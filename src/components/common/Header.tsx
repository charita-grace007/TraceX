import React from 'react';
import { Shield, Radio, UploadCloud, Terminal, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { EmailCase } from '@/src/types/index.ts';

interface HeaderProps {
  cases: EmailCase[];
  currentCase: EmailCase | null;
  onSelectCase: (c: EmailCase) => void;
  onOpenIngest: () => void;
  isLiveServerConnected: boolean;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cases,
  currentCase,
  onSelectCase,
  onOpenIngest,
  isLiveServerConnected,
  onRefreshData,
}) => {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-purple-100/70 bg-white/75 px-5 md:px-7 backdrop-blur-xl shadow-[0_4px_25px_rgba(160,140,210,0.06)]">
      {/* Left: Brand & Problem Statement */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-100 to-pink-50 text-purple-700 shadow-sm">
            <Shield className="h-5 w-5" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-extrabold tracking-wider text-[#2E1C4D]">
                TRACE<span className="text-purple-600">-X</span>
              </span>
              <span className="rounded-full bg-purple-100/80 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-purple-800 border border-purple-200/60">
                SIH26106
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#6A5A82] tracking-tight hidden sm:block">
              Email Threat Detection, GeoLocation & Forensic Intelligence Platform
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Active Case Selector Quick Switcher */}
      <div className="hidden lg:flex items-center gap-2 bg-purple-50/50 border border-purple-100/80 rounded-full p-1 shadow-xs">
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-[#6A5A82] font-mono">
          <Layers className="h-3.5 w-3.5 text-purple-600" />
          <span>Active Case:</span>
        </div>
        <select
          id="active-case-selector"
          value={currentCase?.id || ''}
          onChange={(e) => {
            const found = cases.find(c => c.id === e.target.value);
            if (found) onSelectCase(found);
          }}
          className="bg-white text-xs font-mono text-[#2E1C4D] rounded-full px-3 py-1 border border-purple-200/60 focus:border-purple-500 focus:outline-none cursor-pointer shadow-xs"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.caseNumber} - {c.title.substring(0, 38)}...
            </option>
          ))}
        </select>
      </div>

      {/* Right: Actions & System Status */}
      <div className="flex items-center gap-3">
        {/* Connection status indicator */}
        <div className="hidden md:flex items-center gap-2 rounded-full border border-purple-100/80 bg-purple-50/50 px-3.5 py-1.5 text-xs font-mono text-[#5E4E77]">
          <Radio className={`h-3 w-3 ${isLiveServerConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
          <span>{isLiveServerConnected ? 'SOC ENGINE: ONLINE' : 'OFFLINE CACHE'}</span>
        </div>

        {/* Refresh button */}
        {onRefreshData && (
          <button
            id="refresh-data-btn"
            onClick={onRefreshData}
            title="Reload telemetry data"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-200/60 bg-white text-[#6A5A82] hover:border-purple-300 hover:text-[#2E1C4D] transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}

        {/* Ingest raw email button */}
        <button
          id="quick-ingest-btn"
          onClick={onOpenIngest}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white px-4 py-2 text-xs font-medium transition-all cursor-pointer shadow-[0_4px_16px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.35)] hover:-translate-y-0.5"
        >
          <UploadCloud className="h-3.5 w-3.5 text-purple-100" />
          <span className="font-mono font-bold tracking-wide">INGEST .EML</span>
        </button>
      </div>
    </header>
  );
};
