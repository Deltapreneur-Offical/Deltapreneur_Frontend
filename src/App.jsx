import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import SiteGradientBorder from './components/common/SiteGradientBorder';
import CookieConsentBanner from './components/common/CookieConsentBanner';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute, ProfileGuard } from './components/auth/ProtectedRoute';
import { AdminGuard, CoBrotherGuard } from './components/auth/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import PasswordSecurityPage from './pages/PasswordSecurityPage';
import DashboardPage from './pages/DashboardPage';
import NewVenturePage from './pages/NewVenturePage';
import EditVenturePage from './pages/EditVenturePage';
import VentureDashboardPage from './pages/VentureDashboardPage';
import VentureAnalyticsPage from './pages/VentureAnalyticsPage';
import ProfileAnalyticsPage from './pages/ProfileAnalyticsPage';
import DomainsDashboardPage from './pages/DomainsDashboardPage';
import CoCreationDashboardPage from './pages/CoCreationDashboardPage';
import CoCreationAnalyticsPage from './pages/CoCreationAnalyticsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CoBrotherDashboardPage from './pages/CoBrotherDashboardPage';
import FeeRequestsPage from './pages/FeeRequestsPage';
import AuctionPage from './pages/AuctionPage';
import VentureAuctionPage from './pages/VentureAuctionPage';
import CommunityAuctionPage from './pages/CommunityAuctionPage';
import MeetingsPage from './pages/MeetingsPage';
import Home from './pages/Home';
import JoinForm from './pages/JoinForm';
import ContactPage from './pages/ContactPage';
import SoftwareAuctionPage from './pages/SoftwareAuctionPage';
import AboutUsPage from './pages/AboutUsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';

/* Lazy Loaded Pages */
const VenturesPage = lazy(() => import('./pages/VenturesPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const DomainsPage = lazy(() => import('./pages/DomainsPage'));
const CoCreationPage = lazy(() => import('./pages/CoCreationPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const AuctionsPage = lazy(() => import('./pages/AuctionsPage'));

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <CurrencyProvider>
          <CookieConsentProvider>
            <AuthProvider>
              <SiteGradientBorder />
              <CookieConsentBanner />
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
              path="/community-auction/:auctionId"
              element={
                <ProfileGuard>
                  <CommunityAuctionPage />
                </ProfileGuard>
              }
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
                <ProfileGuard>
                  <DashboardPage />
                </ProfileGuard>
              }
            />

            {/* Ventures */}
            <Route
              path="/ventures"
              element={
                <Suspense fallback={<div className="p-6">Loading...</div>}>
                  <ProfileGuard>
                    <VenturesPage />
                  </ProfileGuard>
                </Suspense>
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

            {/* Community */}
            <Route
              path="/community"
              element={
                <Suspense fallback={<div className="p-6">Loading...</div>}>
                  <ProfileGuard>
                    <CommunityPage />
                  </ProfileGuard>
                </Suspense>
              }
            />

            {/* Domains */}
            <Route
              path="/domains"
              element={
                <Suspense fallback={<div className="p-6">Loading...</div>}>
                  <ProfileGuard>
                    <DomainsPage />
                  </ProfileGuard>
                </Suspense>
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

            {/* CoCreation */}
            <Route
              path="/cocreation"
              element={
                <Suspense fallback={<div className="p-6">Loading...</div>}>
                  <ProfileGuard>
                    <CoCreationPage />
                  </ProfileGuard>
                </Suspense>
              }
            />

            <Route
              path="/cocreation/auction/:auctionId"
              element={<SoftwareAuctionPage />}
            />

            <Route
              path="/cocreation/dashboard"
              element={
                <ProfileGuard>
                  <CoCreationDashboardPage />
                </ProfileGuard>
              }
            />

            <Route
              path="/cocreation/:id/analytics"
              element={
                <ProfileGuard>
                  <CoCreationAnalyticsPage />
                </ProfileGuard>
              }
            />

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
                <Suspense fallback={<div className="p-6">Loading...</div>}>
                  <ProfileGuard>
                    <AuctionsPage />
                  </ProfileGuard>
                </Suspense>
              }
            />

            {/* Purchases */}
            <Route
              path="/purchases"
              element={
                <Suspense fallback={<div className="p-6">Loading...</div>}>
                  <ProfileGuard>
                    <PurchasesPage />
                  </ProfileGuard>
                </Suspense>
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
            </AuthProvider>
          </CookieConsentProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}