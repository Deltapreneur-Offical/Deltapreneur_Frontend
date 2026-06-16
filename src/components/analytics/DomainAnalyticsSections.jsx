import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, ChevronDown } from 'lucide-react';

import AnalyticsChartTooltip from './AnalyticsChartTooltip';
import {
  buildDomainActivitySeries,
  buildTopDomainsRanked,
  computeDomainActivityMetrics,
} from '../../utils/platformAnalyticsData';

const ACTIVITY_TABS = [
  { id: 'views', labelKey: 'platformAnalyticsActivityViews' },
  { id: 'newListings', labelKey: 'platformAnalyticsActivityNewListings' },
  { id: 'sold', labelKey: 'platformAnalyticsActivitySold' },
];

const PERIOD_OPTIONS = [
  { id: 'daily', labelKey: 'platformAnalyticsPeriodDaily' },
  { id: 'weekly', labelKey: 'platformAnalyticsPeriodWeekly' },
  { id: 'monthly', labelKey: 'platformAnalyticsPeriodMonthly' },
];

export function DomainAnalyticsActivitySection({ rows }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('views');
  const [period, setPeriod] = useState('daily');

  const series = useMemo(
    () => buildDomainActivitySeries(rows, activeTab, period),
    [rows, activeTab, period],
  );
  const metrics = useMemo(() => computeDomainActivityMetrics(series), [series]);
  const hasData = series.some((point) => point.value > 0);

  const metricItems = [
    {
      label: t('platformAnalyticsAvgPerDay'),
      value: metrics.avg.toLocaleString(),
    },
    {
      label: t('platformAnalyticsHighest'),
      value: metrics.highest.toLocaleString(),
      detail: metrics.highestLabel,
    },
    {
      label: t('platformAnalyticsLowest'),
      value: metrics.lowest.toLocaleString(),
      detail: metrics.lowestLabel,
    },
    {
      label: t('platformAnalyticsTotal'),
      value: metrics.total.toLocaleString(),
    },
  ];

  return (
    <article className="platform-analytics-activity-card">
      <div className="platform-analytics-activity-card__toolbar">
        <h3>{t('platformAnalyticsDomainActivity')}</h3>
        <div className="platform-analytics-activity-card__controls">
          <div className="platform-analytics-tab-group" role="tablist" aria-label={t('platformAnalyticsDomainActivity')}>
            {ACTIVITY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`platform-analytics-tab${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
          <div className="platform-analytics-period-select">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              aria-label={t('platformAnalyticsPeriodLabel')}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden />
          </div>
        </div>
      </div>

      <div className="platform-analytics-activity-card__chart">
        {!hasData ? (
          <p className="platform-analytics-chart-card__empty">{t('platformAnalyticsActivityEmpty')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={series} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="domainActivityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<AnalyticsChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                fill="url(#domainActivityFill)"
                stroke="none"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={t(ACTIVITY_TABS.find((tab) => tab.id === activeTab)?.labelKey ?? 'platformAnalyticsActivityViews')}
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="platform-analytics-activity-metrics">
        {metricItems.map((item) => (
          <div key={item.label} className="platform-analytics-activity-metric">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.detail ? <small>{item.detail}</small> : null}
          </div>
        ))}
      </div>
    </article>
  );
}

export function DomainAnalyticsTopDomainsSection({ rows, onViewReport }) {
  const { t } = useTranslation();
  const ranked = useMemo(() => buildTopDomainsRanked(rows, 5), [rows]);

  return (
    <article className="platform-analytics-top-domains-card">
      <div className="platform-analytics-top-domains-card__head">
        <h3>{t('platformAnalyticsTopDomains')}</h3>
        <button type="button" className="platform-analytics-link-btn" onClick={onViewReport}>
          {t('platformAnalyticsViewAll')}
        </button>
      </div>

      {!ranked.length ? (
        <p className="platform-analytics-chart-card__empty">{t('platformAnalyticsTopDomainsEmpty')}</p>
      ) : (
        <ul className="platform-analytics-top-domains-list">
          {ranked.map((item) => (
            <li key={item.name} className="platform-analytics-top-domains-item">
              <span className="platform-analytics-top-domains-item__rank">{item.rank}</span>
              <div className="platform-analytics-top-domains-item__body">
                <div className="platform-analytics-top-domains-item__meta">
                  <strong>{item.name}</strong>
                  <span>{item.views.toLocaleString()}</span>
                </div>
                <div className="platform-analytics-top-domains-item__track" aria-hidden>
                  <div
                    className="platform-analytics-top-domains-item__fill"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="platform-analytics-report-btn" onClick={onViewReport}>
        {t('platformAnalyticsViewFullReport')}
        <ArrowRight size={16} aria-hidden />
      </button>
    </article>
  );
}
