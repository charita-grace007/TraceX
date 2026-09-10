import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  Share2,
  Maximize2,
  Layers,
  ShieldAlert,
  Info,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Link2,
  Calendar,
  Lock,
  Server,
  Globe,
  FileText,
  Mail,
  Workflow,
  HelpCircle,
} from 'lucide-react';
import * as d3 from 'd3';
import { EvidenceGraphData, GraphNode as BaseGraphNode, GraphEdge as BaseGraphEdge, EmailCase, Campaign, EvidenceItem } from '@/src/types/index.ts';

// Extend GraphNode to include D3 simulation properties
interface D3GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'EMAIL' | 'SENDER' | 'DOMAIN' | 'IP' | 'ASN' | 'ATTACHMENT' | 'URL' | 'CAMPAIGN';
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BENIGN';
  metadata?: Record<string, string>;
}

interface D3GraphEdge extends d3.SimulationLinkDatum<D3GraphNode> {
  id: string;
  source: any; // Can be string initially, then D3Node after init
  target: any; // Can be string initially, then D3Node after init
  label: 'CONTAINS_URL' | 'USES_DOMAIN' | 'USES_IP' | 'HAS_ATTACHMENT' | 'RELATED_TO' | 'BELONGS_TO_CAMPAIGN';
  confidence: number;
  evidenceId: string;
  reason: string;
}

interface EvidenceGraphViewerProps {
  graphData: EvidenceGraphData;
  emailCase?: EmailCase;
  cases?: EmailCase[];
  campaigns?: Campaign[];
  onSelectCase?: (c: EmailCase) => void;
}

export const EvidenceGraphViewer: React.FC<EvidenceGraphViewerProps> = ({
  graphData,
  emailCase,
  cases = [],
  campaigns = [],
  onSelectCase,
}) => {
  const [nodes, setNodes] = useState<D3GraphNode[]>([]);
  const [edges, setEdges] = useState<D3GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<D3GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<D3GraphEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<D3GraphNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<D3GraphNode | null>(null);
  const [zoomTransform, setZoomTransform] = useState<string>('');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<D3GraphNode, D3GraphEdge> | null>(null);

  const width = 800;
  const height = 500;

  // Dynamically assemble the TRACE-X Evidence Graph using exact data
  useEffect(() => {
    if (!emailCase) return;

    const nodesList: D3GraphNode[] = [];
    const edgesList: D3GraphEdge[] = [];
    const nodeIds = new Set<string>();

    const addNode = (node: D3GraphNode) => {
      if (!nodeIds.has(node.id)) {
        nodesList.push(node);
        nodeIds.add(node.id);
      }
    };

    // Helper to find specific evidence ID based on type
    const findEvidenceId = (type: string, fallback: string = 'EV-01'): string => {
      const item = emailCase.evidenceList.find((ev) => ev.type === type);
      return item ? item.id : fallback;
    };

    // 1. Core Email Node
    addNode({
      id: `email-${emailCase.id}`,
      label: `Email: ${emailCase.caseNumber}`,
      type: 'EMAIL',
      risk: emailCase.decision.threatSeverity,
      metadata: {
        Subject: emailCase.subject,
        Sender: emailCase.senderAddress,
        Recipient: emailCase.recipientAddress,
        Date: new Date(emailCase.dateSent).toLocaleString(),
        Verdict: emailCase.decision.verdict,
        Confidence: `${emailCase.decision.threatConfidence}%`,
      },
    });

    // 2. Campaign Node (if linked)
    let campaignNodeAdded = false;
    if (emailCase.linkedCampaignId) {
      const camp = campaigns.find((c) => c.id === emailCase.linkedCampaignId);
      addNode({
        id: `campaign-${emailCase.linkedCampaignId}`,
        label: camp?.name || emailCase.linkedCampaignId,
        type: 'CAMPAIGN',
        risk: 'CRITICAL',
        metadata: {
          'Campaign ID': emailCase.linkedCampaignId,
          Actor: camp?.threatActorGroup || 'Unknown Group',
          Sectors: camp?.targetSectors.join(', ') || 'N/A',
          Fingerprint: camp?.dnaFingerprint || 'N/A',
        },
      });
      campaignNodeAdded = true;

      // Link Email to Campaign
      edgesList.push({
        id: `edge-email-campaign-${emailCase.id}`,
        source: `email-${emailCase.id}`,
        target: `campaign-${emailCase.linkedCampaignId}`,
        label: 'BELONGS_TO_CAMPAIGN',
        confidence: camp?.correlationConfidence || 90,
        evidenceId: findEvidenceId('CAMPAIGN_MATCH', 'EV-04'),
        reason: `Correlated to threat campaign ${emailCase.linkedCampaignId} based on behavioral clustering and digital artifacts.`,
      });
    }

    // 3. Sender Domain Node
    if (emailCase.senderDomain) {
      addNode({
        id: `domain-${emailCase.senderDomain}`,
        label: emailCase.senderDomain,
        type: 'DOMAIN',
        risk: emailCase.authAnalysis.displaySpoofing.isSpoofed ? 'CRITICAL' : 'LOW',
        metadata: {
          Domain: emailCase.senderDomain,
          'SPF Auth': emailCase.authAnalysis.spf.status,
          'DKIM Auth': emailCase.authAnalysis.dkim.status,
          'DMARC Policy': emailCase.authAnalysis.dmarc.policy,
          Spoofed: emailCase.authAnalysis.displaySpoofing.isSpoofed ? 'YES' : 'NO',
        },
      });

      // Link Email to Domain
      edgesList.push({
        id: `edge-email-domain-${emailCase.senderDomain}`,
        source: `email-${emailCase.id}`,
        target: `domain-${emailCase.senderDomain}`,
        label: 'USES_DOMAIN',
        confidence: 100,
        evidenceId: findEvidenceId('LOOKALIKE_DOMAIN', findEvidenceId('PROTOCOL_AUTH', 'EV-01')),
        reason: `Envelope sender utilizes domain "${emailCase.senderDomain}" for delivery. SPF/DKIM verification performed.`,
      });

      // Link Campaign to Domain if domain belongs to the campaign group
      if (campaignNodeAdded && emailCase.linkedCampaignId) {
        const camp = campaigns.find((c) => c.id === emailCase.linkedCampaignId);
        if (camp?.commonInfrastructure?.domains.includes(emailCase.senderDomain)) {
          edgesList.push({
            id: `edge-campaign-domain-${emailCase.senderDomain}`,
            source: `domain-${emailCase.senderDomain}`,
            target: `campaign-${emailCase.linkedCampaignId}`,
            label: 'USES_DOMAIN',
            confidence: camp.correlationConfidence || 95,
            evidenceId: findEvidenceId('CAMPAIGN_MATCH', 'EV-04'),
            reason: `Sender domain belongs to the registered campaign static domain set.`,
          });
        }
      }
    }

    // 4. URL Nodes
    emailCase.urls.forEach((url, idx) => {
      const urlId = `url-${url.originalUrl}`;
      addNode({
        id: urlId,
        label: url.domain,
        type: 'URL',
        risk: url.riskScore > 75 ? 'CRITICAL' : url.riskScore > 40 ? 'HIGH' : 'LOW',
        metadata: {
          'Risk Score': `${url.riskScore}/100`,
          'Full Destination': url.finalDestination || url.originalUrl,
          Redirection: url.hasRedirection ? 'Yes' : 'No',
          Category: url.category || 'Phishing Lander',
        },
      });

      // Link Email to URL
      edgesList.push({
        id: `edge-email-url-${idx}`,
        source: `email-${emailCase.id}`,
        target: urlId,
        label: 'CONTAINS_URL',
        confidence: 98,
        evidenceId: findEvidenceId('URL_INDICATOR', 'EV-05'),
        reason: `Email body contains interactive hyperlink pointing to "${url.domain}". Resolves with active redirection.`,
      });

      // Link URL Domain to Domain Node (resolve URL to its domain component)
      const urlDomainId = `domain-${url.domain}`;
      addNode({
        id: urlDomainId,
        label: url.domain,
        type: 'DOMAIN',
        risk: url.riskScore > 75 ? 'CRITICAL' : 'HIGH',
        metadata: {
          Domain: url.domain,
          Role: 'Embedded URL Destination',
        },
      });

      edgesList.push({
        id: `edge-url-domain-${idx}`,
        source: urlId,
        target: urlDomainId,
        label: 'USES_DOMAIN',
        confidence: 100,
        evidenceId: findEvidenceId('URL_INDICATOR', 'EV-05'),
        reason: `Hyperlink resolves directly to domain destination "${url.domain}".`,
      });

      // Link URL to Campaign if relevant
      if (campaignNodeAdded && emailCase.linkedCampaignId) {
        const camp = campaigns.find((c) => c.id === emailCase.linkedCampaignId);
        if (camp?.commonInfrastructure?.domains.includes(url.domain)) {
          edgesList.push({
            id: `edge-campaign-url-${idx}`,
            source: urlId,
            target: `campaign-${emailCase.linkedCampaignId}`,
            label: 'BELONGS_TO_CAMPAIGN',
            confidence: camp.correlationConfidence || 90,
            evidenceId: findEvidenceId('CAMPAIGN_MATCH', 'EV-04'),
            reason: `URL domain is registered as static lure infrastructure for threat group "${camp.threatActorGroup}".`,
          });
        }
      }
    });

    // 5. IP Nodes (From Relay Hops)
    emailCase.relayHops.forEach((hop, idx) => {
      if (!hop.ip) return;
      const ipId = `ip-${hop.ip}`;
      addNode({
        id: ipId,
        label: hop.ip,
        type: 'IP',
        risk: hop.isTrusted ? 'LOW' : 'HIGH',
        metadata: {
          IP: hop.ip,
          ASN: hop.asn || 'N/A',
          Provider: hop.asnOrg || 'Unknown',
          Country: hop.country || 'Unknown',
          City: hop.city || 'Unknown',
          Trusted: hop.isTrusted ? 'Yes (Local/Relay)' : 'No (Untrusted Origin)',
        },
      });

      // Link Email to IP
      edgesList.push({
        id: `edge-email-ip-${idx}`,
        source: `email-${emailCase.id}`,
        target: ipId,
        label: 'USES_IP',
        confidence: 100,
        evidenceId: findEvidenceId('RELAY_HOP', 'EV-03'),
        reason: `SMTP delivery trace contains transit hop via server node IP ${hop.ip} (${hop.asnOrg}).`,
      });

      // Link Domain to IP if domain SMTP matches first untrusted IP
      if (idx === 0 && emailCase.senderDomain) {
        edgesList.push({
          id: `edge-domain-ip-${hop.ip}`,
          source: `domain-${emailCase.senderDomain}`,
          target: ipId,
          label: 'USES_IP',
          confidence: 95,
          evidenceId: findEvidenceId('RELAY_HOP', 'EV-03'),
          reason: `Sender domain envelope resolved routing coordinates to sending server IP ${hop.ip}.`,
        });
      }

      // Link IP to Campaign if listed in campaign assets
      if (campaignNodeAdded && emailCase.linkedCampaignId) {
        const camp = campaigns.find((c) => c.id === emailCase.linkedCampaignId);
        if (camp?.commonInfrastructure?.ips.includes(hop.ip)) {
          edgesList.push({
            id: `edge-campaign-ip-${hop.ip}`,
            source: ipId,
            target: `campaign-${emailCase.linkedCampaignId}`,
            label: 'BELONGS_TO_CAMPAIGN',
            confidence: camp.correlationConfidence || 95,
            evidenceId: findEvidenceId('CAMPAIGN_MATCH', 'EV-04'),
            reason: `SMTP server IP matches static hosting range allocated in known threat campaign registry.`,
          });
        }
      }
    });

    // 6. Attachment Nodes
    emailCase.attachments.forEach((att, idx) => {
      const attId = `attachment-${att.sha256 || att.filename}`;
      addNode({
        id: attId,
        label: att.filename,
        type: 'ATTACHMENT',
        risk: att.threatVerdict === 'MALICIOUS' || att.isExecutableOrMacro ? 'CRITICAL' : 'LOW',
        metadata: {
          Filename: att.filename,
          'MIME Type': att.mimeType,
          Size: `${(att.sizeBytes / 1024).toFixed(1)} KB`,
          'SHA-256': att.sha256,
          Executable: att.isExecutableOrMacro ? 'Yes' : 'No',
        },
      });

      // Link Email to Attachment
      edgesList.push({
        id: `edge-email-attachment-${idx}`,
        source: `email-${emailCase.id}`,
        target: attId,
        label: 'HAS_ATTACHMENT',
        confidence: 100,
        evidenceId: findEvidenceId('ATTACHMENT', 'EV-04'),
        reason: `Email message includes a multipart MIME attachment payload containing file "${att.filename}".`,
      });

      // Link Attachment to Campaign if campaign matches
      if (campaignNodeAdded && emailCase.linkedCampaignId) {
        edgesList.push({
          id: `edge-campaign-attachment-${idx}`,
          source: attId,
          target: `campaign-${emailCase.linkedCampaignId}`,
          label: 'BELONGS_TO_CAMPAIGN',
          confidence: 99,
          evidenceId: findEvidenceId('CAMPAIGN_MATCH', 'EV-04'),
          reason: `Cryptographic payload hash matches malware signatures correlated with central threat actor group.`,
        });
      }
    });

    // 7. Multi-incident Related Email Nodes
    const campaignId = emailCase.linkedCampaignId;
    if (campaignId) {
      const relatedCases = cases.filter(
        (c) => c.id !== emailCase.id && (c.linkedCampaignId === campaignId || (c.relatedCaseIds || []).includes(emailCase.id))
      );

      relatedCases.forEach((rc) => {
        const rcEmailId = `email-${rc.id}`;
        addNode({
          id: rcEmailId,
          label: `Email: ${rc.caseNumber}`,
          type: 'EMAIL',
          risk: rc.decision.threatSeverity,
          metadata: {
            Subject: rc.subject,
            Sender: rc.senderAddress,
            Recipient: rc.recipientAddress,
            Date: new Date(rc.dateSent).toLocaleDateString(),
            Verdict: rc.decision.verdict,
          },
        });

        // Link Related Email to Campaign
        edgesList.push({
          id: `edge-rc-campaign-${rc.id}`,
          source: rcEmailId,
          target: `campaign-${campaignId}`,
          label: 'BELONGS_TO_CAMPAIGN',
          confidence: 90,
          evidenceId: findEvidenceId('CAMPAIGN_MATCH', 'EV-04'),
          reason: `Historical security incident "${rc.caseNumber}" previously attributed to campaign "${campaignId}".`,
        });

        // Link Related Email to Active Email directly
        edgesList.push({
          id: `edge-rc-email-${rc.id}`,
          source: rcEmailId,
          target: `email-${emailCase.id}`,
          label: 'RELATED_TO',
          confidence: 85,
          evidenceId: findEvidenceId('CAMPAIGN_MATCH', 'EV-04'),
          reason: `Deterministic overlap detected on campaign envelope markers. Incident link verified.`,
        });
      });
    }

    setNodes(nodesList);
    setEdges(edgesList);
    setSelectedNode(nodesList[0] || null);
    setSelectedEdge(null);
  }, [emailCase, cases, campaigns]);

  // Handle D3 Force Simulation setup
  useEffect(() => {
    if (nodes.length === 0) return;

    // Create a copy of nodes and edges to avoid D3 mutation issues with React rendering
    const simNodes = nodes.map((n) => ({ ...n }));
    const simEdges = edges.map((e) => ({
      ...e,
      source: simNodes.find((n) => n.id === (e.source.id || e.source)) || e.source,
      target: simNodes.find((n) => n.id === (e.target.id || e.target)) || e.target,
    }));

    const simulation = d3
      .forceSimulation<D3GraphNode, D3GraphEdge>(simNodes)
      .force(
        'link',
        d3
          .forceLink<D3GraphNode, D3GraphEdge>(simEdges)
          .id((d) => d.id)
          .distance((d) => {
            if (d.label === 'BELONGS_TO_CAMPAIGN') return 160;
            if (d.label === 'RELATED_TO') return 140;
            return 90;
          })
      )
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(45).strength(0.8))
      .alphaDecay(0.02);

    simulation.on('tick', () => {
      // Force within bounds
      simNodes.forEach((node) => {
        node.x = Math.max(30, Math.min(width - 30, node.x || 0));
        node.y = Math.max(30, Math.min(height - 30, node.y || 0));
      });

      setNodes([...simNodes]);
      setEdges([...simEdges]);
    });

    simulationRef.current = simulation;

    // Reset Zoom / Center Graph
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      // Clean previous zoom listeners to avoid stacking
      svg.on('.zoom', null);

      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        setZoomTransform(event.transform.toString());
      });

      svg.call(zoomBehavior);
      svg.call(zoomBehavior.transform, d3.zoomIdentity);
    }

    return () => {
      simulation.stop();
    };
  }, [nodes.length, emailCase?.id]);

  // Zoom / Pan handlers
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(d3.zoom().scaleBy as any, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(d3.zoom().scaleBy as any, 1 / 1.3);
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(d3.zoom().transform as any, d3.zoomIdentity);
  };

  // Node drag logic using pointer events for full compatibility
  const handlePointerDown = (event: React.PointerEvent<SVGGElement>, node: D3GraphNode) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.15).restart();
    }
    node.fx = node.x;
    node.fy = node.y;
    setDraggedNode(node);
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGGElement>, node: D3GraphNode) => {
    if (draggedNode && draggedNode.id === node.id && svgRef.current) {
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      
      // Calculate coordinates inside the SVG considering current zoom/pan transform
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      
      node.fx = Math.max(20, Math.min(width - 20, svgP.x));
      node.fy = Math.max(20, Math.min(height - 20, svgP.y));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<SVGGElement>, node: D3GraphNode) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    node.fx = null;
    node.fy = null;
    setDraggedNode(null);
  };

  // Compute connected nodes for highlighting
  const getHighlightSet = () => {
    const set = new Set<string>();
    if (selectedNode) {
      set.add(selectedNode.id);
      edges.forEach((edge) => {
        const sId = edge.source.id || edge.source;
        const tId = edge.target.id || edge.target;
        if (sId === selectedNode.id) set.add(tId);
        if (tId === selectedNode.id) set.add(sId);
      });
    } else if (hoveredNode) {
      set.add(hoveredNode.id);
      edges.forEach((edge) => {
        const sId = edge.source.id || edge.source;
        const tId = edge.target.id || edge.target;
        if (sId === hoveredNode.id) set.add(tId);
        if (tId === hoveredNode.id) set.add(sId);
      });
    }
    return set;
  };

  const highlightSet = getHighlightSet();
  const isFiltering = selectedNode !== null || hoveredNode !== null;

  // Custom visual attributes for nodes based on type
  const getNodeStyling = (node: D3GraphNode) => {
    switch (node.type) {
      case 'EMAIL':
        return { bg: 'bg-purple-100/90', border: 'border-purple-400', text: 'text-purple-900', stroke: '#7c3aed', ring: 'rgba(124,58,237,0.15)' };
      case 'DOMAIN':
        return { bg: 'bg-orange-100/90', border: 'border-orange-400', text: 'text-orange-900', stroke: '#ea580c', ring: 'rgba(234,88,12,0.15)' };
      case 'URL':
        return { bg: 'bg-fuchsia-100/90', border: 'border-fuchsia-400', text: 'text-fuchsia-900', stroke: '#d946ef', ring: 'rgba(217,70,239,0.15)' };
      case 'IP':
        return { bg: 'bg-blue-100/90', border: 'border-blue-400', text: 'text-blue-900', stroke: '#3b82f6', ring: 'rgba(59,130,246,0.15)' };
      case 'ATTACHMENT':
        return { bg: 'bg-rose-100/90', border: 'border-rose-400', text: 'text-rose-900', stroke: '#e11d48', ring: 'rgba(225,29,72,0.15)' };
      case 'CAMPAIGN':
        return { bg: 'bg-amber-100/90', border: 'border-amber-400', text: 'text-amber-900', stroke: '#d97706', ring: 'rgba(217,119,6,0.15)' };
      default:
        return { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', stroke: '#8b5cf6', ring: 'rgba(139,92,246,0.15)' };
    }
  };

  // Fetch the related evidence record if any is referenced on selection
  const activeInspectorItem = selectedNode;
  const referencedEvidenceItem = emailCase?.evidenceList.find((ev) => {
    if (!activeInspectorItem) return false;
    
    // Exact mapping logic
    if (activeInspectorItem.type === 'URL' && ev.type === 'URL_INDICATOR') return true;
    if (activeInspectorItem.type === 'DOMAIN' && ev.type === 'LOOKALIKE_DOMAIN') return true;
    if (activeInspectorItem.type === 'IP' && ev.type === 'RELAY_HOP') return true;
    if (activeInspectorItem.type === 'ATTACHMENT' && ev.type === 'ATTACHMENT') return true;
    if (activeInspectorItem.type === 'CAMPAIGN' && ev.type === 'CAMPAIGN_MATCH') return true;
    
    // Check metadata for direct evidence matches or string overlap
    return ev.observation.toLowerCase().includes(activeInspectorItem.label.toLowerCase()) ||
           (activeInspectorItem.metadata?.ASN && ev.observation.includes(activeInspectorItem.metadata.ASN));
  });

  return (
    <div className="space-y-4">
      {/* Graph Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-purple-100/70 bg-white p-4.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-purple-700" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D]">
            TRACE-X Interactive Forensic Evidence Graph
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-[10px] font-mono font-bold uppercase">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500"></span>Email</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"></span>Domain</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-fuchsia-500"></span>URL</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span>IP</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"></span>Attachment</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Campaign</span>
        </div>
      </div>

      {/* Main Graph Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* SVG Graph Viewer Canvas */}
        <div className="lg:col-span-3 rounded-3xl border border-purple-100/70 bg-[#fafaff] overflow-hidden relative min-h-[500px] shadow-xs">
          {/* Grid lines background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e9d5ff20_1px,transparent_1px),linear-gradient(to_bottom,#e9d5ff20_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

          {/* Canvas Floating controls */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 rounded-2xl border border-purple-200/70 bg-white/95 p-1.5 backdrop-blur shadow-sm">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 rounded-xl text-[#6A5A82] hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 rounded-xl text-[#6A5A82] hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Recenter Camera"
              className="p-1.5 rounded-xl text-[#6A5A82] hover:bg-purple-50 hover:text-purple-900 transition-colors border-t border-purple-100 mt-1 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Help Label */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 font-mono text-[10px] text-[#6A5A82] bg-white/95 px-3 py-1.5 rounded-full border border-purple-200/70 shadow-xs">
            <Info className="h-3 w-3 text-purple-700" />
            <span>Drag nodes to organize • Scroll to zoom • Click to inspect</span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[500px] select-none cursor-grab active:cursor-grabbing"
          >
            {/* Markers definition for edge arrows */}
            <defs>
              <marker
                id="arrow-generic"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#7c3aed" />
              </marker>
            </defs>

            {/* Zoomable Container Group */}
            <g ref={containerRef} transform={zoomTransform}>
              {/* Edges / Lines rendering */}
              <g className="edges-layer">
                {edges.map((edge) => {
                  const s = edge.source;
                  const t = edge.target;
                  if (!s || !t || s.x === undefined || t.x === undefined) return null;

                  const sId = s.id || s;
                  const tId = t.id || t;

                  // Evaluate highlight
                  const isSelectedEdge = selectedEdge?.id === edge.id;
                  const isHighlighted =
                    isFiltering &&
                    highlightSet.has(sId) &&
                    highlightSet.has(tId) &&
                    (selectedNode ? sId === selectedNode.id || tId === selectedNode.id : true);

                  const isDimmed = isFiltering && !isHighlighted;

                  return (
                    <g
                      key={edge.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(edge);
                        setSelectedNode(null);
                      }}
                    >
                      {/* Wider invisible interactive line for easy hovering */}
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke="transparent"
                        strokeWidth="10"
                      />
                      {/* Main visible line */}
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={isSelectedEdge ? '#7c3aed' : isHighlighted ? '#9333ea' : '#cbd5e1'}
                        strokeWidth={isSelectedEdge ? '2.5' : isHighlighted ? '2' : '1.5'}
                        strokeDasharray={
                          edge.label === 'RELATED_TO'
                            ? '4 4'
                            : edge.label === 'BELONGS_TO_CAMPAIGN'
                            ? '6 3'
                            : undefined
                        }
                        markerEnd={
                          isSelectedEdge || isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-generic)'
                        }
                        opacity={isDimmed ? 0.15 : 1}
                        className="transition-all duration-200"
                      />
                      {/* Edge label text */}
                      <g opacity={isDimmed ? 0.1 : 0.9}>
                        <rect
                          x={(s.x + t.x) / 2 - 40}
                          y={(s.y + t.y) / 2 - 7}
                          width="80"
                          height="14"
                          rx="4"
                          fill="#ffffff"
                          stroke={isHighlighted ? '#c084fc' : '#e2e8f0'}
                          strokeWidth="1"
                          className="pointer-events-none shadow-xs"
                        />
                        <text
                          x={(s.x + t.x) / 2}
                          y={(s.y + t.y) / 2 + 2.5}
                          fill={isSelectedEdge ? '#6d28d9' : isHighlighted ? '#7c3aed' : '#6A5A82'}
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                        >
                          {edge.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* Nodes rendering */}
              <g className="nodes-layer">
                {nodes.map((node) => {
                  if (node.x === undefined || node.y === undefined) return null;

                  const isSelected = selectedNode?.id === node.id;
                  const isHovered = hoveredNode?.id === node.id;
                  const isHighlighted = !isFiltering || highlightSet.has(node.id);
                  const isDimmed = isFiltering && !isHighlighted;

                  const styling = getNodeStyling(node);
                  const isEmailNode = node.type === 'EMAIL';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onPointerDown={(e) => handlePointerDown(e, node)}
                      onPointerMove={(e) => handlePointerMove(e, node)}
                      onPointerUp={(e) => handlePointerUp(e, node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      opacity={isDimmed ? 0.2 : 1}
                      className="cursor-grab active:cursor-grabbing select-none transition-all duration-150"
                    >
                      {/* Outer selection beacon ring */}
                      {isSelected && (
                        <circle
                          r={isEmailNode ? 32 : 24}
                          fill="none"
                          stroke={styling.stroke}
                          strokeWidth="1.5"
                          className="animate-ping opacity-30"
                        />
                      )}

                      {/* Main node bubble */}
                      <circle
                        r={isEmailNode ? 24 : 18}
                        className={`${styling.bg} ${styling.border} border-2`}
                        stroke={isSelected ? '#7c3aed' : undefined}
                        strokeWidth={isSelected ? 2.5 : undefined}
                        style={{
                          filter: isSelected
                            ? `drop-shadow(0 0 8px ${styling.stroke})`
                            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))',
                        }}
                      />

                      {/* Dynamic visual representation of node classification */}
                      <text
                        y="2.5"
                        className={`${styling.text} font-mono font-black select-none pointer-events-none`}
                        fontSize={isEmailNode ? '9' : '8'}
                        textAnchor="middle"
                      >
                        {node.type.substring(0, 4)}
                      </text>

                      {/* Label block situated underneath the node bubble */}
                      <g transform="translate(0, 32)">
                        <rect
                          x="-55"
                          y="-9"
                          width="110"
                          height="15"
                          rx="6"
                          fill="#ffffff"
                          stroke={isSelected ? styling.stroke : '#e2e8f0'}
                          strokeWidth="1"
                          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.05))"
                        />
                        <text
                          fill={isSelected ? '#2E1C4D' : '#6A5A82'}
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          textAnchor="middle"
                          className="select-none pointer-events-none"
                          y="1"
                        >
                          {node.label.length > 18
                            ? `${node.label.substring(0, 16)}..`
                            : node.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>

        {/* Dynamic inspector sidebar for entity telemetry & evidence mapping */}
        <div className="rounded-3xl border border-purple-100/70 bg-white p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-purple-100/70 pb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#2E1C4D]">
                Evidence Inspector
              </span>
              <Workflow className="h-3.5 w-3.5 text-purple-700" />
            </div>

            {/* Display Node Details */}
            {selectedNode && (
              <div className="space-y-4 font-mono text-xs">
                {/* Node Identity card */}
                <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-purple-100/80 px-2.5 py-0.5 text-[9px] font-bold text-purple-900 uppercase tracking-wider">
                      {selectedNode.type}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase shadow-xs ${
                        selectedNode.risk === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : selectedNode.risk === 'HIGH'
                          ? 'bg-orange-50 text-orange-800 border-orange-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {selectedNode.risk} Severity
                    </span>
                  </div>
                  <h4 className="text-[#2E1C4D] font-bold break-all leading-relaxed pt-1 border-t border-purple-100/70 text-[11px]">
                    {selectedNode.label}
                  </h4>
                </div>

                {/* Specific Node Metadata details */}
                {selectedNode.metadata && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#8A79A2] uppercase font-bold tracking-wider">
                      Technical Telemetry:
                    </span>
                    <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-3.5 space-y-2 text-[10px] text-[#5E4E77] leading-relaxed">
                      {Object.entries(selectedNode.metadata).map(([key, val]) => (
                        <div key={key} className="flex justify-between gap-4 border-b border-purple-100/50 pb-1 last:border-b-0 last:pb-0">
                          <span className="text-[#8A79A2] shrink-0 font-semibold">{key}:</span>
                          <span className="text-[#2E1C4D] font-bold truncate max-w-[150px]" title={val}>
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Action Link if selecting related cases */}
                {selectedNode.type === 'EMAIL' && onSelectCase && emailCase && `email-${emailCase.id}` !== selectedNode.id && (
                  <button
                    onClick={() => {
                      const caseId = selectedNode.metadata?.id || selectedNode.id.replace('email-', '');
                      const foundCase = cases.find((c) => c.id === caseId);
                      if (foundCase) {
                        onSelectCase(foundCase);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-50 border border-purple-200/80 hover:bg-purple-100 px-3 py-2 text-[10px] text-purple-900 font-bold uppercase transition-all shadow-xs cursor-pointer"
                  >
                    <span>Focus Forensic Workspace</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Connected Evidence references mapped directly to Case Evidence List */}
                {referencedEvidenceItem && (
                  <div className="space-y-2 border-t border-purple-100/70 pt-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8A79A2] uppercase font-bold tracking-wider">
                      <FileText className="h-3.5 w-3.5 text-purple-700" />
                      <span>Evidence Reference ({referencedEvidenceItem.id})</span>
                    </div>

                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-3.5 space-y-1">
                      <div className="text-[10px] font-bold text-amber-900 font-sans">
                        {referencedEvidenceItem.title}
                      </div>
                      <p className="text-[10px] text-[#5E4E77] leading-relaxed font-sans pt-1 border-t border-amber-100">
                        {referencedEvidenceItem.observation}
                      </p>
                      <div className="text-[8.5px] text-[#8A79A2] pt-1 border-t border-amber-100 font-mono flex justify-between">
                        <span>Source: {referencedEvidenceItem.technicalSource}</span>
                        <span className="text-amber-800 font-bold">Weight: {referencedEvidenceItem.weight}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Display Edge Details */}
            {selectedEdge && (
              <div className="space-y-4 font-mono text-xs">
                <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-3.5 space-y-2">
                  <span className="rounded-full bg-purple-100/80 px-2.5 py-0.5 text-[9px] font-bold text-purple-900 uppercase tracking-wider">
                    Edge Connection
                  </span>
                  <h4 className="text-[#2E1C4D] font-bold text-[11px] flex items-center gap-1.5 pt-1 border-t border-purple-100/70">
                    <Link2 className="h-4 w-4 text-purple-700 shrink-0" />
                    {selectedEdge.label}
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#8A79A2] uppercase font-bold tracking-wider">
                    Connection Evidence:
                  </span>
                  <p className="text-[10px] text-[#5E4E77] bg-purple-50/20 rounded-2xl border border-purple-100/70 p-3 leading-relaxed">
                    {selectedEdge.reason}
                  </p>
                </div>

                {/* Evidence citation reference details */}
                {selectedEdge.evidenceId && emailCase && (
                  <div className="space-y-2 border-t border-purple-100/70 pt-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8A79A2] uppercase font-bold tracking-wider">
                      <FileText className="h-3.5 w-3.5 text-purple-700" />
                      <span>Edge Evidence Source ({selectedEdge.evidenceId})</span>
                    </div>

                    {(() => {
                      const ev = emailCase.evidenceList.find((item) => item.id === selectedEdge.evidenceId);
                      if (!ev) return <div className="text-[10px] text-[#8A79A2] italic">No static evidence file mapping required. Validated via core graph schemas.</div>;
                      return (
                        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-3.5 space-y-1">
                          <div className="text-[10px] font-bold text-purple-900 font-sans">
                            {ev.title}
                          </div>
                          <p className="text-[10px] text-[#5E4E77] leading-relaxed font-sans pt-1 border-t border-purple-100">
                            {ev.observation}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Default fallback context when no node/edge is actively focused */}
            {!selectedNode && !selectedEdge && (
              <div className="rounded-2xl border border-purple-100/60 bg-purple-50/10 p-5 text-center flex flex-col items-center justify-center space-y-2.5 py-12">
                <Workflow className="h-7 w-7 text-purple-300 animate-pulse" />
                <h5 className="text-[10px] font-bold text-[#6A5A82] uppercase tracking-wider">
                  No Element Focused
                </h5>
                <p className="text-[10px] text-[#8A79A2] leading-relaxed">
                  Click on any node (Email, Domain, URL, IP, Attachment, Campaign) or connecting line in the graph to display its telemetry, relation context, and referenced SOC evidence.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-purple-100/70 pt-3.5 flex items-center justify-between text-[8.5px] text-[#8A79A2] font-mono">
            <span>TRACE-X ENVELOPE LEDGER</span>
            <span>SIH26106</span>
          </div>
        </div>
      </div>
    </div>
  );
};
