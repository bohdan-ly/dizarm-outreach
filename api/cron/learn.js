'use strict';

require('dotenv').config();

const { runLearningCycle } = require('../../learner');

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[cron/learn] Starting scheduled learning cycle');
  try {
    const result = await runLearningCycle();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/learn] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
