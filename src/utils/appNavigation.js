/** Main app hub routes — no layout back button on exact match */
export const APP_HUB_ROUTES = new Set([
  '/dashboard',
  '/operations',
  '/ventures',
  '/domains',
  '/technology',
  '/creator',
  '/auctions',
  '/purchases',
  '/admin',
  '/notifications',
  '/meetings',
  '/fee-requests',
  '/cobrother-dashboard',
]);

/** Pages that already render their own back control in content */
const PAGE_OWN_BACK = [
  /^\/ventures\/new$/,
  /^\/domains\/dashboard$/,
  /^\/technology\/dashboard$/,
  /^\/ventures\/dashboard$/,
  /^\/auction\//,
  /^\/venture-auction\//,
  /^\/creator-auction\//,
  /^\/community-auction\//,
  /^\/technology\/auction\//,
  /^\/software-auction/,
  /^\/ventures\/analytics$/,
  /^\/analytics$/,
  /^\/analytics\/[^/]+$/,
  /^\/technology\/[^/]+\/analytics$/,
];

const BACK_RULES = [
  { test: (p) => p.startsWith('/ventures'), to: '/ventures', label: 'Ventures' },
  { test: (p) => p.startsWith('/venture-auction'), to: '/auctions', label: 'Auctions' },
  { test: (p) => p.startsWith('/domains'), to: '/domains', label: 'Domains' },
  { test: (p) => p.startsWith('/auction/'), to: '/auctions', label: 'Auctions' },
  { test: (p) => p.startsWith('/technology/auction') || p.startsWith('/software-auction'), to: '/auctions?section=technology', label: 'Auctions' },
  { test: (p) => (p.startsWith('/technology') || p.startsWith('/cocreation')) && !p.includes('/auction/'), to: '/technology', label: 'Technology' },
  { test: (p) => p.startsWith('/creator-auction') || p.startsWith('/community-auction'), to: '/auctions', label: 'Auctions' },
  { test: (p) => p.startsWith('/creator') || p.startsWith('/community'), to: '/creator', label: 'Creators' },
  { test: (p) => p.startsWith('/admin'), to: '/admin', label: 'Admin' },
  { test: (p) => p.startsWith('/purchases'), to: '/purchases', label: 'Purchases' },
  { test: (p) => p.startsWith('/fee-requests'), to: '/fee-requests', label: 'Fee requests' },
  { test: (p) => p.startsWith('/meetings'), to: '/meetings', label: 'Meetings' },
  { test: (p) => p.startsWith('/notifications'), to: '/notifications', label: 'Notifications' },
  { test: (p) => p.startsWith('/cobrother'), to: '/cobrother-dashboard', label: 'CoBrother' },
  { test: (p) => p.startsWith('/operations'), to: '/operations', label: 'Operations' },
  { test: (p) => p.startsWith('/dashboard'), to: '/dashboard', label: 'Dashboard' },
];

export function getAppBackTarget(pathname) {
  if (APP_HUB_ROUTES.has(pathname)) return null;
  if (PAGE_OWN_BACK.some((rx) => rx.test(pathname))) return null;

  for (const rule of BACK_RULES) {
    if (rule.test(pathname)) {
      return { to: rule.to, label: `Back to ${rule.label}` };
    }
  }
  return null;
}

export function shouldShowAppLayoutBack(pathname) {
  return getAppBackTarget(pathname) !== null;
}
