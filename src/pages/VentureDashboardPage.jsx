import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { coVentureAPI, likeAPI, ventureAPI, ventureAuctionAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import VentureGstinVerificationModal from '../components/venture/VentureGstinVerificationModal';
import EditActionLabel from '../components/common/EditActionLabel';
import { asArray } from '../utils/asArray';
import { pickMediaUrl } from '../utils/mediaUrl';

const STATUS_META = {
  PENDING:  { label: 'Pending',  color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', icon: '⏳' },
  APPROVED: { label: 'Approved', color: '#6ec896', bg: 'rgba(110,200,150,0.12)', icon: '✓'  },
  REJECTED: { label: 'Rejected', color: '#c86e6e', bg: 'rgba(200,110,110,0.12)', icon: '✕'  },
};

const TYPE_LABELS = {
  FIFTY_FIFTY: '50:50', SIXTY_FORTY: '60:40', SEVENTY_THIRTY: '70:30',
  EIGHTY_TWENTY: '80:20', NINETY_TEN: '90:10', NEGOTIABLE: 'Negotiable',
};

const AUCTION_STATUS_COLORS = {
  DRAFT:    'text-gray-500',
  ACTIVE:   'text-green-500',
  EXTENDED: 'text-yellow-500',
  ENDED:    'text-purple-500',
  UNSOLD:   'text-red-500',
  CLOSED:   'text-gray-400',
};

export default function VentureDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('listings');

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">Venture Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your venture listings, applications, and auctions.</p>
          </div>
          <button className="btn-glow btn-glow-sm" onClick={() => navigate('/ventures')}>
            ← Back to Ventures
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            className={`btn-glow btn-glow-sm ${tab === 'listings' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setTab('listings')}
          >
            📋 My Listings
          </button>
          <button
            className={`btn-glow btn-glow-sm ${tab === 'likes' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setTab('likes')}
          >
            ❤️ Likes Received
          </button>
          <button
            className={`btn-glow btn-glow-sm ${tab === 'incoming' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setTab('incoming')}
          >
            📥 Incoming Applications
          </button>
          <button
            className={`btn-glow btn-glow-sm ${tab === 'applied' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => setTab('applied')}
          >
            🚀 My Applications
          </button>
        </div>

        {tab === 'listings'  && <MyListings />}
        {tab === 'incoming'  && <IncomingApplications />}
        {tab === 'applied'   && <MyApplications />}
        {tab === 'likes'     && <LikesReceived />}
      </div>
    </AppLayout>
  );
}

// ─── My Listings ──────────────────────────────────────────────────────────────
function MyListings() {
  const navigate = useNavigate();
  const [ventures, setVentures]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [verifyTarget, setVerifyTarget] = useState(null);

  const loadVentures = useCallback(() => {
    ventureAPI.getMyVentures()
      .then(({ data }) => setVentures(asArray(data)))
      .catch(() => setVentures([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    ventureAPI.getMyVentures()
      .then(({ data }) => setVentures(asArray(data)))
      .catch(() => setVentures([]))
      .finally(() => setLoading(false));
  }, []);

  const handleVerified = (ventureId) => {
    loadVentures();
    setVerifyTarget(null);
    const venture = ventures.find(v => v.id === ventureId);
    if (venture?.auction?.id) navigate(`/venture-auction/${venture.auction.id}`);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;

  if (ventures.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">📋</div>
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No ventures listed yet</h3>
      <p className="text-gray-600 mb-4">List your first venture to start finding co-founders and collaborators.</p>
      <button className="btn-glow" onClick={() => navigate('/ventures')}>
        List a Venture
      </button>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        {ventures.map(v => (
          <VentureListingRow
            key={v.id}
            venture={v}
            onVerify={() => setVerifyTarget(v)}
            onViewAuction={auctionId => navigate(`/venture-auction/${auctionId}`)}
            onListingChanged={loadVentures}
          />
        ))}
      </div>

      {verifyTarget && (
        <VentureGstinVerificationModal
          venture={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => handleVerified(verifyTarget.id)}
        />
      )}
    </>
  );
}

function VentureListingRow({ venture, onVerify, onViewAuction, onListingChanged }) {
  const { formatPrice } = useCurrency();
  const navigate   = useNavigate();
  const b          = venture.brandDetails || {};
  const isAuction  = venture.saleType === 'AUCTION';
  const auction    = venture.auction;
  const auctionId  = auction?.id;
  const isInactive = venture.status === false;
  const isGstinVerified = Boolean(venture.verified || venture.gstinVerified);

  const handleReactivate = async () => {
    try {
      await ventureAPI.setActive(venture.id, true);
      onListingChanged?.();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Could not reactivate this listing.');
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl flex-wrap gap-2 shadow-sm">
      <div>
        <div className="font-semibold text-gray-900 flex items-center gap-2">
          {b.brandName || '—'}
          {isAuction ? (
            <span className="text-[0.72rem] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
              🔨 Auction
            </span>
          ) : (
            <span className="text-[0.72rem] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              🤝 Regular
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {b.industry?.replace(/_/g, ' ')}
          {venture.stage && ` · ${venture.stage.replace(/_/g, ' ')}`}
          {isAuction && auction && (
            <span className={`ml-2 ${AUCTION_STATUS_COLORS[auction.status] || 'text-gray-500'}`}>
              · Auction: {auction.status}
              {(auction.status === 'ACTIVE' || auction.status === 'EXTENDED') &&
                ` · ${auction.totalBids} bid${auction.totalBids !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
          venture.status
            ? 'text-green-600 bg-green-50 border border-green-200'
            : 'text-gray-500 bg-gray-50 border border-gray-200'
        }`}>
          {venture.status ? '● Active' : '○ Inactive'}
        </span>

        {isGstinVerified && (
          <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md">
            ✓ GSTIN Verified
          </span>
        )}

        {venture.takenDown && (
          <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
            ⚠ Taken Down
          </span>
        )}

        {isAuction && auction?.currentHighestBid > 0 && (
          <span className="text-sm font-bold text-green-600">
            Top: {formatPrice(auction.currentHighestBid)}
          </span>
        )}
        {isAuction && auction?.minBidPrice > 0 && !auction?.currentHighestBid && (
          <span className="text-sm font-bold text-yellow-600">
            Min: {formatPrice(auction.minBidPrice)}
          </span>
        )}

        {isAuction && auctionId && auction.status !== 'DRAFT' && (
          <button className="btn-glow btn-glow-sm"
            onClick={() => onViewAuction(auctionId)}>
            🔨 View Auction →
          </button>
        )}

        {!isGstinVerified && !isInactive && (!isAuction || auction?.status === 'DRAFT') && (
          <button className="btn-glow btn-glow-sm"
            onClick={onVerify}>
            {isAuction ? '🔍 Verify GSTIN (Starts Auction)' : '🔍 Verify GSTIN'}
          </button>
        )}

        {isInactive && (
          <>
            <button className="btn-glow btn-glow-sm" onClick={handleReactivate}>
              List again
            </button>
            <button type="button" className="btn-glow btn-glow-sm inline-flex items-center justify-center" onClick={() => navigate(`/ventures/${venture.id}/edit`)}>
              <EditActionLabel iconSize={16}>Edit</EditActionLabel>
            </button>
          </>
        )}

        {!isAuction && !isInactive && (
          <span className="text-xs text-gray-500">
            {venture.coVentureApplicationCount || 0} application{venture.coVentureApplicationCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Incoming Applications (to MY ventures) ───────────────────────────────────
function IncomingApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId]     = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    coVentureAPI.getMyVentureApplications(statusFilter || undefined)
      .then(({ data }) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (appId, newStatus) => {
    setActionLoading(appId + newStatus);
    try {
      await coVentureAPI.updateStatus(appId, newStatus);
      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setActionLoading(null);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Applicant Name', 'Phone', 'Location', 'GST No', 'Venture', 'Status', 'Applied For', 'How can the User Help?'],
      ...applications.map(a => [
        a.fullName || '',
        a.phone || '',
        a.location || '',
        a.gstNo || '',
        a.venture?.brandDetails?.brandName || '',
        a.status || '',
        TYPE_LABELS[a.venture?.brandDetails?.ventureType] || '',
        a.description || '',
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'coventure-applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = applications.reduce((acc, app) => {
    const name = app.venture?.brandDetails?.brandName || 'Unknown Venture';
    if (!acc[name]) acc[name] = [];
    acc[name].push(app);
    return acc;
  }, {});

  return (
    <div>
      {/* Controls */}
      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              className={`btn-glow btn-glow-sm ${statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === '' ? 'All' : STATUS_META[s].label}
            </button>
          ))}
        </div>
        <button
          className="btn-glow btn-glow-sm ml-auto"
          onClick={exportCSV}
          disabled={applications.length === 0}
        >
          ↓ Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
      ) : applications.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No applications yet</h3>
          <p className="text-gray-600">When someone applies to your ventures, they'll appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([ventureName, apps]) => (
            <div key={ventureName}>
              <h3 className="text-gray-900 mb-3 text-base font-semibold">
                {ventureName}
                <span className="ml-2 text-gray-600 font-normal text-sm">
                  ({apps.length} application{apps.length !== 1 ? 's' : ''})
                </span>
              </h3>
              <div className="flex flex-col gap-3">
                {apps.map(app => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    expanded={expandedId === app.id}
                    onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    onApprove={() => handleStatusUpdate(app.id, 'APPROVED')}
                    onReject={() => handleStatusUpdate(app.id, 'REJECTED')}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app, expanded, onToggle, onApprove, onReject, actionLoading }) {
  const s = STATUS_META[app.status] || STATUS_META.PENDING;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="w-[38px] h-[38px] rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600 text-base flex-shrink-0">
          {app.fullName?.[0]?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{app.fullName || 'Unknown'}</div>
          <div className="text-xs text-gray-500">
            {app.phone || '—'}{app.location ? ` · ${app.location}` : ''}
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0"
          style={{ background: s.bg, color: s.color }}>
          {s.icon} {s.label}
        </div>

        <span className="text-gray-500 text-sm flex-shrink-0">
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Detail label="Full Name" value={app.fullName} />
            <Detail label="Phone" value={app.phone} />
            <Detail label="Location" value={app.location} />
            <Detail label="GST No" value={app.gstNo || 'Not provided'} />
            <Detail label="How can the User Help?" value={app.description} />
          </div>

          {app.status === 'PENDING' && (
            <div className="flex gap-3 mt-2">
              <button
                className="btn-glow btn-glow-sm flex items-center gap-2"
                onClick={onApprove}
                disabled={actionLoading !== null}
              >
                {actionLoading === app.id + 'APPROVED' ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" /> : '✓ Approve'}
              </button>
              <button
                className="px-4 py-2 bg-red-500 border border-red-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={onReject}
                disabled={actionLoading !== null}
              >
                {actionLoading === app.id + 'REJECTED' ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✕ Reject'}
              </button>
            </div>
          )}

          {app.status !== 'PENDING' && (
            <div className="text-xs text-gray-500 mt-1">
              Application has been {app.status.toLowerCase()}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── My Applications (ventures I applied to) ──────────────────────────────────
function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    coVentureAPI.getMyApplications()
      .then(({ data }) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;

  if (applications.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🚀</div>
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No applications yet</h3>
      <p className="text-gray-600">Browse ventures and apply to co-venture with other founders.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {applications.map(app => {
        const b = app.venture?.brandDetails || {};
        const s = STATUS_META[app.status] || STATUS_META.PENDING;
        const brandImage = pickMediaUrl(b);
        return (
          <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 flex-wrap shadow-sm">
            {brandImage
              ? <img src={brandImage} alt={b.brandName} className="w-10 h-10 rounded-lg object-cover" />
              : <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center font-bold text-purple-600">{b.brandName?.[0] || '?'}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{b.brandName || 'Unknown Venture'}</div>
              <div className="text-xs text-gray-500">
                {b.industry?.replace(/_/g, ' ')}{b.ventureType ? ` · ${TYPE_LABELS[b.ventureType] || b.ventureType}` : ''}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: s.bg, color: s.color }}>
              {s.icon} {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-700">{value || '—'}</div>
    </div>
  );
}

function LikesReceived() {
  const [ventures, setVentures] = useState([]);
  const [likeData, setLikeData] = useState({});
  const [loading, setLoading]   = useState(true);

  const mapLikePayload = (payload) => {
    const next = {};
    Object.entries(payload || {}).forEach(([entityId, value]) => {
      const key = String(entityId).toLowerCase();
      if (typeof value === 'number') {
        next[key] = { liked: false, count: value };
        return;
      }
      next[key] = {
        liked: Boolean(value?.liked),
        count: value?.count ?? value?.total_likes ?? 0,
      };
    });
    return next;
  };

  useEffect(() => {
    ventureAPI.getMyVentures()
      .then(async ({ data }) => {
        const list = asArray(data);
        setVentures(list);
        if (list.length > 0) {
          const ids = list.map((v) => String(v.id));
          const response = await likeAPI.bulkStatus('VENTURE', ids);
          setLikeData(mapLikePayload(unwrapApiData(response)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>;

  if (ventures.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">❤️</div>
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No ventures listed yet</h3>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {ventures.map(v => {
        const b = v.brandDetails || {};
        const ls = likeData[String(v.id).toLowerCase()] || { liked: false, count: 0 };
        return (
          <div key={v.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-[10px] flex-wrap gap-2 shadow-sm">
            <div>
              <div className="font-semibold text-gray-900">{b.brandName}</div>
              <div className="text-xs text-gray-500 mt-1">
                {b.industry?.replace(/_/g, ' ')}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-400 font-semibold">
                ❤️ {ls.count} like{ls.count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}