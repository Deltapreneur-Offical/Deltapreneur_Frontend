import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveOAuthCallbackNavigation } from '../utils/authSession';
import { consumeRedirectAfterLogin } from '../utils/listingNavigation';

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
    if (error) return;
    if (token && refreshToken) {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }, []);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const cookieSession = params.get('success') === '1';
    const error = params.get('error');

    if (error) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (!cookieSession && (!token || !refreshToken)) {
      console.error('[OAuth] Missing tokens or error:', {
        error,
        token: !!token,
        refreshToken: !!refreshToken,
      });
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    if (token && refreshToken) {
      login({ accessToken: token, refreshToken }, null);
    }

    refreshUser()
      .then((fetchedUser) => {
        if (!fetchedUser) {
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
        }, 0);
      })
      .catch((err) => {
        console.error('[OAuth] refreshUser failed:', err);
        navigate('/login?error=oauth_profile', { replace: true });
      });
  }, [login, navigate, params, refreshUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-indigo-50 text-purple-600 gap-6">
      <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
      <p className="text-gray-500 font-body">{t('oauthCompletingSignIn')}</p>
    </div>
  );
}
