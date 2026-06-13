import axios from 'axios';
import { API_BASE_URL, API_ORIGIN } from '../config/urls';
import { isPublicBrowsePath } from '../utils/authSession';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

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

function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    null
  );
}

function getStoredRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/** True when the backend may have set HttpOnly refresh (csrf_token is readable). */
function hasCookieRefreshSession() {
  return Boolean(csrfHeader()['X-CSRF-Token']);
}

function canAttemptRefresh() {
  return Boolean(getStoredRefreshToken()) || hasCookieRefreshSession();
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
    url.includes('/auth/reset-password')
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

  if (status === 401) return true;
  return detail.includes('not authenticated') || detail.includes('missing');
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
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (shouldAttemptRefresh(error, original)) {
      const refreshToken = getStoredRefreshToken();
      original._retry = true;
      try {
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
        const newRefreshToken = payload.refreshToken;
        if (!newToken) {
          throw new Error('Refresh response did not include an access token');
        }
        localStorage.setItem('accessToken', newToken);
        localStorage.setItem('token', newToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        notifyAuthCleared();
        const path = window.location.pathname;
        if (!isPublicBrowsePath(path)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
