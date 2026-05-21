'use strict';

require('dotenv').config();

const { runLearningCycle } = require('../learner');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('[outreach-ai] Manual learning cycle triggered via /api/learn');
  try {
    const result = await runLearningCycle();
    res.json(result);
  } catch (err) {
    console.error('[outreach-ai] Learning cycle error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
