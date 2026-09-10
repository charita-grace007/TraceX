import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Eye, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { EmailCase, ScoreContribution } from '@/src/types/index.ts';

interface ThreatScoreMetricsProps {
  emailCase: EmailCase;
}

export const ThreatScoreMetrics: React.FC<ThreatScoreMetricsProps> = ({ emailCase }) => {
  const { decision } = emailCase;
  const [showDetails, setShowDetails] = useState(false);

  const score = decision.threatConfidence;
  const reliability = decision.evidenceQuality;
  const verdict = decision.verdict;

  // Use detailed scores calculated by the engine (or fall back gracefully to inline-calculated structures)
  const detailedThreat = decision.detailedThreatScore || {
    score,
    label: decision.threatSeverity,
    contributions: [],
    explanation: 'Threat score calculated based on general evidence weights.'
  };

  const detailedReliability = decision.detailedReliabilityScore || {
    score: reliability,
    label: (reliability >= 85 ? 'EXCELLENT' : reliability >= 70 ? 'GOOD' : reliability >= 45 ? 'FAIR' : 'POOR') as any,
    contributions: [],
    explanation: 'Reliability metrics determined from general forensic proof weights.'
  };

  // Color mapping based on risk score
  const getScoreColorClass = (val: number) => {
    if (val >= 80) return 'text-rose-500 stroke-rose-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (val >= 50) return 'text-amber-500 stroke-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    return 'text-emerald-500 stroke-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]';
  };

  const getScoreBgClass = (val: number) => {
    if (val >= 80) return 'bg-rose-50 border-rose-200 text-rose-700';
    if (val >= 50) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  };

  const getReliabilityTier = (val: number) => {
    if (val >= 85) return { label: 'EXCELLENT', color: 'text-violet-600', barBg: 'bg-violet-600' };
    if (val >= 70) return { label: 'GOOD', color: 'text-indigo-600', barBg: 'bg-indigo-600' };
    if (val >= 45) return { label: 'FAIR', color: 'text-amber-600', barBg: 'bg-amber-500' };
    return { label: 'POOR', color: 'text-slate-500', barBg: 'bg-slate-400' };
  };

  const relTier = getReliabilityTier(reliability);

  return (
    <div className="rounded-3xl border border-purple-100/70 bg-purple-50/20 p-6 space-y-5">
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Threat Score Card */}
        <div className="rounded-2xl border border-rose-100/80 bg-white/90 p-5 flex items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-[#6A5A82]">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              <span>DETERMINISTIC THREAT SCORE</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold font-mono tracking-tight text-[#2E1C4D]">
                {score}
              </span>
              <span className="text-xs text-[#8A79A2] font-mono ml-1">/ 100</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-mono font-bold border uppercase ${getScoreBgClass(score)}`}>
                {detailedThreat.label}
              </span>
              <span className="text-[10px] font-mono text-[#6A5A82]">
                Indicators Risk Weight
              </span>
            </div>
          </div>

          {/* Circular Gauge */}
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-purple-100"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`transition-all duration-500 ${getScoreColorClass(score)}`}
                strokeWidth="3.5"
                strokeDasharray={`${score}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[9px] font-bold text-[#8A79A2]">THREAT</span>
              <span className="font-mono text-[11px] font-extrabold text-[#2E1C4D]">{score}%</span>
            </div>
          </div>
        </div>

        {/* Evidence Reliability Card */}
        <div className="rounded-2xl border border-purple-100/80 bg-white/90 p-5 space-y-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-between justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-[#6A5A82]">
              <Eye className="h-3.5 w-3.5 text-purple-700" />
              <span>EVIDENCE RELIABILITY SCORE</span>
            </div>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[9px] font-mono font-bold text-purple-800 border border-purple-200/70 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-purple-600 animate-pulse" />
              <span>TRUST ASSURANCE</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-[#2E1C4D]">
                {reliability}%
              </span>
              <span className={`text-[11px] font-mono font-bold tracking-widest uppercase ${relTier.color}`}>
                {relTier.label}
              </span>
            </div>

            {/* Bar Gauge */}
            <div className="h-2 w-full rounded-full bg-purple-100 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${relTier.barBg}`}
                style={{ width: `${reliability}%` }}
              />
            </div>
          </div>

          <p className="text-[10px] text-[#6A5A82] leading-normal font-mono">
            Chain verification coefficient measured over {emailCase.evidenceList.length} authenticated factors.
          </p>
        </div>
      </div>

      {/* Accordion Toggle */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 rounded-full border border-purple-200/70 bg-white hover:bg-purple-50/60 text-[#2E1C4D] hover:text-purple-700 font-mono text-xs font-bold px-5 py-2.5 transition-all shadow-xs cursor-pointer"
        >
          <span>Deterministic Audit Report Inspector</span>
          {showDetails ? <ChevronUp className="h-4 w-4 text-purple-600" /> : <ChevronDown className="h-4 w-4 text-purple-600" />}
        </button>
      </div>

      {/* Expanded Calculations breakdown */}
      {showDetails && (
        <div className="space-y-4 border-t border-purple-100/70 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* THREAT SCORE CONTRIBUTIONS PANEL */}
            <div className="rounded-2xl border border-purple-100/80 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-rose-700 border-b border-purple-100/70 pb-2.5">
                <TrendingUp className="h-4 w-4" />
                <span>THREAT INDICATORS BREAKDOWN</span>
              </div>
              
              <div className="text-[11px] text-[#2E1C4D] font-sans leading-relaxed">
                <p className="font-mono text-[#8A79A2] text-[10px] mb-1.5">Confidence Explanation:</p>
                {detailedThreat.explanation}
              </div>

              <div className="space-y-2 mt-2">
                {detailedThreat.contributions.length > 0 ? (
                  detailedThreat.contributions.map((con, idx) => {
                    const isMalicious = con.contribution > 0;
                    return (
                      <div key={idx} className="flex gap-2.5 items-start text-xs border border-purple-100/60 bg-purple-50/30 rounded-2xl p-3 hover:bg-purple-50/60 transition-colors">
                        <span className="rounded-full bg-purple-100/80 border border-purple-200/70 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-800 select-none">
                          {con.evidenceId}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-[#2E1C4D]">{con.name}</span>
                            <span className={`font-bold ${isMalicious ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {isMalicious ? `+${con.contribution}` : con.contribution}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6A5A82] leading-normal">{con.explanation}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[11px] text-[#8A79A2] font-mono italic text-center py-4">
                    No active threat contributions. Email presents zero risk markers.
                  </div>
                )}
              </div>
            </div>

            {/* RELIABILITY CONTRIBUTIONS PANEL */}
            <div className="rounded-2xl border border-purple-100/80 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-700 border-b border-purple-100/70 pb-2.5">
                <Fingerprint className="h-4 w-4" />
                <span>ASSURANCE & SUFFICIENCY CRITERIA</span>
              </div>
              
              <div className="text-[11px] text-[#2E1C4D] font-sans leading-relaxed">
                <p className="font-mono text-[#8A79A2] text-[10px] mb-1.5">Confidence Explanation:</p>
                {detailedReliability.explanation}
              </div>

              <div className="space-y-2 mt-2">
                {detailedReliability.contributions.length > 0 ? (
                  detailedReliability.contributions.map((con, idx) => {
                    const isPositive = con.contribution > 0;
                    return (
                      <div key={idx} className="flex gap-2.5 items-start text-xs border border-purple-100/60 bg-purple-50/30 rounded-2xl p-3 hover:bg-purple-50/60 transition-colors">
                        <span className="rounded-full bg-purple-100/80 border border-purple-200/70 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-800 select-none">
                          {con.evidenceId}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-[#2E1C4D]">{con.name}</span>
                            <span className={`font-bold ${isPositive ? 'text-purple-700' : 'text-rose-700'}`}>
                              {isPositive ? `+${con.contribution}` : con.contribution}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6A5A82] leading-normal">{con.explanation}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[11px] text-[#8A79A2] font-mono italic text-center py-4">
                    No active reliability factors calculated.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
