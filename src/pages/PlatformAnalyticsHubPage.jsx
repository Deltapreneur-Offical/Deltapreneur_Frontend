import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Globe,
  Lightbulb,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/services';
import CreatorDashboardIcon from '../components/common/CreatorDashboardIcon';
import AppLayout from '../components/layout/AppLayout';

const CATEGORY_META = {
  domains: { Icon: Globe, tone: 'blue' },
  ventures: { Icon: Briefcase, tone: 'purple' },
  technology: { Icon: Lightbulb, tone: 'orange' },
  creators: { Icon: CreatorDashboardIcon, tone: 'creators' },
};

function formatStatValue(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value).toLocaleString();
}

function AnalyticsCategoryCard({ title, desc, to, cta, tone, stat, loading }) {
  const { Icon } = CATEGORY_META[tone];
  const iconClass = `platform-analytics-card__icon platform-analytics-card__icon--${tone}`;

  return (
    <article className="platform-analytics-card">
      <div className="platform-analytics-card__head">
        <div className={iconClass}>
          <Icon size={20} strokeWidth={2} aria-hidden />
        </div>
        <div className="platform-analytics-card__copy">
          <h3>{title}</h3>
          <p>{desc}</p>
          {stat != null ? (
            <p className="platform-analytics-card__stat">
              {loading ? '…' : stat}
            </p>
          ) : null}
        </div>
      </div>
      <div className="platform-analytics-card__actions">
        <Link to={to} className="platform-analytics-card__cta">
          {cta}
        </Link>
        <Link to={to} className="platform-analytics-card__arrow" aria-label={cta}>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export default function PlatformAnalyticsHubPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'ROLE_ADMIN';

  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalVentures: null,
    totalDomains: null,
    totalTechnologies: null,
    totalCreators: null,
  });

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

  const categories = [
    {
      key: 'domains',
      title: t('domains'),
      desc: isAdmin ? t('platformAnalyticsDomainsDescAdmin') : t('platformAnalyticsDomainsDesc'),
      to: '/analytics/domains',
      cta: t('platformAnalyticsBrowseDomains'),
      tone: 'domains',
      stat: isAdmin
        ? t('platformAnalyticsStatListings', { count: formatStatValue(stats.totalDomains) ?? '—' })
        : null,
    },
    {
      key: 'ventures',
      title: t('ventures'),
      desc: isAdmin ? t('platformAnalyticsVenturesDescAdmin') : t('platformAnalyticsVenturesDesc'),
      to: '/analytics/ventures',
      cta: t('platformAnalyticsBrowseVentures'),
      tone: 'ventures',
      stat: isAdmin
        ? t('platformAnalyticsStatListings', { count: formatStatValue(stats.totalVentures) ?? '—' })
        : null,
    },
    {
      key: 'technology',
      title: t('technology'),
      desc: isAdmin ? t('platformAnalyticsTechnologyDescAdmin') : t('platformAnalyticsTechnologyDesc'),
      to: '/analytics/technology',
      cta: t('platformAnalyticsBrowseTechnology'),
      tone: 'technology',
      stat: isAdmin
        ? t('platformAnalyticsStatListings', { count: formatStatValue(stats.totalTechnologies) ?? '—' })
        : null,
    },
    {
      key: 'creators',
      title: t('disruptors'),
      desc: isAdmin ? t('platformAnalyticsCreatorsDescAdmin') : t('platformAnalyticsCreatorsDesc'),
      to: '/analytics/creators',
      cta: t('platformAnalyticsBrowseCreators'),
      tone: 'creators',
      stat: isAdmin
        ? t('platformAnalyticsStatCreators', { count: formatStatValue(stats.totalCreators) ?? '—' })
        : null,
    },
  ];

  const summaryCards = isAdmin
    ? [
        { label: t('dashboardTotalVentures'), value: stats.totalVentures },
        { label: t('dashboardActiveDomains'), value: stats.totalDomains },
        { label: t('dashboardTechnologies'), value: stats.totalTechnologies },
        { label: t('dashboardCreators'), value: stats.totalCreators },
      ]
    : [];

  return (
    <AppLayout>
      <div className="platform-analytics-hub w-full max-w-7xl mx-auto flex flex-col gap-6 lg:gap-8 min-w-0">
        <section className="platform-analytics-hub__header">
          <div>
            <Link to="/dashboard" className="platform-analytics-hub__back">
              <ArrowLeft size={16} strokeWidth={2} aria-hidden />
              {t('platformAnalyticsBackToDashboard')}
            </Link>
            <h1>{t('platformAnalyticsTitle')}</h1>
            <p>{isAdmin ? t('platformAnalyticsSubtitleAdmin') : t('platformAnalyticsSubtitle')}</p>
          </div>
        </section>

        {isAdmin ? (
          <section className="platform-analytics-summary-grid">
            {summaryCards.map((card) => (
              <article key={card.label} className="platform-analytics-summary-card">
                <p>{card.label}</p>
                <strong>{statsLoading ? '…' : formatStatValue(card.value) ?? '—'}</strong>
              </article>
            ))}
          </section>
        ) : null}

        <section className="platform-analytics-category-grid">
          {categories.map((category) => (
            <AnalyticsCategoryCard
              key={category.key}
              title={category.title}
              desc={category.desc}
              to={category.to}
              cta={category.cta}
              tone={category.tone}
              stat={category.stat}
              loading={statsLoading}
            />
          ))}
        </section>
      </div>
    </AppLayout>
  );
}
