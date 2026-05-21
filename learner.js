'use strict';

const fs       = require('fs');
const path     = require('path');
const { Client } = require('@notionhq/client');
const Anthropic  = require('@anthropic-ai/sdk');

const MESSAGES_DB_ID  = '2e92e6bf072280498301e9aeabc54c39';
const LEARNINGS_FILE  = path.join(__dirname, 'learnings.json');

// Use Vercel KV when available; fall back to local JSON file for local dev
const USE_KV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// ─── Notion helpers ───────────────────────────────────────────────────────────

function getNotion() {
  return new Client({ auth: process.env.NOTION_TOKEN });
}

async function fetchRepliedMessages() {
  const n = getNotion();
  const results = [];
  let cursor;

  do {
    const res = await n.databases.query({
      database_id: MESSAGES_DB_ID,
      filter: {
        property: 'Status',
        status: { equals: 'Replied' },
      },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      const p = page.properties;
      const name    = p['Name']?.title?.[0]?.plain_text || '';
      const message = p['Message']?.rich_text?.[0]?.plain_text || '';

      if (message) results.push({ id: page.id, name, message });
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return results;
}

// ─── Learnings persistence ────────────────────────────────────────────────────

const EMPTY_LEARNINGS = { analyzedIds: [], patterns: '', lastUpdatedAt: null };

async function loadLearnings() {
  if (USE_KV) {
    try {
      const { kv } = require('@vercel/kv');
      const data = await kv.get('learnings');
      return data || EMPTY_LEARNINGS;
    } catch (err) {
      console.error('[learner] KV read failed:', err.message);
      return EMPTY_LEARNINGS;
    }
  }
  try {
    return JSON.parse(fs.readFileSync(LEARNINGS_FILE, 'utf8'));
  } catch {
    return EMPTY_LEARNINGS;
  }
}

async function saveLearnings(data) {
  if (USE_KV) {
    try {
      const { kv } = require('@vercel/kv');
      await kv.set('learnings', data);
    } catch (err) {
      console.error('[learner] KV write failed:', err.message);
    }
    return;
  }
  fs.writeFileSync(LEARNINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Claude analysis ──────────────────────────────────────────────────────────

async function analyzeReplied(messages, existingPatterns) {
  const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const examples = messages
    .map((m, i) => `--- Example ${i + 1} (got a reply) ---\n${m}`)
    .join('\n\n');

  const priorContext = existingPatterns
    ? `\nPreviously extracted patterns (update and refine these, do not just repeat):\n${existingPatterns}\n`
    : '';

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `You are a conversion copywriting analyst specializing in cold outreach for design agencies.
Your job is to study cover letters that successfully got replies and extract what made them work.
Output only a compact numbered list of 5-10 actionable writing rules, each under 2 sentences.
No preamble, no conclusion — just the rules.`,
    messages: [
      {
        role: 'user',
        content: `Here are ${messages.length} Behance cover letter(s) that received a reply from the prospect.
Analyze them and extract the specific patterns, phrases, structures, or techniques that likely drove the reply.${priorContext}

${examples}

Output 5-10 actionable rules distilled from these examples.`,
      },
    ],
  });

  return res.content[0].text.trim();
}

// ─── Main learning cycle ──────────────────────────────────────────────────────

async function runLearningCycle() {
  const replied = await fetchRepliedMessages();

  if (replied.length === 0) {
    console.log('[learner] No Replied messages yet — skipping.');
    return { updated: false, count: 0 };
  }

  const stored = await loadLearnings();
  const newIds  = replied.map((m) => m.id).filter((id) => !stored.analyzedIds.includes(id));

  if (newIds.length === 0) {
    console.log(`[learner] No new replies since last analysis (${replied.length} total). Skipping.`);
    return { updated: false, count: replied.length };
  }

  console.log(`[learner] ${newIds.length} new replied message(s). Running Karpathy analysis...`);

  const patterns = await analyzeReplied(
    replied.map((m) => m.message),
    stored.patterns,
  );

  const updated = {
    analyzedIds:   replied.map((m) => m.id),
    patterns,
    lastUpdatedAt: new Date().toISOString(),
  };

  await saveLearnings(updated);
  console.log(`[learner] Learnings updated from ${replied.length} replied message(s).`);

  return { updated: true, count: replied.length, patterns };
}

module.exports = { runLearningCycle, loadLearnings };
