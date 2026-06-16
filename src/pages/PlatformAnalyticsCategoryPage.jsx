import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, LayoutList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { AnalyticsBarCard, AnalyticsPieCard } from '../components/analytics/PlatformAnalyticsCharts';
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

  const totalTablePages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE;
    return rows.slice(start, start + TABLE_PAGE_SIZE);
  }, [rows, tablePage]);

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

  const tableStart = rows.length ? (tablePage - 1) * TABLE_PAGE_SIZE + 1 : 0;
  const tableEnd = Math.min(tablePage * TABLE_PAGE_SIZE, rows.length);

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

            <section ref={tableSectionRef} className="platform-analytics-table-section">
              <div className="platform-analytics-table-section__head">
                <h2>{t('platformAnalyticsListingsTitle')}</h2>
                <span>{t('platformAnalyticsListingsCount', { count: rows.length })}</span>
              </div>

              {rows.length === 0 ? (
                <p className="platform-analytics-table-section__empty">{t('platformAnalyticsNoListings')}</p>
              ) : (
                <>
                  <div className="platform-analytics-table-wrap">
                    <table className="platform-analytics-table">
                      <thead>
                        <tr>
                          <th className="platform-analytics-table__serial">{t('platformAnalyticsColSerial')}</th>
                          {columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, rowIndex) => (
                          <tr key={row.id}>
                            <td className="platform-analytics-table__serial">
                              {(tablePage - 1) * TABLE_PAGE_SIZE + rowIndex + 1}
                            </td>
                            {columns.map((column) => (
                              <td key={`${row.id}-${column.key}`}>{formatCellValue(row[column.key], column)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="platform-analytics-table-footer">
                    <p>
                      {t('platformAnalyticsTableRange', {
                        start: tableStart,
                        end: tableEnd,
                        total: rows.length,
                      })}
                    </p>
                    <div className="platform-analytics-pagination">
                      <button
                        type="button"
                        className="platform-analytics-pagination__btn"
                        onClick={() => setTablePage((page) => Math.max(1, page - 1))}
                        disabled={tablePage <= 1}
                        aria-label={t('platformAnalyticsPreviousPage')}
                      >
                        <ChevronLeft size={16} aria-hidden />
                      </button>
                      {Array.from({ length: totalTablePages }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          className={`platform-analytics-pagination__page${page === tablePage ? ' is-active' : ''}`}
                          onClick={() => setTablePage(page)}
                          aria-current={page === tablePage ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="platform-analytics-pagination__btn"
                        onClick={() => setTablePage((page) => Math.min(totalTablePages, page + 1))}
                        disabled={tablePage >= totalTablePages}
                        aria-label={t('platformAnalyticsNextPage')}
                      >
                        <ChevronRight size={16} aria-hidden />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
