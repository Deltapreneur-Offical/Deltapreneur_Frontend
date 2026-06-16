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

/** Logged in → dedicated detail page (ventures) or list page with ?id=; otherwise → login. */
export function navigateToListingDetail(navigate, type, id) {
  const path = getListingBrowsePath(type, id);
  if (!isLoggedIn()) {
    localStorage.setItem('redirectAfterLogin', path);
    navigate('/login', { state: { from: path } });
    return;
  }
  navigate(path);
}

export function consumeRedirectAfterLogin() {
  const path = localStorage.getItem('redirectAfterLogin');
  if (path) localStorage.removeItem('redirectAfterLogin');
  return path;
}
