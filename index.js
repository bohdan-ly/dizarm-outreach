'use strict';

require('dotenv').config();

const express = require('express');
const cron    = require('node-cron');
const { fetchRobotLeads, fetchLeadById, extractLeadData, saveLetter } = require('./notion');
const { generateCoverLetter } = require('./generate');
const { runLearningCycle } = require('./learner');

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT           = parseInt(process.env.PORT || '3000', 10);
const LEARN_INTERVAL = parseInt(process.env.LEARN_INTERVAL_MINUTES || '60', 10);

// ─── Core processor ──────────────────────────────────────────────────────────

/**
 * Processes a single lead: generate letter and write it back to Notion.
 * @param {object} lead  Output of extractLeadData()
 */
async function processLead(lead) {
  const label = lead.name || lead.clientName || lead.pageId;
  console.log(`[outreach-ai] Processing lead: "${label}"`);

  try {
    const letter = await generateCoverLetter(lead);
    await saveLetter(lead.pageId, label, letter);
    console.log(`[outreach-ai] Done: "${label}" -> cover letter saved, status set to ✅✅✅`);
    return { success: true, pageId: lead.pageId, name: label };
  } catch (err) {
    console.error(`[outreach-ai] Error processing "${label}":`, err.message);
    return { success: false, pageId: lead.pageId, name: label, error: err.message };
  }
}

/**
 * Scans Notion for all 🤖🤖🤖 leads and processes each one.
 * @returns {Promise<object[]>}
 */
async function scanAndProcess() {
  console.log('[outreach-ai] Scanning Notion for 🤖🤖🤖 leads...');
  let pages;
  try {
    pages = await fetchRobotLeads();
  } catch (err) {
    console.error('[outreach-ai] Failed to fetch leads from Notion:', err.message);
    return [];
  }

  if (pages.length === 0) {
    console.log('[outreach-ai] No pending leads found.');
    return [];
  }

  console.log(`[outreach-ai] Found ${pages.length} lead(s) to process.`);

  const results = [];
  for (const page of pages) {
    const lead = extractLeadData(page);
    const result = await processLead(lead);
    results.push(result);
  }
  return results;
}

// ─── Express webhook server ───────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'outreach-ai' });
});

/**
 * POST /webhook
 * Optional body: { "pageId": "notion-page-uuid" }
 *   - With pageId: process only that specific lead
 *   - Without pageId: scan all 🤖🤖🤖 leads
 */
app.post('/webhook', async (req, res) => {
  const { pageId } = req.body || {};

  if (pageId) {
    console.log(`[outreach-ai] Webhook triggered for pageId: ${pageId}`);
    try {
      const lead = await fetchLeadById(pageId);
      const result = await processLead(lead);
      return res.json({ results: [result] });
    } catch (err) {
      console.error('[outreach-ai] Webhook error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  const results = await scanAndProcess();
  res.json({ results });
});

/**
 * POST /learn
 * Manually trigger a self-improvement cycle (also runs on schedule).
 */
app.post('/learn', async (_req, res) => {
  console.log('[outreach-ai] Manual learning cycle triggered via /learn');
  try {
    const result = await runLearningCycle();
    res.json(result);
  } catch (err) {
    console.error('[outreach-ai] Learning cycle error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Startup ──────────────────────────────────────────────────────────────────

function validateEnv() {
  const missing = ['NOTION_TOKEN', 'ANTHROPIC_API_KEY'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[outreach-ai] Missing required env vars: ${missing.join(', ')}`);
    console.error('[outreach-ai] Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

async function main() {
  validateEnv();

  // Start webhook server
  app.listen(PORT, () => {
    console.log(`[outreach-ai] Webhook server listening on http://localhost:${PORT}`);
    console.log(`[outreach-ai]   POST /webhook          — scan + process all 🤖 leads`);
    console.log(`[outreach-ai]   POST /webhook {pageId} — process a single lead`);
    console.log(`[outreach-ai]   POST /learn             — run self-improvement cycle`);
    console.log(`[outreach-ai]   GET  /health            — health check`);
  });

  // Poll Notion every minute
  cron.schedule('* * * * *', () => {
    scanAndProcess().catch((err) => {
      console.error('[outreach-ai] Cron scan error:', err.message);
    });
  });
  console.log('[outreach-ai] Polling Notion every minute');

  // Self-improvement cycle on configurable interval (default: hourly)
  const learnCron = `*/${LEARN_INTERVAL} * * * *`;
  cron.schedule(learnCron, () => {
    runLearningCycle().catch((err) => {
      console.error('[outreach-ai] Learning cycle error:', err.message);
    });
  });
  console.log(`[outreach-ai] Self-improvement cycle every ${LEARN_INTERVAL} minute(s)`);

  // Run one immediate scan on startup
  await scanAndProcess();
}

main().catch((err) => {
  console.error('[outreach-ai] Fatal startup error:', err);
  process.exit(1);
});
