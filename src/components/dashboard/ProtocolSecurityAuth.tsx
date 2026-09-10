import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  ArrowRight, 
  HelpCircle,
  Database,
  Eye,
  EyeOff,
  Sparkles,
  Fingerprint
} from 'lucide-react';
import { EmailCase, ProtocolStatus, AuthEvidenceRecord } from '@/src/types/index.ts';

interface ProtocolSecurityAuthProps {
  emailCase: EmailCase;
}

export const ProtocolSecurityAuth: React.FC<ProtocolSecurityAuthProps> = ({ emailCase }) => {
  const { authAnalysis } = emailCase;
  const [showLedger, setShowLedger] = useState(true);

  const renderStatusIcon = (status: ProtocolStatus) => {
    switch (status) {
      case 'PASS':
        return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
      case 'FAIL':
        return <ShieldAlert className="h-4 w-4 text-rose-600" />;
      case 'SOFTFAIL':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusBgClass = (status: ProtocolStatus) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-50/60 border-emerald-200/70 text-emerald-800';
      case 'FAIL':
        return 'bg-rose-50/60 border-rose-200/70 text-rose-800';
      case 'SOFTFAIL':
        return 'bg-amber-50/60 border-amber-200/70 text-amber-800';
      default:
        return 'bg-purple-50/40 border-purple-100/80 text-[#6A5A82]';
    }
  };

  // Generate fallback evidence records if not populated by the server
  const evidenceRecords: AuthEvidenceRecord[] = authAnalysis.evidenceRecords || [
    {
      id: 'AUTH-EV-SPF',
      category: 'SPF',
      observedValue: authAnalysis.spf.status,
      explanation: authAnalysis.spf.status === 'PASS'
        ? `SPF verification passed. The sending IP "${authAnalysis.spf.clientIp || 'Unknown'}" is officially authorized to dispatch email on behalf of "${authAnalysis.spf.domain}".`
        : authAnalysis.spf.status === 'FAIL'
        ? `SPF verification failed. The sending IP is not authorized in the DNS TXT SPF record of "${authAnalysis.spf.domain}".`
        : `SPF verification returned status "${authAnalysis.spf.status}".`,
      reliability: 'HIGH',
      sourceField: 'Authentication-Results (spf)',
    },
    {
      id: 'AUTH-EV-DKIM',
      category: 'DKIM',
      observedValue: authAnalysis.dkim.status,
      explanation: authAnalysis.dkim.status === 'PASS'
        ? `DKIM cryptographic signature verified successfully. The body hash matches and aligns with the sender domain "${authAnalysis.dkim.domain || 'N/A'}", proving message integrity.`
        : authAnalysis.dkim.status === 'FAIL'
        ? `DKIM cryptographic signature verification failed. The body hash mismatched or the signature was invalid.`
        : `DKIM verification returned status "${authAnalysis.dkim.status}".`,
      reliability: 'HIGH',
      sourceField: 'Authentication-Results (dkim)',
    },
    {
      id: 'AUTH-EV-DMARC',
      category: 'DMARC',
      observedValue: authAnalysis.dmarc.status,
      explanation: authAnalysis.dmarc.status === 'PASS'
        ? `DMARC policy aligned. SPF and/or DKIM successfully verified and aligned with the header From domain.`
        : authAnalysis.dmarc.status === 'FAIL'
        ? `DMARC policy alignment failed. Neither SPF nor DKIM passed and aligned with the From domain, indicating spoofing or lack of validation.`
        : `DMARC verification returned status "${authAnalysis.dmarc.status}".`,
      reliability: 'HIGH',
      sourceField: 'Authentication-Results (dmarc)',
    },
    {
      id: 'AUTH-EV-DISPLAY',
      category: 'DISPLAY_NAME_SPOOF',
      observedValue: authAnalysis.displaySpoofing.isSpoofed ? 'MISMATCH_DETECTED' : 'ALIGNED',
      explanation: authAnalysis.displaySpoofing.explanation || 'Display name matches sender domain.',
      reliability: 'HIGH',
      sourceField: 'From',
    },
    {
      id: 'AUTH-EV-REPLY',
      category: 'REPLY_TO_MISMATCH',
      observedValue: authAnalysis.replyToMismatch.hasMismatch ? 'MISMATCH_DETECTED' : 'ALIGNED',
      explanation: authAnalysis.replyToMismatch.hasMismatch 
        ? `Replies are diverted to external destination "${authAnalysis.replyToMismatch.replyTo}" which differs from From sender "${authAnalysis.replyToMismatch.headerFrom}".`
        : 'Reply-To header is aligned with From sender.',
      reliability: 'HIGH',
      sourceField: 'Reply-To',
    }
  ];

  return (
    <div className="rounded-3xl border border-purple-100/70 bg-purple-50/20 p-6 space-y-5">
      {/* Header and Toggle */}
      <div className="flex items-center justify-between border-b border-purple-100/70 pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-purple-700" />
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#2E1C4D]">
            RFC Protocol Authentication Analysis
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowLedger(!showLedger)}
          className="flex items-center gap-1.5 text-[10px] font-mono font-bold bg-white border border-purple-200/70 rounded-full px-3 py-1 text-[#6A5A82] hover:text-purple-700 shadow-xs transition-colors cursor-pointer"
        >
          {showLedger ? (
            <>
              <EyeOff className="h-3 w-3" />
              <span>Hide Evidence Records</span>
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              <span>Show Evidence Records ({evidenceRecords.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Grid of SPF / DKIM / DMARC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* SPF */}
        <div className={`relative rounded-2xl border p-4 space-y-2 transition-all hover:scale-[1.01] shadow-xs ${getStatusBgClass(authAnalysis.spf.status)}`}>
          <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 font-mono text-[8px] font-bold text-purple-800 border border-purple-200/70 shadow-xs">
            AUTH-EV-SPF
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#2E1C4D]">SPF Record</span>
            {renderStatusIcon(authAnalysis.spf.status)}
          </div>
          <div className="space-y-1 font-mono text-[10px] pt-1">
            <div className="flex justify-between">
              <span className="text-[#6A5A82]">Status:</span>
              <span className="font-bold">{authAnalysis.spf.status}</span>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-[#6A5A82] pr-1">IP:</span>
              <span className="truncate max-w-[120px] font-bold text-[#2E1C4D]" title={authAnalysis.spf.clientIp}>
                {authAnalysis.spf.clientIp || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-[#6A5A82] pr-1">Domain:</span>
              <span className="truncate max-w-[120px]" title={authAnalysis.spf.domain}>
                {authAnalysis.spf.domain}
              </span>
            </div>
          </div>
        </div>

        {/* DKIM */}
        <div className={`relative rounded-2xl border p-4 space-y-2 transition-all hover:scale-[1.01] shadow-xs ${getStatusBgClass(authAnalysis.dkim.status)}`}>
          <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 font-mono text-[8px] font-bold text-purple-800 border border-purple-200/70 shadow-xs">
            AUTH-EV-DKIM
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#2E1C4D]">DKIM Signature</span>
            {renderStatusIcon(authAnalysis.dkim.status)}
          </div>
          <div className="space-y-1 font-mono text-[10px] pt-1">
            <div className="flex justify-between">
              <span className="text-[#6A5A82]">Status:</span>
              <span className="font-bold">{authAnalysis.dkim.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6A5A82]">Selector:</span>
              <span className="truncate max-w-[120px]">{authAnalysis.dkim.selector || 'N/A'}</span>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-[#6A5A82] pr-1">Domain:</span>
              <span className="truncate max-w-[120px]" title={authAnalysis.dkim.domain}>
                {authAnalysis.dkim.domain || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* DMARC */}
        <div className={`relative rounded-2xl border p-4 space-y-2 transition-all hover:scale-[1.01] shadow-xs ${getStatusBgClass(authAnalysis.dmarc.status)}`}>
          <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 font-mono text-[8px] font-bold text-purple-800 border border-purple-200/70 shadow-xs">
            AUTH-EV-DMARC
          </span>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#2E1C4D]">DMARC Alignment</span>
            {renderStatusIcon(authAnalysis.dmarc.status)}
          </div>
          <div className="space-y-1 font-mono text-[10px] pt-1">
            <div className="flex justify-between">
              <span className="text-[#6A5A82]">Status:</span>
              <span className="font-bold">{authAnalysis.dmarc.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6A5A82]">Policy:</span>
              <span className="font-bold text-purple-700">{authAnalysis.dmarc.policy || 'NONE'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6A5A82]">Aligned:</span>
              <span className="font-bold">{authAnalysis.dmarc.aligned ? 'YES' : 'NO'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spoofing Warnings */}
      <div className="space-y-2.5">
        {/* Display Name Spoofing Alerts */}
        {authAnalysis.displaySpoofing.isSpoofed && (
          <div className="relative rounded-2xl bg-rose-50/70 border border-rose-200/70 p-4 flex gap-3 text-xs shadow-xs">
            <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 font-mono text-[8px] font-bold text-rose-800 border border-rose-200 shadow-xs">
              AUTH-EV-DISPLAY
            </span>
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1 flex-1">
              <div className="font-mono font-bold text-rose-800 flex items-center gap-1.5">
                <span>Display Name Impersonation Detected</span>
              </div>
              <p className="text-[#5E4E77] leading-normal font-sans pr-16">{authAnalysis.displaySpoofing.explanation}</p>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] font-mono text-[#6A5A82]">
                <span>Claims: <strong className="text-[#2E1C4D]">{authAnalysis.displaySpoofing.displayName}</strong></span>
                <span className="hidden sm:inline text-purple-200">|</span>
                <span>Actual Email: <strong className="text-rose-700">{authAnalysis.displaySpoofing.actualEmail}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Reply-To Mismatch Indicators */}
        {authAnalysis.replyToMismatch.hasMismatch && (
          <div className="relative rounded-2xl bg-amber-50/70 border border-amber-200/70 p-4 flex gap-3 text-xs shadow-xs">
            <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 font-mono text-[8px] font-bold text-amber-800 border border-amber-200 shadow-xs">
              AUTH-EV-REPLY
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-mono font-bold text-amber-800">Reply-To Routing Mismatch</div>
              <p className="text-[#5E4E77] leading-normal font-sans pr-16">
                E-mail replies are routed away from the sending mailbox, a typical sign of dialog hijacking in payment fraud or executive lures.
              </p>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1.5 text-[10px] font-mono text-[#6A5A82]">
                <span>Header From: <strong className="text-[#2E1C4D]">{authAnalysis.replyToMismatch.headerFrom}</strong></span>
                <ArrowRight className="h-3 w-3 text-amber-600 hidden sm:inline" />
                <span>Reply-To Trap: <strong className="text-amber-700">{authAnalysis.replyToMismatch.replyTo}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Safe State Message */}
        {!authAnalysis.displaySpoofing.isSpoofed && !authAnalysis.replyToMismatch.hasMismatch && (
          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-3.5 flex gap-2.5 text-xs text-emerald-800 font-mono shadow-xs">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>Sender identity attributes align correctly. No display name spoofing or Reply-To divergence identified.</span>
          </div>
        )}
      </div>

      {/* Structured Evidence Records Ledger */}
      {showLedger && (
        <div className="mt-4 border-t border-purple-100/70 pt-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-purple-700 uppercase">
            <Fingerprint className="h-4 w-4" />
            <span>DETERMINISTIC SECURITY EVIDENCE LEDGER</span>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-purple-100/80 bg-white shadow-xs">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="border-b border-purple-100/70 bg-purple-50/40 text-[#6A5A82]">
                <tr>
                  <th className="px-3 py-2.5 w-[110px]">Evidence ID</th>
                  <th className="px-3 py-2.5 w-[140px]">Category</th>
                  <th className="px-3 py-2.5 w-[130px]">Observed Value</th>
                  <th className="px-3 py-2.5">Technical Explanation</th>
                  <th className="px-3 py-2.5 w-[150px]">Source Field</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50 text-[#5E4E77]">
                {evidenceRecords.map((rec) => {
                  const isFail = rec.observedValue === 'FAIL' || rec.observedValue === 'MISMATCH_DETECTED';
                  const isPass = rec.observedValue === 'PASS' || rec.observedValue === 'ALIGNED';
                  
                  return (
                    <tr key={rec.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-purple-700">
                        {rec.id}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-purple-50 border border-purple-100/80 px-2 py-0.5 text-[#5E4E77] uppercase text-[9px] font-bold">
                          {rec.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          isPass 
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                            : isFail 
                            ? 'bg-rose-50 border border-rose-200 text-rose-800' 
                            : 'bg-amber-50 border border-amber-200 text-amber-800'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isPass ? 'bg-emerald-600' : isFail ? 'bg-rose-600' : 'bg-amber-600'}`} />
                          <span>{rec.observedValue}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[#2E1C4D] font-sans leading-relaxed text-[11px]">
                        {rec.explanation}
                      </td>
                      <td className="px-3 py-2.5 text-[#8A79A2] text-[10px] truncate max-w-[150px]" title={rec.sourceField}>
                        {rec.sourceField}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
