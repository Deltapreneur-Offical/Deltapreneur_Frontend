import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { technologyAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { isListingOwner } from '../utils/listingVisibility';
import AppLayout from '../components/layout/AppLayout';
import useCurrency from '../context/CurrencyContext';

function normalizeTechnologyAnalytics(payload) {
  const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  return {
    softwareName: source?.softwareName ?? source?.software_name ?? 'Software',
    totalViews: Number(source?.totalViews ?? 0),
    totalSales: Number(source?.totalSales ?? 0),
    totalRevenue: Number(source?.totalRevenue ?? 0),
    completionStatus: source?.completionStatus ?? source?.completion_status ?? 'N/A',
    viewsByDay: source?.viewsByDay && typeof source.viewsByDay === 'object' ? source.viewsByDay : {},
    byIndustry: source?.byIndustry && typeof source.byIndustry === 'object' ? source.byIndustry : {},
    byRole: source?.byRole && typeof source.byRole === 'object' ? source.byRole : {},
  };
}

export default function CoCreationAnalyticsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (authLoading || !id) return;
    setLoading(true);
    setError('');

    technologyAPI.get(id)
      .then(({ data: softwareRes }) => {
        const software = softwareRes?.data ?? softwareRes;
        if (!isListingOwner(software, user, 'technology')) {
          setError(t('listingDetailAccessDenied', 'This listing is not available to view yet.'));
          setData(null);
          return null;
        }
        return technologyAPI.getAnalytics(id);
      })
      .then((analyticsRes) => {
        if (!analyticsRes) return;
        setData(normalizeTechnologyAnalytics(analyticsRes.data));
      })
      .catch(() => setError(t('cocreationAnalyticsLoadFailed')))
      .finally(() => setLoading(false));
  }, [id, user, authLoading, t]);

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div></AppLayout>;
  if (error)   return <AppLayout><div className="text-center py-20"><p className="text-red-600">{error}</p></div></AppLayout>;
  if (!data)   return null;

  const displayName = data.softwareName === 'Software' ? t('cocreationAnalyticsDefaultName') : data.softwareName;
  const viewEntries   = Object.entries(data.viewsByDay   || {});
  const industryEntries = Object.entries(data.byIndustry || {});
  const roleEntries   = Object.entries(data.byRole       || {});

  const maxViews = Math.max(...viewEntries.map(([, v]) => v), 1);

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{displayName}</h1>
            <p className="text-gray-600 mt-1">{t('cocreationAnalyticsOverview')}</p>
          </div>
          <button className="btn-glow btn-glow-sm" onClick={() => navigate('/technology/dashboard')}>
            {t('cocreationAnalyticsBackDashboard')}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label={t('cocreationAnalyticsTotalViews')}   value={data.totalViews}   icon="👁"  color="#c8a96e" />
          <StatCard label={t('cocreationAnalyticsTotalSales')}   value={data.totalSales}   icon="💰"  color="#6ec896" />
          <StatCard label={t('cocreationAnalyticsTotalRevenue')} value={formatPrice(data.totalRevenue)} icon="📈" color="#6ec896" />
          <StatCard label={t('cocreationAnalyticsStatus')} value={data.completionStatus || 'N/A'} icon="⟁" color="#a0a0b0" />
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitle}>{t('cocreationAnalyticsViews30Days')}</h3>
          {viewEntries.every(([, v]) => v === 0) ? (
            <p style={{ color: '#666', fontSize: '0.875rem' }}>{t('cocreationAnalyticsNoViews')}</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 100, overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {viewEntries.map(([day, count]) => (
                <div key={day} title={`${day}: ${count}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 18 }}>
                  <div style={{ width: 14, height: `${(count / maxViews) * 80}px`, minHeight: count > 0 ? 4 : 0,
                                background: count > 0 ? '#c8a96e' : 'rgba(255,255,255,0.06)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                  {viewEntries.length <= 14 && (
                    <span style={{ fontSize: '0.55rem', color: '#666', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>{day}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={sectionStyle}>
            <h3 style={sectionTitle}>{t('cocreationAnalyticsByIndustry')}</h3>
            {industryEntries.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.875rem' }}>{t('cocreationAnalyticsNoData')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {industryEntries.sort((a, b) => b[1] - a[1]).map(([industry, count]) => {
                  const total = industryEntries.reduce((s, [, c]) => s + c, 0);
                  const pct   = Math.round((count / total) * 100);
                  return (
                    <div key={industry}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#c0c0d0' }}>{industry}</span>
                        <span style={{ color: '#c8a96e' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#c8a96e', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitle}>{t('cocreationAnalyticsByRole')}</h3>
            {roleEntries.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.875rem' }}>{t('cocreationAnalyticsNoData')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {roleEntries.sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                  const total = roleEntries.reduce((s, [, c]) => s + c, 0);
                  const pct   = Math.round((count / total) * 100);
                  return (
                    <div key={role}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#c0c0d0' }}>{role.replace(/_/g, ' ')}</span>
                        <span style={{ color: '#6ec896' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#6ec896', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 12, transition: 'all 0.35s ease', cursor: 'default' }}
         className="card-glow-hover">
      <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color, fontFamily: 'Inter, system-ui, sans-serif' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

const sectionStyle = {
  padding: '1.25rem', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: '1rem'
};

const sectionTitle = {
  fontSize: '0.85rem', fontWeight: 600, color: '#888',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem'
};
