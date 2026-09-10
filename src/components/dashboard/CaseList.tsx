import React, { useState } from 'react';
import { Search, Layers, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { EmailCase } from '@/src/types/index.ts';
import { VerdictBadge, SeverityBadge } from '@/src/components/common/Badge.tsx';

interface CaseListProps {
  cases: EmailCase[];
  selectedCaseId: string;
  onSelectCase: (c: EmailCase) => void;
}

export const CaseList: React.FC<CaseListProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MALICIOUS' | 'SUSPICIOUS' | 'BENIGN'>('ALL');

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.senderAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'ALL') return matchesSearch;
    return matchesSearch && c.decision.verdict === filterType;
  });

  return (
    <div className="flex flex-col h-full rounded-3xl border border-white/80 bg-white/85 backdrop-blur-md p-6 space-y-4 shadow-[0_10px_35px_rgba(142,125,188,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-700" />
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#2E1C4D]">
            Triage & Forensic Queue
          </h2>
        </div>
        <span className="rounded-full bg-purple-50/80 px-3 py-0.5 text-[10px] font-mono font-semibold text-[#6A5A82] border border-purple-100/80">
          {filteredCases.length} displayed
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#8A79A2]" />
        <input
          type="text"
          placeholder="Search number, domain, subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full bg-purple-50/40 pl-10 pr-4 py-2.5 text-xs text-[#2E1C4D] placeholder-[#8A79A2] border border-purple-100/80 focus:outline-none focus:border-purple-400 transition-all shadow-xs"
        />
      </div>

      {/* Quick Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-full bg-purple-50/50 text-[10px] font-mono border border-purple-100/80 shadow-xs">
        {(['ALL', 'MALICIOUS', 'SUSPICIOUS', 'BENIGN'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-full px-2 py-1.5 text-center transition-all cursor-pointer ${
              filterType === type
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'text-[#6A5A82] hover:text-[#2E1C4D]'
            }`}
          >
            {type === 'ALL' ? 'ALL' : type.substring(0, 4)}
          </button>
        ))}
      </div>

      {/* List Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[640px]">
        {filteredCases.length === 0 ? (
          <div className="text-center py-8 font-mono text-xs text-[#8A79A2]">
            No active incidents matching query.
          </div>
        ) : (
          filteredCases.map((c) => {
            const isSelected = c.id === selectedCaseId;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c)}
                className={`group relative cursor-pointer rounded-2xl border p-4 transition-all duration-150 ${
                  isSelected
                    ? 'border-purple-200/90 bg-purple-100/60 shadow-[0_4px_16px_rgba(124,58,237,0.08)]'
                    : 'border-purple-100/50 bg-white/60 hover:border-purple-200/60 hover:bg-purple-50/40'
                }`}
              >
                {/* Visual Accent for Selection */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 rounded-l-2xl" />
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-purple-700">
                    {c.caseNumber}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A79A2]">
                    <Clock className="h-3 w-3 text-[#8A79A2]" />
                    <span>
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="mt-1.5">
                  <h3
                    className={`text-xs font-semibold line-clamp-1 ${
                      isSelected ? 'text-[#2E1C4D] font-bold' : 'text-[#3E2E5B] group-hover:text-purple-700'
                    }`}
                  >
                    {c.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-[#6A5A82] truncate">
                    <span className="font-mono text-[#6A5A82]">{c.senderAddress}</span>
                  </p>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-purple-100/60 pt-2">
                  <div className="flex items-center gap-1">
                    <VerdictBadge verdict={c.decision.verdict} />
                    <SeverityBadge severity={c.decision.threatSeverity} />
                  </div>
                  <div className="text-[9px] font-mono text-[#6A5A82]">
                    Risk: <span className="text-[#2E1C4D] font-bold">{c.decision.threatConfidence}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
