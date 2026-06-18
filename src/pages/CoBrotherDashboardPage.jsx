import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { coBrotherAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';

const STATUS_COLORS = {
  PAYMENT_PENDING:   '#c8a96e',
  FORWARDED:         '#a06ec8',
  ACCEPTED:          '#6ec896',
  REJECTED:          '#c86e6e',
  CANCELLED:         '#666',
};

export default function CoBrotherDashboardPage() {
  const { t } = useTranslation();
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [respondId, setRespondId] = useState(null);

  const load = () => {
    setLoading(true);
    coBrotherAPI.getRequests()
      .then(({ data }) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRespond = async (id, accepted, note) => {
    try {
      await coBrotherAPI.respond(id, accepted, note);
      setRespondId(null);
      load();
    } catch (e) {
      alert(e.response?.data || t('coBrotherDashboardFailedRespond'));
    }
  };

  const pending   = requests.filter(r => r.status === 'FORWARDED');
  const completed = requests.filter(r => r.status !== 'FORWARDED');

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{t('coBrotherDashboardPageTitle')}</h1>
            <p className="text-gray-600 mt-1">{t('coBrotherDashboardPageSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label={t('coBrotherDashboardStatTotal')} value={requests.length} icon="◆" />
          <StatCard label={t('coBrotherDashboardStatPending')} value={pending.length} icon="⏳" color="#a06ec8" />
          <StatCard label={t('coBrotherDashboardStatAccepted')} value={requests.filter(r => r.status === 'ACCEPTED').length}
                    icon="✓" color="#6ec896" />
          <StatCard label={t('coBrotherDashboardStatRejected')} value={requests.filter(r => r.status === 'REJECTED').length}
                    icon="✕" color="#c86e6e" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">◆</div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{t('coBrotherDashboardNoRequests')}</h3>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-8">
                <h3 className="text-purple-600 mb-4 text-sm font-semibold uppercase tracking-wider">
                  {t('coBrotherDashboardPendingResponse')}
                </h3>
                <div className="flex flex-col gap-3">
                  {pending.map(r => (
                    <RequestCard key={r.id} request={r}
                      onRespond={() => setRespondId(r.id)} />
                  ))}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <h3 className="text-gray-500 mb-4 text-sm font-semibold uppercase tracking-wider">
                  {t('coBrotherDashboardCompleted')}
                </h3>
                <div className="flex flex-col gap-3">
                  {completed.map(r => <RequestCard key={r.id} request={r} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {respondId && (
        <RespondModal
          request={requests.find(r => r.id === respondId)}
          onRespond={handleRespond}
          onClose={() => setRespondId(null)}
        />
      )}
    </AppLayout>
  );
}

function RequestCard({ request, onRespond }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLORS[request.status] || '#888';

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem', cursor: 'pointer' }}
           onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#e0e0f0' }}>{request.entityTitle}</div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.2rem' }}>
            {request.requestType}
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor }}>
          {request.status?.replace(/_/g, ' ')}
        </span>
        <span style={{ color: '#666', fontSize: '0.85rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
                        marginBottom: '1rem' }}>
            <ContactBlock label={t('coBrotherDashboardLister')}
              name={request.listerName} email={request.listerEmail}
              phone={request.listerPhone} />
            <ContactBlock label={t('coBrotherDashboardApplicantBuyer')}
              name={request.applicantName} email={request.applicantEmail}
              phone={request.applicantPhone} />
          </div>

          {request.coBrotherNote && (
            <div style={{ fontSize: '0.82rem', color: '#a0a0b0', marginBottom: '0.75rem' }}>
              <strong>{t('coBrotherDashboardYourNote')}</strong> {request.coBrotherNote}
            </div>
          )}

          {request.status === 'FORWARDED' && onRespond && (
            <button className="btn-primary btn-sm" onClick={onRespond}>
              {t('coBrotherDashboardRespond')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ContactBlock({ label, name, email, phone }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#888',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#e0e0f0' }}>{name || '—'}</div>
      <div style={{ fontSize: '0.78rem', color: '#888' }}>{email || '—'}</div>
      <div style={{ fontSize: '0.78rem', color: '#888' }}>{phone || '—'}</div>
    </div>
  );
}

function RespondModal({ request, onRespond, onClose }) {
  const { t } = useTranslation();
  const [note, setNote]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (accepted) => {
    setLoading(true);
    await onRespond(request.id, accepted, note);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div className="modal-glow" />
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-badge">{t('coBrotherDashboardRespondTitle')}</div>
          <h2>{request?.entityTitle}</h2>
          <p>{request?.requestType} · {request?.listerName}</p>
        </div>

        <div className="form-group" style={{ margin: '1.5rem 0' }}>
          <label style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.5rem',
                          display: 'block' }}>{t('coBrotherDashboardNoteOptional')}</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder={t('coBrotherDashboardNotePlaceholder')} rows={3}
            style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={() => handle(true)}
            disabled={loading} style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : t('coBrotherDashboardAccept')}
          </button>
          <button className="btn-danger" onClick={() => handle(false)}
            disabled={loading} style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : t('coBrotherDashboardReject')}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = '#e0e0f0' }) {
  return (
    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 12, transition: 'all 0.35s ease' }}
         className="card-glow-hover">
      <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color,
                    fontFamily: 'Inter, system-ui, sans-serif' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}
