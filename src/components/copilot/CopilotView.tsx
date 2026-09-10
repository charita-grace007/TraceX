import React, { useState } from 'react';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileText,
  HelpCircle,
  CheckCircle,
  HelpCircle as QuestionIcon,
  ChevronRight,
} from 'lucide-react';
import { EmailCase } from '@/src/types/index.ts';

interface CopilotViewProps {
  currentCase: EmailCase;
  onAskCopilot: (question: string) => Promise<{
    answer: string;
    citedEvidenceIds: string[];
    source: 'GEMINI_AI' | 'DETERMINISTIC_COPILOT';
  }>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citedEvidenceIds?: string[];
  source?: 'GEMINI_AI' | 'DETERMINISTIC_COPILOT';
  timestamp: string;
}

const AUDIT_QUESTIONS = [
  {
    id: 'q1',
    label: 'Suspicion Rationale',
    query: 'Why is this email suspicious?',
    description: 'Determines the initial warning triggers and forensic indicators.',
  },
  {
    id: 'q2',
    label: 'Supporting Evidence',
    query: 'What evidence supports the assessment?',
    description: 'Extracts deterministic proof points from the secure ledger.',
  },
  {
    id: 'q3',
    label: 'Contradictory Evidence',
    query: 'What evidence contradicts it?',
    description: 'Searches for legitimate parameters or false positive indicators.',
  },
  {
    id: 'q4',
    label: 'Involved Infrastructure',
    query: 'What infrastructure is involved?',
    description: 'Audits transit mail servers, fast-flux IPs, and hosting provider ASNs.',
  },
  {
    id: 'q5',
    label: 'Campaign Correlation',
    query: 'Is it connected to another campaign?',
    description: 'Examines cluster relationships and internal blast radius exposure.',
  },
  {
    id: 'q6',
    label: 'Recommended Playbook',
    query: 'What should the analyst investigate next?',
    description: 'Provides tactical containment and defense instructions.',
  },
  {
    id: 'q7',
    label: 'Falsifiability Criteria',
    query: 'What evidence would change the current assessment?',
    description: 'Defines the boundaries required to downgrade or clear the threat.',
  },
];

export const CopilotView: React.FC<CopilotViewProps> = ({ currentCase, onAskCopilot }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `I am your **TRACE-X Evidence-Grounded SOC Copilot** for **${currentCase.caseNumber}**.\n\n*Strict Architecture Boundary:* My responses are strictly constrained to the **${currentCase.evidenceList.length} deterministic evidence items** in your ledger. I will format analyses in dedicated categories and cite direct \`[EV-xx]\` tags.\n\nSelect a forensic checkpoint on the left to start a structured audit, or type any custom query in the terminal.`,
      timestamp: new Date().toISOString(),
      citedEvidenceIds: currentCase.evidenceList.slice(0, 1).map(e => e.id),
      source: 'DETERMINISTIC_COPILOT',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedAudits, setCompletedAudits] = useState<string[]>([]);

  const handleSend = async (questionText?: string, questionId?: string) => {
    const text = questionText || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await onAskCopilot(text);
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        citedEvidenceIds: response.citedEvidenceIds,
        source: response.source,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (questionId && !completedAudits.includes(questionId)) {
        setCompletedAudits(prev => [...prev, questionId]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error invoking copilot: ${err.message || 'Service temporarily unavailable.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-purple-100/70 bg-white p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full bg-purple-50 px-3 py-0.5 font-mono text-[10px] font-bold text-purple-800 border border-purple-200 uppercase shadow-xs">
              Evidence-Grounded AI Copilot
            </span>
            <span className="font-mono text-xs text-[#8A79A2]">SIH26106 INTERPRETATION ENGINE</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#2E1C4D]">
            Investigation Assistant for {currentCase.caseNumber}
          </h1>
          <p className="text-xs text-[#6A5A82]">
            Explains deterministic evidence, tracks falsifiability parameters, and recommends containment playbooks. Cannot hallucinate.
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100/80 bg-purple-50/50 px-4 py-2.5 text-xs font-mono text-purple-800 shrink-0 shadow-2xs">
          Target: <strong className="text-[#2E1C4D]">{currentCase.title}</strong>
        </div>
      </div>

      {/* Main Dual-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Forensic Checklist Panel */}
        <div className="lg:col-span-4 flex flex-col rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
          <div className="border-b border-purple-100/70 pb-3.5">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-700" />
              <span>Standard Forensic Audit Checkpoints</span>
            </h2>
            <p className="text-[10px] text-[#6A5A82] mt-1 leading-relaxed">
              Verify each of the 7 core investigation questions. Checks are automatically marked as queried upon copilot analysis.
            </p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {AUDIT_QUESTIONS.map((q) => {
              const isChecked = completedAudits.includes(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => handleSend(q.query, q.id)}
                  disabled={loading}
                  className={`w-full text-left rounded-2xl border p-3.5 font-mono transition-all flex items-start gap-2.5 group text-xs cursor-pointer shadow-2xs ${
                    isChecked
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                      : 'border-purple-100/70 bg-purple-50/20 text-[#5E4E77] hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isChecked ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <QuestionIcon className="h-4 w-4 text-[#8A79A2] group-hover:text-purple-700" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-0.5">
                    <div className="font-bold flex items-center justify-between text-[11px] text-[#2E1C4D]">
                      <span>{q.label}</span>
                      <ChevronRight className="h-3 w-3 text-[#8A79A2] group-hover:text-purple-700 transition-colors" />
                    </div>
                    <p className="text-[9px] text-[#6A5A82] leading-normal font-sans">
                      {q.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2.5 border-t border-purple-100/70 flex items-center justify-between text-[9px] font-mono text-[#6A5A82]">
            <span>Audit Progress:</span>
            <span className="font-bold text-[#2E1C4D]">{completedAudits.length} / 7 Checked</span>
          </div>
        </div>

        {/* Right Column: Chat Terminal Interface */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl border border-purple-100/70 bg-white h-[600px] overflow-hidden shadow-xs">
          {/* Chat Headers */}
          <div className="bg-gradient-to-r from-purple-50/40 via-white to-pink-50/30 px-6 py-3.5 border-b border-purple-100/70 flex items-center justify-between font-mono text-[10px] text-[#6A5A82]">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-purple-800">
              <BotMessageSquare className="h-4 w-4 text-purple-700" />
              <span>TRACE-X Grounded Copilot Session</span>
            </span>
            <span>Case ID: {currentCase.id}</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs bg-[#fafaff]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 text-[10px] text-[#8A79A2] mb-1 px-1">
                  <span className="font-semibold text-[#6A5A82]">{msg.role === 'user' ? 'SOC Analyst' : 'TRACE-X Copilot'}</span>
                  {msg.source && (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] text-purple-800 font-bold uppercase border border-purple-200">
                      {msg.source === 'GEMINI_AI' ? 'GEMINI 1.5 FLASH' : 'DETERMINISTIC CO-ENGINE'}
                    </span>
                  )}
                  <span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`max-w-2xl rounded-2xl p-4.5 leading-relaxed whitespace-pre-wrap shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-[#2E1C4D] text-white font-medium rounded-tr-none'
                      : 'bg-white text-[#2E1C4D] border border-purple-100/80 rounded-tl-none'
                  }`}
                >
                  {msg.content}

                  {/* Cited Evidence Tags */}
                  {msg.citedEvidenceIds && msg.citedEvidenceIds.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-purple-100/70 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-[#8A79A2] uppercase font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-purple-700" />
                        Cited Evidence:
                      </span>
                      {msg.citedEvidenceIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-full bg-purple-50 px-2.5 py-0.5 font-bold text-purple-800 border border-purple-200 text-[10px]"
                        >
                          [{id}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-mono text-purple-800 py-2">
                <Sparkles className="h-4 w-4 animate-spin text-purple-600" />
                <span>Running grounded model checks over active evidence structures...</span>
              </div>
            )}
          </div>

          {/* Interactive Chat Input Terminal */}
          <div className="border-t border-purple-100/70 p-4 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Query case details or type custom threat analyst prompts..."
                className="flex-1 rounded-2xl border border-purple-100/80 bg-[#fafaff] px-4 py-2.5 text-xs font-mono text-[#2E1C4D] placeholder-[#A090B5] focus:border-purple-400 focus:bg-white focus:outline-none shadow-2xs"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex items-center gap-2 rounded-2xl bg-[#2E1C4D] hover:bg-[#432968] px-5 py-2.5 text-xs font-mono font-bold text-white disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                <Send className="h-4 w-4" />
                <span>SEND</span>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
