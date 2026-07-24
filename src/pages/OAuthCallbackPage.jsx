import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasCookieAuthSession, resolveOAuthCallbackNavigation } from '../utils/authSession';
import { consumeRedirectAfterLogin } from '../utils/listingNavigation';
import '../styles/auth.css';

/**
 * OAuth success redirects here:
 *   Preferred: /auth/callback?success=1&newUser=... (HttpOnly cookies on API origin)
 *   Legacy (dev only): /auth/callback?token=JWT&refreshToken=...
 *
 * Strategy:
 *  1. useLayoutEffect: strip sensitive query tokens from the URL immediately
 *  2. refreshUser() → GET /api/v1/auth/me (Bearer or session cookies)
 *  3. flushSync(login(..., user)) then navigate on next tick so ProtectedRoute sees user
 */
export default function OAuthCallbackPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);
  const allowLegacyQueryTokens = !import.meta.env.PROD;

  useLayoutEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const error = qs.get('error');
    const token = qs.get('token');
    const refreshToken = qs.get('refreshToken');
    const hasSensitiveQuery = Boolean(token || refreshToken);
    if (error || !hasSensitiveQuery) return;

    const nextParams = new URLSearchParams(qs);
    nextParams.delete('token');
    nextParams.delete('refreshToken');
    const nextSearch = nextParams.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  }, []);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const cookieSession = params.get('success') === '1' || hasCookieAuthSession();
    const error = params.get('error');
    const provider = params.get('provider');
    const legacyTokens = Boolean(token && refreshToken);

    if (error) {
      console.error('[OAuth] Backend returned error:', error);
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    // Production: cookie session only — never accept JWTs from the query string.
    if (!allowLegacyQueryTokens && legacyTokens && params.get('success') !== '1') {
      console.error('[OAuth] Rejected legacy query-string tokens in production');
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (!cookieSession && !(allowLegacyQueryTokens && legacyTokens)) {
      console.error('[OAuth] Missing tokens or error:', {
        error,
        cookieSession,
        provider,
      });
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (allowLegacyQueryTokens && legacyTokens) {
      login({ accessToken: token }, null);
    }

    const fetchUser = async () => {
      try {
        const fetchedUser = await refreshUser();
        if (!fetchedUser) {
          console.error('[OAuth] No user returned from refreshUser');
          navigate('/login?error=oauth_profile', { replace: true });
          return;
        }
        const redirectPath = consumeRedirectAfterLogin();
        const destination = resolveOAuthCallbackNavigation(fetchedUser, redirectPath);

        flushSync(() => {
          if (allowLegacyQueryTokens && legacyTokens) {
            login({ accessToken: token }, fetchedUser);
          } else {
            login({}, fetchedUser);
          }
        });

        setTimeout(() => {
          const fullPath = `${destination.pathname}${destination.search || ''}${destination.hash || ''}`;
          navigate(fullPath, {
            replace: true,
            state: destination.state,
          });
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            window.history.replaceState({}, document.title, fullPath);
          }
        }, 0);
      } catch (err) {
        console.error('[OAuth] refreshUser failed:', err);
        navigate('/login?error=oauth_profile', { replace: true });
      }
    };

    fetchUser();
  }, [allowLegacyQueryTokens, login, navigate, params, refreshUser]);

  return (
    <div className="auth-page auth-page--loading">
      <div className="auth-page__glow auth-page__glow--top" aria-hidden />
      <div className="auth-page__glow auth-page__glow--bottom" aria-hidden />
      <div className="auth-page__spinner" aria-hidden />
      <p>{t('oauthCompletingSignIn')}</p>
    </div>
  );
}
