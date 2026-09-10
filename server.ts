import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { caseStore } from './server/modules/ingestion/index.ts';
import { campaignEngine } from './server/modules/campaign/index.ts';
import { evidenceLedger } from './server/modules/integrity/index.ts';
import { askInvestigationCopilot } from './server/modules/ai/index.ts';
import { generatePlaybook, exportStixBundle } from './server/modules/report/index.ts';
import { SEEDED_IOCS } from './server/data/seededCases.ts';
import { initializeDatabase, isDatabaseAvailable } from './server/modules/db.ts';
import { searchCaseThreatIntel, executeActiveScan } from './server/modules/forensics/threatIntel.ts';
import { runMLInference, isMLModelAvailable, trainMLModel } from './server/modules/forensics/ml_connector.ts';

dotenv.config();

const PORT = 3000;

async function startServer() {
  // Initialize database and stores
  await initializeDatabase();
  await caseStore.initialize();
  await campaignEngine.initialize();
  await evidenceLedger.initialize();

  // Background trigger for scikit-learn training if model is not yet serialized
  if (!isMLModelAvailable()) {
    console.log('[TRACE-X ML] Initiating model pre-training in background...');
    trainMLModel()
      .then(() => console.log('[TRACE-X ML] Pre-training completed successfully.'))
      .catch((err) => console.error('[TRACE-X ML] Pre-training failed (could be due to missing python modules during initial load):', err.message));
  } else {
    console.log('[TRACE-X ML] Serialized scikit-learn model and TF-IDF vectorizer are loaded and ready.');
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================
  // REST API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      platform: 'TRACE-X SIH26106',
      timestamp: new Date().toISOString(),
      modules: {
        ingestion: 'online',
        forensics: 'online',
        campaignCorrelation: 'online',
        evidenceLedger: 'online',
        aiCopilot: process.env.GEMINI_API_KEY ? 'gemini-active' : 'deterministic-fallback',
        database: isDatabaseAvailable() ? 'postgres-active' : 'fallback-active',
      },
    });
  });

  // Cases
  app.get('/api/cases', (req, res) => {
    const cases = caseStore.getAllCases();
    res.json(cases);
  });

  app.get('/api/cases/:id', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json(emailCase);
  });

  app.get('/api/cases/:id/intel', async (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    try {
      // If we don't have results or they are empty, let's run historical passive lookup
      if (!emailCase.externalIntelligence || emailCase.externalIntelligence.length === 0) {
        console.log(`[TRACE-X INTEL] Conducting automatic historical intelligence lookup for case ${emailCase.id}...`);
        const results = await searchCaseThreatIntel(emailCase);
        emailCase.externalIntelligence = results;
        await caseStore.updateCase(emailCase);
      }
      res.json(emailCase.externalIntelligence || []);
    } catch (err: any) {
      console.error('[TRACE-X INTEL] Error loading threat intel:', err);
      res.status(500).json({ error: 'Failed to load external threat intelligence', details: err.message });
    }
  });

  app.post('/api/cases/:id/intel/scan', async (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const { indicator } = req.body;
    if (!indicator || typeof indicator !== 'string') {
      return res.status(400).json({ error: 'indicator string is required' });
    }

    console.log(`[TRACE-X INTEL] Analyst requested active URL scan for indicator: ${indicator}`);
    try {
      const scanResult = await executeActiveScan(indicator);
      
      // Update cached array: replace any existing lookup for this exact provider & indicator, or append
      const existingList = emailCase.externalIntelligence || [];
      const index = existingList.findIndex(item => item.indicator === indicator && item.provider === scanResult.provider);
      
      if (index !== -1) {
        existingList[index] = scanResult;
      } else {
        existingList.push(scanResult);
      }

      emailCase.externalIntelligence = existingList;
      await caseStore.updateCase(emailCase);

      res.status(201).json(scanResult);
    } catch (err: any) {
      console.error('[TRACE-X INTEL] Active scanning failed:', err);
      res.status(500).json({ error: 'Active urlscan.io submission failed', details: err.message });
    }
  });

  app.get('/api/cases/:id/ml', async (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.id);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    try {
      if (!emailCase.mlClassification) {
        console.log(`[TRACE-X ML] Running scikit-learn text classifier for case ${emailCase.id}...`);
        // Build raw text block to analyze (Subject + Body)
        const textToAnalyze = `Subject: ${emailCase.subject || ''}\n\n${emailCase.bodySnippet || ''}`;
        const classification = await runMLInference(textToAnalyze);
        emailCase.mlClassification = classification;
        await caseStore.updateCase(emailCase);
      }
      res.json(emailCase.mlClassification);
    } catch (err: any) {
      console.error('[TRACE-X ML] Failed to run machine learning classification:', err);
      res.status(500).json({ error: 'Failed to run scikit-learn ML classification', details: err.message });
    }
  });

  app.post('/api/cases/ingest', async (req, res) => {
    const { rawEml, title } = req.body;
    if (!rawEml || typeof rawEml !== 'string') {
      return res.status(400).json({ error: 'rawEml text is required' });
    }
    try {
      const newCase = await caseStore.ingestRawEmail(rawEml, title);
      res.status(201).json(newCase);
    } catch (err: any) {
      console.error('Ingestion error:', err);
      res.status(500).json({ error: err.message || 'Failed to ingest artifact' });
    }
  });

  // Campaigns
  app.get('/api/campaigns', (req, res) => {
    const campaigns = campaignEngine.getAllCampaigns();
    res.json(campaigns);
  });

  app.get('/api/campaigns/:id', (req, res) => {
    const campaign = campaignEngine.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const allCases = caseStore.getAllCases();
    const linkedCases = allCases.filter(c => c.linkedCampaignId === campaign.id);
    res.json({ ...campaign, linkedCases });
  });

  // Threat Hunting & IOC Search
  app.get('/api/hunting/iocs', (req, res) => {
    res.json(SEEDED_IOCS);
  });

  app.get('/api/hunting/search', (req, res) => {
    const query = (req.query.q as string || '').toLowerCase().trim();
    if (!query) {
      return res.json({ indicators: SEEDED_IOCS, matchedCases: [] });
    }
    const matchingIocs = SEEDED_IOCS.filter(ioc =>
      ioc.value.toLowerCase().includes(query) ||
      ioc.type.toLowerCase().includes(query) ||
      ioc.asnInfo?.toLowerCase().includes(query)
    );
    const allCases = caseStore.getAllCases();
    const matchingCases = allCases.filter(c =>
      c.senderAddress.toLowerCase().includes(query) ||
      c.subject.toLowerCase().includes(query) ||
      c.caseNumber.toLowerCase().includes(query) ||
      c.relayHops.some(h => h.ip.includes(query) || h.asn?.toLowerCase().includes(query)) ||
      c.urls.some(u => u.domain.toLowerCase().includes(query))
    );
    res.json({ indicators: matchingIocs, matchedCases: matchingCases });
  });

  // Evidence Integrity Ledger
  app.get('/api/ledger', (req, res) => {
    const blocks = evidenceLedger.getChain();
    const status = evidenceLedger.verifyIntegrity();
    res.json({ blocks, status });
  });

  app.post('/api/ledger/verify', (req, res) => {
    const status = evidenceLedger.verifyIntegrity();
    res.json(status);
  });

  // AI Investigation Copilot
  app.post('/api/ai/investigate', async (req, res) => {
    const { caseId, question, history } = req.body;
    if (!caseId || !question) {
      return res.status(400).json({ error: 'caseId and question are required' });
    }
    const emailCase = caseStore.getCaseById(caseId);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    try {
      const result = await askInvestigationCopilot(emailCase, question, history || []);
      res.json(result);
    } catch (err: any) {
      console.error('AI Copilot error:', err);
      res.status(500).json({ error: err.message || 'AI copilot processing failed' });
    }
  });

  // Reports and Playbooks
  app.get('/api/reports/:caseId/playbook', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.caseId);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    const playbook = generatePlaybook(emailCase);
    res.json(playbook);
  });

  app.get('/api/reports/:caseId/stix', (req, res) => {
    const emailCase = caseStore.getCaseById(req.params.caseId);
    if (!emailCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    const bundle = exportStixBundle(emailCase);
    res.json(bundle);
  });

  // ==========================================
  // VITE DEV MIDDLEWARE / STATIC PRODUCTION
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TRACE-X] SOC Backend Server operational on http://0.0.0.0:${PORT}`);
  });
}

startServer();
