import React, { useState } from 'react';
import {
  FileText,
  GitCommit,
  Network,
  ListTodo,
  Layers,
  Code,
  Calendar,
  User,
  Mail,
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Dna,
} from 'lucide-react';
import { EmailCase, PlaybookAction, Campaign } from '@/src/types/index.ts';
import { VerdictBadge, SeverityBadge, ImpactBadge } from '@/src/components/common/Badge.tsx';
import { VerdictDecisionCard } from './VerdictDecisionCard.tsx';
import { RelayPathViewer } from './RelayPathViewer.tsx';
import { EvidenceMatrix } from './EvidenceMatrix.tsx';
import { EvidenceGraphViewer } from './EvidenceGraphViewer.tsx';
import { AttackPathTimeline } from './AttackPathTimeline.tsx';
import { CampaignCorrelationPanel } from './CampaignCorrelationPanel.tsx';

interface InvestigationWorkspaceProps {
  emailCase: EmailCase;
  cases: EmailCase[];
  campaigns: Campaign[];
  onSelectCase: (c: EmailCase) => void;
  playbookActions?: PlaybookAction[];
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  emailCase,
  cases,
  campaigns,
  onSelectCase,
  playbookActions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'verdict' | 'hops' | 'evidence' | 'graph' | 'attackPath' | 'campaign'>('verdict');
  const [showRawEnvelope, setShowRawEnvelope] = useState(false);

  return (
    <div className="space-y-6">
      {/* Case Header Card */}
      <div className="rounded-3xl border border-purple-100/70 bg-white/85 backdrop-blur-md p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-purple-100/70 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/70">
                {emailCase.caseNumber}
              </span>
              <span className="text-purple-200">•</span>
              <VerdictBadge verdict={emailCase.decision.verdict} />
              <SeverityBadge severity={emailCase.decision.threatSeverity} />
              <ImpactBadge impact={emailCase.decision.businessImpact} />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-[#2E1C4D] font-mono tracking-tight">
              {emailCase.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowRawEnvelope(!showRawEnvelope)}
              className="flex items-center gap-1.5 rounded-full border border-purple-200/70 bg-purple-50/50 px-3.5 py-1.5 text-xs font-mono text-[#2E1C4D] hover:bg-purple-100/60 transition-colors shadow-xs cursor-pointer"
            >
              <Code className="h-3.5 w-3.5 text-purple-700" />
              <span>{showRawEnvelope ? 'Hide Raw MIME' : 'Inspect Raw MIME'}</span>
              {showRawEnvelope ? <ChevronUp className="h-3 w-3 text-[#6A5A82]" /> : <ChevronDown className="h-3 w-3 text-[#6A5A82]" />}
            </button>
          </div>
        </div>

        {/* Message Envelope Details */}
        <div className="mt-4 rounded-2xl bg-purple-50/30 p-4 border border-purple-100/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#6A5A82]">
            <User className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-[#2E1C4D] font-semibold truncate">From: {emailCase.senderName}</span>
            <span className="text-[#8A79A2] truncate">&lt;{emailCase.senderAddress}&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-[#6A5A82]">
            <Mail className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-[#2E1C4D] font-semibold truncate">To:</span>
            <span className="text-[#5E4E77] truncate">{emailCase.recipientAddress}</span>
          </div>
          <div className="flex items-center gap-2 text-[#6A5A82]">
            <Calendar className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-[#2E1C4D] font-semibold">Date:</span>
            <span className="text-[#5E4E77]">{new Date(emailCase.dateSent).toUTCString()}</span>
          </div>
        </div>

        {/* Expandable Raw MIME Preview */}
        {showRawEnvelope && (
          <div className="mt-4 rounded-2xl border border-purple-100/80 bg-purple-50/40 p-4 text-xs font-mono text-[#2E1C4D] overflow-x-auto max-h-64 whitespace-pre leading-relaxed shadow-xs">
            {emailCase.rawMimePreview}
          </div>
        )}
      </div>

      {/* Investigation Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-purple-100/70 pb-3.5 font-mono text-xs">
        <button
          onClick={() => setActiveSubTab('verdict')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all cursor-pointer ${
            activeSubTab === 'verdict'
              ? 'bg-purple-100/90 text-purple-900 border border-purple-300 font-bold shadow-xs'
              : 'bg-white/80 text-[#6A5A82] border border-purple-100/70 hover:bg-purple-50/60 hover:text-[#2E1C4D]'
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-purple-700" />
          <span>Decision & Why/Why Not</span>
        </button>

        <button
          onClick={() => setActiveSubTab('campaign')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all cursor-pointer ${
            activeSubTab === 'campaign'
              ? 'bg-purple-100/90 text-purple-900 border border-purple-300 font-bold shadow-xs'
              : 'bg-white/80 text-[#6A5A82] border border-purple-100/70 hover:bg-purple-50/60 hover:text-[#2E1C4D]'
          }`}
        >
          <Dna className="h-3.5 w-3.5 text-purple-700" />
          <span>Campaign Correlation</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hops')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all cursor-pointer ${
            activeSubTab === 'hops'
              ? 'bg-purple-100/90 text-purple-900 border border-purple-300 font-bold shadow-xs'
              : 'bg-white/80 text-[#6A5A82] border border-purple-100/70 hover:bg-purple-50/60 hover:text-[#2E1C4D]'
          }`}
        >
          <Network className="h-3.5 w-3.5 text-purple-700" />
          <span>Relay Path Trace ({emailCase.relayHops.length} Hops)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('evidence')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all cursor-pointer ${
            activeSubTab === 'evidence'
              ? 'bg-purple-100/90 text-purple-900 border border-purple-300 font-bold shadow-xs'
              : 'bg-white/80 text-[#6A5A82] border border-purple-100/70 hover:bg-purple-50/60 hover:text-[#2E1C4D]'
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-purple-700" />
          <span>Evidence Matrix ({emailCase.evidenceList.length} Items)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('graph')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all cursor-pointer ${
            activeSubTab === 'graph'
              ? 'bg-purple-100/90 text-purple-900 border border-purple-300 font-bold shadow-xs'
              : 'bg-white/80 text-[#6A5A82] border border-purple-100/70 hover:bg-purple-50/60 hover:text-[#2E1C4D]'
          }`}
        >
          <Network className="h-3.5 w-3.5 text-purple-700" />
          <span>Evidence Graph ({emailCase.graph.nodes.length} Nodes)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('attackPath')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all cursor-pointer ${
            activeSubTab === 'attackPath'
              ? 'bg-purple-100/90 text-purple-900 border border-purple-300 font-bold shadow-xs'
              : 'bg-white/80 text-[#6A5A82] border border-purple-100/70 hover:bg-purple-50/60 hover:text-[#2E1C4D]'
          }`}
        >
          <GitCommit className="h-3.5 w-3.5 text-purple-700" />
          <span>Attack Sequence & Playbook</span>
        </button>
      </div>

      {/* Sub-tab Content Area */}
      <div>
        {activeSubTab === 'verdict' && <VerdictDecisionCard emailCase={emailCase} />}
        {activeSubTab === 'campaign' && (
          <CampaignCorrelationPanel
            emailCase={emailCase}
            cases={cases}
            campaigns={campaigns}
            onSelectCase={onSelectCase}
          />
        )}
        {activeSubTab === 'hops' && <RelayPathViewer emailCase={emailCase} />}
        {activeSubTab === 'evidence' && <EvidenceMatrix evidenceList={emailCase.evidenceList} />}
        {activeSubTab === 'graph' && (
          <EvidenceGraphViewer
            graphData={emailCase.graph}
            emailCase={emailCase}
            cases={cases}
            campaigns={campaigns}
            onSelectCase={onSelectCase}
          />
        )}
        {activeSubTab === 'attackPath' && <AttackPathTimeline emailCase={emailCase} playbookActions={playbookActions} />}
      </div>
    </div>
  );
};
