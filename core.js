'use strict';

const { fetchRobotLeads, fetchLeadById, extractLeadData, saveLetter } = require('./notion');
const { generateCoverLetter } = require('./generate');

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

module.exports = { processLead, scanAndProcess };
