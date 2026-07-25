import axios from 'axios';
import { API_BASE_URL } from '../config/urls';
import {
  accessTokenNeedsRefresh,
  clearAuthTokens,
  getStoredAccessToken,
  hasCookieAuthSession,
  isAccessTokenFresh,
  isPublicBrowsePath,
  setStoredAccessToken,
} from '../utils/authSession';
import { sanitizeAxiosError, isVaPublicRequest } from '../utils/apiError';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** Single in-flight refresh so parallel 401s share one token rotation. */
let refreshPromise = null;

const REFRESH_LOCK_NAME = 'cobrother-auth-refresh';
const REFRESH_CHANNEL_NAME = 'cobrother-auth-refresh';
const REFRESH_LS_KEY = 'cobrother-auth-refresh-lock';
const REFRESH_LOCK_TTL_MS = 12_000;
const PROACTIVE_REFRESH_SKEW_MS = 90_000;

/** @type {BroadcastChannel | null} */
let refreshChannel = null;

function ensureRefreshChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!refreshChannel) {
    refreshChannel = new BroadcastChannel(REFRESH_CHANNEL_NAME);
    refreshChannel.onmessage = (event) => {
      const token = event?.data?.type === 'access-token' ? event.data.token : null;
      if (typeof token === 'string' && token) {
        setStoredAccessToken(token);
      }
    };
  }
  return refreshChannel;
}

function publishAccessToken(token) {
  const channel = ensureRefreshChannel();
  if (!channel || !token) return;
  try {
    channel.postMessage({ type: 'access-token', token });
  } catch {
    // Channel may be closed in some test / teardown environments.
  }
}

/** Same origin as normal API calls (Vite proxy locally, API host in prod). */
function refreshBaseURL() {
  return api.defaults.baseURL ?? '';
}

/** Backend may set `csrf_token` (readable) + HttpOnly refresh cookie; refresh then requires X-CSRF-Token. */
function csrfHeader() {
  if (typeof document === 'undefined') return {};
  const m = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  if (!m?.[1]) return {};
  try {
    return { 'X-CSRF-Token': decodeURIComponent(m[1]) };
  } catch {
    return { 'X-CSRF-Token': m[1] };
  }
}

function getStoredRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

function canAttemptRefresh() {
  return Boolean(getStoredRefreshToken()) || hasCookieAuthSession();
}

function notifyAuthCleared() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('auth:cleared'));
}

function extractAuthPayload(data) {
  return data?.data ?? data ?? {};
}

/** Login/register 401 means bad credentials — not an expired access token. */
function isPublicAuthRequest(config) {
  const url = String(config?.url || '');
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/otp/') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

function shouldAttemptRefresh(error, original) {
  if (original?._retry) return false;
  if (isPublicAuthRequest(original)) return false;
  if (!canAttemptRefresh()) return false;
  const status = error.response?.status;
  if (status !== 401 && status !== 403) return false;

  const detail = String(
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.response?.data?.error ||
    '',
  ).toLowerCase();

  if (detail.includes('invalid email or password')) return false;
  if (detail.includes('invalid email or code')) return false;
  if (detail.includes('csrf')) return false;

  if (status === 401) return true;
  return detail.includes('not authenticated') || detail.includes('missing');
}

/** Hard auth failure (clear session). Network / 5xx stay logged in. */
function isHardRefreshAuthFailure(error) {
  const status = error?.response?.status;
  if (!status) return false;
  if (status >= 500) return false;
  return status === 401;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withLocalStorageLock(fn) {
  if (typeof localStorage === 'undefined') {
    return fn();
  }
  const ownerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + REFRESH_LOCK_TTL_MS;

  while (Date.now() < deadline) {
    const now = Date.now();
    let current = null;
    try {
      current = JSON.parse(localStorage.getItem(REFRESH_LS_KEY) || 'null');
    } catch {
      current = null;
    }
    if (!current || !current.expires || current.expires < now) {
      const payload = { id: ownerId, expires: now + REFRESH_LOCK_TTL_MS };
      localStorage.setItem(REFRESH_LS_KEY, JSON.stringify(payload));
      let verify = null;
      try {
        verify = JSON.parse(localStorage.getItem(REFRESH_LS_KEY) || 'null');
      } catch {
        verify = null;
      }
      if (verify?.id === ownerId) {
        try {
          return await fn();
        } finally {
          try {
            const still = JSON.parse(localStorage.getItem(REFRESH_LS_KEY) || 'null');
            if (still?.id === ownerId) {
              localStorage.removeItem(REFRESH_LS_KEY);
            }
          } catch {
            localStorage.removeItem(REFRESH_LS_KEY);
          }
        }
      }
    }

    await sleep(50);
    const token = getStoredAccessToken();
    if (isAccessTokenFresh(token, PROACTIVE_REFRESH_SKEW_MS)) {
      return token;
    }
  }

  return fn();
}

async function runExclusiveRefresh(fn) {
  ensureRefreshChannel();
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK_NAME, { mode: 'exclusive' }, () => fn());
  }
  return withLocalStorageLock(fn);
}

async function performHttpRefresh() {
  const refreshToken = getStoredRefreshToken();
  const { data } = await axios.post(
    '/api/v1/auth/refresh',
    refreshToken ? { refreshToken } : {},
    {
      baseURL: refreshBaseURL(),
      headers: { ...csrfHeader() },
      withCredentials: true,
    },
  );
  const payload = extractAuthPayload(data);
  const newToken = payload.accessToken || payload.token;
  if (!newToken) {
    throw new Error('Refresh response did not include an access token');
  }
  setStoredAccessToken(newToken);
  // Prefer HttpOnly cookie refresh; do not persist refresh tokens in localStorage.
  localStorage.removeItem('refreshToken');
  publishAccessToken(newToken);
  return newToken;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = runExclusiveRefresh(async () => {
      const existing = getStoredAccessToken();
      // Another tab may have refreshed while we waited for the lock.
      if (isAccessTokenFresh(existing, PROACTIVE_REFRESH_SKEW_MS)) {
        return existing;
      }
      return performHttpRefresh();
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Ensure an in-memory access token exists (for WebSocket query auth) when
 * HttpOnly cookies already prove a session. No-op if a token is already loaded.
 */
export async function ensureAccessTokenFromRefresh() {
  const existing = getStoredAccessToken();
  if (isAccessTokenFresh(existing, PROACTIVE_REFRESH_SKEW_MS)) {
    return existing;
  }
  if (!canAttemptRefresh()) return existing || null;
  return refreshAccessToken();
}

function forceLogoutToLogin() {
  clearAuthTokens();
  notifyAuthCleared();
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (!isPublicBrowsePath(path)) {
    window.location.href = '/login';
  }
}

// Attach access token to every request; refresh proactively near expiry.
api.interceptors.request.use(async (config) => {
  ensureRefreshChannel();
  config.headers = config.headers || {};

  if (!isPublicAuthRequest(config) && canAttemptRefresh()) {
    const token = getStoredAccessToken();
    if (token && accessTokenNeedsRefresh(token, PROACTIVE_REFRESH_SKEW_MS)) {
      try {
        await refreshAccessToken();
      } catch {
        // Let the request proceed; response interceptor handles hard 401s.
      }
    }
  }

  const latest = getStoredAccessToken();
  if (latest) config.headers.Authorization = `Bearer ${latest}`;

  const method = String(config.method || 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    config.headers = { ...csrfHeader(), ...config.headers };
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Auto-refresh on 401; only hard-logout on real refresh auth failures.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (shouldAttemptRefresh(error, original)) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        if (isHardRefreshAuthFailure(refreshErr)) {
          forceLogoutToLogin();
        }
        if (isVaPublicRequest(original)) {
          return Promise.reject(refreshErr);
        }
        return Promise.reject(sanitizeAxiosError(refreshErr));
      }
    }
    if (isVaPublicRequest(original)) {
      return Promise.reject(error);
    }
    return Promise.reject(sanitizeAxiosError(error));
  }
);

export default api;
