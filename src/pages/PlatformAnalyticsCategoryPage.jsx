import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, LayoutList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { AnalyticsBarCard, AnalyticsPieCard } from '../components/analytics/PlatformAnalyticsCharts';
import PlatformAnalyticsListingsTable from '../components/analytics/PlatformAnalyticsListingsTable';
import {
  DomainAnalyticsActivitySection,
  DomainAnalyticsTopDomainsSection,
} from '../components/analytics/DomainAnalyticsSections';
import { useAuth } from '../context/AuthContext';
import {
  buildCategoryCharts,
  fetchPlatformAnalyticsRows,
  getCategoryTableColumns,
  getCategoryTitle,
  isAnalyticsCategory,
} from '../utils/platformAnalyticsData';

const TABLE_PAGE_SIZE = 10;

export default function PlatformAnalyticsCategoryPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const tableSectionRef = useRef(null);
  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'ROLE_ADMIN';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tablePage, setTablePage] = useState(1);

  useEffect(() => {
    if (!isAnalyticsCategory(category)) {
      navigate('/analytics', { replace: true });
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchPlatformAnalyticsRows(category, isAdmin)
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setTablePage(1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setError(t('platformAnalyticsLoadFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, isAdmin, navigate, t]);

  const charts = useMemo(() => buildCategoryCharts(category, rows), [category, rows]);
  const columns = useMemo(() => getCategoryTableColumns(category, isAdmin, t), [category, isAdmin, t]);
  const title = getCategoryTitle(category, t);
  const isDomains = category === 'domains';
  const totalViews = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.views || 0), 0),
    [rows],
  );

  const chartTitles = {
    distribution:
      category === 'domains'
        ? t('platformAnalyticsChartDomainStatus')
        : category === 'ventures'
          ? t('platformAnalyticsChartVentureType')
          : category === 'technology'
            ? t('platformAnalyticsChartTechnologyVerified')
            : t('platformAnalyticsChartCreatorCompletion'),
    secondary:
      category === 'domains'
        ? t('platformAnalyticsChartDomainType')
        : category === 'ventures'
          ? t('platformAnalyticsChartVentureVerified')
          : category === 'technology'
            ? t('platformAnalyticsChartTechnologyType')
            : t('platformAnalyticsChartCreatorIndustry'),
    views: t('platformAnalyticsChartTopViews'),
  };

  const scrollToListings = () => {
    tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppLayout>
      <div className="platform-analytics-category w-full max-w-7xl mx-auto flex flex-col gap-6 lg:gap-8 min-w-0">
        <section className="platform-analytics-category__header">
          <Link to="/analytics" className="platform-analytics-hub__back">
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            {t('platformAnalyticsBackToHub')}
          </Link>
          <h1>{title}</h1>
          <p>
            {isAdmin
              ? t('platformAnalyticsCategorySubtitleAdmin', { category: title })
              : t('platformAnalyticsCategorySubtitleUser', { category: title })}
          </p>
        </section>

        {loading ? (
          <div className="platform-analytics-category__loading">{t('platformAnalyticsLoading')}</div>
        ) : error ? (
          <div className="platform-analytics-category__error">{error}</div>
        ) : (
          <>
            <section className="platform-analytics-category__summary">
              <article className="platform-analytics-summary-card platform-analytics-summary-card--enhanced">
                <div className="platform-analytics-summary-card__content">
                  <p>{t('platformAnalyticsTotalListings')}</p>
                  <strong>{rows.length.toLocaleString()}</strong>
                </div>
                <span className="platform-analytics-summary-card__icon" aria-hidden>
                  <LayoutList size={18} strokeWidth={2} />
                </span>
              </article>
              <article className="platform-analytics-summary-card platform-analytics-summary-card--enhanced">
                <div className="platform-analytics-summary-card__content">
                  <p>{t('platformAnalyticsTotalViews')}</p>
                  <strong>{totalViews.toLocaleString()}</strong>
                </div>
                <span className="platform-analytics-summary-card__icon" aria-hidden>
                  <Eye size={18} strokeWidth={2} />
                </span>
              </article>
            </section>

            {isDomains ? (
              <section className="platform-analytics-insights-grid">
                <DomainAnalyticsActivitySection rows={rows} />
                <DomainAnalyticsTopDomainsSection rows={rows} onViewReport={scrollToListings} />
              </section>
            ) : null}

            <section className="platform-analytics-chart-grid">
              <AnalyticsPieCard title={chartTitles.distribution} data={charts.distribution} />
              <AnalyticsPieCard title={chartTitles.secondary} data={charts.secondary} />
              <AnalyticsBarCard title={chartTitles.views} data={charts.views} />
            </section>

            <div ref={tableSectionRef}>
              <PlatformAnalyticsListingsTable
                rows={rows}
                columns={columns}
                category={category}
                tablePage={tablePage}
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={setTablePage}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
