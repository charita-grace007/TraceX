import React from 'react';
import {
  LayoutDashboard,
  SearchCode,
  Network,
  Crosshair,
  Lock,
  BotMessageSquare,
  FileCheck2,
  ChevronRight,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'investigation'
  | 'campaigns'
  | 'hunting'
  | 'ledger'
  | 'copilot'
  | 'reports';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  caseCount: number;
  campaignCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  caseCount,
  campaignCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Command Dashboard',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      badge: caseCount.toString(),
    },
    {
      id: 'investigation' as NavigationTab,
      label: 'Investigation Workspace',
      shortLabel: 'Investigate',
      icon: SearchCode,
      highlight: true,
    },
    {
      id: 'campaigns' as NavigationTab,
      label: 'Campaign Correlation',
      shortLabel: 'Campaigns',
      icon: Network,
      badge: campaignCount.toString(),
    },
    {
      id: 'hunting' as NavigationTab,
      label: 'Threat Hunting (IOCs)',
      shortLabel: 'Hunting',
      icon: Crosshair,
    },
    {
      id: 'ledger' as NavigationTab,
      label: 'Evidence Locker (SHA-256)',
      shortLabel: 'Evidence Locker',
      icon: Lock,
    },
    {
      id: 'copilot' as NavigationTab,
      label: 'AI SOC Copilot',
      shortLabel: 'AI Copilot',
      icon: BotMessageSquare,
      pulse: true,
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Forensic Reports',
      shortLabel: 'Reports',
      icon: FileCheck2,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-purple-100/70 bg-white/70 backdrop-blur-xl flex flex-col justify-between hidden md:flex">
      <div className="py-5">
        <div className="px-6 pb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A79A2]">
            SOC Navigation
          </span>
        </div>

        <nav className="space-y-1.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            const activeButtonClasses = isActive
              ? 'bg-purple-100/80 text-[#2E1C4D] border-purple-200/70 shadow-[0_2px_10px_rgba(124,58,237,0.08)] font-bold'
              : 'text-[#6A5A82] hover:bg-purple-50/60 hover:text-[#2E1C4D] border-transparent';

            const activeIconClasses = isActive
              ? 'border-purple-200 bg-purple-200/80 text-purple-800'
              : 'border-purple-100/60 bg-purple-50/40 text-[#7A6A92] group-hover:text-[#2E1C4D] group-hover:border-purple-200';

            const activeBadgeClasses = isActive
              ? 'bg-purple-200 text-purple-900 border-purple-300/60'
              : 'bg-purple-50/80 text-[#6A5A82] border-purple-100/80';

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`group flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer border ${activeButtonClasses}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${activeIconClasses}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate tracking-wide">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold border ${activeBadgeClasses}`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.pulse && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight
                      className="h-3.5 w-3.5 ml-1 text-purple-700"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: SIH Architectural Notice */}
      <div className="p-4 m-3 rounded-2xl border border-purple-100/80 bg-purple-50/40 text-[11px] text-[#6A5A82] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase text-purple-700 font-bold">
            Guiding Principle
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs"></span>
        </div>
        <p className="text-[10px] leading-relaxed text-[#6A5A82]">
          Deterministic forensic analysis produces the facts first. AI interprets but never invents evidence.
        </p>
      </div>
    </aside>
  );
};
