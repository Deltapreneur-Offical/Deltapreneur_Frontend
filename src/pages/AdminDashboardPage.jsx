import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { adminAPI, meetingAPI, auctionAPI, communityAuctionAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import VentureIcon from '../assets/Coventure_logo.png';
import DomainsIcon from '../assets/CoBranding.png';
import TechnologyIcon from '../assets/CoCreation.png';
import AuctionIcon from '../assets/Auction.png';
import PurchaseIcon from '../assets/purchase.png';
import RequestIcon from '../assets/Request.png';
import EnquireIcon from '../assets/Enquire.png';
import HomepageFeatureSelector from '../components/admin/HomepageFeatureSelector';
import SoftwareAuctionAdminTab from './SoftwareAuctionAdminTab';
import { softwareAuctionAPI } from '../api/services';
import { asArray, extractAdminList } from '../utils/asArray';
import DomainVerificationModal from './DomainVerificationModal';
import VentureGstinVerificationModal from '../components/venture/VentureGstinVerificationModal';
import { formatAuctionDate, formatAuctionDateTime, parseAuctionDate } from '../utils/auctionDate';


function formatAdminRequestType(type) {
  if (type === 'COCREATION') return 'Technology';
  return type?.replace(/_/g, ' ') ?? type;
}

const verifiedBadgeStyle = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#059669',
  background: 'rgba(5,150,105,0.08)',
  border: '1px solid rgba(5,150,105,0.25)',
  padding: '0.15rem 0.45rem',
  borderRadius: 4,
};

const unverifiedBadgeStyle = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#b45309',
  background: 'rgba(180,83,9,0.08)',
  border: '1px solid rgba(180,83,9,0.25)',
  padding: '0.15rem 0.45rem',
  borderRadius: 4,
};

function VerificationBadge({ verified, verifiedLabel = 'Verified', unverifiedLabel = 'Not verified' }) {
  return verified ? (
    <span style={verifiedBadgeStyle}>✓ {verifiedLabel}</span>
  ) : (
    <span style={unverifiedBadgeStyle}>○ {unverifiedLabel}</span>
  );
}

const STATUS_COLORS = {
  PAYMENT_PENDING:   '#c8a96e',
  PAYMENT_COMPLETED: '#6eadc8',
  FORWARDED:         '#a06ec8',
  ACCEPTED:          '#6ec896',
  REJECTED:          '#c86e6e',
  CANCELLED:         '#666',
};

export default function AdminDashboardPage() {
  const [tab, setTab]                       = useState('ventures');
  const [data, setData]                     = useState([]);
  const [coBrothers, setCoBrothers]         = useState([]);
  const [requests, setRequests]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [forwardModal, setForwardModal]     = useState(null);
  const [takeDownTarget, setTakeDownTarget] = useState(null);
  const [participationFees, setParticipationFees] = useState({
    domainParticipationFeeInr: '',
    ventureParticipationFeeInr: '',
    softwareParticipationFeeInr: '',
    communityParticipationFeeInr: '',
  });
  const [savingFees, setSavingFees] = useState(false);
  const [verifyDomain, setVerifyDomain]   = useState(null);
  const [verifyVenture, setVerifyVenture] = useState(null);
  const [listCount, setListCount]         = useState(null);

  const fetchers = {
    domains:            adminAPI.getDomains,
    'domain-enquiries': adminAPI.getDomainEnquiries,
    cocreations:        adminAPI.getTechnologies,
    auctions:           adminAPI.getAllAuctions,
    'venture-auctions': adminAPI.getAllVentureAuctions,
    meetings:           meetingAPI.adminGetAll, 
    'software-auctions': softwareAuctionAPI.adminGetAll,
    'community-auctions': communityAuctionAPI.adminGetAll,
    'addon-orders':     adminAPI.getAddonOrders,
  };

  const loadTab = (currentTab) => {
    const fetchers = {
      ventures:            adminAPI.getVentures,
      domains:             adminAPI.getDomains,
      'domain-enquiries':  adminAPI.getDomainEnquiries,
      cocreations:         adminAPI.getTechnologies,
      auctions:            adminAPI.getAllAuctions,
      'venture-auctions':  adminAPI.getAllVentureAuctions,
      meetings:            meetingAPI.adminGetAll,
      'software-auctions': softwareAuctionAPI.adminGetAll,
      'community-auctions': communityAuctionAPI.adminGetAll,
      'addon-orders':      adminAPI.getAddonOrders,
    };
  
    if (!fetchers[currentTab]) return;
    setLoading(true);
    fetchers[currentTab]()
      .then(({ data }) => {
        const rows = extractAdminList(data);
        setData(rows);
        setListCount(typeof data?.count === 'number' ? data.count : rows.length);
      })
      .catch((e) => {
        setData([]);
        setListCount(0);
        const detail = e.response?.data?.detail;
        const detailText = Array.isArray(detail)
          ? detail.map((d) => d.msg || d).join(', ')
          : (typeof detail === 'string' ? detail : null);
        const msg = e.response?.data?.error || detailText || e.message || `Failed to load ${currentTab}`;
        alert(msg);
      })
      .finally(() => setLoading(false));
  };
  
  useEffect(() => {
    adminAPI.getCoBrothers()
      .then(({ data }) => setCoBrothers(asArray(data)))
      .catch(() => {});
    adminAPI.getCoBrotherRequests()
      .then(({ data }) => setRequests(asArray(data)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    auctionAPI.getParticipationFees()
      .then(({ data }) => {
        setParticipationFees({
          domainParticipationFeeInr: String(data?.domainParticipationFeeInr ?? ''),
          ventureParticipationFeeInr: String(data?.ventureParticipationFeeInr ?? ''),
          softwareParticipationFeeInr: String(data?.softwareParticipationFeeInr ?? ''),
          communityParticipationFeeInr: String(data?.communityParticipationFeeInr ?? ''),
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadTab(tab);
  }, [tab]);


  const handleForward = async (entityId, type, coBrotherId) => {
    try {
      const { data } = await adminAPI.forward({ entityId, type, coBrotherId });
      alert(data?.message || 'Payment request sent to lister.');
      setForwardModal(null);
      adminAPI.getCoBrotherRequests()
        .then(({ data }) => setRequests(asArray(data)));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to forward.');
    }
  };

  const handleTakeDown = (entityId, type, title) =>
    setTakeDownTarget({ entityId, type, title });

  const confirmTakeDown = async (reason) => {
    try {
      const { data } = await adminAPI.takeDown(takeDownTarget.type, takeDownTarget.entityId, reason);
      if (data?.success === false) {
        alert(data?.error || 'Failed to take down listing.');
        return;
      }
      setTakeDownTarget(null);
      loadTab(tab);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to take down listing.');
    }
  };

  const handleRestore = async (entityId, type) => {
    try {
      const { data } = await adminAPI.restore(type, entityId);
      if (data?.success === false) {
        alert(data?.error || 'Failed to restore listing.');
        return;
      }
      loadTab(tab);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to restore listing.');
    }
  };

  const tabs = [
    { id: 'ventures',           label: 'Ventures',          icon: VentureIcon    },
    { id: 'domains',            label: 'Domains',           icon: DomainsIcon    },
    { id: 'domain-enquiries',   label: 'Domain Enquiries',  icon: EnquireIcon    },
    { id: 'cocreations',        label: 'Technology',        icon: TechnologyIcon },
    { id: 'requests',           label: 'CoBrother Requests',icon: RequestIcon    },
    { id: 'auctions',           label: 'Domain Auctions',   icon: AuctionIcon    },
    { id: 'venture-auctions',   label: 'Venture Auctions',  icon: AuctionIcon    },
    { id: 'meetings',           label: 'Meetings',          icon: null, Icon: Calendar },
    { id: 'homepage-features',  label: 'Homepage Features', icon: PurchaseIcon   },
    { id: 'software-auctions', label: 'Software Auctions', icon: AuctionIcon },
    { id: 'community-auctions', label: 'Creator Auctions', icon: AuctionIcon },
    { id: 'addon-orders',       label: 'Addon Orders', icon: PurchaseIcon     },
  ];

  const handleSaveParticipationFees = async () => {
    setSavingFees(true);
    try {
      await auctionAPI.updateParticipationFees({
        domainParticipationFeeInr: Number(participationFees.domainParticipationFeeInr),
        ventureParticipationFeeInr: Number(participationFees.ventureParticipationFeeInr),
        softwareParticipationFeeInr: Number(participationFees.softwareParticipationFeeInr),
        communityParticipationFeeInr: Number(participationFees.communityParticipationFeeInr),
      });
      alert('Participation fees updated.');
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to update participation fees.');
    } finally {
      setSavingFees(false);
    }
  };

  return (
    <AppLayout>
      <div className="admin-page w-full min-w-0 max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 m-0 break-words">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage all platform activity.</p>
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 -mx-1 sm:mx-0 min-w-0">
          <div className="admin-dashboard-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                className={`admin-dashboard-tab ${tab === t.id ? 'active' : ''}`}
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.icon ? (
                  <img src={t.icon} alt="" className="admin-dashboard-tab-icon" />
                ) : t.Icon ? (
                  <span className="admin-dashboard-tab-lucide" aria-hidden>
                    <t.Icon size={22} strokeWidth={2} />
                  </span>
                ) : (
                  <span className="admin-dashboard-tab-icon-spacer" aria-hidden />
                )}
                <span className="admin-dashboard-tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 text-gray-900 min-w-0 overflow-hidden">
          {(tab === 'auctions' || tab === 'venture-auctions' || tab === 'software-auctions' || tab === 'community-auctions') && (
            <div style={{ marginBottom: '1rem', padding: '0.9rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.6rem' }}>Participation Fees (INR)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px,1fr))', gap: '0.6rem' }}>
                {[
                  ['Domain', 'domainParticipationFeeInr'],
                  ['Venture', 'ventureParticipationFeeInr'],
                  ['Software', 'softwareParticipationFeeInr'],
                  ['Creators', 'communityParticipationFeeInr'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.2rem' }}>{label}</div>
                    <input
                      type="number"
                      min="1"
                      value={participationFees[key]}
                      onChange={(e) => setParticipationFees((p) => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '0.45rem 0.55rem', borderRadius: 8, border: '1px solid #d1d5db' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary btn-sm" onClick={handleSaveParticipationFees} disabled={savingFees}>
                  {savingFees ? 'Saving…' : 'Save Fees'}
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16 md:py-20">
              <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
            </div>
          ) : tab === 'domain-enquiries' ? (
            <DomainEnquiriesTable
              enquiries={data}
              onForward={(entityId, type) => setForwardModal({ entityId, type })}
            />
          ) : tab === 'auctions' ? (
            <AuctionsAdminTable auctions={data} />
          ) : tab === 'venture-auctions' ? (
            <VentureAuctionsAdminTable auctions={data} />
          ) : tab === 'addon-orders' ? (
            <AddonOrdersTable orders={data} />
          ) : tab === 'software-auctions' ? (
            <SoftwareAuctionAdminTab auctions={data} onRefresh={() => loadTab(tab)} />
          ) : tab === 'community-auctions' ? (
            <CommunityAuctionsAdminTable auctions={data} />
          ) : tab === 'meetings' ? (
            <MeetingsAdminTab meetings={data} />
          ) : tab === 'homepage-features' ? (
            <div className="admin-homepage-features-grid">
              <HomepageFeatureSelector type="domain" />
              <HomepageFeatureSelector type="venture" />
              <HomepageFeatureSelector type="software" />
              <HomepageFeatureSelector type="community" />
            </div>
          ) : tab === 'requests' ? (
            <RequestsTable requests={requests} />
          ) : data.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="font-display text-2xl font-bold text-gray-900">No records found</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {listCount != null && data.length > 0 && (
                <p className="text-sm text-gray-500 mb-3">{data.length} record{data.length === 1 ? '' : 's'} shown</p>
              )}
              {data.map(item => (
                tab === 'ventures' ? (
                  <VentureAdminRow
                    key={`venture-${item.id}`}
                    venture={item}
                    onForward={(entityId, type) => setForwardModal({ entityId, type })}
                    onTakeDown={handleTakeDown}
                    onRestore={handleRestore}
                    onVerifyVenture={setVerifyVenture}
                  />
                ) : (
                  <AdminRow
                    key={`${tab}-${item.id}-${item.purchaseId || ''}`}
                    item={item}
                    tabType={tab}
                    onForward={(entityId, type) => setForwardModal({ entityId, type })}
                    onTakeDown={handleTakeDown}
                    onRestore={handleRestore}
                    onVerifyDomain={setVerifyDomain}
                    onVerifyVenture={setVerifyVenture}
                    onRefresh={() => loadTab(tab)}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {forwardModal && (
        <ForwardModal
          entityId={forwardModal.entityId}
          type={forwardModal.type}
          coBrothers={coBrothers}
          requests={requests}
          onForward={handleForward}
          onClose={() => setForwardModal(null)}
        />
      )}

      {takeDownTarget && (
        <TakeDownModal
          target={takeDownTarget}
          onConfirm={confirmTakeDown}
          onClose={() => setTakeDownTarget(null)}
        />
      )}

      {verifyDomain && (
        <DomainVerificationModal
          domain={verifyDomain}
          adminMode
          onClose={() => setVerifyDomain(null)}
          onVerified={() => {
            setVerifyDomain(null);
            loadTab(tab);
          }}
        />
      )}

      {verifyVenture && (
        <VentureGstinVerificationModal
          venture={verifyVenture}
          adminMode
          onClose={() => setVerifyVenture(null)}
          onVerified={() => {
            setVerifyVenture(null);
            loadTab(tab);
          }}
        />
      )}
    </AppLayout>
  );
}

function VentureAdminRow({
  venture,
  onForward,
  onTakeDown,
  onRestore,
  onVerifyVenture,
}) {
  const [expanded, setExpanded] = useState(false);
  const title = venture.brandDetails?.brandName || `Venture #${venture.id}`;
  const applications = venture.coVentureApplications || venture.co_venture_applications || [];
  const applicationCount = venture.applicationCount ?? applications.length;
  const isGstinVerified = Boolean(venture.verified || venture.gstinVerified);
  const showGstinVerify = true;

  const forwardableApp = applications.find(a => a.status === 'PENDING')
    || applications.find(a => a.status === 'APPROVED')
    || applications[0];

  const handleVentureForward = (e) => {
    e.stopPropagation();
    if (!forwardableApp) {
      if (applicationCount > 0) {
        alert(
          'This venture has co-venture application(s), but none are loaded in this view.\n\n'
          + 'Expand the venture row — you should see each applicant listed there. '
          + 'Use the Forward button on that specific application.\n\n'
          + 'If the list is empty after expanding, refresh the admin page.'
        );
      } else {
        alert(
          'No co-venture application to forward yet.\n\n'
          + 'Someone must apply to partner on this venture first (via the public venture page). '
          + 'Then expand the venture row and forward that application to a CoBrother.'
        );
      }
      return;
    }
    onForward(forwardableApp.id, 'COVENTURE');
  };

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${venture.takenDown ? 'rgba(200,110,110,0.25)' : '#e5e7eb'}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {title}
            {venture.saleType === 'AUCTION' && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                Auction
              </span>
            )}
            {venture.takenDown && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c86e6e', background: 'rgba(200,110,110,0.12)', border: '1px solid rgba(200,110,110,0.3)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                ⚠ Taken Down
              </span>
            )}
            <VerificationBadge verified={isGstinVerified} verifiedLabel="GSTIN verified" unverifiedLabel="GSTIN pending" />
            {applicationCount > 0 && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#4f46e5', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                {applicationCount} co-venture application{applicationCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
            Venture ID: {venture.id}
          </div>
        </div>
        {!venture.takenDown && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.8rem', flexShrink: 0 }}
            onClick={handleVentureForward}
            title={forwardableApp ? 'Forward a co-venture application to CoBrother' : 'Requires a co-venture application first'}
          >
            ◆ Forward to CoBrother
          </button>
        )}
        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={labelStyle}>Lister</div>
              {venture.listedBy ? (
                <>
                  <div style={valueStyle}>{venture.listedBy.firstname} {venture.listedBy.lastname}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{venture.listedBy.email}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{venture.listedBy.phoneNumber || '—'}</div>
                </>
              ) : <div style={valueStyle}>—</div>}
            </div>
            <div>
              <div style={labelStyle}>Sale type</div>
              <div style={valueStyle}>{venture.saleType || '—'}</div>
            </div>
          </div>

          {venture.brandDetails?.website && (
            <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              <span style={labelStyle}>Website</span>{' '}
              <a href={venture.brandDetails.website} target="_blank" rel="noreferrer" style={{ color: '#4f46e5' }}>
                {venture.brandDetails.website}
              </a>
            </div>
          )}

          {venture.takenDown && venture.takeDownReason && (
            <div style={{ fontSize: '0.8rem', color: '#c86e6e', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              Takedown reason: {venture.takeDownReason}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: applications.length ? '1rem' : 0 }}>
            {showGstinVerify && !venture.takenDown && onVerifyVenture && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
                onClick={(e) => { e.stopPropagation(); onVerifyVenture(venture); }}
              >
                {isGstinVerified ? 'Re-verify GSTIN' : 'Verify GSTIN'}
              </button>
            )}
            {!venture.takenDown && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
                onClick={handleVentureForward}
                title={forwardableApp ? 'Forward a co-venture application to CoBrother' : 'Requires a co-venture application first'}
              >
                ◆ Forward to CoBrother
              </button>
            )}
            {!venture.takenDown ? (
              <button
                className="btn-danger btn-sm"
                style={{ fontSize: '0.8rem' }}
                onClick={(e) => { e.stopPropagation(); onTakeDown(venture.id, 'VENTURE', title); }}
              >
                ⚠ Take Down venture
              </button>
            ) : (
              <button
                className="btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
                onClick={(e) => { e.stopPropagation(); onRestore(venture.id, 'VENTURE'); }}
              >
                ↺ Restore venture
              </button>
            )}
          </div>

          {applicationCount > 0 && applications.length === 0 && (
            <p style={{ fontSize: '0.82rem', color: '#b45309', marginBottom: '0.75rem' }}>
              {applicationCount} application(s) exist but could not be loaded. Restart the backend and refresh.
            </p>
          )}

          {applications.length > 0 ? (
            <div>
              <div style={{ ...labelStyle, marginBottom: '0.5rem' }}>Co-venture applications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {applications.map(app => (
                  <div
                    key={app.id}
                    style={{ padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                          {app.fullName || (app.applicant ? `${app.applicant.firstname || ''} ${app.applicant.lastname || ''}`.trim() : 'Applicant')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {app.applicant?.email || '—'}
                          {app.phone ? ` · ${app.phone}` : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                          Application ID: {app.id} · Status: {app.status}
                        </div>
                      </div>
                      {!venture.takenDown && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', flexShrink: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onForward(app.id, 'COVENTURE');
                          }}
                        >
                          ◆ Forward to CoBrother
                        </button>
                      )}
                    </div>
                    {app.description && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem', marginBottom: 0, fontStyle: 'italic' }}>
                        {app.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', margin: 0 }}>No co-venture applications yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function AdminRow({ item, tabType, onForward, onTakeDown, onRestore, onVerifyDomain, onVerifyVenture, onRefresh }) {
  const [expanded, setExpanded] = useState(false);

  const getTitle = () => {
    if (tabType === 'domains')    return (item.domainName || '') + (item.domainExtension || '');
    return item.name || 'Software #' + item.id;
  };

  const getType = () => {
    if (tabType === 'domains')    return 'DOMAIN';
    return 'COCREATION';
  };

  const lister    = item.listedBy;
  const applicant = item.purchasedBy;

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${item.takenDown ? 'rgba(200,110,110,0.25)' : '#e5e7eb'}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem', cursor: 'pointer' }}
           onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#111827', display: 'flex',
                        alignItems: 'center', gap: '0.5rem' }}>
            {getTitle()}
            {item.takenDown && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c86e6e',
                             background: 'rgba(200,110,110,0.12)',
                             border: '1px solid rgba(200,110,110,0.3)',
                             padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                ⚠ Taken Down
              </span>
            )}
            {tabType === 'domains' && (
              <VerificationBadge
                verified={item.verified}
                verifiedLabel="Domain verified"
                unverifiedLabel="Not verified"
              />
            )}
            {tabType === 'cocreations' && (
              <VerificationBadge
                verified={item.verified}
                verifiedLabel="Technology verified"
                unverifiedLabel="Pending verification"
              />
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
            ID: {item.id}
            {tabType === 'domains' && item.askingPrice != null && (
              <> · ₹{Number(item.askingPrice).toLocaleString('en-IN')}</>
            )}
          </div>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
                        marginBottom: '1rem' }}>
            <div>
              <div style={labelStyle}>Lister</div>
              {lister ? (
                <>
                  <div style={valueStyle}>{lister.firstname} {lister.lastname}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lister.email}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lister.phoneNumber || '—'}</div>
                </>
              ) : <div style={valueStyle}>—</div>}
            </div>
            <div>
              <div style={labelStyle}>Buyer</div>
              {applicant ? (
                <>
                  <div style={valueStyle}>{applicant.firstname} {applicant.lastname}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{applicant.email}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{applicant.phoneNumber || '—'}</div>
                </>
              ) : <div style={valueStyle}>Not yet</div>}
            </div>
          </div>

          {item.takenDown && item.takeDownReason && (
            <div style={{ fontSize: '0.8rem', color: '#c86e6e', marginBottom: '0.75rem',
                          fontStyle: 'italic' }}>
              Takedown reason: {item.takeDownReason}
            </div>
          )}

          {tabType === 'cocreations' && (item.githubLink || item.liveDemoLink) && (
            <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {item.githubLink && (
                <div>
                  <span style={labelStyle}>GitHub</span>{' '}
                  <a href={item.githubLink} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', wordBreak: 'break-all' }}>
                    {item.githubLink}
                  </a>
                </div>
              )}
              {item.liveDemoLink && (
                <div>
                  <span style={labelStyle}>Website / demo</span>{' '}
                  <a href={item.liveDemoLink} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', wordBreak: 'break-all' }}>
                    {item.liveDemoLink}
                  </a>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tabType === 'cocreations' && !item.takenDown && (
              <>
                {!item.verified && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    style={{ fontSize: '0.8rem' }}
                    onClick={async () => {
                      try {
                        await adminAPI.markTechnologyVerified(item.id);
                        alert('Technology listing marked as verified.');
                        onRefresh?.();
                      } catch (e) {
                        alert(e.response?.data?.error || 'Could not mark verified.');
                      }
                    }}
                  >
                    Mark verified
                  </button>
                )}
              </>
            )}
            {tabType === 'domains' && !item.takenDown && onVerifyDomain && (
              <>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => onVerifyDomain(item)}
                >
                  {item.verified ? 'Re-verify domain' : 'Verify domain'}
                </button>
                {!item.verified && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    style={{ fontSize: '0.8rem' }}
                    onClick={async () => {
                      try {
                        await adminAPI.markDomainVerified(item.id);
                        alert('Domain marked as verified.');
                        onRefresh?.();
                      } catch (e) {
                        alert(e.response?.data?.error || 'Could not mark verified.');
                      }
                    }}
                  >
                    Mark verified
                  </button>
                )}
              </>
            )}
            {!item.takenDown && (tabType === 'domains' || tabType === 'cocreations') && (
              <button className="btn-secondary btn-sm"
                onClick={() => onForward(item.id, getType())}
                style={{ fontSize: '0.8rem' }}>
                ◆ Forward to CoBrother
              </button>
            )}
            {!item.takenDown ? (
              <button className="btn-danger btn-sm"
                onClick={() => onTakeDown(item.id, getType(), getTitle())}
                style={{ fontSize: '0.8rem' }}>
                ⚠ Take Down
              </button>
            ) : (
              <button className="btn-secondary btn-sm"
                onClick={() => onRestore(item.id, getType())}
                style={{ fontSize: '0.75rem' }}>
                ↺ Restore
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AuctionsAdminTable({ auctions }) {
  if (!auctions.length) return (
    <div className="text-center py-20"><h3 className="font-display text-2xl font-bold text-gray-900">No auctions yet</h3></div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {auctions.map((item) => {
        // Handle both { auction, bids, domain } and flat auction objects
        const auction = item.auction ?? item;
        const bids    = item.bids ?? [];
        const domain  = item.domain ?? auction.domain;
        return (
          <AuctionAdminRow
            key={auction.id}
            auction={domain ? { ...auction, domain } : auction}
            bids={bids}
          />
        );
      })}
    </div>
  );
}

function AuctionAdminRow({ auction, bids }) {
  const [expanded, setExpanded] = useState(false);
  const domain = auction.domain || {};
  const domainName = domain.domainName || domain.domain_name || '';
  const domainExtension = domain.domainExtension || domain.domain_extension || '';
  const title = (
    auction.domainDisplayName
    || domain.fullDomain
    || `${domainName}${domainExtension}`.trim()
    || domainName
    || `Auction #${String(auction.id || '').slice(0, 8)}`
  );
  const totalBids = auction.totalBids ?? auction.total_bids ?? 0;
  const currentHighestBid = Number(auction.currentHighestBid ?? auction.current_highest_bid ?? 0);
  const status = auction.status ?? '—';
  const winner = auction.currentWinner || null;
  const winnerName = winner
    ? `${winner.firstname || ''} ${winner.lastname || ''}`.trim() || winner.email
    : auction.currentWinnerName || null;

  return (
    <div style={{ background: '#ffffff',
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem', cursor: 'pointer' }}
           onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#111827' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
            {totalBids} bids · Status: {status}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem',
                        fontWeight: 700, color: '#6ec896' }}>
            {currentHighestBid > 0
              ? `₹${currentHighestBid.toLocaleString('en-IN')}`
              : 'No bids'}
          </div>
          {winnerName && (
            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
              {winnerName}
            </div>
          )}
        </div>
        <span style={{ color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb',
                      padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '1rem', marginBottom: '1rem' }}>
            <div><div style={labelStyle}>Lister</div>
              <div style={valueStyle}>
                {domain.listedBy?.firstname} {domain.listedBy?.lastname}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {domain.listedBy?.email}
              </div>
            </div>
            <div><div style={labelStyle}>Winner</div>
              <div style={valueStyle}>
                {winnerName || '—'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {winner?.email || ''}
              </div>
            </div>
            <div><div style={labelStyle}>Winning Bid</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem',
                            fontWeight: 700, color: '#6ec896' }}>
                {currentHighestBid > 0
                  ? `₹${currentHighestBid.toLocaleString('en-IN')}`
                  : '—'}
              </div>
            </div>
          </div>

          {bids?.length > 0 && (
            <div>
              <div style={labelStyle}>All Bids ({bids.length})</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: '0.5rem',
                            background: '#f9fafb', borderRadius: 8, padding: '0.5rem', border: '1px solid #e5e7eb' }}>
                {bids.map((bid, i) => (
                  <div key={bid.id || i} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '0.4rem 0.5rem', fontSize: '0.8rem',
                                        borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ color: '#111827', fontWeight: 500 }}>
                      {bid.bidderName || bid.bidder_name}
                    </span>
                    <span style={{ color: (bid.isWinningBid || bid.is_winning_bid) ? '#059669' : '#7c3aed',
                                   fontWeight: 600 }}>
                      ₹{Number(bid.amount).toLocaleString('en-IN')}
                      {(bid.isWinningBid || bid.is_winning_bid) && ' 🏆'}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {formatAuctionDateTime(bid.bidTime ?? bid.bid_time ?? bid.createdAt, {
                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                      }, '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommunityAuctionsAdminTable({ auctions }) {
  if (!auctions.length) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl font-bold text-gray-900">No creator auctions yet</h3>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {auctions.map((item) => {
        const auction = item.auction ?? item;
        const community = item.community ?? auction.community ?? {};
        return (
          <CommunityAuctionAdminRow
            key={auction.id}
            auction={auction}
            community={community}
          />
        );
      })}
    </div>
  );
}

function CommunityAuctionAdminRow({ auction, community }) {
  const [expanded, setExpanded] = useState(false);
  const title = auction.auctionTitle || community.name || `Creator auction #${auction.id}`;
  const totalBids = auction.totalBids ?? auction.total_bids ?? 0;
  const currentHighestBid = Number(auction.currentHighestBid ?? auction.current_highest_bid ?? 0);
  const winner = auction.currentWinner;
  const winnerName = winner
    ? `${winner.firstname || ''} ${winner.lastname || ''}`.trim() || winner.email
    : null;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#111827' }}>{title}</div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
            {totalBids} bids · Status: {auction.status}
            {community.role ? ` · ${String(community.role).replace(/_/g, ' ')}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 700, color: '#6ec896' }}>
            {currentHighestBid > 0 ? `₹${currentHighestBid.toLocaleString('en-IN')}` : 'No bids'}
          </div>
          {winnerName && (
            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{winnerName}</div>
          )}
        </div>
        <span style={{ color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={labelStyle}>Creator profile</div>
              <div style={valueStyle}>{community.name || '—'}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{community.email || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>Winner</div>
              <div style={valueStyle}>{winnerName || '—'}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{winner?.email || ''}</div>
            </div>
            <div>
              <div style={labelStyle}>Min bid</div>
              <div style={valueStyle}>
                ₹{Number(auction.minBidPrice ?? auction.min_bid_price ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VentureAuctionsAdminTable({ auctions }) {
  if (!auctions.length) return (
    <div className="text-center py-20"><h3 className="font-display text-2xl font-bold text-gray-900">No venture auctions yet</h3></div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {auctions.map((item) => {
        const auction = item.auction ?? item;
        const bids    = item.bids ?? [];
        return (
          <VentureAuctionAdminRow key={auction.id} auction={auction} bids={bids} />
        );
      })}
    </div>
  );
}

function VentureAuctionAdminRow({ auction, bids }) {
  const [expanded, setExpanded] = useState(false);
  const venture = auction.venture || {};
  const brand   = venture.brandDetails || {};

  return (
    <div style={{ background: '#ffffff',
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem', cursor: 'pointer' }}
           onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {brand.brandName || 'Venture #' + auction.id}
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed',
                           background: 'rgba(124,58,237,0.08)',
                           border: '1px solid rgba(124,58,237,0.25)',
                           padding: '0.15rem 0.45rem', borderRadius: 4 }}>
              🔨 Equity Auction
            </span>
            {venture.verified && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669',
                             background: 'rgba(5,150,105,0.08)',
                             border: '1px solid rgba(5,150,105,0.25)',
                             padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                ✓ GSTIN
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
            {auction.totalBids} bids · Status: {auction.status}
            {brand.industry && ` · ${brand.industry.replace(/_/g, ' ')}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem',
                        fontWeight: 700, color: '#6ec896' }}>
            {auction.currentHighestBid > 0
              ? `₹${Number(auction.currentHighestBid).toLocaleString('en-IN')}`
              : 'No bids'}
          </div>
          {auction.currentWinner && (
            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
              {auction.currentWinner.firstname} {auction.currentWinner.lastname}
            </div>
          )}
        </div>
        <span style={{ color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb',
                      padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '1rem', marginBottom: '1rem' }}>
            <div><div style={labelStyle}>Venture Owner</div>
              <div style={valueStyle}>
                {venture.listedBy?.firstname} {venture.listedBy?.lastname}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {venture.listedBy?.email}
              </div>
            </div>
            <div><div style={labelStyle}>Current Winner</div>
              <div style={valueStyle}>
                {auction.currentWinner
                  ? `${auction.currentWinner.firstname} ${auction.currentWinner.lastname}`
                  : '—'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {auction.currentWinner?.email || ''}
              </div>
            </div>
            <div><div style={labelStyle}>Auction Details</div>
              <div style={valueStyle}>
                Min: ₹{Number(auction.minBidPrice || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                Duration: {auction.duration?.replace(/_/g, ' ') || '—'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {auction.startTime ? `Start: ${formatAuctionDate(auction.startTime)}` : ''}
              </div>
            </div>
          </div>

          {bids?.length > 0 && (
            <div>
              <div style={labelStyle}>All Bids ({bids.length})</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: '0.5rem',
                            background: '#f9fafb', borderRadius: 8, padding: '0.5rem', border: '1px solid #e5e7eb' }}>
                {bids.map((bid, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '0.4rem 0.5rem', fontSize: '0.8rem',
                                        borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ color: '#111827', fontWeight: 500 }}>{bid.bidderName}</span>
                    <span style={{ color: bid.isWinningBid ? '#059669' : '#7c3aed',
                                   fontWeight: 600 }}>
                      ₹{Number(bid.amount).toLocaleString('en-IN')}
                      {bid.isWinningBid && ' 🏆'}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {formatAuctionDateTime(bid.bidTime, {
                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                      }, '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DomainEnquiriesTable({ enquiries, onForward }) {
  if (enquiries.length === 0) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">No domain enquiries yet</h3>
      <p className="text-gray-600">Enquiries for domains above ₹5,00,000 will appear here.</p>
    </div>
  );

  const ENQUIRY_STATUS = { PENDING: '#c8a96e', FORWARDED: '#a06ec8', CLOSED: '#6ec896' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {enquiries.map(e => (
        <div key={e.id} style={{ padding: '1rem 1.25rem', background: '#ffffff',
                                  border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#111827' }}>
                {e.domain?.domainName}{e.domain?.domainExtension}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
                ₹{Number(e.domain?.askingPrice || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700,
                           color: ENQUIRY_STATUS[e.status] || '#888' }}>
              {e.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={labelStyle}>Enquirer</div>
              <div style={valueStyle}>{e.fullName}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{e.email}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{e.phone}</div>
            </div>
            <div>
              <div style={labelStyle}>Domain Lister</div>
              <div style={valueStyle}>
                {e.domain?.listedBy?.firstname} {e.domain?.listedBy?.lastname}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{e.domain?.listedBy?.email}</div>
            </div>
          </div>

          {e.message && (
            <div style={{ fontSize: '0.82rem', color: '#a0a0b0', marginBottom: '0.75rem',
                          fontStyle: 'italic' }}>
              "{e.message}"
            </div>
          )}

          {e.status === 'PENDING' && (
            <button className="btn-secondary btn-sm"
              onClick={() => onForward(e.id, 'DOMAIN_ENQUIRY')}
              style={{ fontSize: '0.8rem' }}>
              ◆ Forward to CoBrother
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function RequestsTable({ requests }) {
  if (requests.length === 0) return (
    <div className="text-center py-20"><h3 className="font-display text-2xl font-bold text-gray-900">No CoBrother requests yet</h3></div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {requests.map(r => (
        <div key={r.id} style={{ padding: '1rem 1.25rem', background: '#ffffff',
                                  border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#111827' }}>{r.entityTitle}</span>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                {formatAdminRequestType(r.requestType)}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700,
                           color: STATUS_COLORS[r.status] || '#888' }}>
              {r.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
            Lister: {r.listerName} · {r.listerEmail}
          </div>
          {r.applicantName && (
            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              Applicant: {r.applicantName} · {r.applicantEmail}
            </div>
          )}
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>
            CoBrother: {r.assignedCoBrother?.firstname} {r.assignedCoBrother?.lastname}
          </div>
        </div>
      ))}
    </div>
  );
}

function ForwardModal({ entityId, type, coBrothers, requests, onForward, onClose }) {
  const [selectedCoBrother, setSelectedCoBrother] = useState('');
  const [loading, setLoading]                     = useState(false);

  const entityKey = String(entityId);
  const activeRequests = requests.filter(r =>
    String(r.entityId) === entityKey &&
    r.requestType === type &&
    r.status !== 'CANCELLED' &&
    r.status !== 'REJECTED'
  );

  const alreadyAccepted = activeRequests.some(r => r.status === 'ACCEPTED');
  const pendingPayment  = activeRequests.some(r =>
    r.status === 'PAYMENT_PENDING' || r.status === 'FORWARDED');
  const noCoBrothers = coBrothers.length === 0;

  const handleSubmit = async () => {
    if (noCoBrothers) {
      alert('No CoBrother accounts exist yet. Register users with the CoBrother role first.');
      return;
    }
    if (!selectedCoBrother) { alert('Please select a CoBrother'); return; }
    setLoading(true);
    await onForward(entityKey, type, selectedCoBrother);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-glow" />
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-badge">Forward to CoBrother</div>
          <h2>Assign CoBrother</h2>
          <p>Select a CoBrother for this {formatAdminRequestType(type).toLowerCase()} request.</p>
        </div>

        {noCoBrothers && (
          <div style={{ padding: '0.875rem', background: 'rgba(200,110,110,0.08)',
                        border: '1px solid rgba(200,110,110,0.25)', borderRadius: 8,
                        marginBottom: '1rem', fontSize: '0.83rem', color: '#c86e6e' }}>
            No CoBrother accounts found. Create or promote a user to the CoBrother role before forwarding.
          </div>
        )}

        {!noCoBrothers && alreadyAccepted && (
          <div style={{ padding: '0.875rem', background: 'rgba(200,110,110,0.08)',
                        border: '1px solid rgba(200,110,110,0.25)', borderRadius: 8,
                        marginBottom: '1rem', fontSize: '0.83rem', color: '#c86e6e' }}>
            ⚠️ This request has already been accepted. Forwarding again is not recommended.
          </div>
        )}

        {!noCoBrothers && !alreadyAccepted && pendingPayment && (
          <div style={{ padding: '0.875rem', background: 'rgba(200,169,110,0.08)',
                        border: '1px solid rgba(200,169,110,0.25)', borderRadius: 8,
                        marginBottom: '1rem', fontSize: '0.83rem', color: '#c8a96e' }}>
            ⚠️ The lister already has a pending payment request. Cancel it before assigning another.
          </div>
        )}

        <div className="form-group" style={{ margin: '1rem 0' }}>
          <label style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.5rem',
                          display: 'block' }}>Select CoBrother</label>
          <select value={selectedCoBrother} onChange={e => setSelectedCoBrother(e.target.value)} disabled={noCoBrothers}>
            <option value="">Choose a CoBrother…</option>
            {coBrothers.map(cb => {
              const alreadyAssigned = activeRequests.some(r => String(r.assignedCoBrother?.id) === String(cb.id));
              return (
                <option key={cb.id} value={cb.id} disabled={alreadyAssigned}>
                  {cb.firstname} {cb.lastname} ({cb.email})
                  {alreadyAssigned ? ' — Already assigned' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ padding: '0.875rem', background: 'rgba(200,169,110,0.08)',
                      border: '1px solid rgba(200,169,110,0.2)', borderRadius: 8,
                      marginBottom: '1.25rem', fontSize: '0.83rem', color: '#c8a96e' }}>
          ⚡ A ₹1,000 payment request will be sent to the lister. CoBrother notified after payment.
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={handleSubmit}
            disabled={loading || noCoBrothers || !selectedCoBrother || alreadyAccepted || pendingPayment}
            style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : 'Send Payment Request →'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function TakeDownModal({ target, onConfirm, onClose }) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { alert('Please provide a reason.'); return; }
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-glow" />
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-badge" style={{ background: 'rgba(200,110,110,0.15)',
                                                color: '#c86e6e',
                                                border: '1px solid rgba(200,110,110,0.3)' }}>
            Take Down Listing
          </div>
          <h2>{target.title}</h2>
          <p>{target.type}</p>
        </div>

        <div style={{ padding: '0.875rem', background: 'rgba(200,110,110,0.07)',
                      border: '1px solid rgba(200,110,110,0.2)', borderRadius: 8,
                      marginBottom: '1.25rem', fontSize: '0.83rem', color: '#c86e6e' }}>
          ⚠️ This hides the listing from public view. Lister still sees it with a "Taken Down"
          badge. Restorable at any time.
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.5rem',
                          display: 'block' }}>
            Reason <span style={{ color: '#c86e6e' }}>*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Fraudulent listing, policy violation, spam…"
            rows={3} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-danger" onClick={handleSubmit}
            disabled={loading || !reason.trim()} style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : '⚠ Confirm Takedown'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Meetings Admin Tab ───────────────────────────────────────────────────────
function MeetingsAdminTab({ meetings }) {
  const [filter, setFilter] = useState('all');

  const now = Date.now();

  const categorise = (m) => {
    if (m.status !== 'CONFIRMED') return 'other';
    const start = parseAuctionDate(m.scheduledAt)?.getTime();
    if (!start) return 'other';
    const end   = start + (m.durationMinutes || 30) * 60_000;
    if (start > now)         return 'upcoming';
    if (start <= now && now < end) return 'ongoing';
    return 'other';
  };

  const filtered = meetings.filter(m => {
    if (filter === 'all')     return true;
    if (filter === 'upcoming') return categorise(m) === 'upcoming';
    if (filter === 'ongoing')  return categorise(m) === 'ongoing';
    return true;
  });

  const countUpcoming = meetings.filter(m => categorise(m) === 'upcoming').length;
  const countOngoing  = meetings.filter(m => categorise(m) === 'ongoing').length;

  const MEETING_STATUS = {
    PENDING:   { color: '#c8a96e', label: '⏳ Pending'   },
    CONFIRMED: { color: '#6ec896', label: '✅ Confirmed'  },
    CANCELLED: { color: '#c86e6e', label: '❌ Cancelled'  },
    COMPLETED: { color: '#9ca3af', label: '✓ Completed'  },
  };

  if (meetings.length === 0) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900">No meetings yet</h3>
      <p className="text-gray-600 mt-1">Meeting records will appear here once users schedule them.</p>
    </div>
  );

  return (
    <div>
      {/* Sub-filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all',      label: `All  (${meetings.length})` },
          { id: 'ongoing',  label: `🔴 Ongoing  (${countOngoing})` },
          { id: 'upcoming', label: `🟢 Upcoming  (${countUpcoming})` },
        ].map(f => (
          <button key={f.id}
            className={`filter-tab ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
            style={{ fontSize: '0.82rem' }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No meetings match this filter.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(m => {
            const cat    = categorise(m);
            const sc     = MEETING_STATUS[m.status] || { color: '#888', label: m.status };
            const lister    = m.lister    || {};
            const requester = m.requester || {};

            return (
              <div key={m.id} style={{
                background: '#ffffff',
                border: `1px solid ${cat === 'ongoing' ? 'rgba(110,200,150,0.4)' : '#e5e7eb'}`,
                borderLeft: `4px solid ${cat === 'ongoing' ? '#6ec896' : cat === 'upcoming' ? '#6eadc8' : '#d1d5db'}`,
                borderRadius: 10,
                padding: '1rem 1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Left: topic + participants */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                        {m.topic || '(No topic)'}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: sc.color,
                                     background: sc.color + '18', border: `1px solid ${sc.color}33`,
                                     padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                        {sc.label}
                      </span>
                      {cat === 'ongoing' && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c86e6e',
                                       background: 'rgba(200,110,110,0.1)', border: '1px solid rgba(200,110,110,0.3)',
                                       padding: '0.15rem 0.5rem', borderRadius: 4, animation: 'pulse 1.5s infinite' }}>
                          🔴 Live Now
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div>
                        <div style={labelStyle}>Profile Owner</div>
                        <div style={valueStyle}>{lister.firstname || lister.firstName || '—'} {lister.lastname || lister.lastName || ''}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{lister.email || '—'}</div>
                      </div>
                      <div>
                        <div style={labelStyle}>Requester</div>
                        <div style={valueStyle}>{requester.firstname || requester.firstName || '—'} {requester.lastname || requester.lastName || ''}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{requester.email || '—'}</div>
                      </div>
                    </div>

                    {m.message && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>
                        "{m.message}"
                      </div>
                    )}
                  </div>

                  {/* Right: time info + meet link */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 140 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                      {formatAuctionDateTime(m.scheduledAt, {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem' }}>
                      {m.durationMinutes} min
                    </div>

                    {m.meetingLink && m.status === 'CONFIRMED' && (
                      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                        <a href={m.meetingLink} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                   padding: '0.35rem 0.75rem', borderRadius: 8,
                                   background: '#1a73e8', color: '#fff',
                                   fontSize: '0.75rem', fontWeight: 700,
                                   textDecoration: 'none' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 3H4C2.9 3 2 3.9 2 5v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM15 9l-5 3.5L15 16V9z"/>
                          </svg>
                          Join Google Meet
                        </a>
                        {m.calendarEventLink && (
                          <a href={m.calendarEventLink} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.7rem', color: '#1a73e8', textDecoration: 'none' }}>
                            📅 Calendar Event
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddonOrdersTable({ orders }) {
  if (!orders.length) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900">No addon orders yet</h3>
      <p className="text-gray-600 mt-2">Orders will appear here when users select add-ons during checkout.</p>
    </div>
  );

  const STATUS_COLOR = {
    COMPLETED:       '#6ec896',
    CONTACT_PENDING: '#c8a96e',
    CREATED:         '#6eadc8',
    FAILED:          '#c86e6e',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {orders.map(order => (
        <AddonOrderRow key={order.id} order={order} statusColor={STATUS_COLOR} />
      ))}
    </div>
  );
}

function AddonOrderRow({ order, statusColor }) {
  const [expanded, setExpanded] = useState(false);
  const services = order.selectedServices ? order.selectedServices.split(',') : [];

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', cursor: 'pointer' }}
           onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            #{order.id} — {order.buyerName || order.buyerEmail || '—'}
            <span style={{ fontSize: '0.68rem', fontWeight: 700,
                           color: order.purchaseType === 'DOMAIN' ? '#0369a1' : '#7c3aed',
                           background: order.purchaseType === 'DOMAIN' ? 'rgba(3,105,161,0.08)' : 'rgba(124,58,237,0.08)',
                           border: `1px solid ${order.purchaseType === 'DOMAIN' ? 'rgba(3,105,161,0.25)' : 'rgba(124,58,237,0.25)'}`,
                           padding: '0.15rem 0.45rem', borderRadius: 4 }}>
              {order.purchaseType}
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700,
                           color: statusColor[order.paymentStatus] || '#888',
                           background: 'rgba(0,0,0,0.04)',
                           border: '1px solid rgba(0,0,0,0.1)',
                           padding: '0.15rem 0.45rem', borderRadius: 4 }}>
              {order.paymentStatus?.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
            {services.length} service{services.length !== 1 ? 's' : ''} · ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
            {order.createdAt && ` · ${formatAuctionDate(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 700,
                        color: statusColor[order.paymentStatus] || '#888' }}>
            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={labelStyle}>Buyer</div>
              <div style={valueStyle}>{order.buyerName || '—'}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{order.buyerEmail}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{order.buyerPhone || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>Linked Purchase</div>
              <div style={valueStyle}>{order.purchaseType} #{order.purchaseId}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Addon Order #{order.id}</div>
            </div>
            <div>
              <div style={labelStyle}>Payment</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: statusColor[order.paymentStatus] || '#888' }}>
                {order.paymentStatus?.replace(/_/g, ' ')}
              </div>
              {order.razorpayPaymentId && (
                <div style={{ fontSize: '0.72rem', color: '#6b7280', wordBreak: 'break-all' }}>
                  {order.razorpayPaymentId}
                </div>
              )}
            </div>
          </div>

          {services.length > 0 && (
            <div>
              <div style={labelStyle}>Services Selected</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                {services.map(key => (
                  <span key={key} style={{ fontSize: '0.75rem', fontWeight: 600,
                                           background: '#eef2ff', color: '#4338ca',
                                           border: '1px solid #c7d2fe',
                                           padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 600, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
};
const valueStyle = { fontSize: '0.9rem', color: '#111827', fontWeight: 500 };
