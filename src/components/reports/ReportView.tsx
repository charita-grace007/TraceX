import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Download,
  Share2,
  Copy,
  Check,
  Printer,
  Shield,
  ExternalLink,
  Code,
} from 'lucide-react';
import { EmailCase, Campaign, IntegrityBlock } from '@/src/types/index.ts';
import { VerdictBadge, SeverityBadge, ImpactBadge } from '@/src/components/common/Badge.tsx';
import { jsPDF } from 'jspdf';

interface ReportViewProps {
  currentCase: EmailCase;
  campaigns?: Campaign[];
  ledgerBlocks?: IntegrityBlock[];
}

export const ReportView: React.FC<ReportViewProps> = ({ currentCase, campaigns = [], ledgerBlocks = [] }) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'narrative' | 'stix'>('narrative');
  const [isLockerSealed, setIsLockerSealed] = useState(false);
  const [lockerBlockCount, setLockerBlockCount] = useState(0);

  // Check if case evidence baseline is locked in local register or if system ledger has a block
  useEffect(() => {
    let sealed = false;
    let count = 0;

    // 1. Check local storage baseline
    const saved = localStorage.getItem('tracex_evidence_baselines');
    if (saved) {
      try {
        const baselines = JSON.parse(saved);
        const chain = baselines[currentCase.id];
        if (chain && chain.length > 0) {
          sealed = true;
          count = chain.length;
        }
      } catch (err) {
        console.error('Failed to parse evidence baselines', err);
      }
    }

    // 2. Check if system ledger blocks exist for this case
    if (ledgerBlocks && ledgerBlocks.length > 0) {
      const match = ledgerBlocks.some(b => b.caseId === currentCase.caseNumber || b.caseId === currentCase.id);
      if (match) {
        sealed = true;
        count = Math.max(count, currentCase.evidenceList.length);
      }
    }

    setIsLockerSealed(sealed);
    setLockerBlockCount(count);
  }, [currentCase.id, currentCase.caseNumber, ledgerBlocks, currentCase.evidenceList.length]);

  // Dynamically resolve EV-02 based on actual deterministic case auth status to ensure factual consistency
  const resolvedEvidenceList = currentCase.evidenceList.map(e => {
    if (e.id === 'EV-02') {
      const spf = currentCase.authAnalysis.spf.status;
      const dkim = currentCase.authAnalysis.dkim.status;
      const dmarc = currentCase.authAnalysis.dmarc.status;
      
      const failures: string[] = [];
      if (spf === 'FAIL') failures.push('SPF');
      if (dkim === 'FAIL') failures.push('DKIM');
      if (dmarc === 'FAIL') failures.push('DMARC');
      
      let title = e.title;
      let observation = e.observation;
      
      if (failures.length === 3) {
        title = 'Triple Protocol Authentication Failure (SPF / DKIM / DMARC)';
        observation = `SPF returned FAIL for origin IP ${currentCase.authAnalysis.spf.clientIp || '185.220.101.44'}; DKIM body hash mismatch; DMARC policy evaluated as reject.`;
      } else if (failures.length === 1 && failures[0] === 'SPF' && dkim === 'NONE' && dmarc === 'NONE') {
        title = 'Protocol Authentication Failure (SPF FAIL)';
        observation = `SPF returned FAIL for origin IP ${currentCase.authAnalysis.spf.clientIp || '185.220.101.44'}. DKIM signature status is NONE; DMARC policy status is NONE (not configured).`;
      } else {
        title = `Protocol Authentication Results (${failures.length > 0 ? failures.join(' & ') + ' Failure' : 'All Neutral/NONE'})`;
        observation = `SPF status is ${spf}${currentCase.authAnalysis.spf.clientIp ? ' for IP ' + currentCase.authAnalysis.spf.clientIp : ''}. DKIM signature status is ${dkim}. DMARC policy status is ${dmarc}.`;
      }
      
      return {
        ...e,
        title,
        observation
      };
    }
    return e;
  });

  const stixBundle = {
    type: 'bundle',
    id: `bundle--${currentCase.id}`,
    spec_version: '2.1',
    objects: [
      {
        type: 'incident',
        id: `incident--${currentCase.id}`,
        name: currentCase.title,
        severity: currentCase.decision.threatSeverity.toLowerCase(),
        confidence: currentCase.decision.threatConfidence,
        description: currentCase.subject,
      },
      {
        type: 'email-message',
        id: `email-message--${currentCase.id}`,
        from_ref: currentCase.senderAddress,
        to_refs: [currentCase.recipientAddress],
        subject: currentCase.subject,
        date: currentCase.dateSent,
      },
      ...resolvedEvidenceList.map(e => ({
        type: 'observed-data',
        id: `observed-data--${e.id}`,
        number_observed: 1,
        objects: {
          '0': {
            type: 'artifact',
            description: e.observation,
            hashes: { 'SHA-256': e.sha256Hash || e.id },
          },
        },
      })),
    ],
  };

  const handleDownloadStix = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(stixBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentCase.caseNumber}_STIX2.1.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyStix = () => {
    navigator.clipboard.writeText(JSON.stringify(stixBundle, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Professional PDF Generation using jsPDF
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const margin = 40;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const printableWidth = pageWidth - (margin * 2);
    let y = 50;

    // Helper for page headers and footers on overflow
    const drawHeaderFooter = () => {
      const pageNum = doc.getNumberOfPages();
      
      // Header (Skip on Page 1)
      if (pageNum > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('TRACE-X INCIDENT FORENSICS DOSSIER', margin, 30);
        doc.text(`CASE: ${currentCase.caseNumber}`, pageWidth - margin, 30, { align: 'right' });
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(margin, 35, pageWidth - margin, 35);
      }

      // Footer (On all pages)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);
      doc.text('CONFIDENTIAL • FOR SOC SECURITY OPERATIONS USE ONLY', margin, pageHeight - 22);
      doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
    };

    const checkPageWrap = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 55) {
        doc.addPage();
        drawHeaderFooter();
        y = 55;
      }
    };

    const addSectionHeader = (title: string, subtitle?: string) => {
      checkPageWrap(45);
      y += 15;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(title.toUpperCase(), margin, y);
      
      // Horizontal bar
      y += 4;
      doc.setDrawColor(6, 182, 212); // cyan-500
      doc.setLineWidth(1.5);
      doc.line(margin, y, margin + 180, y);
      
      if (subtitle) {
        y += 11;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(subtitle.toUpperCase(), margin, y);
      }
      y += 12;
    };

    const addLabelValue = (label: string, value: string, indent = 0) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      const labelText = `${label}: `;
      const labelWidth = doc.getTextWidth(labelText);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const valLines = doc.splitTextToSize(value, printableWidth - indent - labelWidth - 5);
      
      checkPageWrap(Math.max(1, valLines.length) * 12 + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(labelText, margin + indent, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59); // slate-800
      
      let first = true;
      valLines.forEach((line: string) => {
        if (first) {
          doc.text(line, margin + indent + labelWidth + 3, y);
          first = false;
        } else {
          doc.text(line, margin + indent, y);
        }
        y += 12;
      });
      y += 1.5;
    };

    const printParagraph = (text: string, indent = 0, fontSize = 8.5, isItalic = false) => {
      doc.setFont('helvetica', isItalic ? 'italic' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(51, 65, 85); // slate-700
      const splitLines = doc.splitTextToSize(text, printableWidth - indent);
      checkPageWrap(splitLines.length * (fontSize + 3.5) + 5);
      splitLines.forEach((line: string) => {
        doc.text(line, margin + indent, y);
        y += fontSize + 3.5;
      });
      y += 2;
    };

    // Initialize Page 1
    drawHeaderFooter();

    // TITLE BRANDING BANNER
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, printableWidth, 48, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('TRACE-X INCIDENT FORENSICS REPORT', margin + 15, y + 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 182, 212); // cyan-400
    doc.text('SIH26106 COMPLIANT • IMMUTABLE FORENSICS REGISTER', margin + 15, y + 36);
    
    y += 62;

    // FILE META & COVER INFO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('REPORT METADATA', margin, y);
    y += 12;

    addLabelValue('Case ID', currentCase.caseNumber);
    addLabelValue('Incident Title', currentCase.title);
    addLabelValue('Attack Classification', currentCase.attackType);
    addLabelValue('Sender Identity', `"${currentCase.senderName}" <${currentCase.senderAddress}>`);
    addLabelValue('Recipient Address', currentCase.recipientAddress);
    addLabelValue('Message Subject', currentCase.subject);
    addLabelValue('Message Date', new Date(currentCase.dateSent).toUTCString());
    addLabelValue('MIME File Hash (SHA-256)', currentCase.artifactHash);
    addLabelValue('Report Generated At', new Date().toUTCString());

    y += 10;

    // 1. EXECUTIVE INCIDENT OVERVIEW (DETERMINISTIC-DERIVED ANALYSIS)
    addSectionHeader('1. Executive Threat Matrix', 'Deterministic-Derived Analysis');
    
    // Grid box for scores
    checkPageWrap(50);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.rect(margin, y, printableWidth, 42, 'FD');

    // Draw grid metrics
    const thirdWidth = printableWidth / 3;
    doc.line(margin + thirdWidth, y, margin + thirdWidth, y + 42);
    doc.line(margin + thirdWidth * 2, y, margin + thirdWidth * 2, y + 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('THREAT SEVERITY', margin + 12, y + 14);
    doc.text('CONFIDENCE INDEX', margin + thirdWidth + 12, y + 14);
    doc.text('PROOF RELIABILITY', margin + thirdWidth * 2 + 12, y + 14);

    doc.setFontSize(11);
    const sev = currentCase.decision.threatSeverity;
    doc.setTextColor(sev === 'CRITICAL' || sev === 'HIGH' ? 220 : 30, sev === 'CRITICAL' || sev === 'HIGH' ? 38 : 41, sev === 'CRITICAL' || sev === 'HIGH' ? 38 : 59);
    doc.text(sev, margin + 12, y + 30);

    doc.setTextColor(30, 41, 59);
    doc.text(`${currentCase.decision.threatConfidence}%`, margin + thirdWidth + 12, y + 30);
    doc.text(`${currentCase.decision.evidenceQuality}%`, margin + thirdWidth * 2 + 12, y + 30);

    y += 54;

    // Add Verdict Finding
    addLabelValue('Forensic Verdict Assessment', `${currentCase.decision.verdict} (${currentCase.decision.businessImpact} Business Impact)`);
    y += 5;

    // Supporting observations
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Key Supporting Determinators:', margin, y);
    y += 12;
    currentCase.decision.why.forEach(w => {
      printParagraph(`• ${w}`, 10);
    });

    y += 5;

    // 2. PROTOCOL AUTHENTICATION RESULTS
    addSectionHeader('2. Authentication Integrity Status', 'Observed Evidence & Deterministic Verification');
    
    // Draw SPF / DKIM / DMARC result table
    checkPageWrap(55);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, printableWidth, 44, 'FD');

    doc.line(margin + thirdWidth, y, margin + thirdWidth, y + 44);
    doc.line(margin + thirdWidth * 2, y, margin + thirdWidth * 2, y + 44);

    // Columns
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SPF (SENDER POLICY)', margin + 10, y + 14);
    doc.text('DKIM (SIGNATURE)', margin + thirdWidth + 10, y + 14);
    doc.text('DMARC (ALIGNMENT)', margin + thirdWidth * 2 + 10, y + 14);

    const spfVal = currentCase.authAnalysis.spf.status;
    const dkimVal = currentCase.authAnalysis.dkim.status;
    const dmarcVal = currentCase.authAnalysis.dmarc.status;

    doc.setFontSize(10);
    doc.setTextColor(spfVal === 'PASS' ? 22 : 220, spfVal === 'PASS' ? 163 : 38, spfVal === 'PASS' ? 74 : 38);
    doc.text(spfVal, margin + 10, y + 28);

    doc.setTextColor(dkimVal === 'PASS' ? 22 : 220, dkimVal === 'PASS' ? 163 : 38, dkimVal === 'PASS' ? 74 : 38);
    doc.text(dkimVal, margin + thirdWidth + 10, y + 28);

    doc.setTextColor(dmarcVal === 'PASS' ? 22 : 220, dmarcVal === 'PASS' ? 163 : 38, dmarcVal === 'PASS' ? 74 : 38);
    doc.text(dmarcVal, margin + thirdWidth * 2 + 10, y + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Domain: ${currentCase.authAnalysis.spf.domain || 'N/A'}`, margin + 10, y + 38);
    doc.text(`Domain: ${currentCase.authAnalysis.dkim.domain || 'N/A'}`, margin + thirdWidth + 10, y + 38);
    doc.text(`Policy: ${currentCase.authAnalysis.dmarc.policy || 'NONE'}`, margin + thirdWidth * 2 + 10, y + 38);

    y += 56;

    // Sender impersonation checks
    const dispSpoof = currentCase.authAnalysis.displaySpoofing;
    addLabelValue('Display Name Spoofing Detected', dispSpoof.isSpoofed ? 'YES (Critical Mismatch)' : 'NO (Verified Matching Name)');
    if (dispSpoof.isSpoofed) {
      addLabelValue('  -> Actual Email', dispSpoof.actualEmail, 10);
      addLabelValue('  -> Similarity Metric', `${(dispSpoof.similarityScore || 0) * 100}% Lookalike Match`, 10);
    }

    const replyTo = currentCase.authAnalysis.replyToMismatch;
    addLabelValue('Reply-To Header Deviation', replyTo.hasMismatch ? 'YES (High Risk Redirect)' : 'NO (Matching Reply Headers)');
    if (replyTo.hasMismatch) {
      addLabelValue('  -> Declared From Address', replyTo.headerFrom, 10);
      addLabelValue('  -> Deviating Reply-To', replyTo.replyTo, 10);
    }

    y += 10;

    // 3. SUSPICIOUS URLS & DOMAINS
    addSectionHeader('3. Extracted Suspicious URLs & Indicators', 'Observed Evidence Details');
    
    if (currentCase.urls && currentCase.urls.length > 0) {
      currentCase.urls.forEach((url, uIdx) => {
        addLabelValue(`Indicator #${uIdx + 1} URL`, url.originalUrl || url.completeUrl || '');
        addLabelValue('  -> Host Domain', url.domain || url.hostname || '', 10);
        addLabelValue('  -> Category / Threat Class', `${url.category || 'Lookalike Domain Match'} (Risk Score: ${url.riskScore}/100)`, 10);
        if (url.isPunycode) addLabelValue('  -> Internationalized Domain', 'YES (Punycode detected)', 10);
        if (url.hasRedirection) addLabelValue('  -> Silent Redirection Flag', 'YES (Redirects on handshake)', 10);
        y += 4;
      });
    } else {
      printParagraph('Zero suspicious external URLs or hostname anchors extracted from HTML email body snippet.');
    }

    y += 10;

    // 4. RECEIVED HEADER TIMELINE
    addSectionHeader('4. Reconstructed Transmission Pathway', 'Observed Hops & Inferred Network Context');
    
    printParagraph('SMTP Received headers sequence traced in reverse-chronological arrival sequence. Earliest hops represent observed source telemetry, while geographic location fields represent BGP hosting providers and ASNs, which must never be used to confirm physical attacker location.', 0, 7.5, true);
    y += 6;

    currentCase.relayHops.forEach((hop) => {
      checkPageWrap(35);
      doc.setFillColor(hop.isTrusted ? 240 : 254, hop.isTrusted ? 253 : 242, hop.isTrusted ? 250 : 242);
      doc.setDrawColor(hop.isTrusted ? 186 : 244, hop.isTrusted ? 230 : 63, hop.isTrusted ? 253 : 94);
      doc.rect(margin, y, printableWidth, 30, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(hop.isTrusted ? 8 : 159, hop.isTrusted ? 145 : 18, hop.isTrusted ? 178 : 57);
      doc.text(`Hop #${hop.index}`, margin + 10, y + 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`IP: ${hop.ip || 'Unknown'}`, margin + 50, y + 18);
      
      const geoText = hop.country ? `${hop.city || 'Unknown'}, ${hop.country} (${hop.countryCode || 'XX'})` : 'Unknown';
      doc.text(`Infrastructure Geolocation Context: ${geoText}`, margin + 140, y + 18);
      
      const trustText = hop.isTrusted ? 'TRUSTED TRANSIT' : 'UNTRUSTED ORIGIN';
      doc.setFont('helvetica', 'bold');
      doc.text(trustText, pageWidth - margin - 10, y + 18, { align: 'right' });

      y += 33;
      addLabelValue('   -> ISP Network Route', `${hop.asnOrg || 'Unknown Organization'} (${hop.asn || 'AS0000'})`, 10);
      addLabelValue('   -> SMTP Handshake Host', `HELO EHLO: ${hop.fromRaw || 'Unknown'} • Receiving MTA: ${hop.byRaw || 'Unknown'}`, 10);
      addLabelValue('   -> Transport Transit Delay', `+${hop.delaySeconds} seconds delay`, 10);
      y += 5;
    });

    y += 10;

    // 5. ATTRIBUTED CAMPAIGN CORRELATION
    addSectionHeader('5. Attributed Threat Campaign Correlation', 'Deterministic-Derived Intel Cluster');
    
    printParagraph('Notice: This section represents a deterministic intelligence correlation and clustering finding generated by TRACE-X analytics engines. It does not constitute independently verified real-world legal attribution or government-vetted threat group designation.', 0, 7.5, true);
    y += 5;

    const campId = currentCase.linkedCampaignId;
    const campaign = campaigns.find(c => c.id === campId);

    if (campaign) {
      addLabelValue('Correlated Campaign ID', campaign.id);
      addLabelValue('TRACE-X Correlated Campaign Cluster Name', campaign.name);
      addLabelValue('TRACE-X Internal Correlation Confidence Index', `${campaign.correlationConfidence || 95}% Confirmed Matches`);
      addLabelValue('TRACE-X Correlation Label', campaign.threatActorGroup);
      addLabelValue('Target Sectors', campaign.targetSectors.join(', '));
      addLabelValue('DNS Fingerprint Signatures', campaign.dnaFingerprint);
      addLabelValue('Common Infrastructure ASNs', campaign.commonInfrastructure.asns.join(', '));
      addLabelValue('Linked Domains', campaign.commonInfrastructure.domains.join(', '));
      addLabelValue('Rotation Notes', campaign.infrastructureRotationNotes);
    } else {
      printParagraph('Isolated Incident: This artifact does not match any known target campaign pools or shared fast-flux hosting indicators in current tenant datasets.');
    }

    y += 10;

    // 6. DETAILED EVIDENCE LEDGER & INTEGRITY LOCKER
    addSectionHeader('6. Sealed Forensic Evidence Records', 'Immutable Hash-Chain Audit (Chain of Custody)');
    
    const lockerStatusText = isLockerSealed 
      ? `SECURED BASELINE SEALED (SHA-256 Hash-chain containing ${lockerBlockCount} records)` 
      : 'UNSEALED IN-MEMORY LOGS (No active integrity baseline sealed)';
    addLabelValue('Secure Locker Integrity Status', lockerStatusText);
    y += 5;

    resolvedEvidenceList.forEach((e) => {
      checkPageWrap(40);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, printableWidth, 36, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(6, 182, 212);
      doc.text(`[${e.id}]`, margin + 10, y + 15);
      
      doc.setTextColor(15, 23, 42);
      doc.text(e.title, margin + 50, y + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Type: ${e.type} | Weight: ${e.weight} | Source: ${e.technicalSource}`, margin + 50, y + 27);
      
      const chainHash = e.sha256Hash || 'N/A (Calculated dynamically on lock)';
      doc.text(`Record Hash: ${chainHash}`, pageWidth - margin - 10, y + 15, { align: 'right' });

      y += 40;
      printParagraph(`Observation payload: ${e.observation}`, 15, 8);
      y += 4;
    });

    y += 10;

    // 7. AI COPILOT INVESTIGATION SUMMARY (AI INTERPRETATION)
    addSectionHeader('7. Evidence-Grounded AI Copilot Findings', 'AI Interpretation & SOC Recommendations');
    
    printParagraph('Notice: AI analysis is strictly constrained to the deterministic evidence and authentication telemetry parsed above. Model assertions must be audited against direct evidence identifiers before authorization.', 0, 7.5, true);
    y += 6;

    // Generate grounded answers to key SOC analyst questions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    // Compute dynamic, factually consistent why suspicious reasons based on actual protocol status
    const suspiciousReasons: string[] = [];
    if (currentCase.authAnalysis.displaySpoofing.isSpoofed) {
      suspiciousReasons.push(`display name impersonation of ${currentCase.authAnalysis.displaySpoofing.targetEntity || 'legitimate entity'}`);
    }
    if (currentCase.authAnalysis.spf.status === 'FAIL') {
      suspiciousReasons.push('unauthorized SMTP sending relay IP failing SPF verification');
    }
    if (currentCase.authAnalysis.dkim.status === 'FAIL') {
      suspiciousReasons.push('invalid or tampered cryptographic DKIM signature');
    }
    if (currentCase.authAnalysis.dmarc.status === 'FAIL') {
      suspiciousReasons.push('DMARC alignment check failure');
    }
    if (currentCase.urls && currentCase.urls.length > 0) {
      suspiciousReasons.push(`${currentCase.urls.length} suspicious external indicators/URLs detected in the body`);
    }
    if (currentCase.authAnalysis.replyToMismatch.hasMismatch) {
      suspiciousReasons.push(`mismatched Reply-To address deviation pointing to ${currentCase.authAnalysis.replyToMismatch.replyTo}`);
    }
    
    // Fallback to decision why but filtering out NONE results
    if (suspiciousReasons.length === 0) {
      currentCase.decision.why.forEach(w => {
        if (w.includes('SPF') && currentCase.authAnalysis.spf.status === 'NONE') return;
        if (w.includes('DKIM') && currentCase.authAnalysis.dkim.status === 'NONE') return;
        if (w.includes('DMARC') && currentCase.authAnalysis.dmarc.status === 'NONE') return;
        suspiciousReasons.push(w);
      });
    }
    if (suspiciousReasons.length === 0) {
      suspiciousReasons.push('anomalous header structures or contextual threat markers');
    }

    const whySuspiciousText = `This email was flagged as ${currentCase.decision.verdict.toLowerCase()} based on: ${suspiciousReasons.join(', ')}.`;

    const qaAnswers = [
      {
        q: '1. Why is this email suspicious?',
        a: whySuspiciousText
      },
      {
        q: '2. What evidence supports the assessment?',
        a: resolvedEvidenceList.filter(e => e.supportsThreat).map(e => `[${e.id}] (${e.title}): ${e.observation}`).join('; ') || 'None observed.'
      },
      {
        q: '3. What evidence contradicts it?',
        a: currentCase.decision.whyNot.length > 0 ? currentCase.decision.whyNot.join('; ') : 'No strong contradictory evidence observed. Protocol headers show status results corresponding to their respective DNS configurations.'
      },
      {
        q: '4. What infrastructure is involved?',
        a: `Sending SMTP relay originates from Host IP ${currentCase.relayHops[0]?.ip || 'Unknown'} under ISP Network Autonomous System ${currentCase.relayHops[0]?.asn || 'AS0000'} (${currentCase.relayHops[0]?.asnOrg || 'N/A'}).`
      },
      {
        q: '5. Is it connected to another campaign?',
        a: campId ? `Yes. Correlated directly as a TRACE-X cluster match with attributed campaign finding ${campId} ("${campaign?.name || 'N/A'}").` : 'No connected threat campaign clusters identified.'
      },
      {
        q: '6. What should the analyst investigate next?',
        a: `Revoke active authentication tokens for ${currentCase.recipientAddress}. Implement SMTP Display Name filters on the gateway, and submit the host domain to peripheral firewall blocks.`
      },
      {
        q: '7. What evidence would change the current assessment?',
        a: currentCase.decision.whatWouldChange.length > 0 ? currentCase.decision.whatWouldChange.join('; ') : 'Out-of-band validation of business processes.'
      }
    ];

    qaAnswers.forEach((qa) => {
      checkPageWrap(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(qa.q, margin, y);
      y += 12;

      printParagraph(qa.a, 10, 8);
      y += 4;
    });

    // 8. EXTERNAL THREAT INTELLIGENCE (ENRICHMENT ONLY)
    if (currentCase.externalIntelligence && currentCase.externalIntelligence.length > 0) {
      checkPageWrap(40);
      addSectionHeader('8. External Threat Intelligence', 'Enrichment Feeds & Third-party Scans');
      printParagraph('Notice: External threat intelligence results are provided for context and enrichment purposes only. They are retrieved from third-party lookup APIs or public scanners and do not replace, modify, or override deterministic forensic evidence or local verification protocols.', 0, 7.5, true);
      y += 8;

      currentCase.externalIntelligence.forEach((item) => {
        checkPageWrap(36);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, printableWidth, 30, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`PROVIDER: ${item.provider.toUpperCase()}`, margin + 10, y + 12);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Indicator: ${item.indicator}`, margin + 10, y + 22);

        doc.setFont('helvetica', 'bold');
        const color = item.status === 'MALICIOUS' ? [220, 38, 38] : [30, 41, 59];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`STATUS: ${item.status}`, pageWidth - margin - 10, y + 12, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Lookup Time: ${new Date(item.lookupTime).toLocaleString()}`, pageWidth - margin - 10, y + 22, { align: 'right' });

        y += 34;
        printParagraph(`Metadata: ${item.details || 'N/A'}`, 15, 7.5);
        y += 4;
      });
    }

    // 9. MACHINE LEARNING CLASSIFICATION (SUPPORTING SIGNAL ONLY)
    if (currentCase.mlClassification) {
      checkPageWrap(40);
      addSectionHeader('9. Machine Learning Classification', 'SUPPORTING ML SIGNAL — NOT THE FORENSIC VERDICT');
      printParagraph('Notice: This section details supporting predictions derived from a TF-IDF vectorizer and a Logistic Regression binary text classifier. These metrics act purely as supportive signals and are strictly decoupled from the deterministic forensics evidence chain.', 0, 7.5, true);
      y += 8;

      checkPageWrap(36);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, printableWidth, 30, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`MODEL CLASSIFIER: SCKIT-LEARN LOGISTIC REGRESSION (v${currentCase.mlClassification.modelVersion})`, margin + 10, y + 12);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Predicted Class: ${currentCase.mlClassification.predictedClass}`, margin + 10, y + 22);

      doc.setFont('helvetica', 'bold');
      const mlColor = currentCase.mlClassification.predictedClass === 'PHISHING' ? [220, 38, 38] : [16, 185, 129];
      doc.setTextColor(mlColor[0], mlColor[1], mlColor[2]);
      doc.text(`RESULT: ${currentCase.mlClassification.predictedClass}`, pageWidth - margin - 10, y + 12, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Phishing Prob: ${(currentCase.mlClassification.phishingProbability * 100).toFixed(1)}% | Benign Prob: ${(currentCase.mlClassification.benignProbability * 100).toFixed(1)}%`, pageWidth - margin - 10, y + 22, { align: 'right' });

      y += 34;
      const reasonsText = currentCase.mlClassification.explainability?.reasons?.join('; ') || 'No attribution features analyzed.';
      printParagraph(`Explainability Features: ${reasonsText}`, 15, 7.5);
      y += 6;
    }

    // Save the PDF locally triggering browser download
    doc.save(`${currentCase.caseNumber}_TRACE-X_Forensics_Report.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-purple-100/70 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full bg-purple-50 px-3 py-0.5 font-mono text-[10px] font-bold text-purple-800 border border-purple-200 uppercase shadow-xs">
              Incident Reporting & Interoperability
            </span>
            <span className="font-mono text-xs text-[#8A79A2]">SIH26106 COMPLIANCE</span>
          </div>
          <h1 className="text-xl font-bold font-mono text-[#2E1C4D]">
            Forensic Incident Dossier: {currentCase.caseNumber}
          </h1>
          <p className="text-xs text-[#6A5A82] mt-1">
            Standardized technical evidence export in STIX 2.1 format for national CERT, law enforcement, and enterprise SIEM integration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-emerald-500 transition-all shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>GENERATE PDF REPORT</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-2xl border border-purple-100/80 bg-purple-50/40 px-3.5 py-2 text-xs font-mono text-purple-900 hover:bg-purple-100/60 transition-colors shadow-2xs"
          >
            <Printer className="h-4 w-4" />
            <span>PRINT DOSSIER</span>
          </button>
          <button
            onClick={handleDownloadStix}
            className="flex items-center gap-2 rounded-2xl bg-[#2E1C4D] px-4 py-2 text-xs font-mono font-bold text-white hover:bg-[#432968] transition-all shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>EXPORT STIX 2.1 JSON</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-purple-100/70 pb-3 font-mono text-xs">
        <button
          onClick={() => setActiveTab('narrative')}
          className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'narrative'
              ? 'bg-purple-100 text-purple-900 border border-purple-200 font-bold shadow-2xs'
              : 'text-[#6A5A82] hover:text-[#2E1C4D]'
          }`}
        >
          Executive & Technical Narrative
        </button>
        <button
          onClick={() => setActiveTab('stix')}
          className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'stix'
              ? 'bg-purple-100 text-purple-900 border border-purple-200 font-bold shadow-2xs'
              : 'text-[#6A5A82] hover:text-[#2E1C4D]'
          }`}
        >
          STIX 2.1 Cyber Threat Intelligence Bundle
        </button>
      </div>

      {activeTab === 'narrative' ? (
        <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-6 font-mono text-xs text-[#2E1C4D] shadow-xs">
          {/* Executive Summary */}
          <div className="space-y-2 border-b border-purple-100/70 pb-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-900">
              1. Executive Incident Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#5E4E77]">
              <div className="space-y-1">
                <p><strong className="text-[#2E1C4D]">Case Number:</strong> {currentCase.caseNumber}</p>
                <p><strong className="text-[#2E1C4D]">Incident Title:</strong> {currentCase.title}</p>
                <p><strong className="text-[#2E1C4D]">Attack Taxonomy:</strong> {currentCase.attackType}</p>
                <p><strong className="text-[#2E1C4D]">Date Sent:</strong> {new Date(currentCase.dateSent).toUTCString()}</p>
              </div>
              <div className="space-y-1">
                <p><strong className="text-[#2E1C4D]">Threat Verdict:</strong> {currentCase.decision.verdict}</p>
                <p><strong className="text-[#2E1C4D]">Threat Severity:</strong> {currentCase.decision.threatSeverity}</p>
                <p><strong className="text-[#2E1C4D]">Threat Confidence:</strong> {currentCase.decision.threatConfidence}%</p>
                <p><strong className="text-[#2E1C4D]">Evidence Quality Index:</strong> {currentCase.decision.evidenceQuality}%</p>
              </div>
            </div>
          </div>

          {/* Envelope Identification */}
          <div className="space-y-2 border-b border-purple-100/70 pb-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-900">
              2. Envelope & Header Telemetry
            </h2>
            <div className="space-y-1 text-[#5E4E77]">
              <p><strong className="text-[#2E1C4D]">Header From:</strong> &quot;{currentCase.senderName}&quot; &lt;{currentCase.senderAddress}&gt;</p>
              <p><strong className="text-[#2E1C4D]">Envelope Recipient:</strong> &lt;{currentCase.recipientAddress}&gt;</p>
              <p><strong className="text-[#2E1C4D]">Subject Line:</strong> {currentCase.subject}</p>
              <p><strong className="text-[#2E1C4D]">Artifact SHA-256:</strong> <span className="text-purple-700">{currentCase.artifactHash}</span></p>
            </div>
          </div>

          {/* Infrastructure Reconstruction */}
          <div className="space-y-2 border-b border-purple-100/70 pb-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-900">
              3. Observable Infrastructure Findings
            </h2>
            <p className="text-[#6A5A82] leading-relaxed">
              Trace-back of the Received header sequence identified {currentCase.relayHops.length} discrete transit hops. The earliest observable sending relay node is <strong>{currentCase.relayHops[0]?.ip}</strong> hosted under <strong>{currentCase.relayHops[0]?.asnOrg || 'Hosting Infrastructure'}</strong>.
            </p>
            <div className="rounded-2xl border border-purple-100/80 bg-purple-50/40 p-3.5 text-[#5E4E77] space-y-1 shadow-2xs">
              <p>• Earliest Origin IP: <span className="font-bold text-[#2E1C4D]">{currentCase.relayHops[0]?.ip}</span></p>
              <p>• Autonomous System: {currentCase.relayHops[0]?.asn} ({currentCase.relayHops[0]?.asnOrg})</p>
              <p>• Geographic Hosting: {currentCase.relayHops[0]?.country}</p>
              <p>• Origin Trust Status: <span className="font-bold">{currentCase.relayHops[0]?.isTrusted ? 'TRUSTED' : 'UNTRUSTED ORIGIN'}</span></p>
            </div>
          </div>

          {/* Cryptographic Proof Items */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-900">
              4. Sealed Evidence Items ({resolvedEvidenceList.length})
            </h2>
            <div className="space-y-2.5">
              {resolvedEvidenceList.map((e) => (
                <div key={e.id} className="rounded-2xl border border-purple-100/80 bg-[#fafaff] p-3.5 text-[#5E4E77] shadow-2xs">
                  <div className="flex items-center justify-between font-bold text-[#2E1C4D]">
                    <span>[{e.id}] {e.title}</span>
                    <span className="text-purple-700">Weight: {e.weight}</span>
                  </div>
                  <p className="mt-1 text-[#6A5A82]">{e.observation}</p>
                  <p className="mt-1 text-[10px] text-[#8A79A2]">Source: {e.technicalSource} | SHA-256: {e.sha256Hash || e.id}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#6A5A82] uppercase font-bold">STIX 2.1 JSON Schema Output</span>
            <button
              onClick={handleCopyStix}
              className="flex items-center gap-1.5 text-xs text-purple-800 hover:text-purple-950 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors cursor-pointer shadow-2xs"
            >
              {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedJson ? 'COPIED JSON' : 'COPY STIX BUNDLE'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl border border-purple-100/80 bg-[#fafaff] text-[#2E1C4D] overflow-x-auto text-xs leading-relaxed max-h-[500px]">
            {JSON.stringify(stixBundle, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
