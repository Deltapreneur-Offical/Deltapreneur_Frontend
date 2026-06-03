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
  const t = url.trim();
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

/** OAuth + SockJS — always the backend origin, not the SPA. */
export const API_ORIGIN = resolveBackendOrigin();

/** Axios baseURL */
export const API_BASE_URL = resolveApiBaseUrl();

export const APP_BASE_URL =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : PRODUCTION_APP_URL);
