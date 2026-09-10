import crypto from 'crypto';
import { EmailCase } from '@/src/types/index.ts';
import { parseRawEmailHeaders } from '../parsing/index.ts';
import { reconstructRelayHops, evaluateProtocolAuth, generateEvidenceList, analyzeUrlsAndDomains } from '../forensics/index.ts';
import { calculateScores } from '../scoring/index.ts';
import { campaignEngine, registerCasesGetter } from '../campaign/index.ts';
import { buildEvidenceGraph } from '../graph/index.ts';
import { evidenceLedger } from '../integrity/index.ts';
import { SEEDED_CASES } from '@/server/data/seededCases.ts';
import { query, isDatabaseAvailable } from '../db.ts';

// Helper functions for safe PostgreSQL JSONB and parameters persistence (preventing Error 22P05)
function isBinaryString(val: string): boolean {
  if (val.includes('\x00')) return true;
  if (val.startsWith('PK\x03\x04')) return true;
  let nonPrintable = 0;
  for (let i = 0; i < Math.min(val.length, 100); i++) {
    const code = val.charCodeAt(i);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintable++;
    }
  }
  return nonPrintable > 5;
}

function sanitizeValueForPostgres(val: any, isPreviewField: boolean = false): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    if (isPreviewField && isBinaryString(val)) {
      return `[BASE64_MIME_PREVIEW]: ` + Buffer.from(val, 'binary').toString('base64');
    }
    // Clean raw null characters to prevent PG 22P05 error on JSONB, and standard text binding errors
    return val.replace(/\x00/g, '[NUL]');
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeValueForPostgres(item));
  }
  if (typeof val === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(val)) {
      cleaned[key] = sanitizeValueForPostgres(val[key], key === 'rawMimePreview');
    }
    return cleaned;
  }
  return val;
}

function prepareCaseForDatabase(c: EmailCase): EmailCase {
  return sanitizeValueForPostgres(c) as EmailCase;
}

function restoreCaseFromDatabase(c: EmailCase): EmailCase {
  if (c && c.rawMimePreview && c.rawMimePreview.startsWith('[BASE64_MIME_PREVIEW]: ')) {
    try {
      const base64Part = c.rawMimePreview.substring('[BASE64_MIME_PREVIEW]: '.length);
      c.rawMimePreview = Buffer.from(base64Part, 'base64').toString('binary');
    } catch (err) {
      console.error('[TRACE-X DB] Failed to restore base64 rawMimePreview:', err);
    }
  }
  return c;
}

function sanitizePlainString(str: string): string {
  if (!str) return '';
  return str.replace(/\x00/g, '[NUL]');
}

class CaseStore {
  private cases: EmailCase[] = SEEDED_CASES.map(c => {
    const rawUrls = c.urls ? c.urls.map(u => typeof u === 'string' ? u : u.originalUrl) : [];
    const { analyzedUrls, evidenceItems } = analyzeUrlsAndDomains(rawUrls, c.displayName, c.sender);

    const mockParsed = {
      headers: {},
      from: c.sender,
      fromDisplayName: c.displayName,
      fromEmail: c.sender,
      replyTo: c.replyTo || c.sender,
      to: c.recipient,
      subject: c.subject,
      date: c.timestamp,
      messageId: c.messageId || '',
      receivedHeaders: [],
      authResultsHeader: c.authAnalysis?.spf?.rawHeader || `spf=${c.spfResult?.toLowerCase()}; dkim=${c.dkimResult?.toLowerCase()}; dmarc=${c.dmarcResult?.toLowerCase()}`,
      bodyText: c.bodySnippet,
      bodyHtml: '',
      urls: rawUrls,
      attachments: []
    };
    const enrichedAuth = evaluateProtocolAuth(mockParsed);

    const originalEvidence = c.evidenceList || [];
    const uniqueEvidence = [...originalEvidence];
    evidenceItems.forEach(ev => {
      if (!uniqueEvidence.some(ue => ue.id === ev.id)) {
        uniqueEvidence.push(ev);
      }
    });

    const fullAuth = {
      ...c.authAnalysis,
      ...enrichedAuth,
      spf: { ...c.authAnalysis?.spf, ...enrichedAuth.spf },
      dkim: { ...c.authAnalysis?.dkim, ...enrichedAuth.dkim },
      dmarc: { ...c.authAnalysis?.dmarc, ...enrichedAuth.dmarc },
    };

    const decision = calculateScores(uniqueEvidence, fullAuth, c.recipient);

    return {
      ...c,
      urls: analyzedUrls,
      evidenceList: uniqueEvidence,
      decision,
      authAnalysis: fullAuth
    };
  });

  public async initialize(): Promise<void> {
    if (!isDatabaseAvailable()) {
      console.log('[TRACE-X DB] Database is not active. Using in-memory case store.');
      return;
    }

    try {
      const rows = await query('SELECT COUNT(*) FROM cases');
      const count = parseInt(rows[0]?.count || '0', 10);

      if (count === 0) {
        console.log('[TRACE-X DB] Seeding cases table with mapped seeded cases...');
        for (const c of this.cases) {
          const dbCase = prepareCaseForDatabase(c);
          await query(
            `INSERT INTO cases (id, case_number, created_at, title, status, sender_address, recipient_address, subject, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              sanitizePlainString(c.id),
              sanitizePlainString(c.caseNumber),
              sanitizePlainString(c.createdAt),
              sanitizePlainString(c.title),
              sanitizePlainString(c.status),
              sanitizePlainString(c.senderAddress),
              sanitizePlainString(c.recipientAddress),
              sanitizePlainString(c.subject),
              JSON.stringify(dbCase)
            ]
          );
        }
      } else {
        console.log('[TRACE-X DB] Loading cases from PostgreSQL...');
        const loaded = await query('SELECT data FROM cases ORDER BY created_at DESC');
        this.cases = loaded.map(r => restoreCaseFromDatabase(r.data as EmailCase));
      }
    } catch (err) {
      console.error('[TRACE-X DB] Failed to initialize cases from database:', err);
    }
  }

  public getAllCases(): EmailCase[] {
    return this.cases;
  }

  public getCaseById(id: string): EmailCase | undefined {
    return this.cases.find(c => c.id === id || c.caseNumber === id);
  }

  public async updateCase(updated: EmailCase): Promise<void> {
    const idx = this.cases.findIndex(c => c.id === updated.id);
    if (idx !== -1) {
      this.cases[idx] = updated;
    }
    if (isDatabaseAvailable()) {
      try {
        const dbCase = prepareCaseForDatabase(updated);
        await query(
          `UPDATE cases SET status = $1, data = $2 WHERE id = $3`,
          [
            sanitizePlainString(updated.status),
            JSON.stringify(dbCase),
            sanitizePlainString(updated.id)
          ]
        );
        console.log(`[TRACE-X DB] Updated case data for ${updated.id} in PostgreSQL.`);
      } catch (err) {
        console.error('[TRACE-X DB] Failed to update case data in PostgreSQL:', err);
      }
    }
  }

  public async ingestRawEmail(rawEml: string, title?: string): Promise<EmailCase> {
    const artifactHash = crypto.createHash('sha256').update(rawEml).digest('hex');
    const parsed = await parseRawEmailHeaders(rawEml);
    const relayHops = reconstructRelayHops(parsed.receivedHeaders);
    const authAnalysis = evaluateProtocolAuth(parsed);
    
    // Map extracted URLs using advanced deterministic analyzer
    const { analyzedUrls, evidenceItems } = analyzeUrlsAndDomains(parsed.urls, parsed.fromDisplayName, parsed.fromEmail);

    // Map real MIME attachments extracted by mailparser
    const attachments = parsed.attachments.map((att, idx) => ({
      id: `att-ingest-${idx}-${Date.now().toString(36)}`,
      filename: att.filename,
      sizeBytes: att.sizeBytes,
      mimeType: att.mimeType,
      sha256: att.sha256,
      isExecutableOrMacro: att.filename.endsWith('.docm') || att.filename.endsWith('.exe') || att.filename.endsWith('.iso') || att.filename.endsWith('.vbs') || att.filename.endsWith('.scr'),
      threatVerdict: (att.filename.endsWith('.docm') || att.filename.endsWith('.exe')) ? 'MALICIOUS' as const : 'SUSPICIOUS' as const,
    }));

    const baseEvidenceList = generateEvidenceList(parsed, authAnalysis, relayHops, analyzedUrls, attachments);
    const evidenceList = [...baseEvidenceList, ...evidenceItems];
    const decision = calculateScores(evidenceList, authAnalysis, parsed.to);

    const caseId = `case-${Date.now().toString(36)}`;
    const caseNumber = `CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();

    const attackType = authAnalysis.displaySpoofing.isSpoofed
      ? (parsed.replyTo !== parsed.fromEmail ? 'BEC_PAYMENT_FRAUD' : 'BRAND_IMPERSONATION')
      : (attachments.some(a => a.isExecutableOrMacro) ? 'MALWARE_DELIVERY' : 'CREDENTIAL_HARVESTING');

    const emailCase: EmailCase = {
      id: caseId,
      caseNumber,
      createdAt,
      status: 'NEW',
      title: title || `Threat Investigation: ${parsed.subject.substring(0, 48)}`,
      senderName: parsed.fromDisplayName || parsed.fromEmail,
      senderAddress: parsed.fromEmail,
      recipientAddress: parsed.to,
      subject: parsed.subject,
      dateSent: parsed.date,
      artifactHash,
      rawMimePreview: rawEml.substring(0, 1200),
      bodySnippet: parsed.bodyText.substring(0, 300) || 'Plaintext message extracted from ingested envelope.',
      attackType,
      tags: ['Ingested-EML', attackType, decision.verdict],

      // Deterministic demonstration dataset fields
      caseId: caseId,
      sender: parsed.fromEmail,
      recipient: parsed.to,
      timestamp: parsed.date,
      messageId: parsed.messageId || `<${caseId}@trace-x.local>`,
      replyTo: parsed.replyTo,
      displayName: parsed.fromDisplayName || parsed.fromEmail,
      senderDomain: parsed.fromEmail.split('@')[1] || 'unknown-domain.com',
      domains: Array.from(new Set([
        parsed.fromEmail.split('@')[1],
        ...analyzedUrls.map(u => u.domain)
      ].filter(Boolean))),
      ipAddresses: Array.from(new Set([
        authAnalysis.spf.clientIp,
        ...relayHops.map(h => h.ip)
      ].filter(Boolean))),
      relatedCaseIds: [],
      spfResult: authAnalysis.spf.status,
      dkimResult: authAnalysis.dkim.status,
      dmarcResult: authAnalysis.dmarc.status,
      
      authAnalysis,
      relayHops,
      urls: analyzedUrls,
      attachments,
      evidenceList,
      decision,
      attackPath: [
        {
          stepIndex: 1,
          phase: 'INFRASTRUCTURE',
          title: 'Sender Host Identification',
          description: `Originating IP ${relayHops[0]?.ip || 'Unknown'} detected in earliest observable hop.`,
          entityValue: relayHops[0]?.ip || 'Unknown',
          evidenceId: evidenceList[0]?.id || 'EV-01',
          status: 'OBSERVED',
        },
        {
          stepIndex: 2,
          phase: 'DELIVERY',
          title: 'Mailbox Delivery Event',
          description: `Delivered to recipient address ${parsed.to}`,
          entityValue: parsed.to,
          evidenceId: 'EV-01',
          status: 'OBSERVED',
        },
      ],
      graph: { nodes: [], edges: [] }, // Populated next
      targetFunction: 'Assigned SOC Triage Queue',
      affectedUsersCount: 1,
      potentialFinancialRisk: decision.businessImpact === 'CRITICAL' ? 'High Impact' : 'Standard Priority',
    };

    // Correlate with campaign
    const correlation = campaignEngine.correlateCaseToCampaign(emailCase);
    if (correlation.matchedCampaign) {
      emailCase.linkedCampaignId = correlation.matchedCampaign.id;
      emailCase.evidenceList.push({
        id: `EV-0${emailCase.evidenceList.length + 1}`,
        type: 'CAMPAIGN_MATCH',
        title: `Campaign Correlation: ${correlation.matchedCampaign.name}`,
        observation: correlation.matchReasons.join('. '),
        technicalSource: 'Campaign DNA Fingerprint Engine',
        reliability: 'MEDIUM',
        supportsThreat: true,
        weight: 80,
        sha256Hash: crypto.createHash('sha256').update(correlation.matchedCampaign.id).digest('hex'),
        timestamp: new Date().toISOString(),
      });
    }

    // Build evidence graph
    emailCase.graph = buildEvidenceGraph(emailCase);

    // Seal evidence into tamper-evident ledger
    const evidenceRoot = crypto.createHash('sha256').update(JSON.stringify(evidenceList)).digest('hex');
    evidenceLedger.recordEvidenceBlock(caseNumber, 'CASE_INGESTION_SEALED', artifactHash, evidenceRoot);

    this.cases.unshift(emailCase);

    if (isDatabaseAvailable()) {
      try {
        const dbCase = prepareCaseForDatabase(emailCase);
        await query(
          `INSERT INTO cases (id, case_number, created_at, title, status, sender_address, recipient_address, subject, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sanitizePlainString(emailCase.id),
            sanitizePlainString(emailCase.caseNumber),
            sanitizePlainString(emailCase.createdAt),
            sanitizePlainString(emailCase.title),
            sanitizePlainString(emailCase.status),
            sanitizePlainString(emailCase.senderAddress),
            sanitizePlainString(emailCase.recipientAddress),
            sanitizePlainString(emailCase.subject),
            JSON.stringify(dbCase)
          ]
        );
        console.log(`[TRACE-X DB] Saved ingested case ${emailCase.id} to PostgreSQL database.`);
      } catch (err) {
        console.error('[TRACE-X DB] Failed to save ingested case to PostgreSQL:', err);
      }
    }

    return emailCase;
  }
}

export const caseStore = new CaseStore();

registerCasesGetter(() => caseStore.getAllCases());
