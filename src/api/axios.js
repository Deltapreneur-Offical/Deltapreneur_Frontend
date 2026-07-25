import axios from 'axios';
import { API_BASE_URL, API_ORIGIN } from '../config/urls';
import {
  clearAuthTokens,
  getStoredAccessToken,
  hasCookieAuthSession,
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

function refreshBaseURL() {
  if (api.defaults.baseURL && String(api.defaults.baseURL).length > 0) {
    return api.defaults.baseURL;
  }
  return API_ORIGIN;
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

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
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
      return newToken;
    })().finally(() => {
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
  if (existing) return existing;
  if (!canAttemptRefresh()) return null;
  return refreshAccessToken();
}

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const method = String(config.method || 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    config.headers = { ...csrfHeader(), ...config.headers };
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Auto-refresh on 401
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
      } catch {
        clearAuthTokens();
        notifyAuthCleared();
        const path = window.location.pathname;
        if (!isPublicBrowsePath(path)) {
          window.location.href = '/login';
        }
      }
    }
    if (isVaPublicRequest(original)) {
      return Promise.reject(error);
    }
    return Promise.reject(sanitizeAxiosError(error));
  }
);

export default api;
