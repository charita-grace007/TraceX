import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Brain, 
  Percent, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { EmailCase, MLInferenceResult } from '@/src/types/index.ts';

interface MLClassificationPanelProps {
  emailCase: EmailCase;
}

export const MLClassificationPanel: React.FC<MLClassificationPanelProps> = ({ emailCase }) => {
  const [result, setResult] = useState<MLInferenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMLInference = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cases/${emailCase.id}/ml`);
      if (!res.ok) {
        throw new Error(`Failed to load ML analysis: HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error('[TRACE-X ML] Failed to load prediction:', err);
      setError(err.message || 'Scikit-learn classification engine offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMLInference();
  }, [emailCase.id]);

  const isPhishing = result?.predictedClass === 'PHISHING';
  const confidence = result 
    ? Math.round((isPhishing ? result.phishingProbability : result.benignProbability) * 100) 
    : 0;

  return (
    <div className="rounded-3xl border border-purple-100/70 bg-purple-50/20 p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-purple-100/70 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-purple-700 shrink-0" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#2E1C4D]">
              ML Classification
            </h3>
          </div>
          <p className="text-[10px] font-mono text-amber-700 flex items-center gap-1.5 font-bold mt-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span>SUPPORTING ML SIGNAL — NOT THE FORENSIC VERDICT</span>
          </p>
        </div>
        
        {result?.modelVersion && (
          <span className="rounded-full bg-white border border-purple-200/70 px-2.5 py-0.5 font-mono text-[9px] text-[#6A5A82] uppercase shadow-xs">
            Model: v{result.modelVersion}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-xs font-mono text-[#6A5A82]">
          <Loader2 className="h-4 w-4 animate-spin text-purple-700" />
          <span>Executing TF-IDF + scikit-learn Logistic Regression Inference...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 text-xs font-mono text-rose-800 space-y-1 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-bold">ML Classifier Error</span>
          </div>
          <p className="text-[11px] text-[#5E4E77] leading-relaxed">
            {error} (Fallback operational: using existing local deterministic metrics).
          </p>
        </div>
      ) : result ? (
        <div className="space-y-4">
          {/* Main decision and prob scale */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4 flex items-center gap-3 bg-white p-4 rounded-2xl border border-purple-100/70 shadow-xs">
              {isPhishing ? (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 shrink-0">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 shrink-0">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
              )}
              <div className="space-y-0.5">
                <div className="text-[9px] font-mono text-[#8A79A2]">Predicted Class</div>
                <div className={`text-sm font-mono font-black ${isPhishing ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {result.predictedClass}
                </div>
              </div>
            </div>

            {/* Probability Bars */}
            <div className="md:col-span-8 space-y-2.5 bg-white p-4 rounded-2xl border border-purple-100/70 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-rose-700 font-semibold">Phishing Probability</span>
                  <span className="font-bold text-rose-800">{(result.phishingProbability * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                    style={{ width: `${result.phishingProbability * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-700 font-semibold">Benign Probability</span>
                  <span className="font-bold text-emerald-800">{(result.benignProbability * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${result.benignProbability * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Explainability reasons */}
          {result.explainability?.reasons && result.explainability.reasons.length > 0 && (
            <div className="rounded-2xl bg-white border border-purple-100/70 p-4 space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6A5A82] font-bold">
                <Brain className="h-3.5 w-3.5 text-purple-700" />
                <span>Text Feature Weight Attribution (Explainability)</span>
              </div>
              <ul className="space-y-1.5">
                {result.explainability.reasons.map((reason, i) => (
                  <li key={i} className="text-xs text-[#5E4E77] flex items-start gap-2 font-sans leading-relaxed">
                    <span className="text-purple-600 shrink-0 font-mono mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
