import crypto from 'crypto';
import { Campaign, EmailCase } from '@/src/types/index.ts';
import { SEEDED_CAMPAIGNS } from '@/server/data/seededCases.ts';
import { query, isDatabaseAvailable } from '../db.ts';

let casesGetter: (() => EmailCase[]) | null = null;

export function registerCasesGetter(fn: () => EmailCase[]) {
  casesGetter = fn;
}

interface CorrelationResult {
  score: number;
  reasons: string[];
  sharedIndicators: string[];
}

export class CampaignEngine {
  private campaigns: Campaign[] = JSON.parse(JSON.stringify(SEEDED_CAMPAIGNS));

  public async initialize(): Promise<void> {
    if (!isDatabaseAvailable()) {
      console.log('[TRACE-X DB] Database is not active. Using in-memory campaigns.');
      return;
    }

    try {
      const rows = await query('SELECT COUNT(*) FROM campaigns');
      const count = parseInt(rows[0]?.count || '0', 10);

      if (count === 0) {
        console.log('[TRACE-X DB] Seeding campaigns table...');
        for (const camp of this.campaigns) {
          await query(
            `INSERT INTO campaigns (id, name, data) VALUES ($1, $2, $3)`,
            [camp.id, camp.name, JSON.stringify(camp)]
          );
        }
      } else {
        console.log('[TRACE-X DB] Loading campaigns from PostgreSQL...');
        const loaded = await query('SELECT data FROM campaigns');
        this.campaigns = loaded.map(r => r.data as Campaign);
      }
    } catch (err) {
      console.error('[TRACE-X DB] Failed to initialize campaigns from database:', err);
    }
  }

  public getAllCampaigns(): Campaign[] {
    const cases = casesGetter ? casesGetter() : [];
    return this.correlateAndEnrichCampaigns(cases);
  }

  public getCampaignById(id: string): Campaign | undefined {
    const campaigns = this.getAllCampaigns();
    return campaigns.find(c => c.id === id);
  }

  /**
   * Performs a pairwise comparison of two cases to determine their connection profile.
   */
  public compareCases(c1: EmailCase, c2: EmailCase): CorrelationResult {
    const reasons: string[] = [];
    const sharedIndicators: string[] = [];
    let score = 0;

    // 1. Sender Domains (excluding common public ones like gmail.com)
    const d1 = c1.senderDomain?.toLowerCase() || '';
    const d2 = c2.senderDomain?.toLowerCase() || '';
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    if (d1 && d2 && d1 === d2 && !genericDomains.includes(d1)) {
      score += 35;
      reasons.push(`Identical sender domain: ${d1}`);
      sharedIndicators.push(`Sender Domain: ${d1}`);
    }

    // 2. URL Domains
    const urls1 = c1.urls || [];
    const urls2 = c2.urls || [];
    const doms1 = urls1.map(u => u.domain.toLowerCase()).filter(Boolean);
    const doms2 = urls2.map(u => u.domain.toLowerCase()).filter(Boolean);
    const commonDoms = doms1.filter(d => doms2.includes(d) && !genericDomains.includes(d));
    if (commonDoms.length > 0) {
      const uniqueCommon = Array.from(new Set(commonDoms));
      score += 40 * uniqueCommon.length;
      reasons.push(`Shared embedded URL domain(s): ${uniqueCommon.join(', ')}`);
      uniqueCommon.forEach(d => sharedIndicators.push(`Domain indicator: ${d}`));
    }

    // 3. URL Path Patterns
    const paths1 = urls1.map(u => u.path).filter(p => p && p.length > 2 && p !== '/');
    const paths2 = urls2.map(u => u.path).filter(p => p && p.length > 2 && p !== '/');
    const commonPaths = paths1.filter(p => paths2.includes(p));
    if (commonPaths.length > 0) {
      const uniquePaths = Array.from(new Set(commonPaths));
      score += 25 * uniquePaths.length;
      reasons.push(`Shared URL path signature: ${uniquePaths.join(', ')}`);
      uniquePaths.forEach(p => sharedIndicators.push(`URL Path: ${p}`));
    }

    // 4. IP Addresses (excluding private ones)
    const ips1 = c1.ipAddresses || [];
    const ips2 = c2.ipAddresses || [];
    const commonIps = ips1.filter(ip => ips2.includes(ip) && !ip.startsWith('10.') && !ip.startsWith('192.168.'));
    if (commonIps.length > 0) {
      const uniqueIps = Array.from(new Set(commonIps));
      score += 35 * uniqueIps.length;
      reasons.push(`Shared network infrastructure IP(s): ${uniqueIps.join(', ')}`);
      uniqueIps.forEach(ip => sharedIndicators.push(`IP: ${ip}`));
    }

    // 5. Attachment Hashes
    const atts1 = c1.attachments || [];
    const atts2 = c2.attachments || [];
    const hashes1 = atts1.map(a => a.sha256).filter(Boolean);
    const hashes2 = atts2.map(a => a.sha256).filter(Boolean);
    const commonHashes = hashes1.filter(h => hashes2.includes(h));
    if (commonHashes.length > 0) {
      const uniqueHashes = Array.from(new Set(commonHashes));
      score += 50 * uniqueHashes.length;
      reasons.push(`Shared cryptographic payload signature (file hash overlap)`);
      uniqueHashes.forEach(h => {
        const matchFile = atts1.find(a => a.sha256 === h)?.filename || 'Payload File';
        sharedIndicators.push(`Attachment Hash: ${h.substring(0, 8)}... (${matchFile})`);
      });
    }

    // 6. Subject Similarity (Jaccard on cleaned terms)
    const getSubjectTerms = (subj: string) => {
      return subj
        .toLowerCase()
        .replace(/^(re|fwd|urgent|critical|security|warning|alert|fw):\s*/gi, '')
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length >= 4);
    };
    const terms1 = getSubjectTerms(c1.subject || '');
    const terms2 = getSubjectTerms(c2.subject || '');
    if (terms1.length > 0 && terms2.length > 0) {
      const set2 = new Set(terms2);
      const intersection = terms1.filter(w => set2.has(w));
      const union = Array.from(new Set([...terms1, ...terms2]));
      const similarity = intersection.length / union.length;
      if (similarity >= 0.22) {
        score += 25;
        reasons.push(`High linguistic lure similarity (${Math.round(similarity * 100)}% subject term overlap)`);
        sharedIndicators.push(`Subject Motif: ${intersection.slice(0, 3).join(', ')}`);
      }
    }

    // 7. Display-Name Patterns
    const name1 = (c1.displayName || c1.senderName || '').toLowerCase();
    const name2 = (c2.displayName || c2.senderName || '').toLowerCase();
    if (name1 && name2) {
      const cleanName = (n: string) => n.replace(/[^a-z0-9]/gi, '');
      const cn1 = cleanName(name1);
      const cn2 = cleanName(name2);
      const sharesKeyword = (
        (name1.includes('security') && name2.includes('security')) ||
        (name1.includes('advisory') && name2.includes('advisory')) ||
        (name1.includes('billing') && name2.includes('billing')) ||
        (name1.includes('director') && name2.includes('director')) ||
        (name1.includes('executive') && name2.includes('executive')) ||
        (name1.includes('office') && name2.includes('office'))
      );

      if (cn1 === cn2) {
        score += 25;
        reasons.push(`Identical display name persona: "${c1.displayName}"`);
        sharedIndicators.push(`Display Name: ${c1.displayName}`);
      } else if (sharesKeyword) {
        score += 15;
        reasons.push(`Shared persona thematic pattern: "${c1.displayName}" vs "${c2.displayName}"`);
        sharedIndicators.push(`Persona Pattern: "${sharesKeyword}"`);
      }
    }

    // 8. Infrastructure Indicators (ASNs and host names)
    const asns1 = (c1.relayHops || []).map(h => h.asn).filter(Boolean) as string[];
    const asns2 = (c2.relayHops || []).map(h => h.asn).filter(Boolean) as string[];
    const commonAsns = asns1.filter(asn => asns2.includes(asn));
    if (commonAsns.length > 0) {
      const uniqueAsns = Array.from(new Set(commonAsns));
      score += 15 * uniqueAsns.length;
      reasons.push(`Shared ASNs: ${uniqueAsns.join(', ')}`);
      uniqueAsns.forEach(asn => sharedIndicators.push(`Hosting ASN: ${asn}`));
    }

    return {
      score,
      reasons,
      sharedIndicators: Array.from(new Set(sharedIndicators))
    };
  }

  /**
   * Dynamically correlates cases into campaigns and enriches campaign entities.
   */
  private correlateAndEnrichCampaigns(cases: EmailCase[]): Campaign[] {
    const updatedCampaigns: Campaign[] = this.campaigns.map(camp => {
      // Find cases belonging to this campaign
      // Either linked explicitly or via close deterministic indicators
      const campaignCases = cases.filter(c => {
        if (c.linkedCampaignId === camp.id) return true;
        
        // Dynamic matching: if the case correlates with high score to any known case in this campaign
        const alreadyLinked = cases.filter(other => other.linkedCampaignId === camp.id && other.id !== c.id);
        for (const anchor of alreadyLinked) {
          const comp = this.compareCases(c, anchor);
          if (comp.score >= 30) return true;
        }

        // Or if it matches predefined campaign infrastructure
        if (camp.id === 'CMP-2026-A1') {
          const isO365 = c.subject?.toLowerCase().includes('office') || 
                         c.subject?.toLowerCase().includes('microsoft') ||
                         c.displayName?.toLowerCase().includes('microsoft');
          if (isO365 && c.decision?.verdict === 'MALICIOUS') return true;
        } else if (camp.id === 'CMP-2026-B2') {
          const isBEC = c.subject?.toLowerCase().includes('wire') || 
                        c.subject?.toLowerCase().includes('voucher') ||
                        c.subject?.toLowerCase().includes('directive') ||
                        c.displayName?.toLowerCase().includes('shah') ||
                        c.displayName?.toLowerCase().includes('kumar');
          if (isBEC && c.decision?.verdict === 'MALICIOUS') return true;
        }

        return false;
      });

      if (campaignCases.length === 0) {
        return {
          ...camp,
          relatedCaseIds: [],
          sharedIndicators: [],
          firstObservedTimestamp: camp.firstSeen,
          latestObservedTimestamp: camp.lastSeen,
          infrastructureChanges: ['No active cases currently mapped to campaign.'],
          correlationReasons: ['No connections established.'],
          correlationConfidence: 0,
          casesCount: 0,
          indicatorsCount: 0
        };
      }

      // Collect shared indicators and reasons across all related cases in this campaign
      const allSharedIndicators: string[] = [];
      const allCorrelationReasons: string[] = [];

      // Add default seeded infrastructure indicators
      camp.commonInfrastructure.domains.forEach(d => allSharedIndicators.push(`Domain anchor: ${d}`));
      camp.commonInfrastructure.ips.forEach(ip => allSharedIndicators.push(`IP anchor: ${ip}`));
      camp.commonInfrastructure.asns.forEach(asn => allSharedIndicators.push(`ASN anchor: ${asn}`));

      // Pairwise comparison of all cases inside the campaign to find overlapping indicators
      for (let i = 0; i < campaignCases.length; i++) {
        for (let j = i + 1; j < campaignCases.length; j++) {
          const comp = this.compareCases(campaignCases[i], campaignCases[j]);
          comp.sharedIndicators.forEach(ind => allSharedIndicators.push(ind));
          comp.reasons.forEach(reason => allCorrelationReasons.push(reason));
        }
      }

      // If only one case, extract its indicators as individual targets compared to camp anchors
      if (campaignCases.length === 1) {
        const c = campaignCases[0];
        if (c.senderDomain && camp.commonInfrastructure.domains.includes(c.senderDomain)) {
          allSharedIndicators.push(`Sender Domain: ${c.senderDomain}`);
          allCorrelationReasons.push(`Sender domain matches campaign domain cluster: ${c.senderDomain}`);
        }
        c.ipAddresses.forEach(ip => {
          if (camp.commonInfrastructure.ips.includes(ip)) {
            allSharedIndicators.push(`Origin IP: ${ip}`);
            allCorrelationReasons.push(`Observable origin IP ${ip} observed in campaign history`);
          }
        });
        (c.urls || []).forEach(url => {
          if (camp.commonInfrastructure.domains.includes(url.domain)) {
            allSharedIndicators.push(`URL Domain: ${url.domain}`);
            allCorrelationReasons.push(`URL destination matches campaign domain indicators: ${url.domain}`);
          }
        });
      }

      const uniqueSharedIndicators = Array.from(new Set(allSharedIndicators));
      const uniqueCorrelationReasons = Array.from(new Set(allCorrelationReasons));

      if (uniqueCorrelationReasons.length === 0 && campaignCases.length > 0) {
        uniqueCorrelationReasons.push('Attributed via thematic and cryptographic envelope alignment with campaign DNA signatures.');
      }

      // Determine first and latest observed timestamps
      const timestamps = campaignCases.map(c => new Date(c.dateSent || c.timestamp || c.createdAt).getTime());
      const minTime = Math.min(...timestamps, new Date(camp.firstSeen).getTime());
      const maxTime = Math.max(...timestamps, new Date(camp.lastSeen).getTime());

      const firstObservedTimestamp = new Date(minTime).toISOString();
      const latestObservedTimestamp = new Date(maxTime).toISOString();

      // Track infrastructure changes chronologically
      const sortedCases = [...campaignCases].sort((a, b) => {
        return new Date(a.dateSent || a.timestamp || a.createdAt).getTime() - new Date(b.dateSent || b.timestamp || b.createdAt).getTime();
      });

      const infrastructureChanges: string[] = [];
      if (sortedCases.length > 1) {
        for (let idx = 0; idx < sortedCases.length - 1; idx++) {
          const current = sortedCases[idx];
          const next = sortedCases[idx + 1];

          if (current.senderDomain !== next.senderDomain) {
            infrastructureChanges.push(
              `Domain rotated: "${current.senderDomain}" (case ${current.caseNumber}) to "${next.senderDomain}" (case ${next.caseNumber})`
            );
          }
          const currIp = current.ipAddresses[0] || 'unknown';
          const nextIp = next.ipAddresses[0] || 'unknown';
          if (currIp !== nextIp && currIp !== 'unknown' && nextIp !== 'unknown') {
            infrastructureChanges.push(
              `Origin IP shifted: ${currIp} to ${nextIp} (Hosting provider transition)`
            );
          }
          if (current.displayName !== next.displayName) {
            infrastructureChanges.push(
              `Impersonation persona altered: "${current.displayName}" to "${next.displayName}"`
            );
          }
          const currHash = current.attachments[0]?.sha256;
          const nextHash = next.attachments[0]?.sha256;
          if (currHash !== nextHash && nextHash) {
            infrastructureChanges.push(
              `Payload payload updated: New attachment hash deployed "${next.attachments[0].filename}"`
            );
          }
        }
      }

      if (infrastructureChanges.length === 0) {
        infrastructureChanges.push('No infrastructure transitions observed. Attacker maintains static campaign delivery nodes.');
      }

      // Calculate confidence
      const correlationConfidence = Math.min(99, 65 + (uniqueSharedIndicators.length * 5) + (campaignCases.length * 5));

      return {
        ...camp,
        relatedCaseIds: campaignCases.map(c => c.id),
        sharedIndicators: uniqueSharedIndicators,
        firstObservedTimestamp,
        latestObservedTimestamp,
        infrastructureChanges,
        correlationReasons: uniqueCorrelationReasons,
        correlationConfidence,
        casesCount: campaignCases.length,
        indicatorsCount: uniqueSharedIndicators.length
      };
    });

    // Handle any dynamic, non-seeded campaigns for outstanding connected cases
    const remainingCases = cases.filter(c => c.decision?.verdict === 'MALICIOUS' && !updatedCampaigns.some(camp => (camp.relatedCaseIds || []).includes(c.id)));
    if (remainingCases.length >= 2) {
      // Find pairwise connections among remaining
      const dynamicGroups: EmailCase[][] = [];
      const visited = new Set<string>();

      for (let i = 0; i < remainingCases.length; i++) {
        const c1 = remainingCases[i];
        if (visited.has(c1.id)) continue;

        const currentGroup = [c1];
        visited.add(c1.id);

        for (let j = i + 1; j < remainingCases.length; j++) {
          const c2 = remainingCases[j];
          if (visited.has(c2.id)) continue;

          const comp = this.compareCases(c1, c2);
          if (comp.score >= 30) {
            currentGroup.push(c2);
            visited.add(c2.id);
          }
        }

        if (currentGroup.length >= 2) {
          dynamicGroups.push(currentGroup);
        }
      }

      dynamicGroups.forEach((group, gIdx) => {
        const dynId = `CMP-DYN-${gIdx + 1}`;
        const firstCase = group[0];
        
        const allShared: string[] = [];
        const allReasons: string[] = [];
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const comp = this.compareCases(group[i], group[j]);
            comp.sharedIndicators.forEach(ind => allShared.push(ind));
            comp.reasons.forEach(r => allReasons.push(r));
          }
        }

        const uniqueShared = Array.from(new Set(allShared));
        const uniqueReasons = Array.from(new Set(allReasons));
        
        const timestamps = group.map(c => new Date(c.dateSent || c.timestamp || c.createdAt).getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);

        updatedCampaigns.push({
          id: dynId,
          name: `Unclassified Dynamic Campaign Cluster (${dynId})`,
          threatActorGroup: 'Ad-hoc Correlation Group',
          firstSeen: new Date(minTime).toISOString(),
          lastSeen: new Date(maxTime).toISOString(),
          dnaFingerprint: `DNA:DYNAMIC-CLUSTER-${dynId}`,
          targetSectors: Array.from(new Set(group.map(c => c.targetFunction).filter(Boolean))),
          casesCount: group.length,
          indicatorsCount: uniqueShared.length,
          commonInfrastructure: {
            asns: Array.from(new Set(group.flatMap(c => (c.relayHops || []).map(h => h.asn).filter(Boolean) as string[]))),
            domains: Array.from(new Set(group.flatMap(c => c.domains).filter(Boolean))),
            ips: Array.from(new Set(group.flatMap(c => c.ipAddresses).filter(Boolean))),
          },
          infrastructureRotationNotes: 'Newly discovered dynamic cluster correlating multiple active threat cases.',
          similarityThreshold: 30,
          relatedCaseIds: group.map(c => c.id),
          sharedIndicators: uniqueShared,
          firstObservedTimestamp: new Date(minTime).toISOString(),
          latestObservedTimestamp: new Date(maxTime).toISOString(),
          infrastructureChanges: ['Dynamic cluster nodes mapped without chronological baseline notes.'],
          correlationReasons: uniqueReasons,
          correlationConfidence: Math.min(95, 50 + uniqueShared.length * 10)
        });
      });
    }

    return updatedCampaigns;
  }

  /**
   * Keep original signature working for ingestion pipeline fallback.
   */
  public correlateCaseToCampaign(emailCase: Partial<EmailCase>): {
    matchedCampaign?: Campaign;
    confidenceScore: number;
    matchReasons: string[];
  } {
    let bestMatch: Campaign | undefined;
    let highestScore = 0;
    let bestReasons: string[] = [];

    const senderDomain = emailCase.senderAddress ? emailCase.senderAddress.split('@')[1]?.toLowerCase() : '';
    const originIps = emailCase.relayHops ? emailCase.relayHops.map(h => h.ip) : [];
    const originAsns = emailCase.relayHops ? emailCase.relayHops.map(h => h.asn).filter(Boolean) as string[] : [];

    for (const camp of this.campaigns) {
      let score = 0;
      const reasons: string[] = [];

      // Check common domains
      if (senderDomain && camp.commonInfrastructure.domains.some(d => senderDomain.includes(d) || d.includes(senderDomain))) {
        score += 45;
        reasons.push(`Sender domain matches campaign domain cluster: ${senderDomain}`);
      }

      // Check common IPs
      const matchingIp = originIps.find(ip => camp.commonInfrastructure.ips.includes(ip));
      if (matchingIp) {
        score += 40;
        reasons.push(`Observable origin IP ${matchingIp} observed in campaign history`);
      }

      // Check ASNs
      const matchingAsn = originAsns.find(asn => camp.commonInfrastructure.asns.some(ca => ca.includes(asn)));
      if (matchingAsn) {
        score += 25;
        reasons.push(`Shared hosting autonomous system ${matchingAsn}`);
      }

      // Check Subject/Lure keywords
      if (emailCase.subject && camp.dnaFingerprint.toLowerCase().includes('wire') && emailCase.subject.toLowerCase().includes('wire')) {
        score += 20;
        reasons.push('Wire transfer lure phrasing aligns with campaign DNA');
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = camp;
        bestReasons = reasons;
      }
    }

    if (highestScore >= 30 && bestMatch) {
      return {
        matchedCampaign: bestMatch,
        confidenceScore: Math.min(99, highestScore),
        matchReasons: bestReasons,
      };
    }

    return {
      confidenceScore: 0,
      matchReasons: ['No statistically significant campaign correlation detected.'],
    };
  }
}

export const campaignEngine = new CampaignEngine();
