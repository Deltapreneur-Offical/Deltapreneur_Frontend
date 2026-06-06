import { Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../common/PageLoader';

function AuthLoadingScreen() {
  return <PageLoader overlay message="Checking your session..." />;
}

/**
 * Loader stays as a fixed overlay; page mounts underneath and lazy-loads
 * with the same loader fallback — no black gap between auth check and dashboard.
 */
function GuardedContent({ loading, children }) {
  return (
    <div className="auth-route-shell">
      <div className="auth-route-shell__content">
        {!loading ? (
          <Suspense fallback={<PageLoader overlay message="Opening your workspace..." />}>
            {children}
          </Suspense>
        ) : null}
      </div>
      <AnimatePresence>
        {loading ? <AuthLoadingScreen key="auth-loading" /> : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * ProtectedRoute — requires the user to be logged in (token exists + /profile/me succeeds).
 * While loading: shows spinner (never redirects prematurely).
 * Not logged in: redirects to /login.
 */
export function ProtectedRoute({ children }) {
  const { user, loading, hasAccessToken } = useAuth();
  const location = useLocation();

  if (!loading && (!user || !hasAccessToken)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <GuardedContent loading={loading}>{children}</GuardedContent>;
}

/**
 * ProfileGuard — requires login AND profileComplete === true.
 * While loading: shows spinner.
 * Not logged in: → /login
 * Logged in but profile incomplete: → /complete-profile
 */
export function ProfileGuard({ children }) {
  const { user, loading, hasAccessToken } = useAuth();
  const location = useLocation();

  if (!loading && (!user || !hasAccessToken)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!loading && user?.role === 'COBROTHER') {
    return <Navigate to="/cobrother" replace />;
  }
  if (!loading && user && !user.profileComplete) {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            state: location.state,
          },
        }}
      />
    );
  }
  return <GuardedContent loading={loading}>{children}</GuardedContent>;
}

export function AdminGuard({ children }) {
  const { user, loading, hasAccessToken } = useAuth();

  if (!loading && (!user || !hasAccessToken)) {
    return <Navigate to="/login" replace />;
  }
  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  if (!loading && roleUpper !== 'ADMIN' && roleUpper !== 'ROLE_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <GuardedContent loading={loading}>{children}</GuardedContent>;
}

export function CoBrotherGuard({ children }) {
  const { user, loading, hasAccessToken } = useAuth();

  if (!loading && (!user || !hasAccessToken)) {
    return <Navigate to="/login" replace />;
  }
  if (!loading && user?.role !== 'COBROTHER') {
    return <Navigate to="/dashboard" replace />;
  }
  return <GuardedContent loading={loading}>{children}</GuardedContent>;
}
