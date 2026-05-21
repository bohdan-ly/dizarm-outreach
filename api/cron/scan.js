'use strict';

require('dotenv').config();

const { scanAndProcess } = require('../../core');

// Vercel injects Authorization: Bearer <CRON_SECRET> on all cron invocations.
// Reject anything else to prevent external callers from triggering scans.
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[cron/scan] Starting scheduled scan');
  try {
    const results = await scanAndProcess();
    res.json({ ok: true, processed: results.length, results });
  } catch (err) {
    console.error('[cron/scan] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
