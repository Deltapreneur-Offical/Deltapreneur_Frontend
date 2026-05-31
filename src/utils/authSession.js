/** Access token stored by password/OAuth callback flows. */
export function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
}

/** Readable CSRF cookie is set alongside HttpOnly refresh/access cookies. */
export function hasCookieAuthSession() {
  if (typeof document === 'undefined') return false;
  return /(?:^|; )csrf_token=([^;]*)/.test(document.cookie);
}

/** True when the browser likely has an authenticated session. */
export function hasAuthSession() {
  return Boolean(getStoredAccessToken() || hasCookieAuthSession());
}
