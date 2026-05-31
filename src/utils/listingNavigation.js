import { hasAuthSession } from './authSession';

/** Browse-page paths; detail opens via ?id= on each list page. */
const LISTING_PATHS = {
  domain: '/domains',
  venture: '/ventures',
  software: '/technology',
  community: '/community',
};

export function getListingBrowsePath(type, id) {
  const base = LISTING_PATHS[type] ?? '/dashboard';
  return id != null ? `${base}?id=${id}` : base;
}

export function isLoggedIn() {
  return hasAuthSession();
}

/** Logged in → list page with detail modal; otherwise → login with return path. */
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
