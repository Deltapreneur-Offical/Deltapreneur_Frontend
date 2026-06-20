/**
 * API / backend origin resolution.
 *
<<<<<<< HEAD
 * **Production defaults** (split architecture):
 *   API:  https://backend.cobrother.com  (requests → /api/v1/... on backend host)
 *   App:  https://cobrother.com
=======
 * **Production (split architecture):**
 *   App:  https://cobrother.com
 *   API:  https://backend.cobrother.com  (axios paths include /api/v1/...)
>>>>>>> 6f0d6c1f4bd220bd0ac9ff150fbe38d8b08f87ad
 *
 * **Override** — set in `.env.production` or deploy build:
 *   VITE_API_URL=https://backend.cobrother.com
 *   VITE_APP_URL=https://cobrother.com
 */
export const PRODUCTION_API_ORIGIN = 'https://backend.cobrother.com';
export const PRODUCTION_APP_URL = 'https://cobrother.com';

/** Strip a trailing /api from env URLs; axios paths already include /api/v1/... */
function siteOriginFromApiEnv(url) {
  if (!url || typeof url !== 'string') return url;
  return url.trim().replace(/\/api\/?$/, '').replace(/\/$/, '');
}

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
const devProxyTarget = (import.meta.env.VITE_DEV_PROXY_TARGET || '').trim();

/** True when .env points at local Uvicorn on :8000 */
const isLocalBackend =
  !remoteApiBase ||
  /^https?:\/\/(127\.0\.0\.1|localhost):8000(\/|$)/i.test(remoteApiBase);

/** Dev: Vite proxies /api and /oauth2 to a remote backend (e.g. backend.cobrother.com). */
const usesViteRemoteProxy = import.meta.env.DEV && Boolean(devProxyTarget) && isLocalBackend;

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
<<<<<<< HEAD
 * Never the SPA origin — oauth_state cookies must be set on the same host as the callback.
=======
 * Never the SPA origin — oauth_state cookies must be set on the backend host.
>>>>>>> 6f0d6c1f4bd220bd0ac9ff150fbe38d8b08f87ad
 */
export function resolveBackendOrigin() {
  if (remoteApiBase && !isFrontendOrigin(remoteApiBase)) {
    return siteOriginFromApiEnv(remoteApiBase) || remoteApiBase.replace(/\/$/, '');
  }
  if (import.meta.env.DEV && isLocalBackend) {
    if (usesViteRemoteProxy && typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://127.0.0.1:8000';
  }
  return PRODUCTION_API_ORIGIN;
}

/**
 * Axios baseURL.
 * - Dev + local backend: '' (Vite proxies /api → :8000)
<<<<<<< HEAD
 * - Prod: direct calls to backend origin
=======
 * - Prod: direct calls to backend.cobrother.com
>>>>>>> 6f0d6c1f4bd220bd0ac9ff150fbe38d8b08f87ad
 * - Override with VITE_API_URL when needed
 */
function resolveApiBaseUrl() {
  if (import.meta.env.DEV && isLocalBackend) {
    return '';
  }
  if (remoteApiBase && !isFrontendOrigin(remoteApiBase)) {
    return siteOriginFromApiEnv(remoteApiBase) || remoteApiBase.replace(/\/$/, '');
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
  const mode = usesViteRemoteProxy
    ? `vite-proxy→${devProxyTarget}`
    : API_BASE_URL
      ? 'direct'
      : 'vite-proxy';
  console.info(`[frontend] API target URL: ${apiTarget} (${mode})`);
}

export const APP_BASE_URL =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : PRODUCTION_APP_URL);
