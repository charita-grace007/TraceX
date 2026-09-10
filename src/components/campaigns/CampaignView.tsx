import React, { useState } from 'react';
import {
  Network,
  Dna,
  Server,
  Globe,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Campaign, EmailCase } from '@/src/types/index.ts';

interface CampaignViewProps {
  campaigns: Campaign[];
  cases: EmailCase[];
  onSelectCase: (c: EmailCase) => void;
  onNavigateTab: (tab: any) => void;
}

export const CampaignView: React.FC<CampaignViewProps> = ({
  campaigns,
  cases,
  onSelectCase,
  onNavigateTab,
}) => {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign>(campaigns[0] || null);

  const linkedCases = selectedCampaign
    ? cases.filter((c) => c.linkedCampaignId === selectedCampaign.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-purple-100/70 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full bg-purple-50 px-3 py-0.5 font-mono text-[10px] font-bold text-purple-800 border border-purple-200 uppercase shadow-xs">
              Campaign Correlation Engine
            </span>
            <span className="font-mono text-xs text-[#8A79A2]">SIH26106 DNA FINGERPRINTING</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#2E1C4D]">
            Threat Campaign Clustering & Infrastructure Evolution
          </h1>
          <p className="text-xs text-[#6A5A82] mt-1">
            Correlates discrete phishing and BEC attacks across shared infrastructure DNA, Autonomous Systems, and lure semantics.
          </p>
        </div>
      </div>

      {/* Main Split: Campaign Selector on Left, Detail & Linked Cases on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List (1 col) */}
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#6A5A82]">
            Identified Threat Clusters ({campaigns.length})
          </span>

          {campaigns.map((camp) => {
            const isSelected = selectedCampaign?.id === camp.id;
            return (
              <div
                key={camp.id}
                onClick={() => setSelectedCampaign(camp)}
                className={`cursor-pointer rounded-2xl border p-4.5 transition-all shadow-xs ${
                  isSelected
                    ? 'border-purple-300 bg-purple-50/60 shadow-sm'
                    : 'border-purple-100/70 bg-white hover:border-purple-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-800">
                    {camp.id}
                  </span>
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#6A5A82] border border-purple-100">
                    {camp.casesCount} Linked Attacks
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-bold text-[#2E1C4D]">
                  {camp.name}
                </h3>

                <div className="mt-2 text-xs font-mono text-[#6A5A82] truncate">
                  DNA: <span className="text-purple-900 font-semibold">{camp.dnaFingerprint}</span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-purple-100/70 pt-2.5 text-[11px] font-mono text-[#8A79A2]">
                  <span>First: {new Date(camp.firstObserved).toLocaleDateString()}</span>
                  <span className="text-amber-800 font-bold">Active Cluster</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Campaign Deep Dive (2 cols) */}
        {selectedCampaign && (
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Summary Card */}
            <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-100/70 pb-3.5">
                <div className="flex items-center gap-2">
                  <Dna className="h-5 w-5 text-purple-700" />
                  <h2 className="text-base font-extrabold text-[#2E1C4D]">
                    {selectedCampaign.name} ({selectedCampaign.id})
                  </h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-800 border border-amber-200 shadow-xs">
                  SIMILARITY THRESHOLD: 85%
                </span>
              </div>

              {/* DNA Fingerprint Box */}
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 space-y-1.5 shadow-xs">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-900">
                  Cryptographic DNA Fingerprint Pattern:
                </span>
                <div className="font-mono text-xs text-amber-950 font-semibold break-all">
                  {selectedCampaign.dnaFingerprint}
                </div>
              </div>

              {/* Infrastructure Evolution Notes */}
              <div>
                <span className="text-xs font-mono font-bold uppercase text-[#6A5A82]">
                  Observed Infrastructure Rotation & Fast-Flux TTPs:
                </span>
                <p className="mt-1.5 text-xs text-[#5E4E77] leading-relaxed bg-purple-50/20 p-4 rounded-2xl border border-purple-100/70 shadow-xs">
                  {selectedCampaign.infrastructureRotationNotes}
                </p>
              </div>

              {/* Common Infrastructure Indicators Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {/* Domains */}
                <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-3.5 space-y-2 shadow-xs">
                  <span className="text-[10px] text-[#6A5A82] uppercase font-bold flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-purple-700" />
                    Domains ({selectedCampaign.commonInfrastructure.domains.length})
                  </span>
                  <div className="space-y-1">
                    {selectedCampaign.commonInfrastructure.domains.map((d, i) => (
                      <div key={i} className="text-[#2E1C4D] font-semibold text-[11px] truncate bg-white border border-purple-100/80 px-2.5 py-1 rounded-xl shadow-2xs">
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* IPs */}
                <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-3.5 space-y-2 shadow-xs">
                  <span className="text-[10px] text-[#6A5A82] uppercase font-bold flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-rose-600" />
                    Relay IPs ({selectedCampaign.commonInfrastructure.ips.length})
                  </span>
                  <div className="space-y-1">
                    {selectedCampaign.commonInfrastructure.ips.map((ip, i) => (
                      <div key={i} className="text-[#2E1C4D] font-semibold text-[11px] truncate bg-white border border-purple-100/80 px-2.5 py-1 rounded-xl shadow-2xs">
                        {ip}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ASNs */}
                <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-3.5 space-y-2 shadow-xs">
                  <span className="text-[10px] text-[#6A5A82] uppercase font-bold flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-indigo-600" />
                    ASNs ({selectedCampaign.commonInfrastructure.asns.length})
                  </span>
                  <div className="space-y-1">
                    {selectedCampaign.commonInfrastructure.asns.map((asn, i) => (
                      <div key={i} className="text-[#2E1C4D] font-semibold text-[11px] truncate bg-white border border-purple-100/80 px-2.5 py-1 rounded-xl shadow-2xs">
                        {asn}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Incidents In Tenant */}
            <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D]">
                Tenant Incidents Attributed to this Campaign ({linkedCases.length})
              </h3>

              {linkedCases.length === 0 ? (
                <div className="text-center py-6 text-[#8A79A2] text-xs font-mono">
                  No currently open tenant cases match this campaign cluster.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedCases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectCase(c);
                        onNavigateTab('investigation');
                      }}
                      className="flex items-center justify-between rounded-2xl border border-purple-100/70 bg-purple-50/20 p-4 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="font-bold text-purple-800">{c.caseNumber}</span>
                          <span className="text-purple-200">•</span>
                          <span className="text-[#2E1C4D] font-bold">{c.subject}</span>
                        </div>
                        <div className="mt-1 text-[11px] font-mono text-[#6A5A82]">
                          Sender: {c.senderAddress} → Target: {c.recipientAddress}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-purple-800 text-xs font-mono font-bold shrink-0">
                        <span>Investigate</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
