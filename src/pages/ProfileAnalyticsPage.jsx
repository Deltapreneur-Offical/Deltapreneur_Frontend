import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { analyticsAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import CommunityProfileIcon from '../assets/Community-profileicon.png';

const COLORS = ['#c8a96e','#6e9ec8','#6ec896','#c86e6e','#9b6ec8','#c8b06e'];

function normalizeAnalyticsPayload(payload) {
  const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  return {
    totalViews: Number(source?.totalViews ?? 0),
    viewsThisWeek: Number(source?.viewsThisWeek ?? 0),
    viewsByDay: source?.viewsByDay && typeof source.viewsByDay === 'object' ? source.viewsByDay : {},
    byIndustry: source?.byIndustry && typeof source.byIndustry === 'object' ? source.byIndustry : {},
    byRole: source?.byRole && typeof source.byRole === 'object' ? source.byRole : {},
  };
}

const StatCard = ({ label, value, sub, color = '#c8a96e' }) => (
  <div className="card-glow-hover p-6 bg-white border border-gray-200 rounded-xl">
    <div className="text-xs text-gray-600 font-semibold uppercase tracking-wider">{label}</div>
    <div className="text-3xl font-bold font-mono mt-1.5" style={{ color }}>{value}</div>
    {sub && <div className="text-sm text-gray-500 mt-0.5">{sub}</div>}
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="card-glow-hover p-6 bg-white border border-gray-200 rounded-xl">
    <div className="text-sm font-semibold text-gray-900 mb-5">{title}</div>
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

export default function ProfileAnalyticsPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    analyticsAPI.getProfileAnalytics()
      .then(({ data }) => setAnalytics(normalizeAnalyticsPayload(data)))
      .catch(() => setError('No creator profile found. Connect LinkedIn first.'))
      .finally(() => setLoading(false));
  }, []);

  const viewsData = analytics
    ? Object.entries(analytics.viewsByDay).map(([date, count]) => ({ date, Views: count }))
    : [];

  const industryData = analytics
    ? Object.entries(analytics.byIndustry).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];

  const roleData = analytics
    ? Object.entries(analytics.byRole).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];

  return (
    <AppLayout>
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-bold text-gray-900 m-0">Profile Analytics</h1>
            <p className="text-gray-600 mt-1 font-medium">See who's viewing your creator profile.</p>
          </div>
          <button
            type="button"
            className="btn-glow btn-glow-sm shrink-0 self-start"
            onClick={() => navigate('/creator')}
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : error ? (
          <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        ) : !analytics ? null : (
          <div className="flex flex-col gap-6">

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard label="Total Profile Views" value={analytics.totalViews/2} sub="All time" />
              <StatCard label="Views This Week" value={analytics.viewsThisWeek/2} sub="Last 7 days" color="#6ec896" />
            </div>

            {/* Views over time */}
            <ChartCard title={<><img src={CommunityProfileIcon} alt="" className="inline-block w-4 h-4 mr-2 object-contain" />Profile Views Over Last 30 Days</>}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={viewsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fill: '#666', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Views" stroke="#c8a96e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Industry + Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="🏭 Viewer Industries">
                {industryData.length === 0 ? (
                  <div style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>No data yet — get more profile views!</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={industryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="👤 Viewer Roles">
                {roleData.length === 0 ? (
                  <div style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={roleData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#a0a0b0', fontSize: 11 }} width={90} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#6e9ec8" radius={[0, 4, 4, 0]} name="Viewers" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}