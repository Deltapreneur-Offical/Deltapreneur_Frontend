import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import AnalyticsChartTooltip from './AnalyticsChartTooltip';
import { pieDataWithPercentages } from '../../utils/platformAnalyticsData';

const COLORS = ['#6366f1', '#16a34a', '#2563eb', '#ea580c', '#7c3aed', '#0891b2', '#db2777', '#ca8a04'];

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function AnalyticsPieCard({ title, data }) {
  const chartData = pieDataWithPercentages((data ?? []).filter((item) => safeNumber(item.value) > 0));
  if (!chartData.length) {
    return (
      <article className="platform-analytics-chart-card">
        <h3>{title}</h3>
        <p className="platform-analytics-chart-card__empty">No data yet</p>
      </article>
    );
  }

  return (
    <article className="platform-analytics-chart-card platform-analytics-chart-card--pie">
      <h3>{title}</h3>
      <div className="platform-analytics-chart-card__body platform-analytics-chart-card__body--split">
        <div className="platform-analytics-pie-layout">
          <div className="platform-analytics-pie-layout__chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<AnalyticsChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="platform-analytics-pie-legend">
            {chartData.map((entry, index) => (
              <li key={`${entry.name}-${index}`}>
                <span
                  className="platform-analytics-pie-legend__swatch"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden
                />
                <span className="platform-analytics-pie-legend__label">{entry.name}</span>
                <span className="platform-analytics-pie-legend__value">
                  {entry.value} ({entry.percent}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function AnalyticsBarCard({ title, data, dataKey = 'views' }) {
  const chartData = (data ?? []).filter((item) => safeNumber(item[dataKey]) > 0);
  if (!chartData.length) {
    return (
      <article className="platform-analytics-chart-card">
        <h3>{title}</h3>
        <p className="platform-analytics-chart-card__empty">No views recorded yet</p>
      </article>
    );
  }

  return (
    <article className="platform-analytics-chart-card">
      <h3>{title}</h3>
      <div className="platform-analytics-chart-card__body">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={64}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Bar dataKey={dataKey} fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
