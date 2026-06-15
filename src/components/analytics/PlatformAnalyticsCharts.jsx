import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import AnalyticsChartTooltip from './AnalyticsChartTooltip';

const COLORS = ['#6366f1', '#16a34a', '#2563eb', '#ea580c', '#7c3aed', '#0891b2', '#db2777', '#ca8a04'];

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function AnalyticsPieCard({ title, data }) {
  const chartData = (data ?? []).filter((item) => safeNumber(item.value) > 0);
  if (!chartData.length) {
    return (
      <article className="platform-analytics-chart-card">
        <h3>{title}</h3>
        <p className="platform-analytics-chart-card__empty">No data yet</p>
      </article>
    );
  }

  return (
    <article className="platform-analytics-chart-card">
      <h3>{title}</h3>
      <div className="platform-analytics-chart-card__body">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={84}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Legend verticalAlign="bottom" height={48} />
          </PieChart>
        </ResponsiveContainer>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={70} />
            <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Bar dataKey={dataKey} fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
