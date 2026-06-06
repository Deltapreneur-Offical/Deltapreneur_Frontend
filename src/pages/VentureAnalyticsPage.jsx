import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { analyticsAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import { asArray } from '../utils/asArray';
import { unwrapApiData } from '../utils/apiResponse';

const COLORS = ['#c8a96e', '#6ec896', '#6e9ec8', '#c86e6e', '#9ec86e', '#c86ec8', '#6ec8c8', '#c8c86e'];

function normalizeAnalyticsPayload(response) {
  const source = unwrapApiData(response) || {};
  return {
    totalViews: Number(source?.totalViews ?? source?.total_views ?? 0),
    totalApplications: Number(source?.totalApplications ?? source?.total_applications ?? 0),
    conversionRate: Number(source?.conversionRate ?? source?.conversion_rate ?? 0),
    avgHoursToApply: Number(source?.avgHoursToApply ?? source?.avg_hours_to_apply ?? 0),
    viewsByDay: source?.viewsByDay ?? source?.views_by_day ?? {},
    byIndustry: source?.byIndustry ?? source?.by_industry ?? {},
    byRole: source?.byRole ?? source?.by_role ?? {},
    applicantSkills: source?.applicantSkills ?? source?.applicant_skills ?? {},
    byStatus: source?.byStatus ?? source?.by_status ?? {},
  };
}

const StatCard = ({ label, value, sub, color = '#c8a96e' }) => (
  <div className="card-glow-hover p-6 bg-white border border-gray-200 rounded-xl flex flex-col gap-1.5">
    <div className="text-xs text-gray-600 font-semibold uppercase tracking-wider">{label}</div>
    <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
    {sub && <div className="text-sm text-gray-500">{sub}</div>}
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
    <div className="text-sm font-semibold text-gray-300 mb-5">{title}</div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3.5 py-2.5 text-xs">
      <div className="text-gray-500 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#c8a96e' }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

export default function VentureAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ventures, setVentures]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    analyticsAPI.getMyVentures()
      .then(({ data }) => {
        const list = asArray(data);
        setVentures(list);
        if (list.length > 0) setSelected(list[0].id);
      })
      .catch(() => setError(t('ventureAnalyticsLoadVenturesFailed')))
      .finally(() => setFetching(false));
  }, [t]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true); setError('');
    analyticsAPI.getVentureAnalytics(selected)
      .then((response) => setAnalytics(normalizeAnalyticsPayload(response)))
      .catch(() => setError(t('ventureAnalyticsLoadFailed')))
      .finally(() => setLoading(false));
  }, [selected, t]);

  const viewsData = analytics
    ? Object.entries(analytics.viewsByDay).map(([date, count]) => ({ date, Views: count }))
    : [];

  const industryData = analytics
    ? Object.entries(analytics.byIndustry).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];

  const roleData = analytics
    ? Object.entries(analytics.byRole).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];

  const skillsData = analytics
    ? Object.entries(analytics.applicantSkills)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : [];

  const statusData = analytics
    ? Object.entries(analytics.byStatus).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <AppLayout>
<div className="flex items-start justify-between mb-6">
  <div>
    <h1 className="font-display text-4xl font-bold text-gray-900 m-0">
      {t('ventureAnalyticsTitle')}
    </h1>

    <p className="text-gray-600 mt-1 font-medium">
      {t('ventureAnalyticsSubtitle')}
    </p>
  </div>

  <button
    className="btn-glow btn-glow-sm"
    onClick={() => navigate('/ventures')}
  >
    {t('ventureAnalyticsBack')}
  </button>
</div>


        {/* Venture selector */}
        {!fetching && ventures.length > 0 && (
          <div className="mb-8 flex gap-2 flex-wrap">
            {ventures.map(v => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`btn-glow btn-glow-sm ${
                  selected === v.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : ''
                }`}
              >
                {v.brandDetails?.brandName || t('ventureAnalyticsVentureFallback', { id: v.id })}
              </button>
            ))}
          </div>
        )}

        {fetching || loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : error ? (
          <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        ) : !analytics ? null : (
          <div className="flex flex-col gap-6">

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label={t('ventureAnalyticsTotalViews')} value={analytics.totalViews} sub={t('profileAnalyticsAllTime')} />
              <StatCard label={t('ventureAnalyticsApplications')} value={analytics.totalApplications} sub={t('profileAnalyticsAllTime')} color="#6ec896" />
              <StatCard label={t('ventureAnalyticsConversionRate')} value={`${analytics.conversionRate}%`} sub={t('ventureAnalyticsViewsToApplications')} color="#6e9ec8" />
              <StatCard label={t('ventureAnalyticsAvgTimeToApply')} value={`${analytics.avgHoursToApply}h`} sub={t('ventureAnalyticsAfterFirstView')} color="#c86e6e" />
            </div>

            {/* Views over time */}
            <ChartCard title={t('ventureAnalyticsViews30Days')}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={viewsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }}
                    tickFormatter={v => v.split(' ')[1] ? v : v} interval={4} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Views" stroke="#c8a96e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Two column: industry + role */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title={t('ventureAnalyticsViewerIndustries')}>
                {industryData.length === 0 ? (
                  <div className="text-gray-600 text-sm text-center py-8">{t('profileAnalyticsNoData')}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={industryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title={t('ventureAnalyticsViewerRoles')}>
                {roleData.length === 0 ? (
                  <div className="text-gray-600 text-sm text-center py-8">{t('profileAnalyticsNoData')}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={roleData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#a0a0b0', fontSize: 11 }} width={90} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#6e9ec8" radius={[0, 4, 4, 0]} name={t('profileAnalyticsViewers')} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Applicant skills */}
            <ChartCard title={t('ventureAnalyticsTopSkills')}>
              {skillsData.length === 0 ? (
                <div className="text-gray-600 text-sm text-center py-8">{t('ventureAnalyticsNoApplicants')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={skillsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#a0a0b0', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={t('ventureAnalyticsApplicants')} radius={[4, 4, 0, 0]}>
                      {skillsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Application status */}
            <ChartCard title={t('ventureAnalyticsStatusBreakdown')}>
              {statusData.length === 0 ? (
                <div className="text-gray-600 text-sm text-center py-8">{t('ventureAnalyticsNoApplications')}</div>
              ) : (
                <div className="flex gap-4 flex-wrap">
                  {statusData.map((s, i) => {
                    const meta = { PENDING: { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' }, APPROVED: { color: '#6ec896', bg: 'rgba(110,200,150,0.12)' }, REJECTED: { color: '#c86e6e', bg: 'rgba(200,110,110,0.12)' } };
                    const m = meta[s.name] || { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' };
                    return (
                      <div key={i} className="px-6 py-4 rounded-[10px] min-w-[120px] text-center" style={{ background: m.bg }}>
                        <div className="text-[1.75rem] font-bold font-mono" style={{ color: m.color }}>{s.value}</div>
                        <div className="text-sm text-gray-500 mt-1">{s.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>

          </div>
        )}
{!fetching && ventures.length === 0 && (
  <div className="flex items-center justify-center h-[75vh]">
    <div className="text-center">
      <div className="text-6xl mb-4">📊</div>

      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
        {t('ventureAnalyticsEmptyTitle')}
      </h3>

      <p className="text-gray-600 mb-6">
        {t('ventureAnalyticsEmptyDesc')}
      </p>

      <button
        className="btn-glow"
        onClick={() => navigate('/ventures/new')}
      >
        {t('ventureAnalyticsListVenture')}
      </button>
    </div>
  </div>
)}


</AppLayout>
);
}