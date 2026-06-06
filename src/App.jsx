import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';

import SiteGradientBorder from './components/common/SiteGradientBorder';
import CookieConsentBanner from './components/common/CookieConsentBanner';
import PageLoader from './components/common/PageLoader';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute, ProfileGuard } from './components/auth/ProtectedRoute';
import { AdminGuard, CoBrotherGuard } from './components/auth/ProtectedRoute';

import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import { CocreationLegacyRedirect } from './utils/cocreationRouteRedirect';

/** Preserve ?linkedin=… query params when redirecting legacy /community URLs. */
function LegacyCommunityRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/creator', search }} replace />;
}

const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const PasswordSecurityPage = lazy(() => import('./pages/PasswordSecurityPage'));
const loadDashboardPage = () => import('./pages/DashboardPage');
const DashboardPage = lazy(loadDashboardPage);
const NewVenturePage = lazy(() => import('./pages/NewVenturePage'));
const EditVenturePage = lazy(() => import('./pages/EditVenturePage'));
const VentureDashboardPage = lazy(() => import('./pages/VentureDashboardPage'));
const VentureAnalyticsPage = lazy(() => import('./pages/VentureAnalyticsPage'));
const ProfileAnalyticsPage = lazy(() => import('./pages/ProfileAnalyticsPage'));
const DomainsDashboardPage = lazy(() => import('./pages/DomainsDashboardPage'));
const CoCreationDashboardPage = lazy(() => import('./pages/CoCreationDashboardPage'));
const CoCreationAnalyticsPage = lazy(() => import('./pages/CoCreationAnalyticsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const CoBrotherDashboardPage = lazy(() => import('./pages/CoBrotherDashboardPage'));
const FeeRequestsPage = lazy(() => import('./pages/FeeRequestsPage'));
const AuctionPage = lazy(() => import('./pages/AuctionPage'));
const VentureAuctionPage = lazy(() => import('./pages/VentureAuctionPage'));
const CommunityAuctionPage = lazy(() => import('./pages/CommunityAuctionPage'));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'));
const JoinForm = lazy(() => import('./pages/JoinForm'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SoftwareAuctionPage = lazy(() => import('./pages/SoftwareAuctionPage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditionsPage'));
const loadVenturesPage = () => import('./pages/VenturesPage');
const VenturesPage = lazy(loadVenturesPage);
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const loadDomainsPage = () => import('./pages/DomainsPage');
const DomainsPage = lazy(loadDomainsPage);
const CoCreationPage = lazy(() => import('./pages/CoCreationPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const loadAuctionsPage = () => import('./pages/AuctionsPage');
const AuctionsPage = lazy(loadAuctionsPage);
const DomainStorefrontPage = lazy(() => import('./pages/DomainStorefrontPage'));
const DomainRegistrationOrderPage = lazy(() => import('./pages/DomainRegistrationOrderPage'));
const CoBrotherAI = lazy(() => import('./components/ai/CoBrotherAI'));

function preloadPostLoginRoutes() {
  void loadDashboardPage();
  void loadDomainsPage();
  void loadVenturesPage();
  void loadAuctionsPage();
}

function RoutePreloader() {
  const { user, loading, hasAccessToken } = useAuth();
  const preloadedRef = useRef(false);

  useEffect(() => {
    if (preloadedRef.current) return;
    if (loading) return;
    if (!user || !hasAccessToken) return;
    preloadedRef.current = true;
    preloadPostLoginRoutes();
  }, [loading, user, hasAccessToken]);

  return null;
}

function RedirectLegacyCocreationAuction() {
  const { auctionId } = useParams();
  return <Navigate to={`/technology/auction/${auctionId}`} replace />;
}

function RedirectLegacyCocreationAnalytics() {
  const { id } = useParams();
  return <Navigate to={`/technology/${id}/analytics`} replace />;
}

function RedirectLegacyCommunityAuction() {
  const { auctionId } = useParams();
  return <Navigate to={`/creator-auction/${auctionId}`} replace />;
}

function RedirectLegacySoftwareAuction() {
  const { auctionId } = useParams();
  return <Navigate to={`/technology/auction/${auctionId}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <CurrencyProvider>
          <CookieConsentProvider>
            <AuthProvider>
              <RoutePreloader />
              <SiteGradientBorder />
              <CookieConsentBanner />
              <Suspense fallback={null}>
                <CoBrotherAI />
              </Suspense>
              <AppErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>

            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/join-form" element={<JoinForm />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/careers" element={<Navigate to="/contact" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />

            {/* Auctions */}
            <Route
              path="/auction/:auctionId"
              element={
                <ProfileGuard>
                  <AuctionPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/venture-auction/:auctionId"
              element={
                <ProfileGuard>
                  <VentureAuctionPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/creator-auction/:auctionId"
              element={
                <ProfileGuard>
                  <CommunityAuctionPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/community-auction/:auctionId"
              element={<RedirectLegacyCommunityAuction />}
            />

            <Route
              path="/meetings"
              element={
                <ProfileGuard>
                  <MeetingsPage />
                </ProfileGuard>
              }
            />

            {/* Complete Profile */}
            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute>
                  <CompleteProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Analytics */}
            <Route
              path="/ventures/analytics"
              element={
                <ProfileGuard>
                  <VentureAnalyticsPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/profile/analytics"
              element={
                <ProfileGuard>
                  <ProfileAnalyticsPage />
                </ProfileGuard>
              }
            />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Ventures */}
            <Route
              path="/ventures"
              element={
                <ProfileGuard>
                  <VenturesPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/ventures/new"
              element={
                <ProfileGuard>
                  <NewVenturePage />
                </ProfileGuard>
              }
            />

            <Route
              path="/ventures/:id/edit"
              element={
                <ProfileGuard>
                  <EditVenturePage />
                </ProfileGuard>
              }
            />

            <Route
              path="/ventures/dashboard"
              element={
                <ProfileGuard>
                  <VentureDashboardPage />
                </ProfileGuard>
              }
            />

            {/* Creator */}
            <Route
              path="/creator"
              element={
                <ProfileGuard>
                  <CommunityPage />
                </ProfileGuard>
              }
            />

            {/* Legacy Community / Disruptor URLs → Creator */}
            <Route path="/community" element={<LegacyCommunityRedirect />} />
            <Route path="/disruptors" element={<Navigate to="/auctions" replace />} />

            {/* Domains */}
            <Route
              path="/domains"
              element={
                <ProfileGuard>
                  <DomainsPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/domains/dashboard"
              element={
                <ProfileGuard>
                  <DomainsDashboardPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/storefront"
              element={
                <ProfileGuard>
                  <DomainStorefrontPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/storefront/orders/:orderId"
              element={
                <ProfileGuard>
                  <DomainRegistrationOrderPage />
                </ProfileGuard>
              }
            />

            {/* Technology (software marketplace) */}
            <Route path="/cocreation/*" element={<CocreationLegacyRedirect />} />

            <Route
              path="/technology"
              element={
                <ProfileGuard>
                  <CoCreationPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/technology/auction/:auctionId"
              element={
                <ProfileGuard>
                  <SoftwareAuctionPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/software-auction/:auctionId"
              element={<RedirectLegacySoftwareAuction />}
            />

            <Route
              path="/technology/dashboard"
              element={
                <ProfileGuard>
                  <CoCreationDashboardPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/technology/:id/analytics"
              element={
                <ProfileGuard>
                  <CoCreationAnalyticsPage />
                </ProfileGuard>
              }
            />

            {/* Legacy CoCreation URLs → Technology */}
            <Route path="/cocreation" element={<Navigate to="/technology" replace />} />
            <Route path="/cocreation/dashboard" element={<Navigate to="/technology/dashboard" replace />} />
            <Route path="/cocreation/auction/:auctionId" element={<RedirectLegacyCocreationAuction />} />
            <Route path="/cocreation/:id/analytics" element={<RedirectLegacyCocreationAnalytics />} />

            {/* Notifications */}
            <Route
              path="/notifications"
              element={
                <ProfileGuard>
                  <NotificationsPage />
                </ProfileGuard>
              }
            />

            {/* Auctions */}
            <Route
              path="/auctions"
              element={
                <ProfileGuard>
                  <AuctionsPage />
                </ProfileGuard>
              }
            />

            {/* Purchases */}
            <Route
              path="/purchases"
              element={
                <ProfileGuard>
                  <PurchasesPage />
                </ProfileGuard>
              }
            />

            {/* Admin */}
            <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboardPage />
                </AdminGuard>
              }
            />

            <Route
              path="/cobrother"
              element={
                <CoBrotherGuard>
                  <CoBrotherDashboardPage />
                </CoBrotherGuard>
              }
            />

            <Route
              path="/fee-requests"
              element={
                <ProtectedRoute>
                  <FeeRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security/password"
              element={
                <ProtectedRoute>
                  <PasswordSecurityPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />

                  </Routes>
                </Suspense>
              </AppErrorBoundary>
            </AuthProvider>
          </CookieConsentProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
