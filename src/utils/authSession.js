/** In-memory access JWT — never persist in localStorage (XSS exfil surface). */
let memoryAccessToken = null;

/** Access token for Bearer / WebSocket use (memory first; migrates legacy LS once). */
export function getStoredAccessToken() {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window === 'undefined') return null;
  const legacy = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (legacy) {
    memoryAccessToken = legacy;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    return legacy;
  }
  return null;
}

/** Store access token in memory only; wipe any legacy localStorage copies. */
export function setStoredAccessToken(token) {
  memoryAccessToken = token || null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
}

/** Clear all client-side auth token keys (memory + legacy storage). */
export function clearAuthTokens() {
  memoryAccessToken = null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');

  const cookieOptions = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  document.cookie = `csrf_token=; ${cookieOptions}`;
}

/**
 * Read JWT `exp` (seconds → ms) without verifying the signature.
 * Returns null when the token is missing or not a JWT.
 */
export function getAccessTokenExpiryMs(token = memoryAccessToken) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    const exp = Number(payload?.exp);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

/** True when JWT `exp` is known and within `skewMs` of expiry (proactive refresh). */
export function accessTokenNeedsRefresh(token = memoryAccessToken, skewMs = 90_000) {
  if (!token) return false;
  const expMs = getAccessTokenExpiryMs(token);
  if (expMs == null) return false;
  return Date.now() >= expMs - skewMs;
}

/**
 * True only when JWT `exp` is known and not near expiry.
 * Unparseable tokens are not treated as fresh (avoids skipping HTTP refresh).
 */
export function isAccessTokenFresh(token = memoryAccessToken, skewMs = 90_000) {
  const expMs = getAccessTokenExpiryMs(token);
  if (expMs == null) return false;
  return Date.now() < expMs - skewMs;
}

/** Readable CSRF cookie is set alongside HttpOnly refresh/access cookies. */
export function hasCookieAuthSession() {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  if (!match?.[1]) return false;
  const value = match[1].trim();
  if (!value) return false;
  try {
    return decodeURIComponent(value).trim().length > 0;
  } catch {
    return value.length > 0;
  }
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
 * Allow only same-app relative paths (blocks //evil.com, schemes, backslash tricks).
 * Returns null when the value is missing or unsafe.
 */
export function sanitizeSafeAppPath(rawPath) {
  if (typeof rawPath !== 'string') return null;
  let path = rawPath.trim();
  if (!path) return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  path = path.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return null;
  // Reject encoded separators that decode to protocol-relative / absolute URLs.
  if (path.toLowerCase().includes('%2f%2f') || path.includes('%5c') || path.includes('%5C')) {
    return null;
  }
  return path;
}

/**
 * Prefer a saved return path; otherwise use role-based default (homepage for most users).
 * Treats "/login" as unset; "/" falls through to the role-based default.
 * Only same-origin relative paths are accepted (open-redirect harden).
 */
export function resolvePostLoginPath(storedPath, user) {
  const safe = sanitizeSafeAppPath(storedPath);
  if (safe && safe !== '/' && safe !== '/login') {
    return safe;
  }
  return getPostLoginDestination(user);
}

/** Normalize react-router `from` (string path or location-like object). */
export function normalizeReturnLocation(from) {
  if (!from) return null;
  if (typeof from === 'string') {
    const trimmed = from.trim();
    if (!trimmed) return null;
    // Allow "pathname?search#hash" strings from ?redirect=
    const match = trimmed.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    const rawPath = match?.[1] || trimmed;
    const safePath = sanitizeSafeAppPath(rawPath);
    if (!safePath) return null;
    return {
      pathname: safePath,
      search: match?.[2] || '',
      hash: match?.[3] || '',
    };
  }
  if (typeof from === 'object' && from.pathname) {
    const safePath = sanitizeSafeAppPath(from.pathname);
    if (!safePath) return null;
    return {
      pathname: safePath,
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
