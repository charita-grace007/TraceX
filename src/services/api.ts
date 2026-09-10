import { EmailCase, Campaign, ThreatHuntingIndicator, IntegrityBlock } from '@/src/types/index.ts';

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchCases(): Promise<EmailCase[]> {
  const res = await fetch('/api/cases');
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch('/api/campaigns');
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  return res.json();
}

export async function fetchIocs(): Promise<ThreatHuntingIndicator[]> {
  const res = await fetch('/api/hunting/iocs');
  if (!res.ok) throw new Error('Failed to fetch IOCs');
  return res.json();
}

export async function fetchLedger(): Promise<{ blocks: IntegrityBlock[]; status: any }> {
  const res = await fetch('/api/ledger');
  if (!res.ok) throw new Error('Failed to fetch ledger');
  return res.json();
}

export async function verifyLedgerChain(): Promise<{ isValid: boolean; message: string }> {
  const res = await fetch('/api/ledger/verify', { method: 'POST' });
  if (!res.ok) throw new Error('Verification request failed');
  return res.json();
}

export async function ingestEmailArtifact(rawEml: string, title?: string): Promise<EmailCase> {
  const res = await fetch('/api/cases/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawEml, title }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ingest failed');
  }
  return res.json();
}

export async function askCopilot(
  caseId: string,
  question: string
): Promise<{
  answer: string;
  citedEvidenceIds: string[];
  source: 'GEMINI_AI' | 'DETERMINISTIC_COPILOT';
}> {
  const res = await fetch('/api/ai/investigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, question }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Copilot query failed');
  }
  return res.json();
}
