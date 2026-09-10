import { EvidenceGraphData, GraphNode, GraphEdge, EmailCase } from '@/src/types/index.ts';

export function buildEvidenceGraph(emailCase: EmailCase): EvidenceGraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Case node
  nodes.push({
    id: `case-${emailCase.id}`,
    label: emailCase.caseNumber,
    type: 'EMAIL',
    risk: emailCase.decision.threatSeverity,
    metadata: { subject: emailCase.subject, date: emailCase.dateSent },
  });

  // Sender node
  const senderId = `sender-${emailCase.senderAddress}`;
  nodes.push({
    id: senderId,
    label: emailCase.senderAddress,
    type: 'SENDER',
    risk: emailCase.authAnalysis.displaySpoofing.isSpoofed ? 'CRITICAL' : 'LOW',
    metadata: { displayName: emailCase.senderName },
  });

  edges.push({
    id: `e-case-sender`,
    source: `case-${emailCase.id}`,
    target: senderId,
    label: 'TRANSMITTED_BY',
    confidence: 100,
  });

  // Domain node
  const domain = emailCase.senderAddress.split('@')[1];
  if (domain) {
    const domainId = `domain-${domain}`;
    nodes.push({
      id: domainId,
      label: domain,
      type: 'DOMAIN',
      risk: emailCase.decision.threatSeverity,
    });

    edges.push({
      id: `e-sender-domain`,
      source: senderId,
      target: domainId,
      label: 'USES_DOMAIN',
      confidence: 100,
    });
  }

  // Earliest observable IP node
  const earliestHop = emailCase.relayHops[0];
  if (earliestHop && earliestHop.ip) {
    const ipId = `ip-${earliestHop.ip}`;
    nodes.push({
      id: ipId,
      label: earliestHop.ip,
      type: 'IP',
      risk: earliestHop.isTrusted ? 'LOW' : 'HIGH',
      metadata: { country: earliestHop.country || 'Unknown', asn: earliestHop.asn || 'N/A' },
    });

    edges.push({
      id: `e-case-ip`,
      source: `case-${emailCase.id}`,
      target: ipId,
      label: 'ORIGIN_TRANSIT',
      confidence: 95,
      evidenceId: 'EV-03',
    });

    if (earliestHop.asn) {
      const asnId = `asn-${earliestHop.asn}`;
      nodes.push({
        id: asnId,
        label: `${earliestHop.asn} (${earliestHop.asnOrg || 'Carrier'})`,
        type: 'ASN',
        risk: earliestHop.isTrusted ? 'LOW' : 'HIGH',
      });

      edges.push({
        id: `e-ip-asn`,
        source: ipId,
        target: asnId,
        label: 'ROUTED_IN',
        confidence: 100,
      });
    }
  }

  // URLs
  emailCase.urls.forEach((url, idx) => {
    const urlId = `url-${idx}`;
    nodes.push({
      id: urlId,
      label: url.domain,
      type: 'URL',
      risk: url.riskScore > 70 ? 'CRITICAL' : 'LOW',
      metadata: { fullUrl: url.originalUrl },
    });

    edges.push({
      id: `e-case-url-${idx}`,
      source: `case-${emailCase.id}`,
      target: urlId,
      label: 'EMBEDDED_LINK',
      confidence: 98,
    });
  });

  // Attachments
  emailCase.attachments.forEach((att, idx) => {
    const attId = `att-${idx}`;
    nodes.push({
      id: attId,
      label: att.filename,
      type: 'ATTACHMENT',
      risk: att.isExecutableOrMacro ? 'CRITICAL' : 'LOW',
      metadata: { sha256: att.sha256 },
    });

    edges.push({
      id: `e-case-att-${idx}`,
      source: `case-${emailCase.id}`,
      target: attId,
      label: 'ATTACHED_FILE',
      confidence: 100,
    });
  });

  // Campaign node if linked
  if (emailCase.linkedCampaignId) {
    const campId = `camp-${emailCase.linkedCampaignId}`;
    nodes.push({
      id: campId,
      label: emailCase.linkedCampaignId,
      type: 'CAMPAIGN',
      risk: 'CRITICAL',
    });

    edges.push({
      id: `e-case-camp`,
      source: `case-${emailCase.id}`,
      target: campId,
      label: 'CAMPAIGN_CLUSTER',
      confidence: 90,
      evidenceId: 'EV-04',
    });
  }

  return { nodes, edges };
}
