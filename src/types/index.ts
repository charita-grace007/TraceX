/**
 * TRACE-X Core Data Models
 * SIH26106: AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform
 */

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BENIGN';
export type ThreatVerdict = 'MALICIOUS' | 'SUSPICIOUS' | 'BENIGN' | 'INCONCLUSIVE';
export type EvidenceReliability = 'HIGH' | 'MEDIUM' | 'LOW';
export type BusinessImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ProtocolStatus = 'PASS' | 'FAIL' | 'SOFTFAIL' | 'NEUTRAL' | 'NONE' | 'TEMP_ERROR';

export interface EmailAttachment {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  isExecutableOrMacro: boolean;
  threatVerdict?: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS';
}

export interface ExtractedUrl {
  originalUrl: string;
  domain: string;
  path: string;
  isPunycode: boolean;
  isIpHost: boolean;
  hasRedirection: boolean;
  finalDestination?: string;
  riskScore: number;
  category?: string;
  // Expanded forensic indicators
  completeUrl?: string;
  hostname?: string;
  registrableDomain?: string;
  isHttps?: boolean;
  isLookalike?: boolean;
  suspiciousCharacteristics?: string[];
}

export interface RelayHop {
  index: number;
  fromRaw: string;
  byRaw: string;
  ip: string;
  reverseDns?: string;
  asn?: string;
  asnOrg?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isTrusted: boolean; // Trusted-hop evidence model: lowest hops may be attacker-controlled
  trustReason: string;
  delaySeconds: number;
  flags: string[];
}

export interface AuthEvidenceRecord {
  id: string; // e.g. "AUTH-EV-SPF"
  category: 'SPF' | 'DKIM' | 'DMARC' | 'DISPLAY_NAME_SPOOF' | 'REPLY_TO_MISMATCH';
  observedValue: string;
  explanation: string;
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceField: string;
}

export interface ProtocolAuthAnalysis {
  spf: {
    status: ProtocolStatus;
    domain: string;
    clientIp: string;
    aligned: boolean;
    rawHeader?: string;
  };
  dkim: {
    status: ProtocolStatus;
    domain: string;
    selector: string;
    aligned: boolean;
    rawHeader?: string;
  };
  dmarc: {
    status: ProtocolStatus;
    policy: 'REJECT' | 'QUARANTINE' | 'NONE' | 'ABSENT';
    aligned: boolean;
    rawHeader?: string;
  };
  displaySpoofing: {
    isSpoofed: boolean;
    displayName: string;
    actualEmail: string;
    targetEntity?: string;
    similarityScore?: number;
    explanation?: string;
  };
  replyToMismatch: {
    hasMismatch: boolean;
    headerFrom: string;
    replyTo: string;
    riskWeight: number;
  };
  evidenceRecords?: AuthEvidenceRecord[];
}

export interface EvidenceItem {
  id: string; // e.g. "EV-01"
  type: 'PROTOCOL_AUTH' | 'RELAY_HOP' | 'LOOKALIKE_DOMAIN' | 'ATTACHMENT' | 'URL_INDICATOR' | 'CAMPAIGN_MATCH' | 'CONTENT_ANOMALY';
  title: string;
  observation: string;
  technicalSource: string;
  reliability: EvidenceReliability;
  supportsThreat: boolean; // true = supports threat, false = counter-evidence supporting legitimacy
  weight: number; // 0 to 100
  sha256Hash: string;
  timestamp: string;
}

export interface ScoreContribution {
  evidenceId: string;
  name: string;
  contribution: number; // positive or negative
  explanation: string;
}

export interface DetailedScore {
  score: number; // 0 - 100
  label: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BENIGN' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  contributions: ScoreContribution[];
  explanation: string;
}

export interface EvidenceDecision {
  verdict: ThreatVerdict;
  threatSeverity: ThreatSeverity;
  threatConfidence: number; // 0 - 100%
  evidenceQuality: number; // 0 - 100% (reliability and completeness of proof)
  businessImpact: BusinessImpactLevel;
  why: string[]; // Strongest supporting evidence
  whyNot: string[]; // Counter-evidence (why it might not be malicious)
  whatWouldChange: string[]; // Evidence that would alter confidence/verdict
  detailedThreatScore?: DetailedScore;
  detailedReliabilityScore?: DetailedScore;
}

export interface AttackPathStep {
  stepIndex: number;
  phase: 'INFRASTRUCTURE' | 'DELIVERY' | 'AUTHENTICATION' | 'REDIRECT' | 'PAYLOAD' | 'IMPACT';
  title: string;
  description: string;
  entityValue: string;
  evidenceId: string;
  status: 'OBSERVED' | 'INFERRED' | 'UNKNOWN';
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'EMAIL' | 'SENDER' | 'DOMAIN' | 'IP' | 'ASN' | 'ATTACHMENT' | 'URL' | 'CAMPAIGN';
  risk: ThreatSeverity;
  metadata?: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence: number;
  evidenceId?: string;
}

export interface EvidenceGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Campaign {
  id: string;
  name: string;
  threatActorGroup: string;
  firstSeen: string;
  lastSeen: string;
  dnaFingerprint: string;
  targetSectors: string[];
  casesCount: number;
  indicatorsCount: number;
  commonInfrastructure: {
    asns: string[];
    domains: string[];
    ips: string[];
  };
  infrastructureRotationNotes: string;
  similarityThreshold: number;
  
  // Expanded deterministic campaign fields
  relatedCaseIds?: string[];
  sharedIndicators?: string[];
  firstObservedTimestamp?: string;
  latestObservedTimestamp?: string;
  infrastructureChanges?: string[];
  correlationReasons?: string[];
  correlationConfidence?: number;
}

export interface IntegrityBlock {
  index: number;
  timestamp: string;
  caseId: string;
  action: string;
  artifactHash: string;
  evidenceRootHash: string;
  previousBlockHash: string;
  blockHash: string;
  verified: boolean;
}

export interface EmailCase {
  id: string;
  caseNumber: string; // e.g., "CASE-2026-0819"
  createdAt: string;
  status: 'NEW' | 'UNDER_INVESTIGATION' | 'CONTAINED' | 'CLOSED';
  title: string;
  senderName: string;
  senderAddress: string;
  recipientAddress: string;
  subject: string;
  dateSent: string;
  artifactHash: string;
  rawMimePreview: string;
  bodySnippet: string;
  attackType: 'CREDENTIAL_HARVESTING' | 'BEC_PAYMENT_FRAUD' | 'MALWARE_DELIVERY' | 'BRAND_IMPERSONATION' | 'BENIGN_BUSINESS';
  tags: string[];

  // Deterministic demonstration dataset fields
  caseId: string;
  sender: string;
  recipient: string;
  timestamp: string;
  messageId: string;
  replyTo: string;
  displayName: string;
  senderDomain: string;
  domains: string[];
  ipAddresses: string[];
  relatedCaseIds: string[];
  spfResult: ProtocolStatus;
  dkimResult: ProtocolStatus;
  dmarcResult: ProtocolStatus;
  
  // Investigation pillars
  authAnalysis: ProtocolAuthAnalysis;
  relayHops: RelayHop[];
  urls: ExtractedUrl[];
  attachments: EmailAttachment[];
  evidenceList: EvidenceItem[];
  decision: EvidenceDecision;
  attackPath: AttackPathStep[];
  graph: EvidenceGraphData;
  linkedCampaignId?: string;
  
  // Impact metrics
  targetFunction: string;
  affectedUsersCount: number;
  potentialFinancialRisk?: string;
  externalIntelligence?: ThreatIntelResult[];
  mlClassification?: MLInferenceResult;
}

export interface MLInferenceResult {
  predictedClass: 'PHISHING' | 'BENIGN';
  phishingProbability: number;
  benignProbability: number;
  modelVersion: string;
  explainability: {
    reasons: string[];
    phishingSignals?: string[];
    benignSignals?: string[];
  };
  error?: string;
}

export interface ThreatIntelResult {
  provider: string;
  indicator: string;
  lookupTime: string;
  status: string; // e.g. "MALICIOUS", "SUSPICIOUS", "BENIGN", "SCAN_SUBMITTED", "RATE_LIMITED", "OFFLINE"
  confidence?: number;
  referenceUrl?: string;
  details?: string;
}

export interface ThreatHuntingIndicator {
  type: 'IP' | 'DOMAIN' | 'HASH' | 'EMAIL' | 'ASN';
  value: string;
  firstSeen: string;
  lastSeen: string;
  reputation: 'MALICIOUS' | 'SUSPICIOUS' | 'NEUTRAL' | 'KNOWN_GOOD';
  associatedCases: string[];
  associatedCampaigns: string[];
  asnInfo?: string;
  geolocCountry?: string;
}

export interface PlaybookAction {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  action: string;
  rationale: string;
  category: 'ISOLATION' | 'IDENTITY' | 'NETWORK' | 'COMMUNICATION' | 'FORENSIC';
  completed: boolean;
}

export interface InvestigationPlaybook {
  caseId: string;
  attackType: string;
  recommendedActions: PlaybookAction[];
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  citedEvidenceIds?: string[];
  timestamp: string;
}
