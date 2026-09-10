import React, { useState } from 'react';
import {
  Crosshair,
  Search,
  Server,
  Globe,
  Lock,
  Layers,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { ThreatHuntingIndicator, EmailCase } from '@/src/types/index.ts';

interface ThreatHuntingViewProps {
  iocs: ThreatHuntingIndicator[];
  cases: EmailCase[];
  onSelectCase: (c: EmailCase) => void;
  onNavigateTab: (tab: any) => void;
}

export const ThreatHuntingView: React.FC<ThreatHuntingViewProps> = ({
  iocs,
  cases,
  onSelectCase,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const filteredIocs = iocs.filter((ioc) => {
    const matchesQuery =
      ioc.value.toLowerCase().includes(query.toLowerCase()) ||
      ioc.asnInfo?.toLowerCase().includes(query.toLowerCase()) ||
      ioc.relatedCampaign?.toLowerCase().includes(query.toLowerCase());
    const matchesType = selectedType === 'ALL' || ioc.type === selectedType;
    return matchesQuery && matchesType;
  });

  const matchingCases = query
    ? cases.filter((c) =>
        c.senderAddress.toLowerCase().includes(query.toLowerCase()) ||
        c.subject.toLowerCase().includes(query.toLowerCase()) ||
        c.relayHops.some(h => h.ip.includes(query) || h.asn?.toLowerCase().includes(query.toLowerCase())) ||
        c.urls.some(u => u.domain.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-purple-100/70 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="rounded-full bg-rose-50 px-3 py-0.5 font-mono text-[10px] font-bold text-rose-800 border border-rose-200 uppercase shadow-xs">
            Threat Intelligence & IOC Vault
          </span>
          <span className="font-mono text-xs text-[#8A79A2]">SIH26106 TELEMETRY</span>
        </div>
        <h1 className="text-xl font-extrabold text-[#2E1C4D]">
          Cross-Incident Threat Hunting & Indicator Correlation
        </h1>
        <p className="text-xs text-[#6A5A82] mt-1">
          Query IP addresses, sending infrastructure, SHA-256 hashes, and lookalike domains across all monitored enclaves and historical campaigns.
        </p>

        {/* Search Input */}
        <div className="mt-4.5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-purple-400" />
            <input
              type="text"
              placeholder="Search indicators (e.g. 185.220.101.44, micros0ft, AS49505)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-purple-100/80 bg-[#fafaff] pl-10 pr-4 py-2.5 text-xs font-mono text-[#2E1C4D] placeholder-[#A090B5] focus:border-purple-400 focus:bg-white focus:outline-none shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-2xl border border-purple-100/80 bg-[#fafaff] px-3.5 py-2.5 text-xs font-mono text-[#2E1C4D] focus:border-purple-400 focus:bg-white focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Indicator Types</option>
              <option value="IP">IP Addresses</option>
              <option value="DOMAIN">Domains</option>
              <option value="URL">URLs</option>
              <option value="HASH">SHA-256 Hashes</option>
              <option value="SENDER">Senders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Query Matches in Ingested Cases (if query active) */}
      {query && matchingCases.length > 0 && (
        <div className="rounded-3xl border border-purple-200/80 bg-purple-50/40 p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-purple-900">
            <Crosshair className="h-4 w-4 text-purple-700" />
            <span>Active Tenant Cases Matching &quot;{query}&quot; ({matchingCases.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchingCases.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelectCase(c);
                  onNavigateTab('investigation');
                }}
                className="rounded-2xl border border-purple-100/80 bg-white p-3.5 hover:border-purple-300 hover:shadow-xs cursor-pointer transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-purple-800">{c.caseNumber}</span>
                  <span className="text-[#8A79A2] text-[11px]">{c.attackType}</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-[#2E1C4D] truncate">
                  {c.subject}
                </div>
                <div className="mt-1 text-[11px] font-mono text-[#6A5A82] truncate">
                  {c.senderAddress}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicator Table */}
      <div className="overflow-hidden rounded-3xl border border-purple-100/70 bg-white shadow-xs">
        <div className="border-b border-purple-100/70 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50/30 via-white to-pink-50/20">
          <span className="text-xs font-mono font-bold uppercase text-[#2E1C4D]">
            Observable Threat Indicators ({filteredIocs.length})
          </span>
          <span className="text-[11px] font-mono text-[#8A79A2]">
            Seeded & Derived Forensics
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-purple-100/70 bg-purple-50/20 text-[11px] uppercase tracking-wider text-[#6A5A82]">
              <tr>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Observable Indicator Value</th>
                <th className="px-5 py-3.5">Attributed Campaign</th>
                <th className="px-5 py-3.5">Autonomous System / Org</th>
                <th className="px-5 py-3.5">Reputation</th>
                <th className="px-5 py-3.5">Linked Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100/60">
              {filteredIocs.map((ioc, idx) => (
                <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-purple-100/80 px-2.5 py-0.5 text-[10px] font-bold text-purple-900">
                      {ioc.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#2E1C4D]">
                    {ioc.value}
                  </td>
                  <td className="px-5 py-3.5 text-amber-800 font-semibold">
                    {ioc.relatedCampaign || 'Isolated'}
                  </td>
                  <td className="px-5 py-3.5 text-[#6A5A82] text-[11px]">
                    {ioc.asnInfo || 'N/A'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs ${
                        ioc.reputation === 'MALICIOUS'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ioc.reputation}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-purple-800 font-bold">
                    {ioc.matchedCasesCount} Cases
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
