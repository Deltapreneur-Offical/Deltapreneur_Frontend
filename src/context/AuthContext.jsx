import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI, profileAPI } from '../api/services';
import { ensureAccessTokenFromRefresh } from '../api/axios';
import {
  clearAuthTokens,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../utils/authSession';

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
    detail.includes('session expired') ||
    detail.includes('invalid token') ||
    detail.includes('expired token') ||
    detail.includes('invalid or expired') ||
    detail.includes('refresh token') ||
    detail.includes('not authenticated')
  );
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccessToken, setHasAccessToken] = useState(
    () => Boolean(getAccessToken()),
  );
  // Bumped on login/logout so a late /auth/me 401 cannot wipe a newer session.
  const authEpochRef = useRef(0);

  // ── fetchMe: restore access token if needed, then GET /auth/me ──────────
  const fetchMe = useCallback(async () => {
    const epoch = authEpochRef.current;
    let token = getAccessToken();
    // csrf_token alone is not a session. Restore via refresh first, then /me.
    if (!token) {
      try {
        await ensureAccessTokenFromRefresh();
      } catch {
        // Refresh cookie missing/unusable — stay logged out quietly.
      }
      if (epoch !== authEpochRef.current) return null;
      token = getAccessToken();
    }
    if (!token) {
      setUser(null);
      setHasAccessToken(false);
      setLoading(false);
      return null;
    }
    setHasAccessToken(true);
    const tokenAtStart = token;
    try {
      // Prefer existing access cookie / memory token for /auth/me.
      // Do NOT refresh after a successful me call — overlapping refreshes
      // used to revoke the live session (backend now also guards this).
      const { data } = await profileAPI.getMe();
      if (epoch !== authEpochRef.current) return null;
      // Backend may return FastAPI { data }, Java { user }, or the user object directly.
      const userData = normalizeUserPayload(data);
      setUser(userData);
      setHasAccessToken(true);
      return userData;
    } catch (err) {
      if (epoch !== authEpochRef.current) return null;
      const latest = getAccessToken();
      if (latest && latest !== tokenAtStart) return null;
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
      // 401 for this same token — clear. Do not wipe a newer login's token.
      if (shouldClearAuth(err) && latest && latest === tokenAtStart) {
        clearAuthTokens();
        setHasAccessToken(false);
        setUser(null);
      } else if (!latest) {
        setHasAccessToken(false);
        setUser(null);
      }
      return null;
    } finally {
      if (epoch === authEpochRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  useEffect(() => {
    const syncAuthState = () => {
      if (getAccessToken()) setHasAccessToken(true);
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
  // Access JWT stays in memory only. Refresh stays HttpOnly-cookie based.
  const login = useCallback((tokens, userData) => {
    authEpochRef.current += 1;
    if (tokens?.accessToken) {
      setStoredAccessToken(tokens.accessToken);
      setHasAccessToken(true);
    }
    localStorage.removeItem('refreshToken');
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
      authEpochRef.current += 1;
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
