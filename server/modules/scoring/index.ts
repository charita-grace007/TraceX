import {
  EvidenceItem,
  EvidenceDecision,
  ThreatSeverity,
  ThreatVerdict,
  BusinessImpactLevel,
  ProtocolAuthAnalysis,
  ScoreContribution,
} from '@/src/types/index.ts';

export function calculateScores(
  evidenceList: EvidenceItem[],
  auth: ProtocolAuthAnalysis,
  targetRole: string = 'General User'
): EvidenceDecision {
  // =========================================================
  // 1. DETERMINISTIC THREAT SCORE CALCULATION
  // =========================================================
  const threatContributions: ScoreContribution[] = [];

  // A. SPF check
  if (auth.spf.status === 'FAIL') {
    threatContributions.push({
      evidenceId: 'AUTH-EV-SPF',
      name: 'SPF Authentication Failure',
      contribution: 20,
      explanation: 'Sender policy framework verification failed, indicating unauthorized sender IP.',
    });
  } else if (auth.spf.status === 'SOFTFAIL') {
    threatContributions.push({
      evidenceId: 'AUTH-EV-SPF',
      name: 'SPF Softfail Warning',
      contribution: 10,
      explanation: 'MTA returned SPF softfail, indicating the sending host is not explicitly permitted.',
    });
  } else if (auth.spf.status === 'PASS') {
    threatContributions.push({
      evidenceId: 'AUTH-EV-SPF',
      name: 'SPF Verification Pass',
      contribution: -10,
      explanation: 'SPF passed. The sending IP is authorized by the sender domain DNS.',
    });
  }

  // B. DKIM check
  if (auth.dkim.status === 'FAIL') {
    threatContributions.push({
      evidenceId: 'AUTH-EV-DKIM',
      name: 'DKIM Signature Failure',
      contribution: 25,
      explanation: 'DKIM cryptographic body or header hash mismatched, suggesting transit tampering or forgery.',
    });
  } else if (auth.dkim.status === 'PASS') {
    threatContributions.push({
      evidenceId: 'AUTH-EV-DKIM',
      name: 'DKIM Verification Pass',
      contribution: -15,
      explanation: 'DKIM cryptographically verified. Content integrity and sender domain authenticity are intact.',
    });
  }

  // C. DMARC check
  if (auth.dmarc.status === 'FAIL') {
    threatContributions.push({
      evidenceId: 'AUTH-EV-DMARC',
      name: 'DMARC Policy Alignment Failure',
      contribution: 20,
      explanation: 'DMARC failed, indicating the visible From header is not aligned with verified SPF or DKIM domains.',
    });
  }

  // D. Display-name mismatch
  if (auth.displaySpoofing.isSpoofed) {
    threatContributions.push({
      evidenceId: 'AUTH-EV-DISPLAY',
      name: 'Display Name Spoof Detection',
      contribution: 25,
      explanation: 'Friendly name mismatch or brand impersonation detected, a common BEC or credential lure strategy.',
    });
  }

  // E. Reply-To mismatch
  if (auth.replyToMismatch.hasMismatch) {
    threatContributions.push({
      evidenceId: 'AUTH-EV-REPLY',
      name: 'Reply-To Diversion Mismatch',
      contribution: 20,
      explanation: 'Reply-To header deviates from From header, potentially hijacking executive responses.',
    });
  }

  // F. Lookalike domain check in general evidence list
  const hasLookalike = evidenceList.some(e => e.type === 'LOOKALIKE_DOMAIN' && e.supportsThreat);
  const lookalikeItem = evidenceList.find(e => e.type === 'LOOKALIKE_DOMAIN' && e.supportsThreat);
  if (hasLookalike) {
    threatContributions.push({
      evidenceId: lookalikeItem?.id || 'EV-LOOKALIKE',
      name: 'Suspicious / Lookalike Domain',
      contribution: 20,
      explanation: 'Domain contains character homoglyphs, typosquatting, or suspicious active registration age.',
    });
  }

  // G. Suspicious URL indicator in general evidence list
  const hasSuspiciousUrl = evidenceList.some(e => e.type === 'URL_INDICATOR' && e.supportsThreat);
  const urlItem = evidenceList.find(e => e.type === 'URL_INDICATOR' && e.supportsThreat);
  if (hasSuspiciousUrl) {
    threatContributions.push({
      evidenceId: urlItem?.id || 'EV-URL',
      name: 'Phishing Hyperlink Extraction',
      contribution: 15,
      explanation: 'MIME body contains embedded URLs pointing to high-risk or credential harvesting vectors.',
    });
  }

  // H. Suspicious attachment in general evidence list
  const hasSuspiciousAttachment = evidenceList.some(e => e.type === 'ATTACHMENT' && e.supportsThreat);
  const attachmentItem = evidenceList.find(e => e.type === 'ATTACHMENT' && e.supportsThreat);
  if (hasSuspiciousAttachment) {
    threatContributions.push({
      evidenceId: attachmentItem?.id || 'EV-ATTACHMENT',
      name: 'Malicious Payload Attachment',
      contribution: 30,
      explanation: 'Executable or macro-enabled MIME binary attachments represent imminent endpoint risk.',
    });
  }

  // I. Campaign correlation in general evidence list
  const hasCampaignMatch = evidenceList.some(e => e.type === 'CAMPAIGN_MATCH' && e.supportsThreat);
  const campaignItem = evidenceList.find(e => e.type === 'CAMPAIGN_MATCH' && e.supportsThreat);
  if (hasCampaignMatch) {
    threatContributions.push({
      evidenceId: campaignItem?.id || 'EV-CAMPAIGN',
      name: 'Known Campaign Correlation',
      contribution: 30,
      explanation: 'Sender infrastructure coordinates with fingerprints of known state or cybercrime campaign clusters.',
    });
  }

  // Compute final Threat Score
  let threatScoreValue = threatContributions.reduce((sum, item) => sum + item.contribution, 0);
  threatScoreValue = Math.min(100, Math.max(0, threatScoreValue));

  let threatSeverityLabel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BENIGN' = 'LOW';
  let verdict: ThreatVerdict = 'INCONCLUSIVE';

  if (threatScoreValue >= 85) {
    threatSeverityLabel = 'CRITICAL';
    verdict = 'MALICIOUS';
  } else if (threatScoreValue >= 60) {
    threatSeverityLabel = 'HIGH';
    verdict = 'MALICIOUS';
  } else if (threatScoreValue >= 35) {
    threatSeverityLabel = 'MEDIUM';
    verdict = 'SUSPICIOUS';
  } else if (threatScoreValue >= 15) {
    threatSeverityLabel = 'LOW';
    verdict = 'SUSPICIOUS';
  } else {
    threatSeverityLabel = 'BENIGN';
    verdict = 'BENIGN';
  }

  const threatExplanation = `Deterministic threat assessment score is ${threatScoreValue} (${threatSeverityLabel}). Calculated from ${threatContributions.filter(c => c.contribution > 0).length} active threat indicators and ${threatContributions.filter(c => c.contribution < 0).length} negative safety checks.`;


  // =========================================================
  // 2. DETERMINISTIC EVIDENCE RELIABILITY CALCULATION
  // =========================================================
  const reliabilityContributions: ScoreContribution[] = [];

  // A. Reliable technical source checks
  if (auth.spf.rawHeader || auth.dkim.rawHeader) {
    reliabilityContributions.push({
      evidenceId: 'AUTH-EV-SPF',
      name: 'MTA Authentication-Results Present',
      contribution: 20,
      explanation: 'Forensic telemetry contains valid header records verified by an upstream mail transfer agent.',
    });
  } else {
    reliabilityContributions.push({
      evidenceId: 'EV-SOURCE-MISSING',
      name: 'MTA Telemetry Absent',
      contribution: -15,
      explanation: 'Missing corporate boundary authentication headers reduces evidence certitude.',
    });
  }

  // B. Cryptographic SPF validation success
  if (auth.spf.status === 'PASS') {
    reliabilityContributions.push({
      evidenceId: 'AUTH-EV-SPF',
      name: 'Authoritative SPF Validation',
      contribution: 20,
      explanation: 'DNS-backed SPF validation provides high-confidence transport path validation.',
    });
  }

  // C. Cryptographic DKIM validation success
  if (auth.dkim.status === 'PASS') {
    reliabilityContributions.push({
      evidenceId: 'AUTH-EV-DKIM',
      name: 'Authoritative DKIM Verification',
      contribution: 25,
      explanation: 'Cryptographic DKIM key signatures verify content authenticity and prevent header forgery.',
    });
  }

  // D. Cryptographic DMARC alignment validation success
  if (auth.dmarc.status === 'PASS') {
    reliabilityContributions.push({
      evidenceId: 'AUTH-EV-DMARC',
      name: 'Authoritative DMARC Alignment',
      contribution: 15,
      explanation: 'DMARC alignment confirms visible sender coordinates correspond to authenticated networks.',
    });
  }

  // E. Missing important header attributes
  const hasMissingHeaders = !auth.spf.domain || !auth.dkim.domain;
  if (hasMissingHeaders) {
    reliabilityContributions.push({
      evidenceId: 'EV-MISSING-HEADERS',
      name: 'Incomplete Domain Attributes',
      contribution: -15,
      explanation: 'Envelope headers are missing sender or organizational boundaries.',
    });
  }

  // F. Conflicting cryptographic indicators
  const isConflicting = (auth.spf.status === 'PASS' && auth.dkim.status === 'FAIL') ||
                         (auth.spf.status === 'FAIL' && auth.dkim.status === 'PASS');
  if (isConflicting) {
    reliabilityContributions.push({
      evidenceId: 'EV-CONFLICT-AUTH',
      name: 'Conflicting Cryptographic Signatures',
      contribution: -15,
      explanation: 'Cryptographic collision detected: one protocol verification succeeded while another failed.',
    });
  }

  // G. Dependency on attacker-controlled parameters
  // If threat is high but we lack SPF/DKIM verification, our evidence relies purely on forged bodies
  const lacksCryptographicProof = auth.spf.status !== 'PASS' && auth.dkim.status !== 'PASS';
  if (threatScoreValue > 15 && lacksCryptographicProof) {
    reliabilityContributions.push({
      evidenceId: 'EV-ATTACKER-CTRL',
      name: 'Attacker-Controlled Content Dependency',
      contribution: -25,
      explanation: 'Threat metrics rely on subjective content analysis (body, URLs, display name) lacking cryptographic signatures.',
    });
  }

  // Compute final Evidence Reliability Score
  // Base score is 50 to represent neutral grounding, adjusted by indicators
  let reliabilityScoreValue = 50 + reliabilityContributions.reduce((sum, item) => sum + item.contribution, 0);
  reliabilityScoreValue = Math.min(100, Math.max(0, reliabilityScoreValue));

  let reliabilityLabel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'FAIR';
  if (reliabilityScoreValue >= 85) {
    reliabilityLabel = 'EXCELLENT';
  } else if (reliabilityScoreValue >= 70) {
    reliabilityLabel = 'GOOD';
  } else if (reliabilityScoreValue >= 45) {
    reliabilityLabel = 'FAIR';
  } else {
    reliabilityLabel = 'POOR';
  }

  const reliabilityExplanation = `Evidence reliability stands at ${reliabilityScoreValue} (${reliabilityLabel}). Indicators verified via authoritative DNS cryptographics earn positive weights, whereas dependency on attacker-controlled body markers or missing MTA records reduces confidence.`;


  // =========================================================
  // 3. BUSINESS IMPACT LEVEL
  // =========================================================
  let businessImpact: BusinessImpactLevel = 'LOW';
  const roleLower = targetRole.toLowerCase();
  if (roleLower.includes('ciso') || roleLower.includes('director') || roleLower.includes('treasury') || roleLower.includes('finance')) {
    businessImpact = threatSeverityLabel === 'CRITICAL' || threatSeverityLabel === 'HIGH' ? 'CRITICAL' : 'HIGH';
  } else if (threatSeverityLabel === 'CRITICAL') {
    businessImpact = 'HIGH';
  } else if (threatSeverityLabel === 'HIGH') {
    businessImpact = 'MEDIUM';
  }

  // Dynamic lists for legacy dashboard elements
  const why: string[] = threatContributions
    .filter(c => c.contribution > 0)
    .map(c => `${c.name}: ${c.explanation} [${c.evidenceId}]`);

  const whyNot: string[] = threatContributions
    .filter(c => c.contribution < 0)
    .map(c => `${c.name}: ${c.explanation} [${c.evidenceId}]`);
  
  if (whyNot.length === 0) {
    whyNot.push('No verifiable counter-evidence supporting legitimacy was observed.');
  }

  const whatWouldChange: string[] = [];
  if (auth.dkim.status !== 'PASS') {
    whatWouldChange.push('Cryptographic DKIM key verification from the authoritative sender domain would reduce the threat severity.');
  }
  if (auth.displaySpoofing.isSpoofed) {
    whatWouldChange.push('Out-of-band identity confirmation with the sender entity would confirm legitimate delegation.');
  }
  if (whatWouldChange.length === 0) {
    whatWouldChange.push('Discovery of previously unseen IOCs or malicious telemetry from the origin IP would elevate confidence.');
  }

  return {
    verdict,
    threatSeverity: threatSeverityLabel,
    threatConfidence: threatScoreValue, // Matches the user-requested numeric Threat Score
    evidenceQuality: reliabilityScoreValue, // Matches the user-requested numeric Evidence Reliability
    businessImpact,
    why,
    whyNot,
    whatWouldChange,
    detailedThreatScore: {
      score: threatScoreValue,
      label: threatSeverityLabel,
      contributions: threatContributions,
      explanation: threatExplanation,
    },
    detailedReliabilityScore: {
      score: reliabilityScoreValue,
      label: reliabilityLabel,
      contributions: reliabilityContributions,
      explanation: reliabilityExplanation,
    },
  };
}
