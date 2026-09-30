/** Route rules and tab definitions for the mobile/tablet bottom navigation. */

/** Routes (and every nested route below them) where the bar must not render. */
export const BOTTOM_NAV_HIDDEN_PREFIXES = [
  '/login',
  '/register',
  '/signup',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/complete-profile',
  '/cart',
  '/checkout',
  '/payment',
  '/payments',
  '/admin',
];

/** Any path containing one of these whole segments is a checkout/payment flow. */
const HIDDEN_SEGMENTS = new Set(['checkout', 'payment', 'payments']);

/** True when `pathname` equals `prefix` or is nested below it. */
export function matchesPathPrefix(pathname, prefix) {
  if (!pathname || !prefix) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isBottomNavHiddenRoute(pathname) {
  const path = String(pathname || '/').toLowerCase();
  if (BOTTOM_NAV_HIDDEN_PREFIXES.some((prefix) => matchesPathPrefix(path, prefix))) {
    return true;
  }
  return path.split('/').some((segment) => HIDDEN_SEGMENTS.has(segment));
}

/** `paths[0]` is the link target; the rest are aliases that also mark the tab active. */
export const BOTTOM_NAV_TABS = [
  { id: 'domains', labelKey: 'domains', label: 'Domains', paths: ['/domains', '/alldomains'] },
  { id: 'ventures', labelKey: 'ventures', label: 'Ventures', paths: ['/ventures', '/co-ventures'] },
  { id: 'auctions', labelKey: 'auctions', label: 'Auctions', paths: ['/auctions'] },
  {
    id: 'technology',
    labelKey: 'technologies',
    label: 'Technologies',
    paths: ['/technology', '/technologies'],
  },
  { id: 'creator', labelKey: 'creator', label: 'Deltapreneurs', paths: ['/creator'] },
];

export function isBottomNavTabActive(tab, pathname) {
  const path = String(pathname || '/').toLowerCase();
  return tab.paths.some((p) => matchesPathPrefix(path, p));
}
