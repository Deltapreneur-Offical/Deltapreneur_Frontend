import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CreditCard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { communityAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import CreatorProfileCompletionBanner from '../components/profile/CreatorProfileCompletionBanner';
import PayoutProfileBanner from '../components/payout/PayoutProfileBanner';
import VentureIcon from '../assets/Coventure_logo.png';
import CommunityIcon from '../assets/Cobrother_Profile.png';
import DomainsIcon from '../assets/CoBranding.png';
import TechnologyIcon from '../assets/CoCreation.png';
import { resolveUserDisplayName } from '../utils/userDisplayName';

const DASHBOARD_GREETING_KEY = 'cobrother_dashboard_greeting_idx';
const DASHBOARD_GREETING_COUNT = 8;

function readNextGreetingIndex() {
  const prev = Number.parseInt(localStorage.getItem(DASHBOARD_GREETING_KEY) ?? '-1', 10);
  const next = Number.isNaN(prev) ? 0 : (prev + 1) % DASHBOARD_GREETING_COUNT;
  localStorage.setItem(DASHBOARD_GREETING_KEY, String(next));
  return next;
}

function displayRoleLabel(role, t) {
  const raw = (role ?? 'GUEST').toString();
  const upper = raw.toUpperCase();
  if (upper === 'ADMIN' || upper === 'ROLE_ADMIN') return t('roleAdministrator');
  if (upper === 'USER' || upper === 'ROLE_USER') return t('roleUser');
  if (upper === 'GUEST') return t('roleGuest');
  return raw;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [greetingIdx] = useState(readNextGreetingIndex);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [creatorProfileReady, setCreatorProfileReady] = useState(false);

  const welcomeMessage = t(`dashboardGreeting_${greetingIdx}`);

  useEffect(() => {
    if (!user?.id) {
      setCreatorProfile(null);
      setCreatorProfileReady(true);
      return undefined;
    }

    let cancelled = false;
    setCreatorProfileReady(false);

    communityAPI
      .getMy()
      .then(({ data }) => {
        if (!cancelled) setCreatorProfile(data?.data ?? data ?? null);
      })
      .catch(() => {
        if (!cancelled) setCreatorProfile(null);
      })
      .finally(() => {
        if (!cancelled) setCreatorProfileReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const cards = [
    {
      icon: VentureIcon,
      title: t('venture'),
      desc: t('ventureDesc'),
      to: '/ventures',
      cta: t('manageVentures'),
    },
    {
      icon: CommunityIcon,
      title: t('disruptors'),
      desc: t('communityDesc'),
      to: '/creator',
      cta: t('exploreDisruptors'),
    },
    {
      icon: DomainsIcon,
      title: t('domains'),
      desc: t('domainsDesc'),
      to: '/domains',
      cta: t('manageDomains'),
    },
    {
      icon: TechnologyIcon,
      title: t('technology'),
      desc: t('technologyDesc'),
      to: '/technology',
      cta: t('distributeSoftware'),
    },
  ];

  const quickActions = [
    { to: '/ventures/new', label: t('dashboardListVenturesQuick'), icon: <span className="text-lg font-semibold leading-none">+</span> },
    { to: '/creator', label: t('dashboardViewDisruptorsQuick'), icon: <img src={CommunityIcon} alt="" className="w-5 h-5 object-contain shrink-0" /> },
    { to: '/domains', label: t('dashboardManageDomainsQuick'), icon: <img src={DomainsIcon} alt="" className="w-5 h-5 object-contain shrink-0" /> },
    { to: '/settings/payouts', label: 'Payout Settings', icon: <CreditCard className="h-5 w-5 shrink-0" /> },
    { to: '/technology', label: t('dashboardExploreTechnologyQuick'), icon: <img src={TechnologyIcon} alt="" className="w-5 h-5 object-contain shrink-0" /> },
  ];

  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  const showAdmin = roleUpper === 'ADMIN' || roleUpper === 'ROLE_ADMIN';

  const displayName = resolveUserDisplayName(user);
  const rolePillText = displayRoleLabel(user?.role, t);
  const profileComplete = Boolean(user?.profileComplete);

  return (
    <AppLayout>
      <div className="app-dashboard w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-6 lg:gap-8 min-w-0">
        <section className="rounded-2xl shadow-sm border border-slate-200/80 bg-white">
          {showAdmin && (
            <div className="rounded-t-2xl border-b border-indigo-200/90 bg-gradient-to-r from-slate-50 via-indigo-50/80 to-violet-50/60 px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 shadow-[0_6px_20px_rgba(99,102,241,0.16),0_2px_8px_rgba(15,23,42,0.1)] relative z-[1]">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200/80">
                  <Shield size={20} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-900/90">{t('dashboardAdminTitle')}</p>
                  <p className="text-sm text-slate-600 mt-0.5 leading-snug">
                    {t('dashboardAdminBody')}
                  </p>
                </div>
              </div>
              <Link
                to="/admin"
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm transition-colors"
              >
                {t('dashboardAdminCTA')}
              </Link>
            </div>
          )}

          {!profileComplete && (
            <div className={`border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/80 to-amber-50 px-4 py-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3${!showAdmin ? ' rounded-t-2xl' : ''}`}>
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" aria-hidden />
                <p className="text-sm text-amber-900 leading-snug m-0">
                  {t('dashboardProfilePendingBanner')}
                </p>
              </div>
              <Link
                to="/complete-profile"
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center rounded-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm transition-colors"
              >
                {t('dashboardCompleteProfileCTA')}
              </Link>
            </div>
          )}

          <div className={`bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-5 sm:p-6 lg:p-8 text-white rounded-b-2xl shadow-[0_6px_20px_rgba(99,102,241,0.16),0_2px_8px_rgba(15,23,42,0.1)] relative z-[1]${!showAdmin && profileComplete ? ' rounded-t-2xl' : ''}${showAdmin || !profileComplete ? ' border-t border-indigo-400/25' : ''}`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-white/80 text-sm mb-1">{t('dashboardWelcomeBack')}</p>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white break-words">
                  {t('dashboardHello', { name: displayName })}
                </h1>
                <p className="text-white/80 mt-2 text-sm sm:text-base">{welcomeMessage}</p>
              </div>
              <div className="dashboard-hero-meta">
                <span className={`dashboard-hero-meta__tag${showAdmin ? ' is-orange' : ''}`}>
                  {rolePillText}
                </span>
                {profileComplete ? (
                  <span className="dashboard-hero-meta__tag is-green">
                    {t('dashboardProfileLabel')} {t('dashboardProfileComplete')}
                  </span>
                ) : (
                  <Link to="/complete-profile" className="dashboard-hero-meta__tag is-amber dashboard-hero-meta__tag--link">
                    {t('dashboardProfileLabel')} {t('dashboardProfilePending')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {creatorProfileReady && creatorProfile ? (
          <CreatorProfileCompletionBanner profile={creatorProfile} editTo="/creator" />
        ) : null}

        {user?.id ? <PayoutProfileBanner context="default" /> : null}

        <section className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
          {cards.map((c) => (
            <article
              key={c.to}
              className="app-dashboard-feature-card group bg-white border border-gray-200 rounded-2xl px-5 flex flex-col items-center text-center min-w-0 hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-300"
            >
              <div className="app-dashboard-feature-card__icon mb-3.5 flex items-center justify-center group-hover:scale-[1.03] transition-transform">
                <img src={c.icon} alt="" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              </div>
              <h3 className="font-display text-base sm:text-[1.05rem] font-semibold text-gray-900 mb-1.5 w-full">
                {c.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4 flex-1 w-full leading-relaxed line-clamp-3 sm:line-clamp-none">
                {c.desc}
              </p>
              <Link
                to={c.to}
                className="btn-glow app-dashboard-card-cta"
              >
                {c.cta} →
              </Link>
            </article>
          ))}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-5">
            {t('dashboardQuickActions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="btn-glow app-dashboard-quick-action"
              >
                {action.icon}
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
