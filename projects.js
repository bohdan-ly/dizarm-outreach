'use strict';

// All 9 DizArm Behance case studies with outcomes, links, and niche tags.
// Niche tags are matched against the lead's Services[] and Full description.
const BEHANCE_PROJECTS = [
  {
    id: 'P1',
    title: 'Fintech Payment System | Finance App | Mobile App',
    link: 'https://bit.ly/453qwjA',
    outcomes: [
      'onboarding drop-off reduced by ~5% through simplified destination discovery flows',
      'average payment value increased by ~17% due to better upsell placements and visual item hierarchy',
    ],
    tags: ['fintech', 'payment', 'finance', 'crypto', 'wallet', 'banking', 'mobile', 'ui/ux design', 'app design'],
  },
  {
    id: 'P2',
    title: 'LMS System | Mobile App | iOS App Design',
    link: 'https://bit.ly/4qhuTjn',
    outcomes: [
      'course completion rate increased from ~45% to ~52%',
      'weekly active users grew by ~12% after launch',
      'time-to-first-lesson decreased by ~9% due to simplified onboarding',
    ],
    tags: ['lms', 'edtech', 'education', 'elearning', 'learning', 'saas', 'mobile', 'ios', 'ui/ux design', 'app design'],
  },
  {
    id: 'P3',
    title: 'Face Art | Beauty App | Mobile App Design',
    link: 'https://bit.ly/4sBz5ft',
    outcomes: [
      'new-user to first-edited-photo conversion rate at ~63%',
      'session length increased by ~8% vs. previous version',
      'export/share actions per active user up by ~7%',
    ],
    tags: ['beauty', 'photo', 'camera', 'filter', 'social', 'influencer', 'ugc', 'consumer', 'mobile', 'app design'],
  },
  {
    id: 'P4',
    title: 'Travel Mobile App | iOS App Design | Creative UI',
    link: 'https://www.behance.net/gallery/210196167/TRAVEL-BUS-WEBSITE-BOOKING-UXUI-TRIP',
    outcomes: [
      'trip booking conversion rate improved to ~4.8% (~7% relative uplift) via clearer CTAs and streamlined checkout',
      'saved trips and wishlist usage increased by ~6%',
      'onboarding drop-off reduced by ~5%',
    ],
    tags: ['travel', 'tourism', 'booking', 'hotel', 'flight', 'trip', 'marketplace', 'mobile', 'website design', 'landing page design', 'ui/ux design'],
  },
  {
    id: 'P5',
    title: 'AR Customizer Mobile App | MVP | PWA Solution',
    link: 'https://bit.ly/4bp6wM4',
    outcomes: [
      'product-view-to-AR-try-on rate at ~29%',
      'add-to-cart after AR interaction at ~15%',
      'bounce rate on product detail pages decreased by ~6%',
    ],
    tags: ['ecommerce', 'ar', 'augmented reality', 'fashion', 'furniture', 'retail', 'd2c', 'pwa', 'app design', 'ui/ux design'],
  },
  {
    id: 'P6',
    title: 'Restaurant Menu | PWA Web App | Creative SaaS Platform',
    link: 'https://bit.ly/4pvM0Nb',
    outcomes: [
      'QR menu scan-to-order completion rate at ~41%',
      'average order value increased by ~7%',
      'menu update time for restaurant staff reduced by ~20%',
    ],
    tags: ['restaurant', 'food', 'hospitality', 'qr', 'ordering', 'saas', 'pwa', 'website design', 'ui/ux design'],
  },
  {
    id: 'P7',
    title: 'App for Vision OS | VR Web App | UX Research | UI Game',
    link: 'https://www.behance.net/gallery/208058057/App-for-Vision-OS-VR-Web-App-UX-Research-UI-Game',
    outcomes: [
      'tutorial completion rate around ~78%, improving feature discovery',
      'daily active users in early cohorts up by ~7% vs. baseline VR prototypes',
      'interaction error rates in core flows reduced by ~8%',
    ],
    tags: ['vr', 'ar', 'xr', 'visionos', 'game', 'gaming', 'immersive', 'experimental', 'game design', 'app design'],
  },
  {
    id: 'P8',
    title: 'Target | PWA | SaaS | AI Solution',
    link: 'https://www.behance.net/gallery/181102989/Target-PWA-SaaS-AI-solution',
    outcomes: [
      'funnel conversion (signup to first action) at ~34%',
      'feature adoption for AI-driven actions at ~27% of actives',
      'churn in first 30 days reduced by ~6%',
    ],
    tags: ['saas', 'ai', 'b2b', 'b2c', 'dashboard', 'productivity', 'pwa', 'automation', 'ui/ux design', 'app design', 'website design'],
  },
  {
    id: 'P9',
    title: 'Aviation Platform | Airport Management | Design Solution',
    link: 'https://www.behance.net/gallery/242503279/AIRPORT-CRM-MANAGEMENT-SOFTWARE-AIRLINE-AVIATION',
    outcomes: [
      '~6% uplift in conversion, activation, and engagement metrics after redesign',
      'clients cite ~25% improvement in engagement metrics on shipped products',
    ],
    tags: ['aviation', 'crm', 'management', 'complex', 'enterprise', 'b2b', 'branding', 'identity design', 'ui/ux design', 'website design'],
  },
];

/**
 * Given an array of service names and a free-text description,
 * returns the 2 most relevant Behance projects.
 *
 * @param {string[]} services  e.g. ["UI/UX Design", "App Design"]
 * @param {string}   description  full lead description text
 * @returns {{ title: string, link: string, outcomes: string[] }[]}
 */
function pickProjects(services, description) {
  const needle = [
    ...(services || []),
    description || '',
  ].join(' ').toLowerCase();

  const scored = BEHANCE_PROJECTS.map((p) => {
    const hits = p.tags.filter((tag) => needle.includes(tag)).length;
    return { project: p, score: hits };
  });

  scored.sort((a, b) => b.score - a.score);

  // Always return at least 2 projects; fall back to P1 + P8 if nothing matched
  const top = scored.filter((s) => s.score > 0).slice(0, 2).map((s) => s.project);

  if (top.length === 0) return [BEHANCE_PROJECTS[0], BEHANCE_PROJECTS[7]]; // P1, P8
  if (top.length === 1) {
    const fallback = BEHANCE_PROJECTS.find((p) => p.id !== top[0].id && (p.id === 'P1' || p.id === 'P8'));
    return [top[0], fallback || BEHANCE_PROJECTS[0]];
  }
  return top;
}

module.exports = { BEHANCE_PROJECTS, pickProjects };
