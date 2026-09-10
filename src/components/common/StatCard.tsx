import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: 'cyan' | 'rose' | 'amber' | 'emerald' | 'indigo';
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  label,
  value,
  subValue,
  icon: Icon,
  accentColor = 'indigo',
}) => {
  const accentClasses = {
    cyan: 'border-cyan-100/70 hover:border-cyan-200/80',
    rose: 'border-rose-100/70 hover:border-rose-200/80',
    amber: 'border-amber-100/70 hover:border-amber-200/80',
    emerald: 'border-emerald-100/70 hover:border-emerald-200/80',
    indigo: 'border-purple-100/70 hover:border-purple-200/80',
  }[accentColor];

  const iconBgClasses = {
    cyan: 'bg-cyan-50/80 text-cyan-700 border-cyan-200/60',
    rose: 'bg-rose-50/80 text-rose-700 border-rose-200/60',
    amber: 'bg-amber-50/80 text-amber-700 border-amber-200/60',
    emerald: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60',
    indigo: 'bg-purple-50/80 text-purple-700 border-purple-200/60',
  }[accentColor];

  return (
    <div
      id={id}
      className={`group relative overflow-hidden rounded-3xl border bg-white/85 backdrop-blur-md p-6 transition-all duration-300 shadow-[0_8px_30px_rgba(142,125,188,0.06)] hover:shadow-[0_12px_36px_rgba(142,125,188,0.12)] hover:-translate-y-1 ${accentClasses}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6A5A82]">
          {label}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl border shadow-xs ${iconBgClasses}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-[#2E1C4D] font-sans">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-[#8A79A2] truncate font-medium">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
