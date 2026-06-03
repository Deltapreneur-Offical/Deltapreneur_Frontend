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

/** Default route after a successful login when no return URL was saved. */
export function getPostLoginDestination(user) {
  const role = (user?.role ?? '').toString().toUpperCase();
  if (role === 'COBROTHER') return '/cobrother';
  return '/dashboard';
}

/**
 * Prefer a saved return path; otherwise use role-based dashboard default.
 * Treats "/" and "/login" as "no saved path" so users land on the app, not home.
 */
export function resolvePostLoginPath(storedPath, user) {
  const normalized = typeof storedPath === 'string' ? storedPath.trim() : '';
  if (normalized && normalized !== '/' && normalized !== '/login') {
    return normalized;
  }
  return getPostLoginDestination(user);
}
