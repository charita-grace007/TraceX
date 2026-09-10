import React from 'react';
import {
  Network,
  Dna,
  Server,
  Globe,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Layers,
  FileSpreadsheet,
  Shuffle,
  GitCompare,
  CheckCircle2,
} from 'lucide-react';
import { Campaign, EmailCase } from '@/src/types/index.ts';
import { VerdictBadge, SeverityBadge, ImpactBadge } from '@/src/components/common/Badge.tsx';

interface CampaignCorrelationPanelProps {
  emailCase: EmailCase;
  cases: EmailCase[];
  campaigns: Campaign[];
  onSelectCase: (c: EmailCase) => void;
}

export const CampaignCorrelationPanel: React.FC<CampaignCorrelationPanelProps> = ({
  emailCase,
  cases,
  campaigns,
  onSelectCase,
}) => {
  // Find the campaign connected to this case
  const campaign = campaigns.find((c) => c.id === emailCase.linkedCampaignId);

  // Filter cases belonging to this campaign
  const relatedCases = campaign
    ? cases.filter((c) => c.linkedCampaignId === campaign.id || (campaign.relatedCaseIds || []).includes(c.id))
    : [];

  if (!campaign) {
    return (
      <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-purple-100/70 pb-4">
          <Network className="h-5 w-5 text-purple-700" />
          <h3 className="font-mono text-sm font-bold text-[#2E1C4D] uppercase tracking-wider">
            Campaign Correlation Analysis
          </h3>
        </div>

        <div className="rounded-2xl border border-purple-100/80 bg-purple-50/30 p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
          <ShieldAlert className="h-10 w-10 text-purple-400 animate-pulse" />
          <h4 className="font-mono text-xs font-bold text-[#2E1C4D] uppercase">
            Isolated Incident Detector
          </h4>
          <p className="text-xs text-[#6A5A82] max-w-md leading-relaxed">
            This email does not correlate with any known active threat campaign in our tenant ledger. It is classified as an independent or isolated incident. No fast-flux, bulletproof hosting, or multi-stage email clusters were observed.
          </p>
        </div>

        {campaigns.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] font-bold text-[#8A79A2] uppercase tracking-wider">
              Other Tenant-Wide Threat Campaigns:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-purple-100/80 bg-[#fafaff] p-4.5 space-y-2 hover:border-purple-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="font-bold text-amber-700">{c.id}</span>
                    <span className="text-[#8A79A2]">{c.casesCount} linked cases</span>
                  </div>
                  <h5 className="text-xs font-bold text-[#2E1C4D]">{c.name}</h5>
                  <p className="text-[10px] text-[#6A5A82] line-clamp-2 leading-relaxed">
                    {c.infrastructureRotationNotes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Get shared indicators of various types
  const sharedDomains = (campaign.sharedIndicators || []).filter((ind) => ind.toLowerCase().includes('domain'));
  const sharedIps = (campaign.sharedIndicators || []).filter((ind) => ind.toLowerCase().includes('ip') || ind.toLowerCase().includes('hosting'));
  const sharedUrls = (campaign.sharedIndicators || []).filter((ind) => ind.toLowerCase().includes('url') || ind.toLowerCase().includes('path'));
  const sharedAttachments = (campaign.sharedIndicators || []).filter((ind) => ind.toLowerCase().includes('attachment') || ind.toLowerCase().includes('hash'));

  return (
    <div className="space-y-6">
      {/* Campaign Metadata Header Card */}
      <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/70 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-50 px-3 py-0.5 font-mono text-[10px] font-bold text-amber-800 border border-amber-200 uppercase shadow-xs">
                ATTRIBUTED CAMPAIGN
              </span>
              <span className="text-[#A090B5] font-mono text-xs">•</span>
              <span className="font-mono text-xs text-[#8A79A2]">ID: {campaign.id}</span>
            </div>
            <h2 className="text-base font-bold font-mono text-[#2E1C4D] flex items-center gap-2">
              <Dna className="h-5 w-5 text-purple-700" />
              {campaign.name}
            </h2>
          </div>

          <div className="flex flex-col items-end font-mono">
            <div className="text-[10px] text-[#8A79A2] uppercase">Correlation Confidence:</div>
            <div className="text-lg font-bold text-purple-800">{campaign.correlationConfidence || 95}%</div>
          </div>
        </div>

        {/* Campaign Core Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="rounded-2xl bg-purple-50/40 border border-purple-100/80 p-3.5 shadow-2xs">
            <div className="text-[#8A79A2] text-[10px] uppercase font-bold">Threat Actor Group:</div>
            <div className="text-[#2E1C4D] mt-1 font-semibold truncate">{campaign.threatActorGroup}</div>
          </div>
          <div className="rounded-2xl bg-purple-50/40 border border-purple-100/80 p-3.5 shadow-2xs">
            <div className="text-[#8A79A2] text-[10px] uppercase font-bold">Targeted Sectors:</div>
            <div className="text-[#2E1C4D] mt-1 font-semibold truncate" title={campaign.targetSectors.join(', ')}>
              {campaign.targetSectors.join(', ')}
            </div>
          </div>
          <div className="rounded-2xl bg-purple-50/40 border border-purple-100/80 p-3.5 shadow-2xs">
            <div className="text-[#8A79A2] text-[10px] uppercase font-bold">First Observed:</div>
            <div className="text-[#2E1C4D] mt-1 font-semibold">
              {new Date(campaign.firstObservedTimestamp || campaign.firstSeen).toLocaleDateString()}
            </div>
          </div>
          <div className="rounded-2xl bg-purple-50/40 border border-purple-100/80 p-3.5 shadow-2xs">
            <div className="text-[#8A79A2] text-[10px] uppercase font-bold">Latest Activity:</div>
            <div className="text-[#2E1C4D] mt-1 font-semibold">
              {new Date(campaign.latestObservedTimestamp || campaign.lastSeen).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* DNA Fingerprint Box */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1 shadow-2xs">
          <div className="text-[10px] font-mono font-bold uppercase text-amber-800">
            Campaign DNS & Artifact DNA Fingerprint:
          </div>
          <div className="font-mono text-[11px] text-amber-950 break-all leading-relaxed">
            {campaign.dnaFingerprint}
          </div>
        </div>
      </div>

      {/* 2-Column Details Panel: Reasons & Related Cases / Infrastructure Changes & Shared Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Evidence & Connection Analysis */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Correlation Reasons: Explain WHY they are connected */}
          <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D] flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-purple-700" />
              Deterministic Attribution Evidence
            </h3>
            
            <p className="text-xs text-[#6A5A82] leading-relaxed">
              Below are the deterministic link-analysis validations and correlations establishing identity overlap between the current active case and past incidents inside the cluster:
            </p>

            <div className="space-y-2.5">
              {(campaign.correlationReasons || []).map((reason, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-purple-50/40 border border-purple-100/80 p-3.5 text-xs font-mono text-[#5E4E77] flex items-start gap-2.5 shadow-2xs"
                >
                  <CheckCircle2 className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Related Emails (Incidents List) */}
          <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D] flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600" />
              Related Phishing & Threat Emails ({relatedCases.length})
            </h3>

            <p className="text-xs text-[#6A5A82] leading-relaxed">
              The following emails are linked by the deterministic campaign engine. Select any of them to re-focus the forensic workspace:
            </p>

            <div className="space-y-3">
              {relatedCases.map((c) => {
                const isActive = c.id === emailCase.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all cursor-pointer shadow-2xs ${
                      isActive
                        ? 'border-purple-300 bg-purple-50/60 shadow-xs ring-1 ring-purple-200'
                        : 'border-purple-100/80 bg-[#fafaff] hover:border-purple-200 hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-800">{c.caseNumber}</span>
                        <span className="text-[#A090B5] text-[10px]">•</span>
                        <span className="text-[10px] font-mono text-[#8A79A2]">
                          {new Date(c.dateSent || c.timestamp).toLocaleDateString()}
                        </span>
                        {isActive && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-900 border border-purple-200">
                            ACTIVE FOCUS
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-[#2E1C4D] truncate pr-4">{c.subject}</h4>
                      <div className="font-mono text-[10px] text-[#6A5A82] truncate">
                        Sender: <strong className="text-[#2E1C4D]">{c.senderAddress}</strong> → Target: <strong className="text-[#2E1C4D]">{c.recipientAddress}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                        <VerdictBadge verdict={c.decision.verdict} />
                        <SeverityBadge severity={c.decision.threatSeverity} />
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'text-purple-700' : 'text-[#8A79A2] group-hover:translate-x-1'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Infrastructure Rotation Timeline & Indicators */}
        <div className="space-y-6">
          
          {/* Infrastructure Evolution Panel */}
          <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D] flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-rose-500" />
              Infrastructure Evolution
            </h3>
            
            <p className="text-xs text-[#6A5A82] leading-relaxed pb-2 border-b border-purple-100/70">
              Chronological ledger tracking how the threat actor rotated domain, IP and payload components to evade filter detection:
            </p>

            <div className="relative border-l-2 border-purple-100 pl-4 ml-2 space-y-5 py-1">
              {(campaign.infrastructureChanges || []).map((change, idx) => (
                <div key={idx} className="relative space-y-1">
                  {/* Timeline point */}
                  <span className="absolute -left-[23px] top-1 flex h-3 w-3 rounded-full bg-rose-500 border-2 border-white shadow-2xs"></span>
                  <div className="font-mono text-[11px] text-[#5E4E77] leading-relaxed">
                    {change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Indicators Breakdown */}
          <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D] flex items-center gap-2">
              <Server className="h-4 w-4 text-amber-600" />
              Shared Infrastructure Indicators
            </h3>

            <div className="space-y-4">
              {/* Shared Domains */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8A79A2] uppercase">
                  <Globe className="h-3.5 w-3.5 text-purple-700" />
                  <span>Shared Domains ({sharedDomains.length})</span>
                </div>
                {sharedDomains.length === 0 ? (
                  <div className="text-[10px] font-mono text-[#A090B5] italic pl-5">No shared domains observed.</div>
                ) : (
                  <div className="space-y-1 pl-5">
                    {sharedDomains.map((d, i) => (
                      <div key={i} className="font-mono text-xs text-[#2E1C4D] break-all bg-purple-50/40 px-2.5 py-1.5 rounded-xl border border-purple-100/80 shadow-2xs">
                        {d.replace(/^(domain indicator|sender domain):\s*/gi, '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared IPs */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8A79A2] uppercase">
                  <Server className="h-3.5 w-3.5 text-rose-500" />
                  <span>Shared IPs & Hosts ({sharedIps.length})</span>
                </div>
                {sharedIps.length === 0 ? (
                  <div className="text-[10px] font-mono text-[#A090B5] italic pl-5">No shared IP relays observed.</div>
                ) : (
                  <div className="space-y-1 pl-5">
                    {sharedIps.map((ip, i) => (
                      <div key={i} className="font-mono text-xs text-[#2E1C4D] break-all bg-purple-50/40 px-2.5 py-1.5 rounded-xl border border-purple-100/80 shadow-2xs">
                        {ip.replace(/^(ip|hosting asn|origin ip):\s*/gi, '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared URLs & Paths */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8A79A2] uppercase">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-purple-700" />
                  <span>Shared URL Paths ({sharedUrls.length})</span>
                </div>
                {sharedUrls.length === 0 ? (
                  <div className="text-[10px] font-mono text-[#A090B5] italic pl-5">No shared URL path signatures.</div>
                ) : (
                  <div className="space-y-1 pl-5">
                    {sharedUrls.map((p, i) => (
                      <div key={i} className="font-mono text-xs text-[#2E1C4D] break-all bg-purple-50/40 px-2.5 py-1.5 rounded-xl border border-purple-100/80 shadow-2xs">
                        {p.replace(/^(url path):\s*/gi, '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared Attachments & Payloads */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8A79A2] uppercase">
                  <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Shared Attachments ({sharedAttachments.length})</span>
                </div>
                {sharedAttachments.length === 0 ? (
                  <div className="text-[10px] font-mono text-[#A090B5] italic pl-5">No shared file hashes.</div>
                ) : (
                  <div className="space-y-1 pl-5">
                    {sharedAttachments.map((att, i) => (
                      <div key={i} className="font-mono text-xs text-[#2E1C4D] break-all bg-purple-50/40 px-2.5 py-1.5 rounded-xl border border-purple-100/80 shadow-2xs">
                        {att.replace(/^(attachment hash):\s*/gi, '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
