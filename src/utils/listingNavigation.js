import { hasAuthSession } from './authSession';

/** Browse-page paths; detail opens on a dedicated page for ventures. */
const LISTING_PATHS = {
  domain: '/domains',
  venture: '/ventures',
  software: '/technology',
  community: '/creator',
};

export function getListingBrowsePath(type, id) {
  if (id != null && type === 'venture') {
    return `/ventures/${id}`;
  }
  const base = LISTING_PATHS[type] ?? '/dashboard';
  return id != null ? `${base}?id=${id}` : base;
}

export function isLoggedIn() {
  return hasAuthSession();
}

/** Navigate to the listing detail/browse page. All listing types are publicly
 *  viewable from the Home page — no login redirect is needed. */
export function navigateToListingDetail(navigate, type, id) {
  const path = getListingBrowsePath(type, id);
  navigate(path);
}

export function consumeRedirectAfterLogin() {
  const path = localStorage.getItem('redirectAfterLogin');
  if (path) localStorage.removeItem('redirectAfterLogin');
  return path;
}

/** Operations → Virtual Assistance detail path (mirrors /creator?id=). */
export function getVirtualAssistantDetailPath(id, { intent } = {}) {
  if (id == null || id === '') {
    return '/operations?section=assistance';
  }
  const params = new URLSearchParams({
    section: 'assistance',
    id: String(id),
  });
  if (intent === 'hire') params.set('intent', 'hire');
  return `/operations?${params.toString()}`;
}

/** Logged in → operations VA detail; otherwise → login (same as Creator listings). */
export function navigateToVirtualAssistantDetail(navigate, id, options = {}) {
  const path = getVirtualAssistantDetailPath(id, options);
  if (!isLoggedIn()) {
    localStorage.setItem('redirectAfterLogin', path);
    navigate('/login', { state: { from: path } });
    return;
  }
  navigate(path);
}
