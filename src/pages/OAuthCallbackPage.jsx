import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { consumeRedirectAfterLogin } from '../utils/listingNavigation';

/**
 * Spring Boot OAuth2 success handler redirects here:
 *   /auth/callback?token=JWT&refreshToken=...&profileComplete=true/false
 *
 * Strategy:
 *  1. useLayoutEffect: persist tokens ASAP (before other effects can /me with stale creds)
 *  2. refreshUser() → /profile/me
 *  3. flushSync(login(..., user)) then navigate on next tick so ProtectedRoute sees user
 */
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);

  useLayoutEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const error = qs.get('error');
    const token = qs.get('token');
    const refreshToken = qs.get('refreshToken');
    if (error || !token || !refreshToken) return;
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
  }, []);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const profileCompleteParam = params.get('profileComplete') === 'true';
    const error = params.get('error');

    if (error || !token || !refreshToken) {
      console.error('[OAuth] Missing tokens or error:', {
        error,
        token: !!token,
        refreshToken: !!refreshToken,
      });
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    login({ accessToken: token, refreshToken }, null);

    refreshUser()
      .then((fetchedUser) => {
        if (!fetchedUser) {
          navigate('/login?error=oauth_profile', { replace: true });
          return;
        }
        const isComplete = fetchedUser.profileComplete ?? profileCompleteParam;
        const redirectPath = consumeRedirectAfterLogin();
        const destination = isComplete
          ? redirectPath || '/'
          : '/complete-profile';

        flushSync(() => {
          login({ accessToken: token, refreshToken }, fetchedUser);
        });

        setTimeout(() => {
          navigate(destination, { replace: true });
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
      <p className="text-gray-500 font-body">Completing sign-in…</p>
    </div>
  );
}
