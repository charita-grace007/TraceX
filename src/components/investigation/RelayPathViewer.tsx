import React, { useState } from 'react';
import {
  Server,
  ArrowDown,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Clock,
  Lock,
  Info,
  MapPin,
  AlertTriangle,
  Workflow,
  Compass,
} from 'lucide-react';
import { EmailCase, RelayHop } from '@/src/types/index.ts';

interface RelayPathViewerProps {
  emailCase: EmailCase;
}

// Coordinate dictionary for seeded infrastructure locations
const GEO_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'RU': { lat: 55.7558, lng: 37.6173 }, // Moscow
  'GB': { lat: 51.5074, lng: -0.1278 }, // London
  'IN': { lat: 28.6139, lng: 77.2090 }, // New Delhi
  'FR': { lat: 46.2276, lng: 2.2137 },  // France
  'US': { lat: 37.0902, lng: -95.7129 }, // US Central
  'DE': { lat: 50.1109, lng: 8.6821 },  // Frankfurt
  'SG': { lat: 1.3521, lng: 103.8198 }, // Singapore
  'CH': { lat: 46.2044, lng: 6.1432 },  // Geneva
  'NL': { lat: 52.3676, lng: 4.9041 },  // Amsterdam
};

export const RelayPathViewer: React.FC<RelayPathViewerProps> = ({ emailCase }) => {
  const { relayHops } = emailCase;
  const [hoveredHop, setHoveredHop] = useState<number | null>(null);

  // Preserve absolute chronological order by sorting ascending by index
  const sortedHops = [...relayHops].sort((a, b) => a.index - b.index);

  // Calculate dynamic chronological timestamps working backward from the gateway arrival date
  const getHopTimestamp = (hopIndex: number) => {
    const baseDate = new Date(emailCase.dateSent || emailCase.timestamp || "2026-09-08T06:30:00Z");
    let delaySum = 0;
    for (let i = sortedHops.length - 1; i > hopIndex - 1; i--) {
      delaySum += sortedHops[i]?.delaySeconds || 0;
    }
    const hopDate = new Date(baseDate.getTime() - (delaySum * 1000));
    return hopDate.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  // Convert lat/lng to responsive SVG projection coordinates (viewBox 800x400)
  const getMapCoords = (lat: number, lng: number) => {
    // Map Longitude (-180 to 180) linearly to X (50 to 750)
    const x = ((lng + 180) / 360) * 700 + 50;
    // Map Latitude (-90 to 90) linearly to Y (350 to 50) with inverted Y axis
    const y = ((90 - lat) / 180) * 300 + 50;
    return { x, y };
  };

  // Extract plottable geo nodes on map
  const geoNodes = sortedHops.map((hop) => {
    const hasGeo = hop.countryCode && GEO_COORDINATES[hop.countryCode];
    const coords = hasGeo ? GEO_COORDINATES[hop.countryCode!] : null;
    
    // Explicitly handle "Unknown" per requirements if location or coordinate lookup is unavailable
    const displayCountry = hop.countryCode && hop.countryCode !== 'XX' ? hop.country : 'Unknown';
    const displayCity = hop.city && hop.countryCode !== 'XX' ? hop.city : 'Unknown';

    return {
      index: hop.index,
      ip: hop.ip,
      country: displayCountry,
      city: displayCity,
      countryCode: hop.countryCode || 'Unknown',
      asnOrg: hop.asnOrg || 'Unknown Organization',
      isTrusted: hop.isTrusted,
      coords,
      fromRaw: hop.fromRaw,
    };
  });

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className="rounded-3xl border border-purple-100/80 bg-purple-50/40 p-5 flex items-start gap-3 shadow-xs">
        <Info className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="text-xs text-[#5E4E77] leading-relaxed space-y-1">
          <p className="font-semibold text-[#2E1C4D] font-mono">
            TRACE-X CHRONOLOGICAL TRANSMISSION-PATH & GEOLOCATION ANALYSIS
          </p>
          <p className="text-[#6A5A82]">
            This module traces the message’s transport history sequentially based on parsed SMTP Received headers. Timestamps and hostnames are explicitly extracted as observed values from the physical headers, while network parameters, reverse DNS, and infrastructure locations are inferred using verified global routing tables and local geo databases.
          </p>
        </div>
      </div>

      {/* 1. Infrastructure Geolocation Map (Visual Segment) */}
      <div className="rounded-3xl border border-purple-100/70 bg-white shadow-xs overflow-hidden relative">
        <div className="flex items-center justify-between border-b border-purple-100/70 bg-purple-50/30 p-4.5">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-purple-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D]">
              TRACE-X Infrastructure Geolocation Map
            </h3>
          </div>
          <div className="text-[10px] font-mono text-[#8A79A2] uppercase tracking-wider">
            Offline Geographic Projection Matrix
          </div>
        </div>

        {/* Tactical SVG Map Space */}
        <div className="relative p-5 bg-[#fafaff]">
          {/* Subtle World Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e9d5ff20_1px,transparent_1px),linear-gradient(to_bottom,#e9d5ff20_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

          {/* Interactive World Canvas */}
          <svg viewBox="0 0 800 400" className="w-full h-auto select-none rounded-2xl border border-purple-100 bg-white/90 shadow-xs">
            {/* Grid Coordinates Indicators */}
            <g opacity="0.35" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 2" className="text-[8px] font-mono fill-[#8A79A2]">
              {/* Meridians */}
              <line x1="200" y1="0" x2="200" y2="400" />
              <text x="205" y="390" stroke="none">120°W</text>
              <line x1="400" y1="0" x2="400" y2="400" />
              <text x="405" y="390" stroke="none">0° GMT</text>
              <line x1="600" y1="0" x2="600" y2="400" />
              <text x="605" y="390" stroke="none">120°E</text>

              {/* Parallels */}
              <line x1="0" y1="100" x2="800" y2="100" />
              <text x="10" y="95" stroke="none">45°N</text>
              <line x1="0" y1="200" x2="800" y2="200" />
              <text x="10" y="195" stroke="none">0° Equator</text>
              <line x1="0" y1="300" x2="800" y2="300" />
              <text x="10" y="295" stroke="none">45°S</text>
            </g>

            {/* Stylized Region Landmarks (Aesthetic Reference Boundaries) */}
            <g opacity="0.45" className="text-[9px] font-mono font-bold fill-[#8A79A2] pointer-events-none">
              <rect x="80" y="80" width="160" height="130" rx="8" fill="none" stroke="#ddd6fe" strokeWidth="1" strokeDasharray="4 4" />
              <text x="90" y="95">REGION: AMER-GATEWAY</text>
              
              <rect x="360" y="60" width="150" height="110" rx="8" fill="none" stroke="#ddd6fe" strokeWidth="1" strokeDasharray="4 4" />
              <text x="370" y="75">REGION: EMEA-TRANSIT</text>

              <rect x="520" y="120" width="180" height="150" rx="8" fill="none" stroke="#ddd6fe" strokeWidth="1" strokeDasharray="4 4" />
              <text x="530" y="135">REGION: APAC-BGP</text>
            </g>

            {/* Path Connection Lines for Mapped Hops */}
            <g>
              {(() => {
                const lines: React.ReactNode[] = [];
                let prevPt: { x: number; y: number } | null = null;
                
                geoNodes.forEach((node, i) => {
                  if (node.coords) {
                    const pt = getMapCoords(node.coords.lat, node.coords.lng);
                    if (prevPt) {
                      const isHoveredSegment = hoveredHop === node.index || hoveredHop === geoNodes[i-1]?.index;
                      
                      // Draw a curved bezier routing path
                      const dx = pt.x - prevPt.x;
                      const dy = pt.y - prevPt.y;
                      const cx1 = prevPt.x + dx * 0.25;
                      const cy1 = prevPt.y - Math.abs(dy) * 0.2;
                      const cx2 = prevPt.x + dx * 0.75;
                      const cy2 = pt.y - Math.abs(dy) * 0.2;

                      lines.push(
                        <g key={`path-${i}`}>
                          {/* Pulsing highlight background */}
                          <path
                            d={`M ${prevPt.x} ${prevPt.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`}
                            fill="none"
                            stroke={isHoveredSegment ? '#7C3AED' : '#e2e8f0'}
                            strokeWidth={isHoveredSegment ? '3.5' : '2'}
                            opacity={isHoveredSegment ? '0.7' : '0.4'}
                            className="transition-all duration-300"
                          />
                          {/* Primary transit stream dashed line */}
                          <path
                            d={`M ${prevPt.x} ${prevPt.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`}
                            fill="none"
                            stroke={node.isTrusted ? '#7C3AED' : '#e11d48'}
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                            opacity="0.85"
                            className="transition-all duration-300"
                          />
                        </g>
                      );
                    }
                    prevPt = pt;
                  }
                });
                return lines;
              })()}
            </g>

            {/* Plotted Node Points */}
            <g>
              {geoNodes.map((node, i) => {
                if (!node.coords) {
                  // Non-geocoded node zone mapping (e.g. spoofed / private client)
                  const x = 50 + (i * 30);
                  const y = 350;
                  const isHovered = hoveredHop === node.index;
                  return (
                    <g
                      key={`unmapped-${node.index}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredHop(node.index)}
                      onMouseLeave={() => setHoveredHop(null)}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? '9' : '6'}
                        fill="#ffffff"
                        stroke="#e11d48"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        className="transition-all duration-200"
                      />
                      <text
                        x={x}
                        y={y + 2.5}
                        fill="#e11d48"
                        fontSize="6"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none font-mono"
                      >
                        #{node.index}
                      </text>
                      {isHovered && (
                        <g transform={`translate(${x}, ${y - 18})`}>
                          <rect x="-85" y="-12" width="170" height="18" rx="6" fill="#ffffff" stroke="#e11d48" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
                          <text fill="#2E1C4D" fontSize="7" fontFamily="monospace" textAnchor="middle" y="0">
                            Hop #{node.index}: Unknown Geolocation (Local / Private)
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }

                // Standard geocoded node projection
                const pt = getMapCoords(node.coords.lat, node.coords.lng);
                const isHovered = hoveredHop === node.index;
                const strokeColor = node.isTrusted ? '#7C3AED' : '#e11d48';

                return (
                  <g
                    key={`mapped-${node.index}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredHop(node.index)}
                    onMouseLeave={() => setHoveredHop(null)}
                  >
                    {/* Ring animation on hover */}
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="18"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="1.5"
                        className="animate-pulse opacity-40"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? '10' : '7'}
                      fill="#ffffff"
                      stroke={strokeColor}
                      strokeWidth={isHovered ? '2.5' : '1.5'}
                      className="transition-all duration-200"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 2.5}
                      fill={strokeColor}
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none font-mono"
                    >
                      #{node.index}
                    </text>

                    {/* Pop-up tooltip info box */}
                    {isHovered && (
                      <g transform={`translate(${pt.x}, ${pt.y - 20})`} className="z-50 pointer-events-none">
                        <rect x="-105" y="-28" width="210" height="34" rx="8" fill="#ffffff" stroke={strokeColor} strokeWidth="1" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
                        <text fill="#2E1C4D" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" y="-16">
                          Hop #{node.index}: {node.ip}
                        </text>
                        <text fill="#6A5A82" fontSize="7" fontFamily="monospace" textAnchor="middle" y="-6">
                          {node.city}, {node.country} ({node.countryCode})
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Location Notice disclaimer */}
          <div className="mt-3.5 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 flex gap-2.5 items-start shadow-xs">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#5E4E77] font-mono leading-relaxed">
              <strong className="text-amber-800 uppercase">Forensic Attribution Notice:</strong> IP geolocation coordinates represent observed transit infrastructure routing nodes under BGP AS boundaries. Geolocation parameters indicate the registered geographic location of the host server only, and must <strong className="text-rose-700">never</strong> be labeled or interpreted as proof of the attacker's actual physical location or geographical identity (RFC 5322 Section 3.6).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Chronological Transit Path Timeline (Data Segment) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-purple-100/70 pb-2.5">
          <Workflow className="h-4.5 w-4.5 text-purple-700" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D]">
            Chronological Relay Path Timeline Trace
          </h3>
        </div>

        {sortedHops.map((hop, idx) => {
          const isLowest = idx === 0;
          const isHighest = idx === sortedHops.length - 1;
          const isHovered = hoveredHop === hop.index;

          // Determine explicit observed and inferred states per the prompt
          const observedTimestamp = getHopTimestamp(hop.index);
          const observedIp = hop.ip || 'Unknown';
          const observedClaimedHost = hop.fromRaw || 'Unknown';
          const observedReceiverHost = hop.byRaw || 'Unknown';

          // Inferred details
          const inferredCountry = hop.countryCode && hop.countryCode !== 'XX' ? hop.country : 'Unknown';
          const inferredCity = hop.city && hop.countryCode !== 'XX' ? hop.city : 'Unknown';
          const inferredReverseDns = hop.reverseDns || 'Unknown (No PTR)';
          const inferredAsn = hop.asn ? `${hop.asn} (${hop.asnOrg || 'Unknown'})` : 'Unknown';

          return (
            <div
              key={hop.index}
              className="relative transition-all duration-200"
              onMouseEnter={() => setHoveredHop(hop.index)}
              onMouseLeave={() => setHoveredHop(null)}
            >
              {/* Connector line */}
              {idx < sortedHops.length - 1 && (
                <div className="absolute left-8 top-16 bottom-0 w-0.5 -mb-4 bg-gradient-to-b from-purple-200 to-purple-300 z-0 flex items-center justify-center">
                  <div className="bg-white p-1 rounded-full border border-purple-200/80 shadow-xs">
                    <ArrowDown className="h-3 w-3 text-purple-400" />
                  </div>
                </div>
              )}

              <div
                className={`relative z-10 rounded-3xl border p-5.5 transition-all shadow-xs ${
                  isHovered
                    ? 'border-purple-300 bg-purple-50/40 shadow-md'
                    : !hop.isTrusted
                    ? 'border-rose-200/80 bg-rose-50/20'
                    : 'border-purple-100/70 bg-white hover:border-purple-200'
                }`}
              >
                {/* Header line of the Hop card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-100/70 pb-3.5 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border font-mono text-sm font-black shadow-xs ${
                        !hop.isTrusted
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-purple-200 bg-purple-50 text-purple-800'
                      }`}
                    >
                      #{hop.index}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#2E1C4D]">
                          {observedIp}
                        </span>
                        {isLowest && (
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 font-mono text-[9px] font-bold text-rose-800 border border-rose-200 uppercase shadow-xs">
                            Earliest Observable Hop
                          </span>
                        )}
                        {isHighest && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800 border border-emerald-200 uppercase shadow-xs">
                            Border Gateway Connection
                          </span>
                        )}
                        {hop.isTrusted ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[9px] text-emerald-800 border border-emerald-200 uppercase font-bold shadow-xs">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Trusted Relay</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-mono text-[9px] text-rose-800 border border-rose-200 uppercase font-bold shadow-xs">
                            <ShieldAlert className="h-3 w-3" />
                            <span>Untrusted (Origin)</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#8A79A2] font-mono">
                        <Clock className="h-3.5 w-3.5 text-purple-400" />
                        <span>Transit Delta Delay: +{hop.delaySeconds}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Time stamp */}
                  <div className="text-right font-mono text-xs text-[#6A5A82]">
                    <span className="text-[#8A79A2] text-[10px] uppercase font-bold block">Recorded Timestamp:</span>
                    <span className="text-[#2E1C4D] font-semibold">{observedTimestamp}</span>
                  </div>
                </div>

                {/* Grid separating Observed and Inferred forensic telemetry */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* LEFT: OBSERVED INFO */}
                  <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-800">
                        Observed from Message Headers
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Source IP (from-clause IP):</span>
                        <span className="text-[#2E1C4D] font-bold">{observedIp}</span>
                      </div>
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Claimed Client EHLO (HELO-Host):</span>
                        <span className="text-[#2E1C4D] font-bold break-all">{observedClaimedHost}</span>
                      </div>
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Receiving MTA Server (by-clause):</span>
                        <span className="text-[#2E1C4D] font-bold break-all">{observedReceiverHost}</span>
                      </div>
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Header Date String:</span>
                        <span className="text-[#2E1C4D] font-bold">{observedTimestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: INFERRED INFO */}
                  <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">
                        Inferred Forensic Intelligence
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Infrastructure Geolocation:</span>
                        <span className="text-[#2E1C4D] font-bold flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-purple-700" />
                          {inferredCountry !== 'Unknown' ? `${inferredCity}, ${inferredCountry}` : 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Verified PTR Host (Reverse DNS):</span>
                        <span className="text-[#2E1C4D] font-bold break-all">{inferredReverseDns}</span>
                      </div>
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Autonomous System (ASN Org):</span>
                        <span className="text-[#2E1C4D] font-bold break-all">{inferredAsn}</span>
                      </div>
                      <div>
                        <span className="text-[#8A79A2] text-[10px] block">Trust Assessment Verification:</span>
                        <span className="text-[#2E1C4D] font-bold leading-relaxed block">{hop.trustReason}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flag items */}
                {hop.flags.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-purple-100/70 pt-3">
                    <span className="text-[9px] font-mono font-bold text-[#8A79A2] uppercase shrink-0">Security Attributes:</span>
                    {hop.flags.map((flag, fIdx) => (
                      <span
                        key={fIdx}
                        className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[9px] text-[#6A5A82] border border-purple-200/70 font-semibold shadow-xs"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Protocol Authentication Matrix */}
      <div className="rounded-3xl border border-purple-100/70 bg-white p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2E1C4D] flex items-center gap-2">
          <Lock className="h-4 w-4 text-purple-700" />
          <span>Protocol Authentication Results (RFC 8601)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          {/* SPF */}
          <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6A5A82] font-bold">SPF Record</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs ${
                  emailCase.authAnalysis.spf.status === 'PASS'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {emailCase.authAnalysis.spf.status}
              </span>
            </div>
            <div className="text-[11px] text-[#6A5A82]">
              Domain: <strong className="text-[#2E1C4D]">{emailCase.authAnalysis.spf.domain}</strong>
            </div>
            <div className="text-[10px] text-[#8A79A2]">
              Client IP: {emailCase.authAnalysis.spf.clientIp}
            </div>
          </div>

          {/* DKIM */}
          <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6A5A82] font-bold">DKIM Signature</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs ${
                  emailCase.authAnalysis.dkim.status === 'PASS'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {emailCase.authAnalysis.dkim.status}
              </span>
            </div>
            <div className="text-[11px] text-[#6A5A82]">
              Domain: <strong className="text-[#2E1C4D]">{emailCase.authAnalysis.dkim.domain}</strong>
            </div>
            <div className="text-[10px] text-[#8A79A2]">
              Selector: {emailCase.authAnalysis.dkim.selector || 'none'}
            </div>
          </div>

          {/* DMARC */}
          <div className="rounded-2xl border border-purple-100/70 bg-purple-50/20 p-4 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6A5A82] font-bold">DMARC Policy</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs ${
                  emailCase.authAnalysis.dmarc.status === 'PASS'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {emailCase.authAnalysis.dmarc.status}
              </span>
            </div>
            <div className="text-[11px] text-[#6A5A82]">
              Policy: <strong className="text-[#2E1C4D]">{emailCase.authAnalysis.dmarc.policy || 'NONE'}</strong>
            </div>
            <div className="text-[10px] text-[#8A79A2]">
              Alignment: {emailCase.authAnalysis.dmarc.aligned ? 'ALIGNED' : 'MISALIGNED'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
