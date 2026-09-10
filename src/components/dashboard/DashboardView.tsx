import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Network,
  Lock,
  Sparkles,
  Users,
  ExternalLink,
  ChevronRight,
  Send,
  User,
  Mail,
  Calendar,
  Layers,
  ArrowRightCircle,
} from 'lucide-react';
import { EmailCase, Campaign, ThreatHuntingIndicator, IntegrityBlock } from '@/src/types/index.ts';
import { StatCard } from '@/src/components/common/StatCard.tsx';
import { Badge } from '@/src/components/common/Badge.tsx';

// Import Reusable Dashboard Panels
import { CaseList } from './CaseList.tsx';
import { ThreatScoreMetrics } from './ThreatScoreMetrics.tsx';
import { ProtocolSecurityAuth } from './ProtocolSecurityAuth.tsx';
import { SuspiciousIndicatorsList } from './SuspiciousIndicatorsList.tsx';
import { AttachmentsDetails } from './AttachmentsDetails.tsx';
import { CampaignSummaryCard } from './CampaignSummaryCard.tsx';

interface DashboardViewProps {
  cases: EmailCase[];
  campaigns: Campaign[];
  iocs: ThreatHuntingIndicator[];
  ledgerBlocks: IntegrityBlock[];
  onSelectCase: (c: EmailCase) => void;
  onNavigateTab: (tab: any) => void;
  onOpenIngest: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases,
  campaigns,
  iocs,
  ledgerBlocks,
  onSelectCase,
  onNavigateTab,
  onOpenIngest,
}) => {
  const [selectedCase, setSelectedCase] = useState<EmailCase | null>(null);

  // Default to the first case on load or when cases change
  useEffect(() => {
    if (cases.length > 0) {
      // Keep current if it still exists, otherwise choose first
      setSelectedCase((prev) => {
        if (prev && cases.some((c) => c.id === prev.id)) {
          return cases.find((c) => c.id === prev.id) || cases[0];
        }
        return cases[0];
      });
    }
  }, [cases]);

  const criticalCases = cases.filter(
    (c) => c.decision.threatSeverity === 'CRITICAL' || c.decision.threatSeverity === 'HIGH'
  );
  const activeCampaignsCount = campaigns.length;
  const verifiedBlocksCount = ledgerBlocks.length;
  const totalAffectedUsers = cases.reduce((acc, c) => acc + (c.affectedUsersCount || 0), 0);

  const handleSelectCaseLocal = (c: EmailCase) => {
    setSelectedCase(c);
    onSelectCase(c); // Sync to global app state as well
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System Mission */}
      <div className="relative overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-r from-purple-100/90 via-pink-50/80 to-amber-50/70 p-7 md:p-9 shadow-[0_10px_35px_rgba(168,142,210,0.12)] backdrop-blur-md">
        {/* Soft decorative atmospheric pastel glows */}
        <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-purple-300/30 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-pink-300/30 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/2 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1 font-mono text-[10px] font-bold text-purple-900 border border-purple-200/70 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse"></span>
                SOC COGNITIVE RADAR ACTIVE
              </span>
              <span className="rounded-full bg-white/85 px-3.5 py-1 font-mono text-[10px] font-bold text-indigo-900 border border-indigo-200/70 shadow-xs">
                SIH26106 FORENSICS
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold font-mono tracking-tight text-[#2E1C4D] leading-snug">
              Evidence-Driven Email Threat & Campaign Intelligence
            </h1>
            <p className="text-xs md:text-sm text-[#5E4E77] max-w-3xl leading-relaxed">
              TRACE-X reconstructs what happened, separates evidence reliability from threat severity, correlates campaigns via infrastructure DNA, and seals findings in a tamper-evident ledger.
            </p>
          </div>
          <div className="flex items-center shrink-0">
            <button
              onClick={onOpenIngest}
              className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 px-6 py-3.5 text-xs font-mono font-bold text-white shadow-[0_6px_22px_rgba(124,58,237,0.3)] hover:shadow-[0_8px_28px_rgba(124,58,237,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-purple-100" />
              <span className="tracking-wider">INGEST SUSPICIOUS EMAIL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Incidents"
          value={cases.length}
          subValue={`${criticalCases.length} Critical/High Priority`}
          icon={ShieldAlert}
          accentColor="rose"
        />
        <StatCard
          label="Correlated Campaigns"
          value={activeCampaignsCount}
          subValue="Active Threat Clusters"
          icon={Network}
          accentColor="amber"
        />
        <StatCard
          label="Evidence Blocks Sealed"
          value={verifiedBlocksCount}
          subValue="SHA-256 Ledger Verified"
          icon={Lock}
          accentColor="emerald"
        />
        <StatCard
          label="Targeted Personnel"
          value={totalAffectedUsers}
          subValue="Across Monitored Enclaves"
          icon={Users}
          accentColor="indigo"
        />
      </div>

      {/* Split Dashboard Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Triage List */}
        <div className="lg:col-span-1 h-full">
          <CaseList
            cases={cases}
            selectedCaseId={selectedCase?.id || ''}
            onSelectCase={handleSelectCaseLocal}
          />
        </div>

        {/* Right Columns: Forensic Case Explorer */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCase ? (
            <div className="rounded-3xl border border-white/80 bg-white/85 backdrop-blur-md p-6 md:p-8 space-y-6 shadow-[0_10px_35px_rgba(142,125,188,0.08)] animate-in fade-in duration-200">
              
              {/* Case Header & Identity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/70 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-purple-700">
                      {selectedCase.caseNumber}
                    </span>
                    <span className="text-purple-300">•</span>
                    <span className="text-xs font-mono text-[#8A79A2]">
                      ID: {selectedCase.caseId}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${
                      selectedCase.status === 'UNDER_INVESTIGATION'
                        ? 'bg-purple-50/90 text-purple-800 border-purple-200/80'
                        : selectedCase.status === 'CONTAINED'
                        ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80'
                        : selectedCase.status === 'RESOLVED'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-rose-50/90 text-rose-800 border-rose-200/80'
                    }`}>
                      {selectedCase.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-base md:text-lg font-extrabold text-[#2E1C4D]">
                    {selectedCase.title}
                  </h2>
                </div>

                <button
                  onClick={() => {
                    onSelectCase(selectedCase);
                    onNavigateTab('investigation');
                  }}
                  className="rounded-full bg-purple-50/90 hover:bg-purple-100/90 border border-purple-200/80 text-purple-800 font-mono text-[11px] font-bold px-4 py-2 flex items-center gap-2 cursor-pointer transition-all shrink-0 shadow-xs hover:-translate-y-0.5"
                >
                  <span>DEEP INVESTIGATION</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Envelope Identity Details */}
              <div className="rounded-2xl border border-purple-100/70 bg-purple-50/30 p-4 md:p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <User className="h-4 w-4 text-[#8A79A2] shrink-0" />
                    <span className="text-[#8A79A2]">From:</span>
                    <span className="text-[#2E1C4D] font-bold truncate" title={selectedCase.senderName}>
                      {selectedCase.displayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-[#8A79A2] shrink-0" />
                    <span className="text-[#8A79A2]">Envelope:</span>
                    <span className="text-purple-700 truncate font-bold" title={selectedCase.senderAddress}>
                      {selectedCase.sender}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Send className="h-4 w-4 text-[#8A79A2] shrink-0" />
                    <span className="text-[#8A79A2]">To:</span>
                    <span className="text-[#2E1C4D] truncate font-bold" title={selectedCase.recipientAddress}>
                      {selectedCase.recipient}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar className="h-4 w-4 text-[#8A79A2] shrink-0" />
                    <span className="text-[#8A79A2]">Date:</span>
                    <span className="text-[#5E4E77] truncate">
                      {new Date(selectedCase.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-purple-100/70 pt-2.5 space-y-1">
                  <div className="text-[10px] font-mono text-[#8A79A2]">Subject</div>
                  <div className="text-xs font-semibold text-[#2E1C4D] italic leading-relaxed">
                    "{selectedCase.subject}"
                  </div>
                </div>
              </div>

              {/* Metric Placeholders: Threat Score & Evidence Quality */}
              <ThreatScoreMetrics emailCase={selectedCase} />

              {/* Protocol Authentication Locks (SPF/DKIM/DMARC) */}
              <ProtocolSecurityAuth emailCase={selectedCase} />

              {/* Suspicious URL & Domain Extraction */}
              <SuspiciousIndicatorsList emailCase={selectedCase} />

              {/* Enclosed Attachments File details */}
              <AttachmentsDetails emailCase={selectedCase} />

              {/* Linked Threat Campaign Summary */}
              <CampaignSummaryCard emailCase={selectedCase} campaigns={campaigns} />

              {/* Workspace CTA Banner */}
              <div className="rounded-3xl border border-purple-100/80 bg-gradient-to-r from-purple-50/70 via-pink-50/40 to-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 font-mono">
                    <Layers className="h-4 w-4" />
                    <span>Live Forensic Workspace Pipeline</span>
                  </div>
                  <p className="text-[11px] text-[#6A5A82] max-w-md">
                    Access the complete network hop visualizer, cryptographic chain-of-custody verifying ledger blocks, and STIX indicator exports.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onSelectCase(selectedCase);
                    onNavigateTab('investigation');
                  }}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-mono text-xs font-bold px-5 py-3 flex items-center gap-2 cursor-pointer transition-all shrink-0 shadow-[0_4px_16px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)] hover:-translate-y-0.5"
                >
                  <span>LAUNCH ATTACK PATH ANALYSIS</span>
                  <ArrowRightCircle className="h-4 w-4" />
                </button>
              </div>

            </div>
          ) : (
            <div className="rounded-3xl border border-white/80 bg-white/85 backdrop-blur-md p-8 text-center h-full flex flex-col items-center justify-center space-y-3 shadow-[0_10px_35px_rgba(142,125,188,0.08)]">
              <ShieldAlert className="h-10 w-10 text-purple-300 animate-pulse" />
              <h3 className="font-mono text-sm font-bold text-[#2E1C4D]">
                NO CASE ACTIVE
              </h3>
              <p className="text-xs text-[#6A5A82] max-w-sm">
                Select a suspicious case from the triage queue on the left to begin compiling the forensic security audit.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
