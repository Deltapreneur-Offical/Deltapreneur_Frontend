import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import VentureIcon from '../assets/Coventure_logo.png';
import CommunityIcon from '../assets/Cobrother_Profile.png';
import DomainsIcon from '../assets/CoBranding.png';
import TechnologyIcon from '../assets/CoCreation.png';

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

  const welcomeMessage = t(`dashboardGreeting_${greetingIdx}`);

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
      to: '/community',
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
    { to: '/community', label: t('dashboardViewDisruptorsQuick'), icon: <img src={CommunityIcon} alt="" className="w-5 h-5 object-contain shrink-0" /> },
    { to: '/domains', label: t('dashboardManageDomainsQuick'), icon: <img src={DomainsIcon} alt="" className="w-5 h-5 object-contain shrink-0" /> },
    { to: '/technology', label: t('dashboardExploreTechnologyQuick'), icon: <img src={TechnologyIcon} alt="" className="w-5 h-5 object-contain shrink-0" /> },
  ];

  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  const showAdmin = roleUpper === 'ADMIN' || roleUpper === 'ROLE_ADMIN';

  const firstName = user?.firstname || user?.firstName || user?.name || user?.email?.split('@')[0] || 'User';
  const rolePillText = displayRoleLabel(user?.role, t);

  return (
    <AppLayout>
      <div className="app-dashboard w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-6 lg:gap-8 min-w-0">
        <section className="rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 bg-white">
          {showAdmin && (
            <div className="border-b border-indigo-100 bg-gradient-to-r from-slate-50 via-indigo-50/80 to-violet-50/60 px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
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

          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-5 sm:p-6 lg:p-8 text-white">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-white/80 text-sm mb-1">{t('dashboardWelcomeBack')}</p>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white break-words">
                  {t('dashboardHello', { name: firstName })}
                </h1>
                <p className="text-white/80 mt-2 text-sm sm:text-base">{welcomeMessage}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-white/10 backdrop-blur rounded-full">
                  <span className="text-xs text-white/70">{t('dashboardRoleLabel')}</span>
                  <span className="text-sm font-semibold text-white">{rolePillText}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-white/15 backdrop-blur rounded-full border border-white/20">
                  <span className="text-xs text-white/70">{t('dashboardProfileLabel')}</span>
                  <span className="text-sm font-semibold text-white">{t('dashboardProfileComplete')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
          {cards.map((c) => (
            <article
              key={c.to}
              className="group bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col items-center text-center min-w-0 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 hover:border-indigo-300 transition-all duration-300"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-4 bg-gray-50 rounded-2xl group-hover:scale-105 transition-transform">
                <img src={c.icon} alt="" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-gray-900 mb-2 w-full">
                {c.title}
              </h3>
              <p className="text-sm text-gray-500 mb-5 flex-1 w-full leading-relaxed line-clamp-3 sm:line-clamp-none">
                {c.desc}
              </p>
              <Link
                to={c.to}
                className="btn-glow btn-glow-sm w-full text-sm py-2.5 px-3 text-center leading-snug whitespace-normal"
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
                className="btn-glow flex items-center justify-center gap-2 py-3 px-4 text-sm text-center min-h-[48px] whitespace-normal leading-snug"
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
