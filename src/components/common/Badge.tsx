import React from 'react';
import { ThreatSeverity, ThreatVerdict, EvidenceReliability, ProtocolStatus, BusinessImpactLevel } from '@/src/types/index.ts';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  pulse = false,
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[10px] font-mono rounded-full',
    md: 'px-3 py-1 text-[10px] font-mono tracking-wide rounded-full',
    lg: 'px-3.5 py-1.5 text-xs font-mono tracking-wider rounded-full',
  }[size];

  const variantClasses = {
    default: 'bg-purple-50/80 text-purple-900 border-purple-200/70',
    critical: 'bg-rose-50/80 text-rose-800 border-rose-200/70',
    high: 'bg-orange-50/80 text-orange-800 border-orange-200/70',
    medium: 'bg-amber-50/80 text-amber-800 border-amber-200/70',
    low: 'bg-indigo-50/80 text-indigo-800 border-indigo-200/70',
    success: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/70',
    warning: 'bg-amber-50/80 text-amber-800 border-amber-200/70',
    info: 'bg-purple-50/80 text-purple-800 border-purple-200/70',
    neutral: 'bg-slate-100/80 text-slate-700 border-slate-200/80',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border uppercase select-none shadow-xs ${sizeClasses} ${variantClasses}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
        </span>
      )}
      {children}
    </span>
  );
};

export const VerdictBadge: React.FC<{ verdict: ThreatVerdict }> = ({ verdict }) => {
  switch (verdict) {
    case 'MALICIOUS':
      return <Badge variant="critical" pulse>{verdict}</Badge>;
    case 'SUSPICIOUS':
      return <Badge variant="high">{verdict}</Badge>;
    case 'BENIGN':
      return <Badge variant="success">{verdict}</Badge>;
    default:
      return <Badge variant="neutral">{verdict}</Badge>;
  }
};

export const SeverityBadge: React.FC<{ severity: ThreatSeverity }> = ({ severity }) => {
  switch (severity) {
    case 'CRITICAL':
      return <Badge variant="critical">{severity}</Badge>;
    case 'HIGH':
      return <Badge variant="high">{severity}</Badge>;
    case 'MEDIUM':
      return <Badge variant="medium">{severity}</Badge>;
    case 'LOW':
      return <Badge variant="low">{severity}</Badge>;
    case 'BENIGN':
      return <Badge variant="success">{severity}</Badge>;
    default:
      return <Badge variant="neutral">{severity}</Badge>;
  }
};

export const ProtocolBadge: React.FC<{ status: ProtocolStatus; label?: string }> = ({ status, label }) => {
  let variant: 'success' | 'critical' | 'warning' | 'neutral' = 'neutral';
  if (status === 'PASS') variant = 'success';
  else if (status === 'FAIL') variant = 'critical';
  else if (status === 'SOFTFAIL') variant = 'warning';

  return (
    <Badge variant={variant} size="sm">
      {label ? `${label}: ${status}` : status}
    </Badge>
  );
};

export const ReliabilityBadge: React.FC<{ reliability: EvidenceReliability }> = ({ reliability }) => {
  switch (reliability) {
    case 'HIGH':
      return <Badge variant="info" size="sm">REL: HIGH</Badge>;
    case 'MEDIUM':
      return <Badge variant="warning" size="sm">REL: MED</Badge>;
    case 'LOW':
      return <Badge variant="neutral" size="sm">REL: LOW</Badge>;
  }
};

export const ImpactBadge: React.FC<{ impact: BusinessImpactLevel }> = ({ impact }) => {
  switch (impact) {
    case 'CRITICAL':
      return <Badge variant="critical" size="sm">IMPACT: CRITICAL</Badge>;
    case 'HIGH':
      return <Badge variant="high" size="sm">IMPACT: HIGH</Badge>;
    case 'MEDIUM':
      return <Badge variant="medium" size="sm">IMPACT: MED</Badge>;
    case 'LOW':
      return <Badge variant="low" size="sm">IMPACT: LOW</Badge>;
  }
};
