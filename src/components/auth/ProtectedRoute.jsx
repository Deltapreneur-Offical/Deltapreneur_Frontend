import { Suspense, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { virtualAssistantAPI } from '../../api/services';
import { unwrapApiData } from '../../utils/apiResponse';
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
  const allowedAdminRoles = ['ADMIN', 'ROLE_ADMIN', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'AUCTION_MODERATOR', 'ROLE_AUCTION_MODERATOR'];
  if (!loading && !allowedAdminRoles.includes(roleUpper)) {
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

/**
 * VirtualAssistantApplicantGuard — requires login, profile complete, and an existing
 * Virtual Assistant application. While loading: shows spinner.
 * No application found: → the public Virtual Assistant application page.
 */
export function VirtualAssistantApplicantGuard({ children }) {
  const { user, loading, hasAccessToken } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isApplicant, setIsApplicant] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading || !user || !hasAccessToken) {
      setChecking(false);
      setIsApplicant(false);
      return;
    }
    if (user?.role === 'COBROTHER') {
      setChecking(false);
      setIsApplicant(false);
      return;
    }
    virtualAssistantAPI
      .getMy()
      .then((res) => {
        const data = unwrapApiData(res);
        if (!active) return;
        setIsApplicant(!!data);
      })
      .catch((err) => {
        if (active) {
          const status = err?.response?.status;
          if (status === 404) {
            setIsApplicant(false);
          } else {
            setIsApplicant(true);
          }
          setChecking(false);
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [loading, user, hasAccessToken]);

  if (loading || checking) {
    return <GuardedContent loading>{children}</GuardedContent>;
  }
  if (!user || !hasAccessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user?.role === 'COBROTHER') {
    return <Navigate to="/cobrother" replace />;
  }
  if (!isApplicant) {
    return <Navigate to="/virtual-assistant" replace />;
  }
  return <GuardedContent loading={false}>{children}</GuardedContent>;
}

/**
 * VirtualAssistantGuard — requires login AND an unlocked VA Workspace
 * (at least one approved role). While loading: shows spinner.
 * No application / still locked: → the applicant journey page.
 */
export function VirtualAssistantGuard({ children }) {
  const { user, loading, hasAccessToken } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasApplication, setHasApplication] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading || !user || !hasAccessToken) {
      setChecking(false);
      setHasApplication(false);
      setUnlocked(false);
      return;
    }
    if (user?.role === 'COBROTHER') {
      setChecking(false);
      setHasApplication(false);
      setUnlocked(false);
      return;
    }
    virtualAssistantAPI
      .getMy()
      .then((res) => {
        const data = unwrapApiData(res);
        if (!active) return;
        if (data) {
          setHasApplication(true);
          const locked = data.workspaceLocked !== false;
          setUnlocked(!locked);
        } else {
          setHasApplication(false);
          setUnlocked(false);
        }
      })
      .catch((err) => {
        if (active) {
          const status = err?.response?.status;
          if (status === 404) {
            setHasApplication(false);
            setUnlocked(false);
          } else {
            setHasApplication(true);
            setUnlocked(true);
          }
          setChecking(false);
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [loading, user, hasAccessToken]);

  if (loading || checking) {
    return <GuardedContent loading>{children}</GuardedContent>;
  }
  if (!user || !hasAccessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user?.role === 'COBROTHER') {
    return <Navigate to="/cobrother" replace />;
  }
  if (!hasApplication) {
    return <Navigate to="/virtual-assistant" replace />;
  }
  if (!unlocked) {
    return <Navigate to="/virtual-assistant/journey" replace />;
  }
  return <GuardedContent loading={false}>{children}</GuardedContent>;
}

/**
 * VaApplicationGuard — requires login for the Virtual Assistant application flow.
 * Public VA pages (marketplace, public profile, hire) remain accessible.
 * While loading: shows spinner.
 * Not logged in: redirects to /login, then back to the application page.
 */
export function VaApplicationGuard({ children }) {
  const { user, loading, hasAccessToken } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GuardedContent loading>{children}</GuardedContent>;
  }
  if (!user || !hasAccessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <GuardedContent loading={false}>{children}</GuardedContent>;
}
