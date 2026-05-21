'use strict';

require('dotenv').config();

const { fetchLeadById } = require('../notion');
const { processLead, scanAndProcess } = require('../core');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
};
