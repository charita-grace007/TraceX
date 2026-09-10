import { EmailCase, InvestigationPlaybook } from '@/src/types/index.ts';

export function generatePlaybook(emailCase: EmailCase): InvestigationPlaybook {
  const actions: InvestigationPlaybook['recommendedActions'] = [];

  if (emailCase.attackType === 'CREDENTIAL_HARVESTING') {
    actions.push(
      {
        id: 'act-01',
        priority: 'P0',
        action: 'Revoke Active User Sessions & Reset Authentication',
        rationale: 'Prevent unauthorized lateral access using compromised credentials.',
        category: 'IDENTITY',
        completed: false,
      },
      {
        id: 'act-02',
        priority: 'P0',
        action: 'Sinkhole / Block Malicious Lander Domain at DNS Firewall',
        rationale: `Block destination ${emailCase.urls[0]?.domain || 'phishing portal'} across enterprise web filters.`,
        category: 'NETWORK',
        completed: false,
      },
      {
        id: 'act-03',
        priority: 'P1',
        action: 'Sweep Mailboxes for Related Campaign Messages',
        rationale: `Search organization inboxes for shared indicators linked to ${emailCase.linkedCampaignId || 'this cluster'}.`,
        category: 'COMMUNICATION',
        completed: false,
      }
    );
  } else if (emailCase.attackType === 'BEC_PAYMENT_FRAUD') {
    actions.push(
      {
        id: 'act-01',
        priority: 'P0',
        action: 'Notify Treasury & Place Hold on Pending Wire Transfers',
        rationale: 'Mitigate direct financial loss from fraudulent disbursement authorization.',
        category: 'COMMUNICATION',
        completed: false,
      },
      {
        id: 'act-02',
        priority: 'P0',
        action: 'Block Impersonated Domain & Divergent Reply-To Mailbox',
        rationale: `Block ${emailCase.authAnalysis.replyToMismatch.replyTo} to thwart dialogue hijacking.`,
        category: 'NETWORK',
        completed: false,
      },
      {
        id: 'act-03',
        priority: 'P1',
        action: 'Execute Out-of-Band Executive Confirmation',
        rationale: 'Verify legitimate intent via confirmed telephonic / in-person verification channel.',
        category: 'IDENTITY',
        completed: false,
      }
    );
  } else if (emailCase.attackType === 'MALWARE_DELIVERY') {
    actions.push(
      {
        id: 'act-01',
        priority: 'P0',
        action: 'Isolate Target Endpoint from Corporate LAN',
        rationale: 'Prevent potential PowerShell / C2 beacon lateral movement.',
        category: 'ISOLATION',
        completed: false,
      },
      {
        id: 'act-02',
        priority: 'P0',
        action: 'Submit Attachment SHA-256 Hash to EDR Blocklist',
        rationale: `Block hash ${emailCase.attachments[0]?.sha256 || 'payload hash'} globally.`,
        category: 'FORENSIC',
        completed: false,
      },
      {
        id: 'act-03',
        priority: 'P1',
        action: 'Audit Compromised Partner Mailbox Relay',
        rationale: 'Alert partner organization security team regarding verified credential compromise.',
        category: 'COMMUNICATION',
        completed: false,
      }
    );
  } else {
    actions.push({
      id: 'act-01',
      priority: 'P2',
      action: 'File As Verified Benign / Mark Case Closed',
      rationale: 'All protocol checks and SPF/DKIM/DMARC alignments confirm legitimate business flow.',
      category: 'FORENSIC',
      completed: true,
    });
  }

  return {
    caseId: emailCase.id,
    attackType: emailCase.attackType,
    recommendedActions: actions,
  };
}

export function exportStixBundle(emailCase: EmailCase): object {
  const timestamp = new Date().toISOString();
  return {
    type: 'bundle',
    id: `bundle--${emailCase.id}`,
    spec_version: '2.1',
    objects: [
      {
        type: 'incident',
        id: `incident--${emailCase.id}`,
        created: timestamp,
        modified: timestamp,
        name: emailCase.title,
        description: emailCase.subject,
        severity: emailCase.decision.threatSeverity.toLowerCase(),
        confidence: emailCase.decision.threatConfidence,
      },
      {
        type: 'email-message',
        id: `email-message--${emailCase.id}`,
        from_ref: emailCase.senderAddress,
        to_refs: [emailCase.recipientAddress],
        subject: emailCase.subject,
        date: emailCase.dateSent,
      },
      ...emailCase.evidenceList.map(e => ({
        type: 'observed-data',
        id: `observed-data--${e.id}`,
        created: e.timestamp,
        number_observed: 1,
        objects: {
          '0': {
            type: 'artifact',
            description: e.observation,
            hashes: { 'SHA-256': e.sha256Hash },
          },
        },
      })),
    ],
  };
}
