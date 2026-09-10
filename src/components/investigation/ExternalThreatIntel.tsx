import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Zap, 
  AlertTriangle, 
  Globe, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  ShieldCheck,
  HelpCircle,
  Activity,
  Check,
  X
} from 'lucide-react';
import { EmailCase, ThreatIntelResult } from '@/src/types/index.ts';

interface ExternalThreatIntelProps {
  emailCase: EmailCase;
}

export const ExternalThreatIntel: React.FC<ExternalThreatIntelProps> = ({ emailCase }) => {
  const [intel, setIntel] = useState<ThreatIntelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWarningFor, setShowWarningFor] = useState<string | null>(null);

  const fetchIntel = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cases/${emailCase.id}/intel`);
      if (!res.ok) {
        throw new Error(`Failed to load intelligence data: HTTP ${res.status}`);
      }
      const data = await res.json();
      setIntel(data);
    } catch (err: any) {
      console.error('[TRACE-X INTEL] Failed to fetch threat intel:', err);
      setError(err.message || 'Threat intelligence service unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel();
  }, [emailCase.id]);

  const handleActiveScan = async (url: string) => {
    setScanning(url);
    setShowWarningFor(null);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${emailCase.id}/intel/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ indicator: url })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
      }

      const scanResult = await res.json();
      
      // Update local state with new result
      setIntel(prev => {
        const index = prev.findIndex(item => item.indicator === url && item.provider === scanResult.provider);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = scanResult;
          return updated;
        }
        return [...prev, scanResult];
      });
    } catch (err: any) {
      console.error('[TRACE-X INTEL] Active scan submission failed:', err);
      setError(`Active URL Scan failed: ${err.message || 'Service offline'}`);
    } finally {
      setScanning(null);
    }
  };

  // Extract all HTTP/HTTPS indicators
  const urlIndicators = (emailCase.urls || []).map(u => u.originalUrl).filter(url => url.startsWith('http://') || url.startsWith('https://'));
  const domainIndicators = emailCase.domains || [];
  const ipIndicators = emailCase.ipAddresses || [];
  const allIndicators = Array.from(new Set([...urlIndicators, ...domainIndicators, ...ipIndicators]));
  const indicatorsToScan = urlIndicators;

  // Compute overall validation state & corroboration info
  const hasMaliciousMatch = intel.some(item => item.status === 'MALICIOUS');
  const hasSuspiciousMatch = intel.some(item => item.status === 'SUSPICIOUS');
  const isAllFailure = intel.length > 0 && intel.every(item => item.status === 'PROVIDER_FAILURE' || item.status === 'RATE_LIMITED' || item.status === 'OFFLINE');
  
  let corroborationStatus = 'NO KNOWN MATCH';
  let corroborationDetails = 'No known malicious record was found in the checked external intelligence source.';
  let corroborationSubText = 'No known malicious record was found; this does not establish legitimacy. A newly created phishing URL or domain may not yet exist in external databases.';
  let corroborationBadgeStyle = 'bg-white text-[#6A5A82] border-purple-200/70 shadow-xs';
  let corroborationBorderClass = 'border-purple-100/70';

  if (isAllFailure || (intel.length === 0 && loading)) {
    corroborationStatus = 'EXTERNAL VALIDATION UNAVAILABLE';
    corroborationDetails = 'External threat intelligence services are currently offline or unreachable.';
    corroborationSubText = 'Preserving the internal deterministic forensic verdict. The absence of external intelligence MUST NOT be treated as evidence of legitimacy.';
    corroborationBadgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs';
    corroborationBorderClass = 'border-amber-200/70';
  } else if (hasMaliciousMatch || hasSuspiciousMatch) {
    if (emailCase.decision.verdict === 'MALICIOUS' || emailCase.decision.verdict === 'SUSPICIOUS') {
      corroborationStatus = 'CORROBORATES';
      corroborationDetails = 'External intelligence corroborates the forensic assessment.';
      corroborationSubText = 'One or more checked indicators matched known malicious or suspicious threat feeds, confirming the internal deterministic threat verdict.';
      corroborationBadgeStyle = 'bg-rose-50 text-rose-800 border-rose-200 shadow-xs';
      corroborationBorderClass = 'border-rose-200/70';
    } else {
      corroborationStatus = 'CONFLICTING MATCHES';
      corroborationDetails = 'External lookups returned suspicious records, deviating from benign local assessment.';
      corroborationSubText = 'External databases contain malicious threat markers for indicators that do not trigger severe local forensic rules. Further triage recommended.';
      corroborationBadgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs';
      corroborationBorderClass = 'border-amber-200/70';
    }
  }

  // Map individual indicator status following task specification
  const getIndicatorUIStatus = (item: ThreatIntelResult) => {
    if (item.status === 'MALICIOUS') {
      return {
        label: 'KNOWN THREAT / MATCH FOUND',
        badge: 'bg-rose-50 text-rose-800 border-rose-200 rounded-full shadow-xs',
        icon: <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0" />
      };
    }
    if (item.status === 'SUSPICIOUS') {
      return {
        label: 'SUSPICIOUS MATCH',
        badge: 'bg-amber-50 text-amber-800 border-amber-200 rounded-full shadow-xs',
        icon: <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
      };
    }
    if (item.status === 'BENIGN') {
      return {
        label: 'NO KNOWN MATCH',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 rounded-full shadow-xs',
        icon: <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
      };
    }
    if (item.status === 'PROVIDER_FAILURE' || item.status === 'RATE_LIMITED' || item.status === 'OFFLINE') {
      return {
        label: 'UNAVAILABLE',
        badge: 'bg-white text-[#6A5A82] border-purple-200/70 rounded-full shadow-xs',
        icon: <AlertCircle className="h-4.5 w-4.5 text-[#8A79A2] shrink-0" />
      };
    }
    return {
      label: item.status.replace('_', ' '),
      badge: 'bg-purple-50 text-purple-800 border-purple-200 rounded-full shadow-xs',
      icon: <Clock className="h-4.5 w-4.5 text-purple-700 shrink-0" />
    };
  };

  return (
    <div className="rounded-3xl border border-purple-100/70 bg-purple-50/20 p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100/70 pb-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-purple-600 animate-pulse"></span>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#2E1C4D]">
              EXTERNAL VALIDATION
            </h3>
          </div>
          <p className="text-[11px] text-[#6A5A82]">
            Corroborates the internal deterministic forensic assessment against public reputation databases and live scanner registries.
          </p>
        </div>
        <button
          onClick={fetchIntel}
          disabled={loading}
          className="rounded-full border border-purple-200/70 bg-white px-3.5 py-1 text-[10px] font-mono font-bold text-purple-800 hover:bg-purple-50 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
        >
          {loading ? 'SYNCING...' : 'SYNC FEED'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 text-xs font-mono text-rose-800 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RELATIONSHIP DESIGN PATTERN FLOW */}
      <div className={`rounded-2xl border ${corroborationBorderClass} bg-white p-5 space-y-3.5 shadow-xs`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8A79A2]">
            VALIDATION RELATIONSHIP FLOW
          </span>
          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-extrabold uppercase tracking-wider border ${corroborationBadgeStyle}`}>
            {corroborationStatus}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-100/60">
          <div className="flex-1 space-y-1">
            <div className="text-[10px] font-mono font-semibold text-[#8A79A2] uppercase">INTERNAL FORENSIC ASSESSMENT</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-[#2E1C4D]">
                Verdict: {emailCase.decision.verdict}
              </span>
              <span className="text-[10px] font-mono text-[#6A5A82] bg-white px-2 py-0.5 rounded-full border border-purple-200/70 shadow-xs">
                Deterministic Threat: {emailCase.decision.threatConfidence}%
              </span>
              <span className="text-[10px] font-mono text-[#6A5A82] bg-white px-2 py-0.5 rounded-full border border-purple-200/70 shadow-xs">
                Evidence Quality: {emailCase.decision.evidenceQuality}%
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-center font-bold text-purple-400 px-2 font-mono text-sm">
            ↓
          </div>

          <div className="flex-1 space-y-1">
            <div className="text-[10px] font-mono font-semibold text-[#8A79A2] uppercase">EXTERNAL THREAT-INTEL LOOKUP</div>
            <div className="text-xs font-mono font-semibold text-[#2E1C4D] flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-purple-700" />
              <span>{corroborationDetails}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#6A5A82] leading-relaxed font-sans bg-purple-50/20 p-3 rounded-xl border border-purple-100/60">
          {corroborationSubText}
        </p>
      </div>

      {/* INDIVIDUAL CHECKED INDICATORS LIST */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6A5A82]">
          INDICATOR LEVEL VERDICTS
        </h4>

        {loading && intel.length === 0 ? (
          <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-[#6A5A82]">
            <Loader2 className="h-4 w-4 animate-spin text-purple-700" />
            <span>Loading external validation...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show Checked Indicators first */}
            {intel.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intel.map((item, idx) => {
                  const ui = getIndicatorUIStatus(item);
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-2xl border p-4 space-y-3 flex flex-col justify-between transition-all shadow-xs ${
                        item.status === 'MALICIOUS' 
                          ? 'border-rose-200/80 bg-rose-50/40 hover:bg-rose-50/60' 
                          : item.status === 'SUSPICIOUS'
                          ? 'border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/60'
                          : item.status === 'BENIGN'
                          ? 'border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/60'
                          : 'border-purple-100/70 bg-white'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {ui.icon}
                            <span className="font-mono text-[10px] font-extrabold text-[#2E1C4D] uppercase tracking-wider">
                              {item.provider}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-extrabold border uppercase tracking-wider ${ui.badge}`}>
                            {ui.label}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[9px] font-mono text-[#8A79A2] uppercase">INDICATOR TARGET</div>
                          <div className="text-xs font-mono font-bold text-[#2E1C4D] truncate" title={item.indicator}>
                            {item.indicator}
                          </div>
                        </div>

                        {/* Explicit text as requested for BENIGN lookup */}
                        {item.status === 'BENIGN' ? (
                          <p className="text-[11px] text-emerald-800 leading-relaxed font-mono">
                            "No known malicious record was found in the checked external intelligence source."
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#5E4E77] leading-relaxed italic">
                            "{item.details || 'No extended metadata available.'}"
                          </p>
                        )}
                      </div>

                      <div className="border-t border-purple-100/80 pt-2.5 mt-1.5 flex items-center justify-between text-[10px] font-mono text-[#8A79A2]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-purple-400" />
                          <span>{new Date(item.lookupTime).toLocaleTimeString()}</span>
                        </div>
                        {item.referenceUrl && (
                          <a 
                            href={item.referenceUrl} 
                            target="_blank" 
                            referrerPolicy="no-referrer"
                            className="flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold transition-colors"
                          >
                            <span>View reference</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List any Unchecked indicators */}
            {allIndicators.filter(ind => !intel.some(item => item.indicator === ind)).map((ind, idx) => (
              <div 
                key={`unchecked-${idx}`} 
                className="rounded-2xl border border-purple-100/60 bg-white/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                    <span className="font-mono text-[10px] font-bold text-[#8A79A2] uppercase tracking-wider">
                      PASSIVE LOOKUP REGISTRY
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#2E1C4D] truncate max-w-lg" title={ind}>
                    {ind}
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full font-mono text-[9px] font-extrabold border bg-purple-50 text-[#6A5A82] border-purple-200/70 uppercase tracking-wider self-start sm:self-auto shadow-xs">
                  NOT CHECKED
                </span>
              </div>
            ))}

            {intel.length === 0 && allIndicators.length === 0 && (
              <div className="text-center py-6 space-y-1.5">
                <Globe className="h-8 w-8 text-purple-300 mx-auto" />
                <p className="text-xs font-mono text-[#6A5A82]">No external lookup history found for this incident.</p>
                <p className="text-[10px] text-[#8A79A2]">Initiate an active scan or sync feeds above to populate details.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Scan Launcher Console */}
      {indicatorsToScan.length > 0 && (
        <div className="rounded-2xl border border-purple-100/80 bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2E1C4D]">
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            <span>Active submission sandbox console</span>
          </div>

          <div className="space-y-2.5">
            {indicatorsToScan.map((url, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/30 p-3.5 rounded-2xl border border-purple-100/60 shadow-xs">
                <span className="text-[11px] font-mono text-[#2E1C4D] truncate max-w-sm sm:max-w-md" title={url}>
                  {url}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {showWarningFor === url ? (
                    <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-sans max-w-md shadow-xs">
                      <div className="flex items-start gap-1.5 text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span className="font-bold">Third-Party Disclosure Warning</span>
                      </div>
                      <p className="text-[11px] text-[#5E4E77] leading-relaxed">
                        Submitting this URL to urlscan.io transfers ownership of the lookup indicator to a public, third-party scanner. Any parameters, email targets, or private access tokens within this link may become publicly viewable.
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => handleActiveScan(url)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors shadow-xs"
                        >
                          I UNDERSTAND, SCAN NOW
                        </button>
                        <button
                          onClick={() => setShowWarningFor(null)}
                          className="text-[#6A5A82] hover:text-[#2E1C4D] font-mono text-[10px] px-2"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowWarningFor(url)}
                      disabled={scanning !== null}
                      className="flex items-center gap-1.5 rounded-full bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 font-mono text-[10px] font-bold px-3.5 py-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {scanning === url ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-purple-700" />
                          <span>SUBMITTING...</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3 w-3 text-purple-700" />
                          <span>SCAN WITH URLSCAN</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

