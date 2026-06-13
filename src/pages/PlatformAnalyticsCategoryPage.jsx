import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { AnalyticsBarCard, AnalyticsPieCard } from '../components/analytics/PlatformAnalyticsCharts';
import { useAuth } from '../context/AuthContext';
import {
  buildCategoryCharts,
  fetchPlatformAnalyticsRows,
  getCategoryTableColumns,
  getCategoryTitle,
  isAnalyticsCategory,
} from '../utils/platformAnalyticsData';

function formatCellValue(value, column) {
  if (column.format) return column.format(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return '—';
  return value;
}

export default function PlatformAnalyticsCategoryPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const roleUpper = (user?.role ?? '').toString().toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'ROLE_ADMIN';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        if (!cancelled) setRows(data);
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
              <article className="platform-analytics-summary-card">
                <p>{t('platformAnalyticsTotalListings')}</p>
                <strong>{rows.length.toLocaleString()}</strong>
              </article>
              <article className="platform-analytics-summary-card">
                <p>{t('platformAnalyticsTotalViews')}</p>
                <strong>{rows.reduce((sum, row) => sum + Number(row.views || 0), 0).toLocaleString()}</strong>
              </article>
            </section>

            <section className="platform-analytics-chart-grid">
              <AnalyticsPieCard title={chartTitles.distribution} data={charts.distribution} />
              <AnalyticsPieCard title={chartTitles.secondary} data={charts.secondary} />
              <AnalyticsBarCard title={chartTitles.views} data={charts.views} />
            </section>

            <section className="platform-analytics-table-section">
              <div className="platform-analytics-table-section__head">
                <h2>{t('platformAnalyticsListingsTitle')}</h2>
                <span>{t('platformAnalyticsListingsCount', { count: rows.length })}</span>
              </div>

              {rows.length === 0 ? (
                <p className="platform-analytics-table-section__empty">{t('platformAnalyticsNoListings')}</p>
              ) : (
                <div className="platform-analytics-table-wrap">
                  <table className="platform-analytics-table">
                    <thead>
                      <tr>
                        {columns.map((column) => (
                          <th key={column.key}>{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          {columns.map((column) => (
                            <td key={`${row.id}-${column.key}`}>{formatCellValue(row[column.key], column)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
