import React, { useState } from 'react';
import { 
  Globe, 
  Link2, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  AlertCircle, 
  ChevronRight,
  Info,
  HelpCircle,
  Fingerprint
} from 'lucide-react';
import { EmailCase, ExtractedUrl } from '@/src/types/index.ts';

interface SuspiciousIndicatorsListProps {
  emailCase: EmailCase;
}

export const SuspiciousIndicatorsList: React.FC<SuspiciousIndicatorsListProps> = ({ emailCase }) => {
  const { urls = [], domains = [] } = emailCase;
  const [selectedUrlIndex, setSelectedUrlIndex] = useState<number | null>(urls.length > 0 ? 0 : null);

  const unusualTlds = [
    'info', 'xyz', 'top', 'click', 'buzz', 'club', 'work', 'support',
    'live', 'icu', 'gdn', 'vip', 'fit', 'ru', 'cn', 'tk', 'ml', 'cf'
  ];

  // Client-side domain detector helper
  const analyzeDomainDeterministically = (domainName: string) => {
    const findings: string[] = [];
    const lower = domainName.toLowerCase();
    
    // Punycode
    if (lower.startsWith('xn--')) {
      findings.push('Punycode encoded domain (potential internationalized domain spoofing homoglyph)');
    }

    // Excessive subdomains
    const parts = lower.split('.');
    if (parts.length > 3) {
      findings.push(`Excessive subdomains (${parts.length - 2} subdomains found)`);
    }

    // Unusual TLD
    const tld = parts[parts.length - 1];
    if (unusualTlds.includes(tld)) {
      findings.push(`Unusual top-level domain (.${tld})`);
    }

    // Suspicious character substitutions
    const isSubstitution = (
      /micros0ft/i.test(lower) ||
      /paypa1/i.test(lower) ||
      /g00gle/i.test(lower) ||
      /offic3/i.test(lower) ||
      /out1ook/i.test(lower) ||
      lower.includes('rnicrosoft') ||
      lower.includes('vvicrosoft')
    );
    if (isSubstitution) {
      findings.push('Suspicious character substitutions (typosquatting)');
    }

    // Brand mismatch
    const brands = ['microsoft', 'office', 'paypal', 'google', 'stripe', 'amazon', 'apple'];
    brands.forEach(b => {
      if (lower.includes(b)) {
        const officialMap: Record<string, string[]> = {
          'microsoft': ['microsoft.com', 'office.com', 'live.com', 'windows.net'],
          'office': ['office.com', 'office365.com'],
          'paypal': ['paypal.com'],
          'google': ['google.com', 'gmail.com'],
          'stripe': ['stripe.com'],
          'amazon': ['amazon.com', 'aws.amazon.com'],
          'apple': ['apple.com', 'icloud.com']
        };
        const officials = officialMap[b] || [];
        const matchesOfficial = officials.some(official => lower === official || lower.endsWith('.' + official));
        if (!matchesOfficial) {
          findings.push(`Claims Brand "${b}" but resolved domain is not official`);
        }
      }
    });

    return {
      domain: domainName,
      isClean: findings.length === 0,
      findings
    };
  };

  return (
    <div className="rounded-3xl border border-purple-100/70 bg-purple-50/20 p-6 space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-purple-100/70 pb-3.5">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#2E1C4D] flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-700" />
            <span>EXTRACTED DOMAINS & EMBEDDED URL FORENSICS</span>
          </h3>
          <p className="text-[10px] text-[#6A5A82] font-mono">
            Deterministic syntax inspection and brand alignment verification.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-white px-3 py-0.5 font-mono text-[10px] text-[#6A5A82] border border-purple-200/70 shadow-xs">
            {domains.length} Domains
          </span>
          <span className="rounded-full bg-purple-100/80 px-3 py-0.5 font-mono text-[10px] text-purple-800 border border-purple-200/80 shadow-xs font-bold">
            {urls.length} URLs
          </span>
        </div>
      </div>

      {/* DOMAIN ANALYST RADAR */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-mono font-bold tracking-wider text-[#6A5A82] uppercase flex items-center gap-1.5">
          <Fingerprint className="h-3.5 w-3.5 text-purple-700" />
          <span>DOMAIN SECURITY REPUTATION FLAGS</span>
        </span>
        
        {domains.length === 0 ? (
          <div className="text-[10px] text-[#8A79A2] italic font-mono pl-2">No unique domains extracted.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {domains.map((dom, idx) => {
              const analysis = analyzeDomainDeterministically(dom);
              return (
                <div 
                  key={idx} 
                  className={`rounded-2xl border p-3.5 font-mono text-xs flex items-start gap-2.5 transition-all shadow-xs ${
                    analysis.isClean 
                      ? 'bg-white/90 border-purple-100/70 hover:bg-purple-50/40 hover:border-purple-200/80' 
                      : 'bg-rose-50/70 border-rose-200/70 hover:bg-rose-50/90'
                  }`}
                >
                  {analysis.isClean ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#2E1C4D] truncate" title={dom}>
                        {dom}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        analysis.isClean ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {analysis.isClean ? 'CLEAN' : 'WARNING'}
                      </span>
                    </div>
                    {analysis.findings.length > 0 ? (
                      <ul className="space-y-0.5 pt-1">
                        {analysis.findings.map((f, fIdx) => (
                          <li key={fIdx} className="text-[10px] text-rose-700 flex items-start gap-1">
                            <span className="text-rose-500/80">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[9.5px] text-[#8A79A2] leading-none">No immediate brand, punycode, or TLD violations detected.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* URL DETAIL INSPECTOR MODULE */}
      <div className="space-y-3 pt-2">
        <span className="text-[10px] font-mono font-bold tracking-wider text-[#6A5A82] uppercase flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-purple-700" />
          <span>DEEP SYNTAX URL FORENSIC REPORT</span>
        </span>

        {urls.length === 0 ? (
          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-4 text-center text-xs font-mono text-emerald-800 flex items-center justify-center gap-2 shadow-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>No embedded links detected in EML HTML content or plaintext envelopes.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left URL Selector list */}
            <div className="lg:col-span-5 space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {urls.map((url, idx) => {
                const isSelected = selectedUrlIndex === idx;
                const hasIssues = (url.suspiciousCharacteristics || []).length > 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedUrlIndex(idx)}
                    className={`w-full text-left rounded-2xl p-3 border transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs ${
                      isSelected 
                        ? 'bg-white border-purple-300 ring-2 ring-purple-200/60' 
                        : 'bg-white/80 border-purple-100/60 hover:bg-white hover:border-purple-200/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${hasIssues ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="font-mono text-[11px] font-bold text-[#2E1C4D] truncate block">
                          {url.domain}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-[#6A5A82] truncate block pl-3.5">
                        {url.originalUrl}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 font-mono">
                      <div className="text-right">
                        <div className="text-[8px] text-[#8A79A2]">Risk</div>
                        <div className={`text-[10px] font-bold ${url.riskScore >= 70 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {url.riskScore}%
                        </div>
                      </div>
                      <ChevronRight className={`h-3 w-3 text-purple-300 transition-transform ${isSelected ? 'translate-x-0.5 text-purple-700' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Detailed Inspector View */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-purple-100/80 p-5 space-y-4 font-mono text-xs shadow-xs">
              {selectedUrlIndex !== null && urls[selectedUrlIndex] ? (() => {
                const url = urls[selectedUrlIndex];
                const cleanHost = url.hostname || url.domain || 'unknown';
                const regDomain = url.registrableDomain || cleanHost;
                const hasIssues = (url.suspiciousCharacteristics || []).length > 0;

                return (
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between gap-2 border-b border-purple-100/70 pb-2.5">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-[#8A79A2] uppercase tracking-widest block">URL FORENSICS OBJECT</span>
                        <span className="font-bold text-[#2E1C4D] text-xs break-all">{cleanHost}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {url.isHttps ? (
                          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-bold flex items-center gap-1 shadow-xs">
                            <Lock className="h-3 w-3 text-emerald-600" />
                            <span>HTTPS SECURE</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-[9px] font-bold flex items-center gap-1 animate-pulse shadow-xs">
                            <Unlock className="h-3 w-3 text-rose-600" />
                            <span>INSECURE HTTP</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detailed Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/40 rounded-2xl p-4 border border-purple-100/60">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[#8A79A2] block">HOSTNAME</span>
                        <span className="text-[#2E1C4D] break-all text-[11px] font-semibold">{cleanHost}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[#8A79A2] block">REGISTRABLE DOMAIN</span>
                        <span className="text-[#2E1C4D] break-all text-[11px] font-semibold">{regDomain}</span>
                      </div>
                      <div className="space-y-0.5 sm:col-span-2">
                        <span className="text-[9px] text-[#8A79A2] block">PATH SPECIFIER</span>
                        <span className="text-[#2E1C4D] break-all text-[11px]">{url.path || '/'}</span>
                      </div>
                    </div>

                    {/* Complete URL Display */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-[#8A79A2] block">COMPLETE ENCODED URL</span>
                      <div className="rounded-2xl border border-purple-100/80 bg-purple-50/20 p-3.5 text-[10.5px] text-[#2E1C4D] select-all break-all relative group shadow-xs">
                        <span>{url.originalUrl}</span>
                        <a 
                          href={url.originalUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="absolute right-2 top-2 p-1.5 rounded-full bg-white border border-purple-200/70 hover:bg-purple-50 text-[#6A5A82] hover:text-purple-700 opacity-0 group-hover:opacity-100 transition-all shadow-xs"
                          title="Open Hyperlink in New Tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Suspicious Findings Analysis */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[9px] text-[#8A79A2] uppercase tracking-wider block">SYNTAX RISK AUDIT</span>
                      {hasIssues ? (
                        <div className="space-y-1.5">
                          {(url.suspiciousCharacteristics || []).map((char, idx) => (
                            <div key={idx} className="rounded-2xl bg-rose-50/80 border border-rose-200/70 px-3.5 py-2.5 text-[10.5px] text-rose-800 flex items-start gap-2.5 shadow-xs">
                              <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-bold text-rose-900">Anomalous Signature Observed</span>
                                <p className="text-[#5E4E77] font-sans leading-relaxed">{char}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/70 px-3.5 py-2.5 text-[11px] text-emerald-800 flex items-center gap-2 shadow-xs">
                          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Syntax alignment matches official criteria. No brand spoofing or character substitutions detected.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="h-full flex flex-col items-center justify-center text-[#8A79A2] text-center py-10 space-y-2">
                  <HelpCircle className="h-8 w-8 text-purple-200 animate-pulse" />
                  <span>Select an extracted URL from the left list to view complete technical parameters.</span>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
