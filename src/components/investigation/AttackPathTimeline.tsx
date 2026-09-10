import React, { useState } from 'react';
import {
  GitCommit,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Clock,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { EmailCase, AttackPathStep, PlaybookAction } from '@/src/types/index.ts';

interface AttackPathTimelineProps {
  emailCase: EmailCase;
  playbookActions?: PlaybookAction[];
}

export const AttackPathTimeline: React.FC<AttackPathTimelineProps> = ({ emailCase, playbookActions }) => {
  const [actions, setActions] = useState<PlaybookAction[]>(playbookActions || []);

  const toggleAction = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const getStatusBadge = (status: AttackPathStep['status']) => {
    switch (status) {
      case 'OBSERVED':
        return (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200 uppercase shadow-xs">
            OBSERVED IN EVIDENCE
          </span>
        );
      case 'INFERRED':
        return (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-800 border border-amber-200 uppercase shadow-xs">
            INFERRED STATISTICALLY
          </span>
        );
      case 'UNKNOWN':
        return (
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#6A5A82] border border-purple-200 uppercase shadow-xs">
            UNOBSERVED / BLIND SPOT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Attack Path Kill-Chain Reconstruction */}
      <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-purple-100/70 pb-3.5">
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-purple-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D]">
              Reconstructed Attack Sequence (Observed vs Inferred)
            </h3>
          </div>
          <span className="text-xs font-mono text-[#6A5A82]">
            Attack Vector: <strong className="text-purple-800">{emailCase.attackType}</strong>
          </span>
        </div>

        <div className="space-y-3">
          {emailCase.attackPath.map((step) => (
            <div
              key={step.stepIndex}
              className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-purple-200 transition-colors shadow-xs"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-purple-200/80 bg-purple-50 font-mono text-xs font-bold text-purple-800 mt-0.5 shadow-xs">
                  0{step.stepIndex}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase text-purple-700">
                      [{step.phase}]
                    </span>
                    <h4 className="text-xs font-semibold text-[#2E1C4D]">
                      {step.title}
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-[#6A5A82] leading-relaxed">
                    {step.description}
                  </p>
                  <div className="mt-1.5 font-mono text-[11px] text-[#8A79A2]">
                    Target Indicator: <strong className="text-[#2E1C4D]">{step.entityValue}</strong>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col sm:items-end gap-1.5">
                {getStatusBadge(step.status)}
                {step.evidenceId && (
                  <span className="text-[11px] font-mono text-[#8A79A2]">
                    Cites <strong className="text-purple-800">[{step.evidenceId}]</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adaptive Response Playbook */}
      <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-purple-100/70 pb-3.5">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-purple-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D]">
              Defensible Investigation & Mitigation Playbook
            </h3>
          </div>
          <span className="text-xs font-mono text-purple-800 font-bold">
            {actions.filter(a => a.completed).length} / {actions.length} Actions Completed
          </span>
        </div>

        <div className="space-y-2.5">
          {actions.map((act) => (
            <div
              key={act.id}
              onClick={() => toggleAction(act.id)}
              className={`flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition-all shadow-xs ${
                act.completed
                  ? 'border-emerald-200 bg-emerald-50/30 text-[#6A5A82]'
                  : 'border-purple-100/70 bg-purple-50/20 hover:border-purple-200 text-[#2E1C4D]'
              }`}
            >
              <input
                type="checkbox"
                checked={act.completed}
                onChange={() => {}}
                className="mt-0.5 rounded-md border-purple-300 text-purple-600 focus:ring-0 cursor-pointer h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs ${
                      act.priority === 'P0'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {act.priority}
                  </span>
                  <span className="text-xs font-semibold">{act.action}</span>
                </div>
                <div className="mt-1 text-[11px] text-[#6A5A82]">
                  {act.rationale}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
