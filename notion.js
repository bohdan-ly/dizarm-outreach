'use strict';

const { Client } = require('@notionhq/client');

const DATABASE_ID  = '2e92e6bf-0722-8018-9f42-fd2d850b07d9';
const MESSAGES_DB_ID = '2e92e6bf-0722-8049-8301-e9aeabc54c39';
const READINESS_ROBOT = '🤖🤖🤖';
const READINESS_DONE  = '✅✅✅';

let notion;

function getClient() {
  if (!notion) {
    notion = new Client({ auth: process.env.NOTION_TOKEN });
  }
  return notion;
}

/**
 * Returns the ISO-8601 start-of-day timestamp for today in GMT+1.
 * e.g. "2026-04-14T00:00:00+01:00"
 */
function todayStartGMT1() {
  const now = new Date();
  // Shift to GMT+1
  const gmt1 = new Date(now.getTime() + 60 * 60 * 1000);
  const yyyy = gmt1.getUTCFullYear();
  const mm   = String(gmt1.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(gmt1.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T00:00:00+01:00`;
}

/**
 * Returns all Outreach Leads pages where:
 *   - Outreach Readiness == 🤖🤖🤖
 *   - Created At is on or after today (GMT+1)
 * @returns {Promise<object[]>}
 */
async function fetchRobotLeads() {
  const n = getClient();
  const results = [];
  let cursor;

  do {
    const res = await n.databases.query({
      database_id: DATABASE_ID,
      filter: {
        and: [
          {
            property: 'Outreach Readiness',
            select: { equals: READINESS_ROBOT },
          },
          {
            property: 'Created At',
            created_time: { on_or_after: todayStartGMT1() },
          },
        ],
      },
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return results;
}

/**
 * Extracts the relevant fields from a Notion page object.
 * @param {object} page  Raw Notion page from the API
 * @returns {object}
 */
function extractLeadData(page) {
  const p = page.properties;

  const getText   = (prop) => prop?.rich_text?.[0]?.plain_text || prop?.title?.[0]?.plain_text || '';
  const getSelect = (prop) => prop?.select?.name || '';
  const getMulti  = (prop) => (prop?.multi_select || []).map((o) => o.name);
  const getUrl    = (prop) => prop?.url || '';

  return {
    pageId:       page.id,
    name:         getText(p['Name']),
    clientName:   getText(p['Client Name']),
    jobTitle:     getText(p['Job Title']),
    description:  getText(p['Full description']),
    website:      getUrl(p['Website']),
    services:     getMulti(p['Services']),
    account:      getSelect(p['Account']),
    leadSource:   getSelect(p['Lead Source']),
    importantNote: getText(p['Important Note']),
  };
}

/**
 * Fetches a single lead page by ID and extracts its data.
 * @param {string} pageId
 * @returns {Promise<object>}
 */
async function fetchLeadById(pageId) {
  const n = getClient();
  const page = await n.pages.retrieve({ page_id: pageId });
  return extractLeadData(page);
}

/**
 * Creates a new record in the Messages database with the generated cover letter,
 * links it to the lead via the "Outreach Leads" relation,
 * then flips the lead's Outreach Readiness to ✅✅✅.
 *
 * @param {string} pageId    Lead page ID
 * @param {string} leadName  Used as the Message record title
 * @param {string} letter    The generated cover letter text
 */
async function saveLetter(pageId, leadName, letter) {
  const n = getClient();

  // Create a new Messages record linked to this lead
  await n.pages.create({
    parent: { database_id: MESSAGES_DB_ID },
    properties: {
      Name: {
        title: [{ text: { content: `${leadName || pageId} — message 1` } }],
      },
      Message: {
        rich_text: [{ text: { content: letter.slice(0, 2000) } }],
      },
      'Outreach Leads': {
        relation: [{ id: pageId }],
      },
      Status: {
        status: { name: 'Not Sent' },
      },
    },
  });

  // Flip lead status to done
  await n.pages.update({
    page_id: pageId,
    properties: {
      'Outreach Readiness': {
        select: { name: READINESS_DONE },
      },
    },
  });
}

module.exports = { fetchRobotLeads, fetchLeadById, extractLeadData, saveLetter };
