/**
 * API / backend origin resolution.
 *
 * Runtime host mapping (production SPA):
 *   cobrother.com     → https://backend.cobrother.com
 *   hubregistrar.com  → https://backend.hubregistrar.com
 *
 * Baked VITE_API_URL is only a fallback for unknown hosts / non-browser.
 * APP_BASE_URL follows window.location.origin in the browser.
 */
export const PRODUCTION_API_ORIGIN = 'https://backend.cobrother.com';
export const PRODUCTION_HUB_API_ORIGIN = 'https://backend.hubregistrar.com';
export const PRODUCTION_APP_URL = 'https://cobrother.com';

const COBROTHER_SPA_RE = /(^|\.)cobrother\.com$/i;
const HUBREGISTRAR_SPA_RE = /(^|\.)hubregistrar\.com$/i;
const RETURN_ORIGIN_RE =
  /^https:\/\/([a-z0-9-]+\.)*(cobrother|hubregistrar)\.com$/i;
const DEV_RETURN_ORIGINS = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
]);

export function productionApiOriginForHost(hostname) {
  const host = String(hostname || '')
    .split(':')[0]
    .trim()
    .toLowerCase();
  if (!host || host.startsWith('backend.')) return null;
  if (COBROTHER_SPA_RE.test(host)) return PRODUCTION_API_ORIGIN;
  if (HUBREGISTRAR_SPA_RE.test(host)) return PRODUCTION_HUB_API_ORIGIN;
  return null;
}

export function allowedReturnOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  let origin;
  try {
    const parsed = new URL(value.trim());
    if (parsed.username || parsed.password) return null;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    origin = parsed.origin;
  } catch {
    return null;
  }
  const host = new URL(origin).hostname.toLowerCase();
  if (host.startsWith('backend.')) return null;
  if (DEV_RETURN_ORIGINS.has(origin)) return origin;
  if (RETURN_ORIGIN_RE.test(origin)) return origin;
  return null;
}

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

const devProxyTarget = (import.meta.env.VITE_DEV_PROXY_TARGET || '').trim();
const remoteApiBaseRaw =
  import.meta.env.DEV && devProxyTarget
    ? devProxyTarget
    : import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const remoteApiBase = normalizeLocalApiBase(remoteApiBaseRaw);

/** True when .env points at local Uvicorn on :8000 */
const isLocalBackend =
  !remoteApiBase ||
  /^https?:\/\/(127\.0\.0\.1|localhost):8000(\/|$)/i.test(remoteApiBase);

/** Dev: Vite proxies /api and /oauth2 to a remote backend (e.g. backend.hubregistrar.com). */
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
 * Never the SPA origin — oauth_state cookies must be set on the same host as the callback.
 */
export function resolveBackendOrigin() {
  if (typeof window !== 'undefined') {
    const mapped = productionApiOriginForHost(window.location.hostname);
    if (mapped) return mapped;
  }
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
 * - Prod: direct calls to backend origin
 * - Override with VITE_API_URL when needed
 */
function resolveApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const mapped = productionApiOriginForHost(window.location.hostname);
    if (mapped) return mapped;
  }
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
 * Raw WebSocket origin (auction STOMP + notifications).
 * Local DEV talks to Uvicorn directly — Vite's WS proxy races with HMR and can fail.
 */
export function resolveWebSocketOrigin() {
  if (import.meta.env.DEV && typeof window !== 'undefined' && isLocalBackend) {
    return 'ws://127.0.0.1:8000';
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

/**
 * Native WebSocket for auction STOMP (raw frames, no SockJS).
 * Path matches backend: /ws/{server}/{session}/websocket
 */
export function createAuctionStompSocket() {
  const server = String(Math.floor(Math.random() * 1000));
  const session = Math.random().toString(36).slice(2, 10);
  return new WebSocket(
    `${resolveWebSocketOrigin()}/ws/${server}/${session}/websocket`,
  );
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

export function resolveAppBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const baked = (import.meta.env.VITE_APP_URL || '').trim();
  if (baked) return baked.replace(/\/$/, '');
  return PRODUCTION_APP_URL.replace(/\/$/, '');
}

export const APP_BASE_URL = resolveAppBaseUrl();
