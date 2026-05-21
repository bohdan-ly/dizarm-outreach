'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { pickProjects } = require('./projects');
const { loadLearnings } = require('./learner');

let anthropic;

function getClient() {
  if (!anthropic) {
    anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

/**
 * Formats 1-2 Behance projects into a concise reference block for the prompt.
 */
function formatProjects(projects) {
  return projects
    .map((p) => {
      const outcomes = p.outcomes.slice(0, 2).join('; ');
      return `- ${p.title}\n  Link: ${p.link}\n  Results: ${outcomes}`;
    })
    .join('\n\n');
}

/**
 * Generates a personalized Behance cover letter for a lead.
 *
 * @param {object} lead  Extracted lead data from notion.js
 * @returns {Promise<string>}  The ready-to-send cover letter text
 */
async function generateCoverLetter(lead) {
  const { name, clientName, jobTitle, description, website, services, leadSource, importantNote } = lead;

  const selectedProjects = pickProjects(services, description);
  const projectsBlock = formatProjects(selectedProjects);

  const isInbound = leadSource === 'Inbound';
  const templateHint = isInbound
    ? 'Template B (inbound brief response): acknowledge their brief, highlight 3 key priorities for their project, reference the most relevant Behance case study, end with a soft CTA (15-min call or free Loom).'
    : 'Template A (cold outbound): open with a specific genuine observation about their product/work, suggest one concrete free idea, reference 1-2 Behance case studies with outcomes, end with a soft low-friction CTA.';

  const { patterns } = await loadLearnings();
  const learningsBlock = patterns
    ? `\nLEARNED PATTERNS (from real replied messages — follow these closely):\n${patterns}`
    : '';

  const systemPrompt = `You are Anita, Lead Product Designer and strategic copywriter at DizArm — a strategic branding and UI/UX agency for digital-first companies.

DizArm context:
- Agency: DizArm
- Contact: Anita (Lead Product Designer)
- Niche: mobile & website UI/UX designs for digital-first companies (AI, Web3, Healthcare, Real-estate, E-commerce)
- USP: designs that lift trial activation by 40% and LTV by 17% — making complex products easy to use
- Behance: https://www.behance.net/anitakaapu1a81
- Website: https://www.dizarm.io/

Writing rules:
- Total length: ~700 characters (not words — characters)
- Conversational tone, not salesy, not too casual
- Adapt text to prospect's language and tone (if they use slang, use slang; if they use formal language, use formal language)
- Open with a specific genuine observation (never generic "Love what you're building")
- Reference 2-3 Behance case studies with concrete outcome metrics
- Suggest one concrete, actionable, high-value free idea
- End with a clear soft CTA, no link to the call, etc.
- No em dashes (use commas or short sentences instead)
- No emojis in the letter body${learningsBlock}`;

  const userPrompt = `Generate one personalized cover letter using ${templateHint}

PROSPECT DATA:
- Name: ${name || clientName || 'there'}
- Company / Project: ${clientName || name || 'their company'}
- Job Title / Role: ${jobTitle || 'not specified'}
- Website: ${website || 'not provided'}
- Services needed: ${services.length ? services.join(', ') : 'UI/UX Design'}
- Lead source: ${leadSource || 'Outbound'}
- Full brief / description:
${description || 'No additional description provided.'}
${importantNote ? `\nIMPORTANT NOTES (follow exactly): ${importantNote}` : ''}

BEHANCE CASE STUDIES TO REFERENCE (pick the most relevant 1-2):
${projectsBlock}

Write the cover letter now. Output only the letter text, no preamble, no labels.`;

  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  return message.content[0].text.trim();
}

module.exports = { generateCoverLetter };
