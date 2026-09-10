import React from 'react';
import {
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Building,
  Target,
} from 'lucide-react';
import { EmailCase } from '@/src/types/index.ts';
import { VerdictBadge, SeverityBadge, ImpactBadge } from '@/src/components/common/Badge.tsx';
import { ExternalThreatIntel } from './ExternalThreatIntel.tsx';
import { MLClassificationPanel } from './MLClassificationPanel.tsx';

interface VerdictDecisionCardProps {
  emailCase: EmailCase;
}

export const VerdictDecisionCard: React.FC<VerdictDecisionCardProps> = ({ emailCase }) => {
  const { decision, authAnalysis } = emailCase;

  return (
    <div className="space-y-6">
      {/* THREAT ASSESSMENT TITLE & SCORE METRICS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-purple-100/70 pb-2.5">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#2E1C4D]">
            THREAT ASSESSMENT
          </h2>
        </div>
        
        {/* Top Section: Dual Scoring Architecture (Threat vs Evidence Quality) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Threat Verdict & Confidence */}
          <div className="rounded-3xl border border-rose-200/70 bg-rose-50/40 p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6A5A82]">
                Deterministic Threat Verdict
              </span>
              <VerdictBadge verdict={decision.verdict} />
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="font-mono text-3xl font-extrabold text-rose-700">
                  {decision.threatConfidence}%
                </div>
                <span className="text-xs text-[#6A5A82] font-mono">Threat Confidence Score</span>
              </div>
              <SeverityBadge severity={decision.threatSeverity} />
            </div>

            {/* Progress bar */}
            <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-rose-100/80">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  decision.threatConfidence > 75 ? 'bg-rose-600' : decision.threatConfidence > 45 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${decision.threatConfidence}%` }}
              />
            </div>
            <p className="mt-2.5 text-[11px] text-[#6A5A82]">
              Derived from cumulative weighted forensic indicators and protocol failures.
            </p>
          </div>

          {/* Evidence Quality & Completeness */}
          <div className="rounded-3xl border border-purple-200/70 bg-purple-50/40 p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6A5A82]">
                Evidence Quality & Proof
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-800 border border-purple-200/70 shadow-xs">
                SIH INNOVATION
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="font-mono text-3xl font-extrabold text-purple-800">
                  {decision.evidenceQuality}%
                </div>
                <span className="text-xs text-[#6A5A82] font-mono">Independent Reliability Index</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#2E1C4D] bg-white px-2.5 py-1 rounded-full border border-purple-200/70 shadow-xs">
                {emailCase.evidenceList.length} Artifacts Sealed
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-purple-100/80">
              <div
                className="h-full bg-purple-700 transition-all duration-500 rounded-full"
                style={{ width: `${decision.evidenceQuality}%` }}
              />
            </div>
            <p className="mt-2.5 text-[11px] text-[#6A5A82]">
              Assesses cryptographic verifiability. A high threat score never masks weak proof.
            </p>
          </div>

          {/* Business Impact Context */}
          <div className="rounded-3xl border border-purple-100/70 bg-white/90 p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6A5A82]">
                Enterprise Business Impact
              </span>
              <ImpactBadge impact={decision.businessImpact} />
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-[#5E4E77]">
                <Building className="h-4 w-4 text-purple-600" />
                <span>Target Role: <strong className="text-[#2E1C4D]">{emailCase.targetFunction || 'General Personnel'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#5E4E77]">
                <Target className="h-4 w-4 text-rose-600" />
                <span>Financial Exposure: <strong className="text-[#2E1C4D]">{emailCase.potentialFinancialRisk || 'Standard'}</strong></span>
              </div>
            </div>

            <div className="mt-3.5 border-t border-purple-100 pt-2.5 text-[11px] text-[#8A79A2]">
              Evaluates blast radius and priority according to targeted internal personnel.
            </div>
          </div>
        </div>
      </div>

      {/* WHY THIS VERDICT? */}
      <div className="rounded-3xl border border-rose-200/70 bg-rose-50/30 p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-rose-700 border-b border-rose-200/70 pb-2.5">
          <CheckCircle2 className="h-4 w-4 text-rose-600" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-900">
            WHY THIS VERDICT?
          </h3>
        </div>
        
        <p className="text-xs text-[#6A5A82] leading-relaxed">
          The following active forensic indicators were detected on the mail envelope and message MIME payload, driving the deterministic classification model:
        </p>

        <div className="space-y-3">
          {decision.detailedThreatScore?.contributions && decision.detailedThreatScore.contributions.length > 0 ? (
            decision.detailedThreatScore.contributions.map((c, idx) => {
              const isThreat = c.contribution > 0;
              return (
                <div 
                  key={idx} 
                  className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all shadow-xs ${
                    isThreat 
                      ? 'bg-white border-rose-200/70 hover:bg-rose-50/30' 
                      : 'bg-white border-emerald-200/70 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`h-2 w-2 rounded-full ${isThreat ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      <h4 className="text-xs font-mono font-bold text-[#2E1C4D]">{c.name}</h4>
                      <span className="text-[10px] font-mono text-[#6A5A82] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/70">
                        {c.evidenceId}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5E4E77] leading-relaxed max-w-2xl">
                      {c.explanation}
                    </p>
                    <div className="text-[10px] font-mono flex items-center gap-1.5">
                      <span className="text-[#8A79A2]">Forensic Impact:</span>
                      <span className={isThreat ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        {isThreat ? 'Supports Threat Classification' : 'Mitigates Threat Assessment'}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`font-mono text-xs font-extrabold px-3 py-1.5 rounded-full border shadow-xs ${
                      isThreat 
                        ? 'bg-rose-50 text-rose-800 border-rose-200' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {c.contribution > 0 ? `+${c.contribution}` : c.contribution} Weight
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl bg-white border border-purple-100 p-4 text-center text-xs text-[#8A79A2] font-mono shadow-xs">
              No active threat or validation indicators were detected.
            </div>
          )}
        </div>
      </div>

      {/* COUNTER-EVIDENCE & WHAT WOULD CHANGE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* COUNTER-EVIDENCE */}
        <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/30 p-6 space-y-4 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 text-emerald-800 border-b border-emerald-200/70 pb-2.5">
            <XCircle className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-950">
              COUNTER-EVIDENCE
            </h3>
          </div>

          <p className="text-xs text-[#6A5A82] leading-relaxed">
            Verifiable elements or protocol alignments that support legitimacy or reduce threat confidence:
          </p>

          <div className="space-y-3 flex-1">
            {decision.detailedThreatScore?.contributions && decision.detailedThreatScore.contributions.filter(c => c.contribution < 0).length > 0 ? (
              decision.detailedThreatScore.contributions.filter(c => c.contribution < 0).map((c, idx) => (
                <div 
                  key={idx} 
                  className="rounded-2xl border border-emerald-200/70 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <h4 className="text-xs font-mono font-bold text-[#2E1C4D]">{c.name}</h4>
                    </div>
                    <p className="text-[11px] text-[#5E4E77] leading-relaxed">
                      {c.explanation}
                    </p>
                  </div>
                  <div className="shrink-0 font-mono text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs">
                    {c.contribution} Weight
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-center text-xs text-[#8A79A2] font-mono flex flex-col items-center justify-center h-full min-h-[100px]">
                No verifiable counter-evidence supporting legitimacy was observed.
              </div>
            )}
          </div>
        </div>

        {/* WHAT WOULD CHANGE THE VERDICT? */}
        <div className="rounded-3xl border border-purple-200/70 bg-purple-50/30 p-6 space-y-4 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 text-purple-800 border-b border-purple-200/70 pb-2.5">
            <Lightbulb className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-950">
              WHAT WOULD CHANGE THE VERDICT?
            </h3>
          </div>

          <p className="text-xs text-[#6A5A82] leading-relaxed">
            Potential authoritative evidence or administrative confirmation that would alter the threat classification:
          </p>

          <div className="space-y-3 flex-1">
            {decision.whatWouldChange && decision.whatWouldChange.length > 0 ? (
              decision.whatWouldChange.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-purple-200/70 text-xs text-[#5E4E77] leading-relaxed shadow-xs"
                >
                  <span className="text-purple-700 font-mono font-black shrink-0">?</span>
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-purple-200 bg-white/70 p-6 text-center text-xs text-[#8A79A2] font-mono flex flex-col items-center justify-center h-full min-h-[100px]">
                No hypothetical criteria defined.
              </div>
            )}
          </div>
        </div>
      </div>

      <MLClassificationPanel emailCase={emailCase} />

      <ExternalThreatIntel emailCase={emailCase} />
    </div>
  );
};
