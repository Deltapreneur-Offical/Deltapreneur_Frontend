import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Code2,
  Gavel,
  Globe,
  Lightbulb,
  LineChart,
  Plus,
  Settings,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import CreatorDashboardIcon from '../components/common/CreatorDashboardIcon';
import InlineStatLoader from '../components/common/InlineStatLoader';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { adminAPI, communityAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import CreatorProfileCompletionBanner from '../components/profile/CreatorProfileCompletionBanner';
import PayoutProfileBanner from '../components/payout/PayoutProfileBanner';
import { resolveUserDisplayName } from '../utils/userDisplayName';
import { ventureListChooseUrl } from '../constants/ventureListingTypeContent';

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

const STAT_CARD_ICONS = {
  ventures: { Icon: Briefcase, tone: 'purple' },
  domains: { Icon: Globe, tone: 'green' },
  technologies: { Icon: Code2, tone: 'blue' },
  creators: { Icon: CreatorDashboardIcon, tone: 'creators' },
};

const MODULE_ICONS = {
  ventures: { Icon: Briefcase, tone: 'purple' },
  creators: { Icon: CreatorDashboardIcon, tone: 'creators' },
  domains: { Icon: Globe, tone: 'blue' },
  technology: { Icon: Lightbulb, tone: 'orange' },
  auctions: { Icon: Gavel, tone: 'purple' },
  purchases: { Icon: ShoppingBag, tone: 'blue' },
};

const QUICK_ACTION_ICONS = {
  venture: { Icon: Plus, tone: 'purple' },
  creators: { Icon: CreatorDashboardIcon, tone: 'creators' },
  domains: { Icon: Globe, tone: 'blue' },
  technology: { Icon: Lightbulb, tone: 'orange' },
};

function formatStatValue(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function renderDashboardIcon(iconConfig, size) {
  const { Icon } = iconConfig;
  return <Icon size={size} strokeWidth={2} aria-hidden />;
}

function dashboardIconClass(baseClass, tone) {
  return `${baseClass} ${baseClass}--${tone}`;
}

function DashboardStatCard({ label, value, tone, loading }) {
  const iconConfig = STAT_CARD_ICONS[tone];

  return (
    <article className="dashboard-stat-card">
      <div className="dashboard-stat-card__top">
        <div className={dashboardIconClass('dashboard-stat-card__icon', tone)}>
          {renderDashboardIcon(iconConfig, 18)}
        </div>
      </div>
      <p className="dashboard-stat-card__label">{label}</p>
      <p className="dashboard-stat-card__value" aria-busy={loading || undefined}>
        {loading ? <InlineStatLoader /> : formatStatValue(value)}
      </p>
    </article>
  );
}

function DashboardModuleCard({ title, desc, cta, to, tone }) {
  const iconConfig = MODULE_ICONS[tone];

  return (
    <article className="dashboard-module-card">
      <div className="dashboard-module-card__head">
        <div className={dashboardIconClass('dashboard-module-card__icon', tone)}>
          {renderDashboardIcon(iconConfig, 20)}
        </div>
        <div className="dashboard-module-card__copy">
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </div>
      <div className="dashboard-module-card__actions">
        <Link to={to} className="dashboard-module-card__cta">
          {cta}
        </Link>
        <Link to={to} className="dashboard-module-card__arrow" aria-label={cta}>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function DashboardQuickAction({ to, label, tone }) {
  const iconConfig = QUICK_ACTION_ICONS[tone];

  return (
    <Link to={to} className="dashboard-quick-action">
      <span className={dashboardIconClass('dashboard-quick-action__icon', tone)}>
        {renderDashboardIcon(iconConfig, 16)}
      </span>
      <span className="dashboard-quick-action__label">{label}</span>
      <ArrowRight size={16} strokeWidth={2.25} className="dashboard-quick-action__arrow" aria-hidden />
    </Link>
  );
}

function DashboardWelcomeBanner({ user, t }) {
  const [greetingIdx] = useState(readNextGreetingIndex);
  const displayName = resolveUserDisplayName(user);
  const rolePillText = displayRoleLabel(user?.role, t);
  const profileComplete = Boolean(user?.profileComplete);
  const welcomeMessage = t(`dashboardGreeting_${greetingIdx}`);

  return (
    <section className="dashboard-welcome-shell">
      {!profileComplete ? (
        <div className="dashboard-welcome-shell__alert">
          <div className="dashboard-welcome-shell__alert-copy">
            <AlertCircle size={18} strokeWidth={2} aria-hidden />
            <p>{t('dashboardProfilePendingBanner')}</p>
          </div>
          <Link to="/complete-profile" className="dashboard-welcome-shell__alert-cta">
            {t('dashboardCompleteProfileCTA')}
          </Link>
        </div>
      ) : null}

      <div className="dashboard-welcome-hero">
        <div className="dashboard-welcome-hero__content">
          <p className="dashboard-welcome-hero__eyebrow">{t('dashboardWelcomeBack')}</p>
          <h2>{t('dashboardHello', { name: displayName })}</h2>
          <p className="dashboard-welcome-hero__message">{welcomeMessage}</p>
        </div>

        <div className="dashboard-welcome-hero__badges">
          <div className="dashboard-welcome-hero__badge">
            <span className="dashboard-welcome-hero__badge-dot dashboard-welcome-hero__badge-dot--role" aria-hidden />
            <span>{rolePillText}</span>
          </div>
          {profileComplete ? (
            <div className="dashboard-welcome-hero__badge">
              <span className="dashboard-welcome-hero__badge-dot dashboard-welcome-hero__badge-dot--complete" aria-hidden />
              <span>{t('dashboardProfileComplete')}</span>
            </div>
          ) : (
            <Link to="/complete-profile" className="dashboard-welcome-hero__badge dashboard-welcome-hero__badge--link">
              <span className="dashboard-welcome-hero__badge-dot dashboard-welcome-hero__badge-dot--pending" aria-hidden />
              <span>{t('dashboardProfilePending')}</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [creatorProfileReady, setCreatorProfileReady] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalVentures: null,
    totalDomains: null,
    totalTechnologies: null,
    totalCreators: null,
  });

  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'ROLE_ADMIN';

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

  useEffect(() => {
    if (!isAdmin) return undefined;

    let cancelled = false;
    setStatsLoading(true);

    adminAPI
      .getDashboard()
      .then(({ data }) => {
        if (cancelled) return;
        const payload = data?.data ?? data ?? {};
        setStats({
          totalVentures: payload.totalVentures ?? null,
          totalDomains: payload.totalDomains ?? null,
          totalTechnologies: payload.totalTechnologies ?? null,
          totalCreators: payload.totalCreators ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStats({
            totalVentures: null,
            totalDomains: null,
            totalTechnologies: null,
            totalCreators: null,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const modules = [
    {
      key: 'ventures',
      title: t('venture'),
      desc: t('ventureDesc'),
      to: '/ventures',
      cta: t('manageVentures'),
      tone: 'ventures',
    },
    {
      key: 'creators',
      title: t('disruptors'),
      desc: t('communityDesc'),
      to: '/creator',
      cta: t('exploreDisruptors'),
      tone: 'creators',
    },
    {
      key: 'domains',
      title: t('domains'),
      desc: t('domainsDesc'),
      to: '/domains',
      cta: t('manageDomains'),
      tone: 'domains',
    },
    {
      key: 'technology',
      title: t('technology'),
      desc: t('technologyDesc'),
      to: '/technology',
      cta: t('distributeSoftware'),
      tone: 'technology',
    },
    {
      key: 'auctions',
      title: t('auctions'),
      desc: t('dashboardModuleAuctionsDesc'),
      to: '/auctions',
      cta: t('dashboardViewAuctions'),
      tone: 'auctions',
    },
    {
      key: 'purchases',
      title: t('purchases'),
      desc: t('dashboardModulePurchasesDesc'),
      to: '/purchases',
      cta: t('dashboardViewPurchases'),
      tone: 'purchases',
    },
  ];

  const quickActions = [
    {
      key: 'venture',
      to: ventureListChooseUrl('venture'),
      label: t('dashboardCreateVentureQuick'),
      tone: 'venture',
    },
    {
      key: 'creators',
      to: '/creator',
      label: t('dashboardExploreCreatorsQuick'),
      tone: 'creators',
    },
    {
      key: 'domains',
      to: '/domains',
      label: t('dashboardManageDomainsQuick'),
      tone: 'domains',
    },
    {
      key: 'technology',
      to: '/technology',
      label: t('dashboardExploreTechnologyQuick'),
      tone: 'technology',
    },
  ];

  const statCards = [
    { key: 'ventures', label: t('dashboardTotalVentures'), value: stats.totalVentures, tone: 'ventures' },
    { key: 'domains', label: t('dashboardActiveDomains'), value: stats.totalDomains, tone: 'domains' },
    { key: 'technologies', label: t('dashboardTechnologies'), value: stats.totalTechnologies, tone: 'technologies' },
    { key: 'creators', label: t('dashboardCreators'), value: stats.totalCreators, tone: 'creators' },
  ];

  return (
    <AppLayout>
      <div className="app-dashboard w-full max-w-7xl mx-auto flex flex-col gap-6 lg:gap-8 min-w-0">
        {isAdmin ? (
          <section className="dashboard-admin-header">
            <div className="dashboard-admin-header__copy">
              <div className="dashboard-admin-header__title-row">
                <h1>{t('dashboard')}</h1>
                <span className="dashboard-admin-header__badge">
                  <UserRound size={14} strokeWidth={2} aria-hidden />
                  {t('dashboardAdministratorBadge')}
                </span>
              </div>
              <p>{t('dashboardSubtitle')}</p>
            </div>
            <div className="dashboard-admin-header__actions">
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `dashboard-admin-header__btn dashboard-admin-header__btn--ghost${isActive ? ' is-active' : ''}`
                }
              >
                <LineChart size={16} strokeWidth={2} aria-hidden />
                {t('dashboardViewAnalytics')}
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `dashboard-admin-header__btn dashboard-admin-header__btn--primary${isActive ? ' is-active' : ''}`
                }
              >
                <Settings size={16} strokeWidth={2} aria-hidden />
                {t('dashboardAdminPanel')}
              </NavLink>
            </div>
          </section>
        ) : null}

        {isAdmin ? (
          <section className="dashboard-stat-grid">
            {statCards.map((card) => (
              <DashboardStatCard
                key={card.key}
                label={card.label}
                value={card.value}
                tone={card.tone}
                loading={statsLoading}
              />
            ))}
          </section>
        ) : null}

        {!isAdmin && creatorProfileReady && creatorProfile ? (
          <CreatorProfileCompletionBanner profile={creatorProfile} editTo="/creator" />
        ) : null}

        {user?.id ? <PayoutProfileBanner context="default" /> : null}

        {!isAdmin ? <DashboardWelcomeBanner user={user} t={t} /> : null}

        <section className="dashboard-section">
          <h2 className="dashboard-section__title">{t('dashboardPlatformModules')}</h2>
          <div className="dashboard-module-grid">
            {modules.map((module) => (
              <DashboardModuleCard
                key={module.key}
                title={module.title}
                desc={module.desc}
                cta={module.cta}
                to={module.to}
                tone={module.tone}
              />
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="dashboard-section__title">{t('dashboardQuickActions')}</h2>
          <div className="dashboard-quick-action-grid">
            {quickActions.map((action) => (
              <DashboardQuickAction
                key={action.key}
                to={action.to}
                label={action.label}
                tone={action.tone}
              />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
