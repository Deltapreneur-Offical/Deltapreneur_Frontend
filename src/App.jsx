import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import lightFavicon from './assets/favicon.png';
import darkFavicon from './assets/Hubregistrar_favicon_white.png';
import { applyThemeFavicon } from './utils/applyThemeFavicon';
import SiteGradientBorder from './components/common/SiteGradientBorder';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsentBanner from './components/common/CookieConsentBanner';
import PageLoader from './components/common/PageLoader';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { ProtectedRoute, ProfileGuard } from './components/auth/ProtectedRoute';
import { AdminGuard, AdminOrAuctionModeratorGuard, CoBrotherGuard, VirtualAssistantGuard, VirtualAssistantApplicantGuard, VaApplicationGuard } from './components/auth/ProtectedRoute';

import WhatsAppFloatingButton from './components/common/WhatsAppFloatingButton';
import Home from './pages/Home';
import { CocreationLegacyRedirect } from './utils/cocreationRouteRedirect';

/** Preserve ?linkedin=… query params when redirecting legacy /community URLs. */
function LegacyCommunityRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/creator', search }} replace />;
}

const LoginPage = lazy(() => import('./pages/LoginPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const PasswordSecurityPage = lazy(() => import('./pages/PasswordSecurityPage'));
const PayoutSettingsPage = lazy(() => import('./pages/PayoutSettingsPage'));
const loadDashboardPage = () => import('./pages/DashboardPage');
const DashboardPage = lazy(loadDashboardPage);
const NewVenturePage = lazy(() => import('./pages/NewVenturePage'));
const EditVenturePage = lazy(() => import('./pages/EditVenturePage'));
const VentureDetailPage = lazy(() => import('./pages/VentureDetailPage'));
const VentureDashboardPage = lazy(() => import('./pages/VentureDashboardPage'));
const VentureAnalyticsPage = lazy(() => import('./pages/VentureAnalyticsPage'));
const ProfileAnalyticsPage = lazy(() => import('./pages/ProfileAnalyticsPage'));
const PlatformAnalyticsHubPage = lazy(() => import('./pages/PlatformAnalyticsHubPage'));
const PlatformAnalyticsCategoryPage = lazy(() => import('./pages/PlatformAnalyticsCategoryPage'));
const DomainsDashboardPage = lazy(() => import('./pages/DomainsDashboardPage'));
const CoCreationDashboardPage = lazy(() => import('./pages/CoCreationDashboardPage'));
const CoCreationAnalyticsPage = lazy(() => import('./pages/CoCreationAnalyticsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const VirtualAssistantAdminRedirectPage = lazy(() => import('./pages/VirtualAssistantAdminRedirectPage'));
const VirtualAssistantApplicationDetailPage = lazy(() => import('./pages/VirtualAssistantApplicationDetailPage'));
const CoBrotherDashboardPage = lazy(() => import('./pages/CoBrotherDashboardPage'));
const FeeRequestsPage = lazy(() => import('./pages/FeeRequestsPage'));
const AuctionPage = lazy(() => import('./pages/AuctionPage'));
const VentureDealPage = lazy(() => import('./pages/VentureDealPage'));
const NewCoVenturePage = lazy(() => import('./pages/NewCoVenturePage'));
const CommunityAuctionPage = lazy(() => import('./pages/CommunityAuctionPage'));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'));
const JoinForm = lazy(() => import('./pages/JoinForm'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SoftwareAuctionPage = lazy(() => import('./pages/SoftwareAuctionPage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const DataDeletionPage = lazy(() => import('./pages/DataDeletionPage'));
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditionsPage'));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'));
const CancellationPolicyPage = lazy(() => import('./pages/CancellationPolicyPage'));
const ShippingAndExchangePage = lazy(() => import('./pages/ShippingAndExchangePage'));
const VirtualAssistantPage = lazy(() => import('./pages/VirtualAssistantPage'));
const VirtualAssistantSuccessPage = lazy(() => import('./pages/VirtualAssistantSuccessPage'));
const VirtualAssistantMarketplacePage = lazy(() => import('./pages/VirtualAssistantMarketplacePage'));
const VirtualAssistantPublicProfilePage = lazy(() => import('./pages/VirtualAssistantPublicProfilePage'));
const VirtualAssistantJourneyPage = lazy(() => import('./pages/VirtualAssistantJourneyPage'));
const VirtualAssistantUnlockPage = lazy(() => import('./pages/VirtualAssistantUnlockPage'));
const VirtualAssistantWorkspacePage = lazy(() => import('./pages/VirtualAssistantWorkspacePage'));
const loadVenturesPage = () => import('./pages/VenturesPage');
const VenturesPage = lazy(loadVenturesPage);
const VentureListingChoosePage = lazy(() => import('./pages/VentureListingChoosePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const loadDomainsPage = () => import('./pages/DomainsPage');
const DomainsPage = lazy(loadDomainsPage);
const CoCreationPage = lazy(() => import('./pages/CoCreationPage'));
const TechnologyServiceDetailPage = lazy(() => import('./pages/TechnologyServiceDetailPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const loadAuctionsPage = () => import('./pages/AuctionsPage');
const AuctionsPage = lazy(loadAuctionsPage);
const DomainStorefrontPage = lazy(() => import('./pages/DomainStorefrontPage'));
const OperationsPage = lazy(() => import('./pages/OperationsPage'));
const RegistrationsPage = lazy(() => import('./pages/RegistrationsPage'));
const FranchisePage = lazy(() => import('./pages/FranchisePage'));
const DomainRegistrationOrderPage = lazy(() => import('./pages/DomainRegistrationOrderPage'));
const DomainTransferSellerPage = lazy(() => import('./pages/DomainTransferSellerPage'));
const DomainTransferBuyerPage = lazy(() => import('./pages/DomainTransferBuyerPage'));
const EdgePointsPage = lazy(() => import('./pages/EdgePointsPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const SharedDomainPage = lazy(() => import('./pages/SharedDomainPage'));

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
    const timer = window.setTimeout(() => {
      preloadPostLoginRoutes();
    }, 8000);
    return () => window.clearTimeout(timer);
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

/** Remount routed pages when language changes so all UI strings refresh. */
function LanguageAwareRoutes({ children }) {
  const { i18n } = useTranslation();
  const languageKey = i18n.resolvedLanguage || i18n.language;
  return (
    <Suspense fallback={<PageLoader />} key={languageKey}>
      {children}
    </Suspense>
  );
}

// CLOUDFLARE FIX: Dynamic country folder detector
const getCountryBasename = () => {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && firstSegment.length === 2) {
    return `/${firstSegment}`;
  }
  return '';
};

const currentCountryBase = getCountryBasename();

export default function App() {
  useEffect(() => {
    const darkModeMatcher = window.matchMedia('(prefers-color-scheme: dark)');
    const applyFavicon = () => applyThemeFavicon(lightFavicon, darkFavicon);
    applyFavicon();
    darkModeMatcher.addEventListener('change', applyFavicon);
    return () => darkModeMatcher.removeEventListener('change', applyFavicon);
  }, []);

  return (
    <BrowserRouter 
      basename={currentCountryBase} 
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ScrollToTop />
      <CookieConsentProvider>
        <AuthProvider>
          <CartProvider>
          <RoutePreloader />
          <SiteGradientBorder />
          <CookieConsentBanner />
          <WhatsAppFloatingButton />
          <AppErrorBoundary>
            <LanguageAwareRoutes>
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
                <Route path="/data-deletion" element={<DataDeletionPage />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />
                <Route path="/cancellation-policy" element={<CancellationPolicyPage />} />
                <Route path="/shipping-and-exchange" element={<ShippingAndExchangePage />} />
                <Route path="/auth/callback" element={<OAuthCallbackPage />} />
                <Route
                  path="/virtual-assistant"
                  element={
                    <VaApplicationGuard>
                      <VirtualAssistantPage />
                    </VaApplicationGuard>
                  }
                />
                <Route
                  path="/virtual-assistant/success"
                  element={
                    <VaApplicationGuard>
                      <VirtualAssistantSuccessPage />
                    </VaApplicationGuard>
                  }
                />
                <Route path="/virtual-assistants/marketplace" element={<VirtualAssistantMarketplacePage />} />
                <Route path="/virtual-assistants/:id" element={<VirtualAssistantPublicProfilePage />} />

                {/* Auctions */}
                <Route
                  path="/auction/:auctionId"
                  element={<AuctionPage />}
                />

                <Route
                  path="/venture-auction/:auctionId"
                  element={<Navigate to="/ventures" replace />}
                />

                <Route
                  path="/creator-auction/:auctionId"
                  element={<CommunityAuctionPage />}
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
                  path="/analytics"
                  element={
                    <ProfileGuard>
                      <PlatformAnalyticsHubPage />
                    </ProfileGuard>
                  }
                />

                <Route
                  path="/analytics/:category"
                  element={
                    <ProfileGuard>
                      <PlatformAnalyticsCategoryPage />
                    </ProfileGuard>
                  }
                />

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

                <Route
                  path="/operations/:id"
                  element={<OperationsPage />}
                />
                <Route
                  path="/operations"
                  element={<OperationsPage />}
                />
                <Route
                  path="/registrations"
                  element={<RegistrationsPage />}
                />
                <Route
                  path="/franchise"
                  element={<FranchisePage />}
                />

                {/* Ventures */}
                <Route
                  path="/ventures"
                  element={<VenturesPage />}
                />

                <Route path="/co-ventures" element={<Navigate to="/ventures" replace />} />

                <Route
                  path="/co-ventures/new"
                  element={
                    <ProfileGuard>
                      <NewCoVenturePage />
                    </ProfileGuard>
                  }
                />

                <Route
                  path="/ventures/deals/:dealId"
                  element={<VentureDealPage />}
                />

                <Route
                  path="/ventures/list"
                  element={
                    <ProfileGuard>
                      <VentureListingChoosePage />
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

                <Route
                  path="/ventures/:id"
                  element={<VentureDetailPage />}
                />

                {/* Creator */}
                <Route
                  path="/creator"
                  element={<CommunityPage />}
                />
                <Route
                  path="/creator/:id"
                  element={<CommunityPage />}
                />

                {/* Legacy Community / Disruptor URLs → Creator */}
                <Route path="/community" element={<LegacyCommunityRedirect />} />
                <Route path="/disruptors" element={<Navigate to="/auctions" replace />} />

                {/* Domains */}
                <Route
                  path="/domains"
                  element={<DomainsPage />}
                />
                <Route
                  path="/alldomains"
                  element={<DomainsPage />}
                />
                <Route
                  path="/domains/:id"
                  element={<DomainsPage />}
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
                  path="/domains/transfers/:transactionId"
                  element={
                    <ProfileGuard>
                      <DomainTransferSellerPage />
                    </ProfileGuard>
                  }
                />

                <Route
                  path="/purchases/transfers/:transactionId"
                  element={
                    <ProfileGuard>
                      <DomainTransferBuyerPage />
                    </ProfileGuard>
                  }
                />

                <Route
                  path="/storefront"
                  element={<DomainStorefrontPage />}
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
                  path="/technology/services/:slug"
                  element={<TechnologyServiceDetailPage />}
                />
                <Route
                  path="/technologies/services/:slug"
                  element={<TechnologyServiceDetailPage />}
                />

                {[
                  'ai-business-suite', 'website-builder', 'crm', 'invoice-ai',
                  'appointment-booking', 'document-signer', 'cloud-storage', 'business-phone',
                  'vpn', 'email-marketing', 'social-media-automation', 'reputation-management',
                  'link-in-bio', 'smm-growth', 'esim', 'web-hosting', 'wordpress-plugin-pack'
                ].map((serviceSlug) => (
                  <Route
                    key={serviceSlug}
                    path={`/technology/${serviceSlug}`}
                    element={<TechnologyServiceDetailPage />}
                  />
                ))}

                {[
                  'ai-business-suite', 'website-builder', 'crm', 'invoice-ai',
                  'appointment-booking', 'document-signer', 'cloud-storage', 'business-phone',
                  'vpn', 'email-marketing', 'social-media-automation', 'reputation-management',
                  'link-in-bio', 'smm-growth', 'esim', 'web-hosting', 'wordpress-plugin-pack'
                ].map((serviceSlug) => (
                  <Route
                    key={`plural-${serviceSlug}`}
                    path={`/technologies/${serviceSlug}`}
                    element={<TechnologyServiceDetailPage />}
                  />
                ))}

                <Route path="/technologies" element={<Navigate to="/technology" replace />} />
                <Route
                  path="/technology"
                  element={<CoCreationPage />}
                />
                <Route
                  path="/technology/:id"
                  element={<CoCreationPage />}
                />

                <Route
                  path="/technology/auction/:auctionId"
                  element={<SoftwareAuctionPage />}
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

                {/* Shared domain preview (public) */}
                <Route path="/s/:token" element={<SharedDomainPage />} />

                {/* Edge Points */}
                <Route
                  path="/edge-points"
                  element={
                    <ProtectedRoute>
                      <EdgePointsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Auctions */}
                <Route
                  path="/auctions"
                  element={<AuctionsPage />}
                />

                {/* Cart */}
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
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

                {/* Virtual Assistant — applicant journey */}
                <Route
                  path="/virtual-assistant/journey"
                  element={
                    <VirtualAssistantApplicantGuard>
                      <VirtualAssistantJourneyPage />
                    </VirtualAssistantApplicantGuard>
                  }
                />

                {/* Virtual Assistant — one-time unlock cinematic */}
                <Route
                  path="/virtual-assistant/unlock"
                  element={
                    <VirtualAssistantGuard>
                      <VirtualAssistantUnlockPage />
                    </VirtualAssistantGuard>
                  }
                />

                {/* Virtual Assistant — unlocked workspace */}
                <Route
                  path="/virtual-assistant/workspace"
                  element={
                    <VirtualAssistantGuard>
                      <VirtualAssistantWorkspacePage />
                    </VirtualAssistantGuard>
                  }
                />

                {/* Admin */}
                <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
                <Route
                  path="/admin"
                  element={
                    <AdminOrAuctionModeratorGuard>
                      <AdminDashboardPage />
                    </AdminOrAuctionModeratorGuard>
                  }
                />
                <Route
                  path="/admin/virtual-assistants/applications"
                  element={
                    <AdminGuard>
                      <VirtualAssistantAdminRedirectPage />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/virtual-assistants/applications/:applicationId"
                  element={
                    <AdminGuard>
                      <VirtualAssistantApplicationDetailPage />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/virtual-assistants/direct-add"
                  element={
                    <AdminGuard>
                      <VirtualAssistantAdminRedirectPage />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/virtual-assistants/published"
                  element={
                    <AdminGuard>
                      <VirtualAssistantAdminRedirectPage />
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
                <Route
                  path="/settings/payouts"
                  element={
                    <ProfileGuard>
                      <PayoutSettingsPage />
                    </ProfileGuard>
                  }
                />

                {/* Fallback — unknown URLs go home, not login */}
                <Route path="*" element={<Navigate to="/" replace />} />

              </Routes>
            </LanguageAwareRoutes>
          </AppErrorBoundary>
          </CartProvider>
        </AuthProvider>
      </CookieConsentProvider>
    </BrowserRouter>
  );
}