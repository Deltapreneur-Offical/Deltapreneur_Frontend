import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, profileAPI } from '../api/services';
import { clearAuthTokens, getStoredAccessToken, hasCookieAuthSession } from '../utils/authSession';

/** Stable fallback so `useAuth()` never returns null (avoids destructuring errors outside provider). */
const authContextDefault = {
  user: null,
  loading: false,
  hasAccessToken: false,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => null,
};

const AuthContext = createContext(authContextDefault);

function getAccessToken() {
  return getStoredAccessToken();
}

function normalizeUserPayload(data) {
  return data?.data ?? data?.user ?? data ?? null;
}

function shouldClearAuth(error) {
  const status = error?.response?.status;
  if (status !== 401) return false;
  const detail = String(
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.response?.data?.error ||
    '',
  ).toLowerCase();
  return (
    !detail ||
    detail.includes('invalid') ||
    detail.includes('expired') ||
    detail.includes('not authenticated') ||
    detail.includes('missing') ||
    detail.includes('token')
  );
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccessToken, setHasAccessToken] = useState(() => Boolean(getAccessToken()));

  // ── fetchMe: reads token, hits /profile/me, normalises response ──────────
  const fetchMe = useCallback(async () => {
    const token = getAccessToken();
    const cookieSession = hasCookieAuthSession();
    if (!token && !cookieSession) {
      setUser(null);
      setHasAccessToken(false);
      setLoading(false);
      return null;
    }
    if (token) setHasAccessToken(true);
    try {
      const { data } = await profileAPI.getMe();
      // Backend may return FastAPI { data }, Java { user }, or the user object directly.
      const userData = normalizeUserPayload(data);
      setUser(userData);
      setHasAccessToken(true);
      return userData;
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = String(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        '',
      ).toLowerCase();
      const databaseUnavailable = (
        status === 503
        || serverMessage.includes('database')
        || serverMessage.includes('rds tunnel')
      );
      if (databaseUnavailable) {
        setUser(null);
        return null;
      }
      // 401 = token invalid/expired — clear auth keys only (avoid wiping unrelated keys
      // and racing OAuth callback which may have just written new tokens).
      if (shouldClearAuth(err)) {
        clearAuthTokens();
        setHasAccessToken(false);
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  useEffect(() => {
    const syncAuthState = () => {
      const token = getAccessToken();
      if (token) setHasAccessToken(true);
    };

    const onAuthCleared = () => {
      setHasAccessToken(false);
      setUser(null);
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener('focus', syncAuthState);
    window.addEventListener('auth:cleared', onAuthCleared);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('focus', syncAuthState);
      window.removeEventListener('auth:cleared', onAuthCleared);
    };
  }, []);

  // ── login: called from OAuthCallbackPage and password/OTP login ──────────
  // Stores tokens FIRST, then optionally seeds user state
  const login = useCallback((tokens, userData) => {
    if (tokens?.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('token', tokens.accessToken);
      setHasAccessToken(true);
    }
    if (tokens?.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
    // Only seed user if we have real data (not empty {})
    if (userData && Object.keys(userData).length > 0) {
      setUser(userData);
    }
  }, []);

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    try {
      await authAPI.logout(refreshToken);
    } catch (err) {
      // Keep local logout behavior, but surface backend failures for debugging.
      console.warn(
        '[Auth] Logout request failed; cleared local session anyway.',
        err?.response?.data || err?.message || err,
      );
    } finally {
      clearAuthTokens();
      setHasAccessToken(false);
      setUser(null);
    }
  };

  // refreshUser returns the fetched user so callers can use it immediately
  const refreshUser = useCallback(() => fetchMe(), [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, loading, hasAccessToken, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? authContextDefault;
}
