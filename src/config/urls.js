/**
 * API / backend origin resolution.
 *
 * **Production defaults** (switch to local before local dev):
 *   Backend: https://cobrother-backend.onrender.com
 *   App:     https://co-brother-frontend.vercel.app
 *
 * **Override** — set in `.env` / Vercel:
 *   VITE_API_URL=https://cobrother-backend.onrender.com
 *   VITE_APP_URL=https://co-brother-frontend.vercel.app
 */
export const PRODUCTION_API_ORIGIN = 'https://cobrother-backend.onrender.com';
export const PRODUCTION_APP_URL = 'https://co-brother-frontend.vercel.app';

/**
 * Local Uvicorn is HTTP-only. `https://127.0.0.1:8000` causes ERR_SSL_PROTOCOL_ERROR.
 */
function normalizeLocalApiBase(url) {
  if (!url || typeof url !== 'string') return url;
  let t = url.trim();
  try {
    const parsed = new URL(t);
    if (['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
      parsed.port = '8000';
      t = parsed.toString().replace(/\/$/, '');
    }
  } catch {
    // Relative URLs are handled by the caller.
  }
  if (/^https:\/\/(127\.0\.0\.1|localhost):8000(\/|$)/i.test(t)) {
    return `http://${t.slice('https://'.length)}`;
  }
  return t;
}

const remoteApiBaseRaw =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const remoteApiBase = normalizeLocalApiBase(remoteApiBaseRaw);

/** True when .env points at local Uvicorn on :8000 */
const isLocalBackend =
  !remoteApiBase ||
  /^https?:\/\/(127\.0\.0\.1|localhost):8000(\/|$)/i.test(remoteApiBase);

function isFrontendOrigin(url) {
  if (!url || typeof window === 'undefined') return false;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Real backend host for OAuth, WebSockets, and Google redirect URI parity.
 * Never the Vercel SPA origin — oauth_state cookies must be set on the same host as the callback.
 */
export function resolveBackendOrigin() {
  if (remoteApiBase && !isFrontendOrigin(remoteApiBase)) {
    return remoteApiBase.replace(/\/$/, '');
  }
  if (import.meta.env.DEV && isLocalBackend) {
    return 'http://127.0.0.1:8000';
  }
  return PRODUCTION_API_ORIGIN;
}

/**
 * Axios baseURL.
 * - Dev + local backend: '' (Vite proxies /api → :8000)
 * - Prod: direct calls to Render (avoids Vercel POST redirects that strip Authorization)
 * - Override with VITE_API_URL when needed
 */
function resolveApiBaseUrl() {
  if (import.meta.env.DEV && isLocalBackend) {
    return '';
  }
  if (remoteApiBase && !isFrontendOrigin(remoteApiBase)) {
    return remoteApiBase.replace(/\/$/, '');
  }
  if (!import.meta.env.DEV) {
    return PRODUCTION_API_ORIGIN.replace(/\/$/, '');
  }
  return PRODUCTION_API_ORIGIN.replace(/\/$/, '');
}

/** OAuth redirects — always the real backend origin, not the SPA. */
export const API_ORIGIN = resolveBackendOrigin();

/** Axios baseURL */
export const API_BASE_URL = resolveApiBaseUrl();

/**
 * SockJS / STOMP base origin.
 * Local dev with Vite proxy: same origin as the SPA so `/ws` is proxied to Uvicorn.
 */
export function resolveRealtimeOrigin() {
  if (import.meta.env.DEV && typeof window !== 'undefined' && isLocalBackend) {
    return window.location.origin;
  }
  return resolveBackendOrigin().replace(/\/$/, '');
}

/**
 * Raw WebSocket origin (notifications).
 * Matches SockJS routing — local dev uses the Vite `/ws` proxy when on local backend.
 */
export function resolveWebSocketOrigin() {
  if (import.meta.env.DEV && typeof window !== 'undefined' && isLocalBackend) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }

  const base = resolveBackendOrigin().replace(/\/$/, '');
  if (base.startsWith('https://')) return base.replace('https://', 'wss://');
  if (base.startsWith('http://')) return base.replace('http://', 'ws://');

  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  return 'ws://127.0.0.1:8000';
}

if (import.meta.env.DEV && typeof console !== 'undefined') {
  const apiTarget = API_BASE_URL || API_ORIGIN;
  const mode = API_BASE_URL ? 'direct' : 'vite-proxy';
  console.info(`[frontend] API target URL: ${apiTarget} (${mode})`);
}

export const APP_BASE_URL =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : PRODUCTION_APP_URL);
