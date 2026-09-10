import React from 'react';
import { Network, Server, UserCheck, ShieldCheck, HelpCircle } from 'lucide-react';
import { EmailCase, Campaign } from '@/src/types/index.ts';

interface CampaignSummaryCardProps {
  emailCase: EmailCase;
  campaigns: Campaign[];
}

export const CampaignSummaryCard: React.FC<CampaignSummaryCardProps> = ({
  emailCase,
  campaigns,
}) => {
  const campaign = campaigns.find((c) => c.id === emailCase.linkedCampaignId);

  return (
    <div className="rounded-3xl border border-purple-100/70 bg-purple-50/20 p-6 space-y-4">
      {/* Header and Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#2E1C4D]">
          Related Campaign Summary
        </h3>
        {campaign ? (
          <span className="rounded-full bg-amber-50 px-3 py-0.5 font-mono text-[10px] text-amber-800 border border-amber-200 font-extrabold shadow-xs">
            DNA CORRELATED
          </span>
        ) : (
          <span className="rounded-full bg-white px-3 py-0.5 font-mono text-[10px] text-[#6A5A82] border border-purple-200/70 font-bold shadow-xs">
            ISOLATED EVENT
          </span>
        )}
      </div>

      {!campaign ? (
        <div className="rounded-2xl bg-white/80 border border-purple-100/70 p-4 text-xs font-mono text-[#6A5A82] flex items-center gap-2.5 shadow-xs">
          <HelpCircle className="h-4 w-4 text-purple-300 shrink-0" />
          <span>Independent incident. No corresponding campaign fingerprint or bulletproof infrastructure correlation identified at this time.</span>
        </div>
      ) : (
        <div className="space-y-3 font-mono text-xs">
          {/* Header */}
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/70 p-4 space-y-1 shadow-xs">
            <div className="flex justify-between font-bold text-amber-800">
              <span className="text-xs">{campaign.name}</span>
              <span className="text-[10px]">{campaign.id}</span>
            </div>
            <div className="text-[10px] text-[#6A5A82]">
              DNA: <strong className="text-[#2E1C4D]">{campaign.dnaFingerprint}</strong>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-[11px] text-[#5E4E77] bg-white/90 rounded-2xl p-4 border border-purple-100/60 shadow-xs">
            <div className="flex justify-between">
              <span className="text-[#8A79A2]">Threat Actor:</span>
              <span className="font-bold text-[#2E1C4D]">{campaign.threatActorGroup}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A79A2]">Target Sectors:</span>
              <span className="text-[#2E1C4D] truncate max-w-[200px]" title={campaign.targetSectors.join(', ')}>
                {campaign.targetSectors.join(', ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A79A2]">First Seen:</span>
              <span className="text-[#2E1C4D]">
                {new Date(campaign.firstSeen).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Infrastructure Highlights */}
          <div className="rounded-2xl bg-white/90 p-4 border border-purple-100/70 space-y-2 text-[10px] shadow-xs">
            <div className="font-bold text-[#2E1C4D] flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-purple-700" />
              <span>Common Infrastructure Patterns:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[#5E4E77]">
              <div>
                <div className="text-[#8A79A2] font-bold">ASNs:</div>
                <div className="truncate max-w-[150px] font-semibold text-[#2E1C4D]">{campaign.commonInfrastructure.asns.join(', ')}</div>
              </div>
              <div>
                <div className="text-[#8A79A2] font-bold">Domains:</div>
                <div className="truncate max-w-[150px] font-semibold text-[#2E1C4D]">{campaign.commonInfrastructure.domains.join(', ')}</div>
              </div>
            </div>
            <p className="text-[9px] text-[#8A79A2] pt-1.5 border-t border-purple-100 mt-1 leading-normal">
              {campaign.infrastructureRotationNotes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
