/** Access token stored by password/OAuth callback flows. */
export function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
}

/** Clear all client-side auth token keys (legacy + current). */
export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

/** Readable CSRF cookie is set alongside HttpOnly refresh/access cookies. */
export function hasCookieAuthSession() {
  if (typeof document === 'undefined') return false;
  return /(?:^|; )csrf_token=([^;]*)/.test(document.cookie);
}

/** Paths that should never force-redirect to /login when a session expires. */
const PUBLIC_NO_AUTH_REDIRECT_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/join-form',
];

/** True on marketing/home routes where guests may browse without signing in. */
export function isPublicBrowsePath(pathname) {
  const path = (pathname || (typeof window !== 'undefined' ? window.location.pathname : '') || '').trim();
  if (!path || path === '/') return true;
  return PUBLIC_NO_AUTH_REDIRECT_PATHS.some(
    (publicPath) => publicPath !== '/' && (path === publicPath || path.startsWith(`${publicPath}/`)),
  );
}

/** True when the browser likely has an authenticated session. */
export function hasAuthSession() {
  return Boolean(getStoredAccessToken() || hasCookieAuthSession());
}

/** Default route after a successful login when no return URL was saved. */
export function getPostLoginDestination(user) {
  const role = (user?.role ?? '').toString().toUpperCase().replace(/^ROLE_/, '');
  if (role === 'COBROTHER') return '/cobrother';
  return '/';
}

/**
 * Prefer a saved return path; otherwise use role-based default (homepage for most users).
 * Treats "/login" as unset; "/" falls through to the role-based default.
 */
export function resolvePostLoginPath(storedPath, user) {
  const normalized = typeof storedPath === 'string' ? storedPath.trim() : '';
  if (normalized && normalized !== '/' && normalized !== '/login') {
    return normalized;
  }
  return getPostLoginDestination(user);
}

/** Normalize react-router `from` (string path or location-like object). */
export function normalizeReturnLocation(from) {
  if (!from) return null;
  if (typeof from === 'string') {
    const trimmed = from.trim();
    return trimmed ? { pathname: trimmed } : null;
  }
  if (typeof from === 'object' && from.pathname) {
    return {
      pathname: from.pathname,
      search: from.search || '',
      hash: from.hash || '',
      state: from.state,
    };
  }
  return null;
}

/**
 * Post-login navigation target, preserving location.state (e.g. openListDomainForm).
 * @returns {{ pathname: string, state?: object }}
 */
export function resolvePostLoginNavigation(from, user) {
  const returnLoc = normalizeReturnLocation(from);
  const pathname = resolvePostLoginPath(returnLoc?.pathname, user);
  const usedSavedPath = Boolean(
    returnLoc?.pathname
    && resolvePostLoginPath(returnLoc.pathname, user) === pathname,
  );
  const search = usedSavedPath && returnLoc?.search != null ? returnLoc.search : '';
  const hash = usedSavedPath && returnLoc?.hash != null ? returnLoc.hash : '';
  const state = usedSavedPath && returnLoc?.state ? returnLoc.state : undefined;
  const result = { pathname, search, hash };
  if (state) result.state = state;
  return result;
}

/**
 * Where to send the user right after auth — complete-profile first when needed,
 * carrying the eventual destination (and its state) in location.state.from.
 * @returns {{ pathname: string, state?: object }}
 */
export function resolveAfterAuthNavigation(from, user) {
  const target = resolvePostLoginNavigation(from, user);
  if (user && !user.profileComplete) {
    return { pathname: '/complete-profile', state: { from: target } };
  }
  return target;
}

const RETURN_LOCATION_STORAGE_KEY = 'returnLocationAfterLogin';

/** Persist full return target before OAuth leaves the SPA (pathname, search, state). */
export function saveReturnLocationBeforeOAuth(from) {
  if (typeof window === 'undefined') return;
  const returnLoc = normalizeReturnLocation(from);
  if (!returnLoc?.pathname) return;
  try {
    localStorage.setItem(RETURN_LOCATION_STORAGE_KEY, JSON.stringify(returnLoc));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Read and clear saved OAuth return target. */
export function consumeReturnLocationBeforeOAuth() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(RETURN_LOCATION_STORAGE_KEY);
  if (raw) localStorage.removeItem(RETURN_LOCATION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeReturnLocation(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * OAuth callback destination — same rules as password login
 * (including complete-profile first and nested location.state).
 */
export function resolveOAuthCallbackNavigation(user, redirectPath) {
  const savedLocation = consumeReturnLocationBeforeOAuth();
  const from = savedLocation || redirectPath || null;
  return resolveAfterAuthNavigation(from, user);
}
