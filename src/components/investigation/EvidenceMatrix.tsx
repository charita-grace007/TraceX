import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { EvidenceItem } from '@/src/types/index.ts';
import { ReliabilityBadge } from '@/src/components/common/Badge.tsx';

interface EvidenceMatrixProps {
  evidenceList: EvidenceItem[];
}

export const EvidenceMatrix: React.FC<EvidenceMatrixProps> = ({ evidenceList }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filtered = evidenceList.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.observation.toLowerCase().includes(search.toLowerCase()) ||
      item.technicalSource.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-purple-100/70 bg-white p-4.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8A79A2]" />
          <input
            type="text"
            placeholder="Search evidence by ID, keyword, technical source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-purple-200/70 bg-purple-50/20 pl-9.5 pr-4 py-2 text-xs font-mono text-[#2E1C4D] placeholder-[#8A79A2] focus:border-purple-400 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#8A79A2]" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-full border border-purple-200/70 bg-purple-50/20 px-3.5 py-2 text-xs font-mono text-[#2E1C4D] focus:border-purple-400 focus:outline-none shadow-xs transition-colors cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="PROTOCOL_AUTH">Protocol Auth</option>
            <option value="LOOKALIKE_DOMAIN">Lookalike Domain</option>
            <option value="RELAY_HOP">Relay Hop</option>
            <option value="CONTENT_ANOMALY">Content Anomaly</option>
            <option value="URL_INDICATOR">URL Indicator</option>
            <option value="ATTACHMENT_ANALYSIS">Attachment</option>
            <option value="CAMPAIGN_MATCH">Campaign Match</option>
          </select>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="overflow-hidden rounded-3xl border border-purple-100/70 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-purple-100/80 bg-purple-50/40 text-[11px] uppercase tracking-wider text-[#6A5A82]">
              <tr>
                <th className="px-4.5 py-3.5">ID</th>
                <th className="px-4.5 py-3.5">Finding & Observation</th>
                <th className="px-4.5 py-3.5">Technical Source</th>
                <th className="px-4.5 py-3.5">Reliability</th>
                <th className="px-4.5 py-3.5">Hypothesis</th>
                <th className="px-4.5 py-3.5">Weight</th>
                <th className="px-4.5 py-3.5">SHA-256 Fingerprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100/60">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-4.5 py-3.5 font-bold text-purple-800 whitespace-nowrap">
                    [{item.id}]
                  </td>
                  <td className="px-4.5 py-3.5 max-w-md">
                    <div className="font-semibold text-[#2E1C4D]">{item.title}</div>
                    <div className="mt-0.5 text-[#6A5A82] text-[11px] leading-relaxed">
                      {item.observation}
                    </div>
                  </td>
                  <td className="px-4.5 py-3.5 text-[#5E4E77] whitespace-nowrap text-[11px]">
                    {item.technicalSource}
                  </td>
                  <td className="px-4.5 py-3.5 whitespace-nowrap">
                    <ReliabilityBadge reliability={item.reliability} />
                  </td>
                  <td className="px-4.5 py-3.5 whitespace-nowrap">
                    {item.supportsThreat ? (
                      <span className="flex items-center gap-1 text-rose-700 text-[11px] font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>SUPPORTS</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                        <XCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span>COUNTERS</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4.5 py-3.5 font-bold text-[#2E1C4D]">
                    {item.weight}
                  </td>
                  <td className="px-4.5 py-3.5 whitespace-nowrap">
                    <button
                      onClick={() => handleCopyHash(item.sha256Hash)}
                      title="Copy SHA-256 cryptographic hash"
                      className="flex items-center gap-1.5 text-[10px] text-[#6A5A82] hover:text-purple-800 bg-white px-2.5 py-1 rounded-full border border-purple-200/70 transition-colors shadow-xs cursor-pointer"
                    >
                      <Lock className="h-3 w-3 text-purple-400" />
                      <span>{item.sha256Hash.substring(0, 10)}...</span>
                      {copiedHash === item.sha256Hash ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-[#8A79A2]" />
                      )}
                    </button>
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
