import React, { useState, useEffect } from 'react';
import {
  fetchCases,
  fetchCampaigns,
  fetchIocs,
  fetchLedger,
  verifyLedgerChain,
  ingestEmailArtifact,
  askCopilot,
  fetchHealth,
} from './services/api.ts';
import { EmailCase, Campaign, ThreatHuntingIndicator, IntegrityBlock } from './types/index.ts';

import { Header } from './components/common/Header.tsx';
import { Sidebar, NavigationTab } from './components/common/Sidebar.tsx';
import { IngestModal } from './components/common/IngestModal.tsx';

import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { InvestigationWorkspace } from './components/investigation/InvestigationWorkspace.tsx';
import { CampaignView } from './components/campaigns/CampaignView.tsx';
import { ThreatHuntingView } from './components/hunting/ThreatHuntingView.tsx';
import { EvidenceLockerView } from './components/integrity/EvidenceLockerView.tsx';
import { CopilotView } from './components/copilot/CopilotView.tsx';
import { ReportView } from './components/reports/ReportView.tsx';

import { Shield, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [cases, setCases] = useState<EmailCase[]>([]);
  const [currentCase, setCurrentCase] = useState<EmailCase | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [iocs, setIocs] = useState<ThreatHuntingIndicator[]>([]);
  const [ledgerBlocks, setLedgerBlocks] = useState<IntegrityBlock[]>([]);
  
  const [isLiveServerConnected, setIsLiveServerConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load telemetry from backend API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify health
      try {
        await fetchHealth();
        setIsLiveServerConnected(true);
      } catch {
        setIsLiveServerConnected(false);
      }

      const [casesData, campaignsData, iocsData, ledgerData] = await Promise.all([
        fetchCases(),
        fetchCampaigns(),
        fetchIocs(),
        fetchLedger(),
      ]);

      setCases(casesData);
      setCampaigns(campaignsData);
      setIocs(iocsData);
      setLedgerBlocks(ledgerData.blocks);

      if (casesData.length > 0) {
        // Keep current selected case if valid, otherwise pick first
        setCurrentCase(prev => {
          if (prev && casesData.some(c => c.id === prev.id)) {
            return casesData.find(c => c.id === prev.id) || casesData[0];
          }
          return casesData[0];
        });
      }
    } catch (err: any) {
      console.error('Failed to load SOC telemetry:', err);
      setError('Unable to synchronize with TRACE-X SOC backend services. Retrying...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIngest = async (rawEml: string, title?: string) => {
    try {
      const newCase = await ingestEmailArtifact(rawEml, title);
      setCases(prev => [newCase, ...prev]);
      setCurrentCase(newCase);
      setCurrentTab('investigation');
      
      // Update ledger
      const ledgerRes = await fetchLedger();
      setLedgerBlocks(ledgerRes.blocks);

      showNotification(`Artifact sealed into ledger block #${ledgerRes.blocks.length}: ${newCase.caseNumber}`);
    } catch (err: any) {
      console.error('Ingestion failure:', err);
      showNotification(`Ingestion failed: ${err.message}`);
    }
  };

  const handleAskCopilot = async (question: string) => {
    if (!currentCase) throw new Error('No case selected');
    return askCopilot(currentCase.id, question);
  };

  const handleVerifyLedger = async () => {
    return verifyLedgerChain();
  };

  const handleUpdateCase = (updated: EmailCase) => {
    setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
    setCurrentCase(updated);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading && cases.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F7F8FC] text-slate-800">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-600 shadow-[0_4px_20px_rgba(124,58,237,0.1)]">
          <Shield className="h-8 w-8 animate-pulse" />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500"></span>
          </span>
        </div>
        <div className="mt-5 font-mono text-base font-extrabold tracking-widest text-slate-900 uppercase">
          Initializing TRACE-X SOC Engine
        </div>
        <p className="mt-1 font-mono text-xs text-slate-500">
          SIH26106 • Verifying deterministic evidence chain & campaigns...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF8F5] via-[#F7F3F9] to-[#EFEAF6] text-[#2E1C4D] flex flex-col font-sans selection:bg-purple-200 selection:text-purple-950 relative overflow-x-hidden">
      {/* Ambient decorative soft pastel background orbs */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#FFE5D9]/45 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed top-1/4 -right-40 h-[600px] w-[600px] rounded-full bg-[#EAD8F7]/50 blur-[130px] -z-10" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 h-[550px] w-[550px] rounded-full bg-[#DFE6FA]/45 blur-[120px] -z-10" />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-purple-200/70 bg-white/95 backdrop-blur-md p-4 text-xs font-mono text-[#2E1C4D] shadow-[0_10px_35px_rgba(142,125,188,0.18)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        cases={cases}
        currentCase={currentCase}
        onSelectCase={(c) => setCurrentCase(c)}
        onOpenIngest={() => setIngestModalOpen(true)}
        isLiveServerConnected={isLiveServerConnected}
        onRefreshData={loadData}
      />

      {/* Mobile Tab Navigation Bar */}
      <div className="md:hidden border-b border-purple-100/70 bg-white/70 backdrop-blur-md px-3 py-2.5 flex items-center gap-2 overflow-x-auto text-xs font-mono">
        {(['dashboard', 'investigation', 'campaigns', 'hunting', 'ledger', 'copilot', 'reports'] as NavigationTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            className={`rounded-full px-3.5 py-1.5 capitalize shrink-0 transition-all ${
              currentTab === tab
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-sm shadow-purple-500/20'
                : 'text-[#6A5A82] hover:bg-purple-50/80 hover:text-[#2E1C4D]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Body with Sidebar + Viewport */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          caseCount={cases.length}
          campaignCount={campaigns.length}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-mono text-rose-800 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadData}
                  className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold hover:bg-rose-200 text-rose-900 transition-colors cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {currentTab === 'dashboard' && (
              <DashboardView
                cases={cases}
                campaigns={campaigns}
                iocs={iocs}
                ledgerBlocks={ledgerBlocks}
                onSelectCase={(c) => setCurrentCase(c)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenIngest={() => setIngestModalOpen(true)}
              />
            )}

            {currentTab === 'investigation' && currentCase && (
              <InvestigationWorkspace
                emailCase={currentCase}
                cases={cases}
                campaigns={campaigns}
                onSelectCase={(c) => setCurrentCase(c)}
              />
            )}

            {currentTab === 'campaigns' && (
              <CampaignView
                campaigns={campaigns}
                cases={cases}
                onSelectCase={(c) => setCurrentCase(c)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'hunting' && (
              <ThreatHuntingView
                iocs={iocs}
                cases={cases}
                onSelectCase={(c) => setCurrentCase(c)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'ledger' && (
              <EvidenceLockerView
                ledgerBlocks={ledgerBlocks}
                onVerifyLedger={handleVerifyLedger}
                currentCase={currentCase}
                cases={cases}
                onUpdateCase={handleUpdateCase}
              />
            )}

            {currentTab === 'copilot' && currentCase && (
              <CopilotView
                currentCase={currentCase}
                onAskCopilot={handleAskCopilot}
              />
            )}

            {currentTab === 'reports' && currentCase && (
              <ReportView currentCase={currentCase} campaigns={campaigns} ledgerBlocks={ledgerBlocks} />
            )}
          </div>
        </main>
      </div>

      {/* Ingest Modal */}
      <IngestModal
        isOpen={ingestModalOpen}
        onClose={() => setIngestModalOpen(false)}
        onIngest={handleIngest}
      />
    </div>
  );
}
