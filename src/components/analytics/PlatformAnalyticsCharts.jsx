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
import {
  ANALYTICS_CHART,
  BAR_CHART_COLORS,
  getPieChartColor,
} from '../../constants/analyticsChartTheme';
import { pieDataWithPercentages } from '../../utils/platformAnalyticsData';

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
                  innerRadius={62}
                  outerRadius={84}
                  paddingAngle={1}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={getPieChartColor(index, chartData.length)}
                    />
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
                  style={{ backgroundColor: getPieChartColor(index, chartData.length) }}
                  aria-hidden
                />
                <span className="platform-analytics-pie-legend__label">{entry.name}</span>
                <span className="platform-analytics-pie-legend__leader" aria-hidden />
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
          <BarChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ANALYTICS_CHART.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: ANALYTICS_CHART.axisBar, fontSize: 11 }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={64}
              axisLine={{ stroke: ANALYTICS_CHART.border }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: ANALYTICS_CHART.axisBar, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Bar dataKey={dataKey} radius={[8, 8, 0, 0]} maxBarSize={44}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={BAR_CHART_COLORS[index % BAR_CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
