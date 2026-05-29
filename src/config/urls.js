/**
 * API / backend origin resolution.
 *
 * **Production defaults** (switch to local before local dev):
 *   Backend: https://backend.cobrother.com
 *   App:     https://cobrother.com
 *
 * **Override** — set in `.env`:
 *   VITE_API_URL=https://backend.cobrother.com
 *   VITE_APP_URL=https://cobrother.com
 */
export const PRODUCTION_API_ORIGIN = 'https://cobrother-backend.onrender.com';
export const PRODUCTION_APP_URL = 'https://co-brother-frontend.vercel.app';

/**
 * Local Uvicorn is HTTP-only. `https://127.0.0.1:8000` (or https://localhost:8000)
 * causes ERR_SSL_PROTOCOL_ERROR. Some .env examples or Chrome upgrades use https by mistake.
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

function isSameOriginAsApp(apiBase) {
  if (import.meta.env.DEV || typeof window === 'undefined') return false;
  const base = String(apiBase || '').replace(/\/$/, '');
  if (!base || base === '/') return true;
  try {
    return new URL(base).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * In dev with a local backend, use same-origin relative URLs so Vite proxies /api → :8000.
 * On Vercel, vercel.json also proxies /api → Render when base URL is same-origin.
 */
function resolveApiBaseUrl() {
  if (import.meta.env.DEV && isLocalBackend) {
    return '';
  }
  const configured = remoteApiBase || PRODUCTION_API_ORIGIN;
  if (isSameOriginAsApp(configured)) {
    // Vercel: relative /api is rewritten to Render (see vercel.json)
    return '';
  }
  return configured;
}

function resolveApiOrigin() {
  if (import.meta.env.DEV && isLocalBackend) {
    return typeof window !== 'undefined'
      ? window.location.origin
      : 'http://127.0.0.1:5173';
  }
  const configured = remoteApiBase || PRODUCTION_API_ORIGIN;
  if (isSameOriginAsApp(configured)) {
    return typeof window !== 'undefined'
      ? window.location.origin
      : PRODUCTION_APP_URL;
  }
  return configured;
}

/** Spring Boot origin for OAuth redirects and SockJS. */
export const API_ORIGIN = resolveApiOrigin();

/** Axios baseURL — empty in local dev uses Vite proxy (see vite.config.js). */
export const API_BASE_URL = resolveApiBaseUrl();

export const APP_BASE_URL =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : PRODUCTION_APP_URL);

