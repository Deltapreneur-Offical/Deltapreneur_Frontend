import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveOAuthCallbackNavigation } from '../utils/authSession';
import { consumeRedirectAfterLogin } from '../utils/listingNavigation';
import '../styles/auth.css';

/**
 * OAuth success redirects here:
 *   Legacy: /auth/callback?token=JWT&refreshToken=...&profileComplete=...
 *   Cookie session: /auth/callback?success=1&newUser=... (HttpOnly cookies on API origin)
 *
 * Strategy:
 *  1. useLayoutEffect: persist URL tokens when present
 *  2. refreshUser() → GET /api/v1/auth/me (Bearer or session cookies)
 *  3. flushSync(login(..., user)) then navigate on next tick so ProtectedRoute sees user
 */
export default function OAuthCallbackPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);

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
    const cookieSession = params.get('success') === '1';
    const error = params.get('error');
    const provider = params.get('provider');

    if (error) {
      console.error('[OAuth] Backend returned error:', error);
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (!cookieSession && (!token || !refreshToken)) {
      console.error('[OAuth] Missing tokens or error:', {
        error,
        cookieSession,
        provider,
      });
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (token && refreshToken) {
      login({ accessToken: token, refreshToken }, null);
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
          if (token && refreshToken) {
            login({ accessToken: token, refreshToken }, fetchedUser);
          } else {
            login({}, fetchedUser);
          }
        });

        setTimeout(() => {
          navigate(destination.pathname, {
            replace: true,
            state: destination.state,
          });
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            window.history.replaceState({}, document.title, destination.pathname);
          }
        }, 0);
      } catch (err) {
        console.error('[OAuth] refreshUser failed:', err);
        navigate('/login?error=oauth_profile', { replace: true });
      }
    };

    fetchUser();
  }, [login, navigate, params, refreshUser]);

  return (
    <div className="auth-page auth-page--loading">
      <div className="auth-page__glow auth-page__glow--top" aria-hidden />
      <div className="auth-page__glow auth-page__glow--bottom" aria-hidden />
      <div className="auth-page__spinner" aria-hidden />
      <p>{t('oauthCompletingSignIn')}</p>
    </div>
  );
}
