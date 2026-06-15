import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Calendar, Headset } from 'lucide-react';
import { adminAPI, meetingAPI, auctionAPI, communityAuctionAPI, operationsAdminAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import useCurrency from '../context/CurrencyContext';
import { formatInr } from '../utils/money';
import VentureIcon from '../assets/Coventure_logo.png';
import DomainsIcon from '../assets/CoBranding.png';
import TechnologyIcon from '../assets/CoCreation.png';
import AuctionIcon from '../assets/Auction.png';
import PurchaseIcon from '../assets/purchase.png';
import RequestIcon from '../assets/Request.png';
import EnquireIcon from '../assets/Enquire.png';
import HomepageFeatureSelector from '../components/admin/HomepageFeatureSelector';
import SoftwareAuctionAdminTab from './SoftwareAuctionAdminTab';
import DomainTransferAdminTab from './DomainTransferAdminTab';
import VentureDealsAdminTab from './VentureDealsAdminTab';
import OperationsAdminTab from './OperationsAdminTab';
import DomainVerificationModal from './DomainVerificationModal';
import { softwareAuctionAPI } from '../api/services';
import { asArray, extractAdminList } from '../utils/asArray';
import { normalizeAddonOrders } from '../utils/normalizeAddonOrders';
import LearnMoreTooltip from '../components/common/LearnMoreTooltip';
import VentureGstinVerificationModal from '../components/venture/VentureGstinVerificationModal';
import { formatAuctionDate, formatAuctionDateTime, parseAuctionDate } from '../utils/auctionDate';
import AdminFeesAndChargesTab from '../components/admin/AdminFeesAndChargesTab';
import { formatEquityPercent } from '../constants/ventureLabels';
import { resolveVentureVerificationStatus } from '../utils/ventureVerification';
import PageContentSkeleton from '../components/common/PageContentSkeleton';


function formatAdminRequestType(type, t) {
  if (type === 'COCREATION') return t('adminRequestTypeTechnology');
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

function VerificationBadge({ verified, verifiedLabel, unverifiedLabel }) {
  const { t } = useTranslation();
  const vLabel = verifiedLabel ?? t('adminVerified');
  const uLabel = unverifiedLabel ?? t('adminNotVerified');
  return verified ? (
    <span style={verifiedBadgeStyle}>✓ {vLabel}</span>
  ) : (
    <span style={unverifiedBadgeStyle}>○ {uLabel}</span>
  );
}

const DOMAIN_LISTING_TYPE_BADGE = {
  domain_auction: { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', labelKey: 'adminDomainBadgeAuction' },
  normal_domain:  { color: '#0369a1', bg: 'rgba(3,105,161,0.1)', labelKey: 'adminDomainBadgeNormal' },
};

const DOMAIN_VERIFICATION_STATUS_BADGE = {
  PENDING:             { color: '#b45309', bg: 'rgba(245,158,11,0.12)', labelKey: 'adminDomainVerificationPending' },
  VERIFIED:            { color: '#059669', bg: 'rgba(5,150,105,0.1)', labelKey: 'adminDomainVerificationVerified' },
  REJECTED:            { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', labelKey: 'adminDomainVerificationRejected' },
  MORE_INFO_REQUESTED: { color: '#b45309', bg: 'rgba(245,158,11,0.12)', labelKey: 'adminDomainVerificationMoreInfo' },
};

function DomainAdminBadge({ color, bg, children }) {
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, color, background: bg,
      border: `1px solid ${color}44`, padding: '0.15rem 0.45rem', borderRadius: 4,
    }}>
      {children}
    </span>
  );
}

function domainListingType(item) {
  return item.listingType ?? (item.saleType === 'AUCTION' ? 'domain_auction' : 'normal_domain');
}

function domainNeedsMarkVerified(item) {
  const isAuction = domainListingType(item) === 'domain_auction';
  if (isAuction) {
    const status = String(item.verificationStatus ?? 'PENDING').toUpperCase();
    return status !== 'VERIFIED' && status !== 'REJECTED';
  }
  return !item.verified;
}

function DomainListingBadges({ item }) {
  const { t } = useTranslation();
  const listingType = domainListingType(item);
  const verificationStatus = item.verificationStatus ?? (item.verified ? 'VERIFIED' : 'PENDING');
  const typeStyle = DOMAIN_LISTING_TYPE_BADGE[listingType] || DOMAIN_LISTING_TYPE_BADGE.normal_domain;
  const statusStyle = DOMAIN_VERIFICATION_STATUS_BADGE[verificationStatus] || DOMAIN_VERIFICATION_STATUS_BADGE.PENDING;
  return (
    <>
      <DomainAdminBadge color={typeStyle.color} bg={typeStyle.bg}>{t(typeStyle.labelKey)}</DomainAdminBadge>
      <DomainAdminBadge color={statusStyle.color} bg={statusStyle.bg}>{t(statusStyle.labelKey)}</DomainAdminBadge>
    </>
  );
}

const STATUS_COLORS = {
  PAYMENT_PENDING:   '#b45309',
  PAYMENT_COMPLETED: '#0369a1',
  FORWARDED:         '#7c3aed',
  ACCEPTED:          '#059669',
  REJECTED:          '#dc2626',
  CANCELLED:         '#4b5563',
};

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [tab, setTab]                       = useState('ventures');
  const [data, setData]                     = useState([]);
  const [coBrothers, setCoBrothers]         = useState([]);
  const [requests, setRequests]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [forwardModal, setForwardModal]     = useState(null);
  const [takeDownTarget, setTakeDownTarget] = useState(null);
  const [verifyDomain, setVerifyDomain]   = useState(null);
  const [verifyVenture, setVerifyVenture] = useState(null);
  const [listCount, setListCount]         = useState(null);

  const loadTab = (currentTab, options = {}) => {
    const { silent = false } = options;
    const fetchers = {
      ventures:            adminAPI.getVentures,
      domains:             adminAPI.getDomains,
      'domain-enquiries':  adminAPI.getDomainEnquiries,
      cocreations:         adminAPI.getTechnologies,
      auctions:            adminAPI.getAllAuctions,
      'venture-auctions':  adminAPI.getAllVentureAuctions,
      meetings:            meetingAPI.adminGetAll,
      operations:          operationsAdminAPI.list,
      'software-auctions': softwareAuctionAPI.adminGetAll,
      'community-auctions': communityAuctionAPI.adminGetAll,
      'addon-orders':      adminAPI.getAddonOrders,
    };
  
    if (currentTab === 'fees-charges' || currentTab === 'domain-transfers' || currentTab === 'venture-deals') {
      setLoading(false);
      setData([]);
      return;
    }

    if (!fetchers[currentTab]) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    fetchers[currentTab]()
      .then(({ data }) => {
        let rows = extractAdminList(data);
        if (currentTab === 'ventures') {
          rows = rows.filter(
            (v) => v.saleType !== 'AUCTION' && v.sale_type !== 'AUCTION',
          );
        }
        if (currentTab === 'addon-orders') {
          rows = normalizeAddonOrders(rows);
        }
        setData(rows);
        setListCount(rows.length);
      })
      .catch((e) => {
        setData([]);
        setListCount(0);
        const detail = e.response?.data?.detail;
        const detailText = Array.isArray(detail)
          ? detail.map((d) => d.msg || d).join(', ')
          : (typeof detail === 'string' ? detail : null);
        const msg = e.response?.data?.error || detailText || e.message || t('adminLoadFailed', { tab: currentTab });
        alert(msg);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
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
    const requestedTab = new URLSearchParams(location.search).get('tab');
    const allowedTabs = new Set([
      'ventures',
      'domains',
      'domain-enquiries',
      'cocreations',
      'requests',
      'auctions',
      'venture-auctions',
      'meetings',
      'homepage-features',
      'software-auctions',
      'community-auctions',
      'addon-orders',
      'domain-transfers',
      'venture-deals',
    ]);
    if (requestedTab && allowedTabs.has(requestedTab)) {
      setTab(requestedTab);
    }
  }, [location.search]);

  useEffect(() => {
    loadTab(tab);
  }, [tab]);


  const handleForward = async (entityId, type, coBrotherId) => {
    try {
      const { data } = await adminAPI.forward({ entityId, type, coBrotherId });
      alert(data?.message || t('adminPaymentSent'));
      setForwardModal(null);
      adminAPI.getCoBrotherRequests()
        .then(({ data }) => setRequests(asArray(data)));
    } catch (e) {
      alert(e.response?.data?.error || t('adminForwardFailed'));
    }
  };

  const handleTakeDown = (entityId, type, title) =>
    setTakeDownTarget({ entityId, type, title });

  const confirmTakeDown = async (reason) => {
    try {
      const { data } = await adminAPI.takeDown(takeDownTarget.type, takeDownTarget.entityId, reason);
      if (data?.success === false) {
        alert(data?.error || t('adminTakeDownFailed'));
        return;
      }
      setTakeDownTarget(null);
      loadTab(tab);
    } catch (e) {
      alert(e.response?.data?.error || t('adminTakeDownFailed'));
    }
  };

  const handleRestore = async (entityId, type) => {
    try {
      const { data } = await adminAPI.restore(type, entityId);
      if (data?.success === false) {
        alert(data?.error || t('adminRestoreFailed'));
        return;
      }
      loadTab(tab);
    } catch (e) {
      alert(e.response?.data?.error || t('adminRestoreFailed'));
    }
  };

  const tabs = [
    { id: 'ventures',           label: t('adminTabVentures'),          icon: VentureIcon    },
    { id: 'domains',            label: t('adminTabDomains'),           icon: DomainsIcon    },
    { id: 'domain-enquiries',   label: t('adminTabDomainEnquiries'),   icon: EnquireIcon    },
    { id: 'cocreations',        label: t('adminTabTechnology'),        icon: TechnologyIcon },
    { id: 'requests',           label: t('adminTabCoBrotherRequests'), icon: RequestIcon    },
    { id: 'auctions',           label: t('adminTabDomainAuctions'),    icon: AuctionIcon    },
    { id: 'venture-deals',   label: 'Venture Deals',   icon: AuctionIcon    },
    { id: 'meetings',           label: t('adminTabMeetings'),          icon: null, Icon: Calendar },
    { id: 'operations',         label: t('adminTabOperations', { defaultValue: 'Operations' }), icon: null, Icon: Headset },
    { id: 'homepage-features',  label: t('adminTabHomepageFeatures'),  icon: PurchaseIcon   },
    { id: 'software-auctions',  label: t('adminTabSoftwareAuctions'),  icon: AuctionIcon },
    { id: 'community-auctions', label: t('adminTabCreatorAuctions'),   icon: AuctionIcon },
    { id: 'addon-orders',       label: t('adminTabAddonOrders'),       icon: PurchaseIcon     },
    { id: 'fees-charges',       label: 'Fees & Charges',                 icon: PurchaseIcon   },
    { id: 'domain-transfers',   label: t('adminTabDomainTransfers', { defaultValue: 'Domain transfers' }), icon: DomainsIcon },
  ];

  return (
    <AppLayout>
      <div className="admin-page w-full min-w-0 max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 m-0 break-words">
                {t('adminDashboardTitle')}
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">{t('adminDashboardSubtitle')}</p>
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 -mx-1 sm:mx-0 min-w-0">
          <div className="admin-dashboard-tabs">
            {tabs.map(tabItem => (
              <button
                key={tabItem.id}
                type="button"
                className={`admin-dashboard-tab admin-dashboard-tab--${tabItem.id} ${tab === tabItem.id ? 'active' : ''}`}
                aria-pressed={tab === tabItem.id}
                onClick={() => setTab(tabItem.id)}
              >
                {tabItem.icon ? (
                  <img src={tabItem.icon} alt="" className="admin-dashboard-tab-icon" />
                ) : tabItem.Icon ? (
                  <tabItem.Icon size={28} strokeWidth={1.85} className="admin-dashboard-tab-lucide-icon" aria-hidden />
                ) : (
                  <span className="admin-dashboard-tab-icon-spacer" aria-hidden />
                )}
                <span className="admin-dashboard-tab-label">{tabItem.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className="admin-page-content bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 text-gray-900 min-w-0 overflow-hidden"
          data-admin-section={tab}
        >
          {tab === 'fees-charges' ? (
            <AdminFeesAndChargesTab />
          ) : loading ? (
            <PageContentSkeleton variant="table" rows={7} />
          ) : tab === 'domain-enquiries' ? (
            <DomainEnquiriesTable
              enquiries={data}
              onForward={(entityId, type) => setForwardModal({ entityId, type })}
            />
          ) : tab === 'auctions' ? (
            <AuctionsAdminTable auctions={data} />
          ) : tab === 'venture-deals' ? (
            <VentureDealsAdminTab />
          ) : tab === 'addon-orders' ? (
            <AddonOrdersTable orders={data} />
          ) : tab === 'software-auctions' ? (
            <SoftwareAuctionAdminTab auctions={data} onRefresh={() => loadTab(tab)} />
          ) : tab === 'community-auctions' ? (
            <CommunityAuctionsAdminTable auctions={data} />
          ) : tab === 'meetings' ? (
            <MeetingsAdminTab meetings={data} />
          ) : tab === 'operations' ? (
            <OperationsAdminTab services={data} onRefresh={() => loadTab(tab, { silent: true })} />
          ) : tab === 'homepage-features' ? (
            <div className="admin-homepage-features-grid">
              <HomepageFeatureSelector type="domain" />
              <HomepageFeatureSelector type="venture" />
              <HomepageFeatureSelector type="software" />
              <HomepageFeatureSelector type="community" />
            </div>
          ) : tab === 'domain-transfers' ? (
            <DomainTransferAdminTab />
          ) : tab === 'requests' ? (
            <RequestsTable requests={requests} />
          ) : data.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoRecords')}</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {listCount != null && data.length > 0 && (
                <p className="text-sm text-gray-500 mb-3">{t('adminRecordsShown', { count: data.length })}</p>
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
                    onRefresh={() => loadTab(tab)}
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
  onRefresh,
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const title = venture.brandDetails?.brandName || t('adminVentureFallback', { id: venture.id });
  const listingMode = venture.listingMode || venture.listing_mode || 'VENTURE';
  const isCoVentureListing = listingMode === 'CO_VENTURE';
  const applications = venture.coVentureApplications || venture.co_venture_applications || [];
  const pitches = venture.acquisitionApplications || venture.acquisition_applications || [];
  const pitchCount = venture.pitchCount ?? pitches.length;
  const applicationCount = isCoVentureListing
    ? (venture.coVentureApplicationCount ?? venture.applicationCount ?? applications.length)
    : pitchCount;
  const isGstinVerified = Boolean(venture.verified || venture.gstinVerified);
  const showGstinVerify = true;
  const listingVerificationStatus = resolveVentureVerificationStatus(venture);
  const showListingVerificationSection = ['PENDING', 'APPROVED', 'REJECTED'].includes(
    listingVerificationStatus,
  );
  const listingApproval = venture.listingApprovalStatus || venture.listing_approval_status || 'PENDING_APPROVAL';
  const profileComplete = venture.companyProfileComplete
    ?? venture.companyProfile?.isComplete
    ?? venture.company_profile?.is_complete
    ?? false;
  const canApproveListing = listingApproval === 'PENDING_APPROVAL' && profileComplete;

  const forwardableApp = applications.find(a => a.status === 'PENDING')
    || applications.find(a => a.status === 'APPROVED')
    || applications[0];

  const handleVentureForward = (e) => {
    e.stopPropagation();
    if (!forwardableApp) {
      if (applicationCount > 0) {
        alert(i18n.t('adminVentureForwardNoApp'));
      } else {
        alert(i18n.t('adminVentureForwardNeedApp'));
      }
      return;
    }
    onForward(forwardableApp.id, 'COVENTURE');
  };

  return (
    <div className={`admin-record-card ${venture.takenDown ? '!border-red-200' : ''}`}>
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:px-5 sm:py-4 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="admin-record-title flex items-center gap-2 flex-wrap">
            {title}
            {venture.saleType === 'AUCTION' && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                {t('adminAuction')}
              </span>
            )}
            {venture.takenDown && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c86e6e', background: 'rgba(200,110,110,0.12)', border: '1px solid rgba(200,110,110,0.3)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                {t('adminTakenDown')}
              </span>
            )}
            <VerificationBadge verified={isGstinVerified} verifiedLabel={t('adminGstinVerified')} unverifiedLabel={t('adminGstinPending')} />
            {listingApproval === 'PENDING_APPROVAL' && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#b45309', background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.2)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                Pending approval
              </span>
            )}
            {listingApproval === 'APPROVED' && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                Live
              </span>
            )}
            {applicationCount > 0 && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#4f46e5', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                {isCoVentureListing
                  ? t('adminCoVentureApps', { count: applicationCount })
                  : `${applicationCount} bid${applicationCount !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>
          <div className="admin-record-id">
            {t('adminVentureId', { id: venture.id })}
          </div>
        </div>
        <span className="admin-expand-chevron px-1 shrink-0 self-start sm:self-center">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4 sm:px-5 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="min-w-0">
              <div className="admin-field-label">{t('adminLister')}</div>
              {venture.listedBy ? (
                <>
                  <div className="admin-field-value">{venture.listedBy.firstname} {venture.listedBy.lastname}</div>
                  <div className="admin-field-meta break-all">{venture.listedBy.email}</div>
                  <div className="admin-field-meta break-all">{venture.listedBy.phoneNumber || '—'}</div>
                </>
              ) : <div className="admin-field-value">—</div>}
            </div>
            <div>
              <div className="admin-field-label">{t('adminSaleType')}</div>
              <div className="admin-field-value">{venture.saleType || '—'}</div>
              {venture.dealType && (
                <div className="admin-field-meta">{venture.dealType.replace(/_/g, ' ')}</div>
              )}
            </div>
          </div>

          {(venture.brandDetails?.dealValue || venture.equityPercentOffered) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {venture.brandDetails?.dealValue != null && (
                <div>
                  <div className="admin-field-label">Asking price</div>
                  <div className="admin-field-value">{formatInr(venture.brandDetails.dealValue)}</div>
                </div>
              )}
              {venture.equityPercentOffered != null && (
                <div>
                  <div className="admin-field-label">
                    {isCoVentureListing ? 'Equity offer' : 'Ownership liquidation'}
                  </div>
                  <div className="admin-field-value">{formatEquityPercent(venture.equityPercentOffered)}%</div>
                </div>
              )}
            </div>
          )}

          {(venture.companyProfile?.currentYearRevenueInr != null
            || venture.companyProfile?.previousYearRevenueInr != null
            || venture.companyProfile?.twoYearsAgoRevenueInr != null) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {venture.companyProfile?.currentYearRevenueInr != null && (
                <div>
                  <div className="admin-field-label">Current year revenue</div>
                  <div className="admin-field-value">{formatInr(venture.companyProfile.currentYearRevenueInr)}</div>
                </div>
              )}
              {venture.companyProfile?.previousYearRevenueInr != null && (
                <div>
                  <div className="admin-field-label">Previous year revenue</div>
                  <div className="admin-field-value">{formatInr(venture.companyProfile.previousYearRevenueInr)}</div>
                </div>
              )}
              {venture.companyProfile?.twoYearsAgoRevenueInr != null && (
                <div>
                  <div className="admin-field-label">Revenue from two years ago</div>
                  <div className="admin-field-value">{formatInr(venture.companyProfile.twoYearsAgoRevenueInr)}</div>
                </div>
              )}
            </div>
          )}

          {showListingVerificationSection && (
            <div className="mb-4 rounded-lg border border-gray-200 p-3">
              <div className="admin-field-label admin-field-label--spaced">
                {t('adminVentureListingVerification')}
              </div>
              <p className="text-xs text-gray-500 mb-2">{t('adminVentureListingVerificationHint')}</p>
              <div className="text-sm text-gray-700 space-y-1">
                <div>{t('adminVentureListingVerificationStatus', { status: listingVerificationStatus })}</div>
                {venture.verificationVideoUrl && (
                  <div>
                    {t('adminVentureListingVerificationVideo')}:{' '}
                    <a href={venture.verificationVideoUrl} target="_blank" rel="noreferrer" className="admin-link">
                      {venture.verificationVideoUrl}
                    </a>
                  </div>
                )}
                {(venture.verificationDocuments || []).map((doc) => (
                  <div key={doc.id}>
                    {t('adminVentureListingVerificationDocument')}:{' '}
                    <a href={doc.fileUrl || doc.file_url} target="_blank" rel="noreferrer" className="admin-link">
                      {doc.fileName || doc.file_name || 'View'}
                    </a>
                  </div>
                ))}
              </div>
              {listingVerificationStatus === 'PENDING' && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    className="btn-secondary btn-sm text-[0.8rem]"
                    onClick={(e) => {
                      e.stopPropagation();
                      adminAPI.approveVentureVerification(venture.id).then(() => onRefresh?.());
                    }}
                  >
                    {t('adminVentureApproveListingVerification')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm text-[0.8rem]"
                    onClick={(e) => {
                      e.stopPropagation();
                      const reason = window.prompt(t('adminVentureListingVerificationRejectPrompt')) || '';
                      adminAPI.rejectVentureVerification(venture.id, reason).then(() => onRefresh?.());
                    }}
                  >
                    {t('adminVentureRejectListingVerification')}
                  </button>
                </div>
              )}
            </div>
          )}

          {venture.brandDetails?.website && (
            <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              <span className="admin-field-label admin-field-label--inline">{t('adminWebsite')}</span>{' '}
              <a href={venture.brandDetails.website} target="_blank" rel="noreferrer" className="admin-link">
                {venture.brandDetails.website}
              </a>
            </div>
          )}

          {venture.takenDown && venture.takeDownReason && (
            <div style={{ fontSize: '0.8rem', color: '#c86e6e', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              {t('adminTakedownReason', { reason: venture.takeDownReason })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-2 mb-4">
            {canApproveListing && (
              <>
                <button
                  type="button"
                  className="btn-secondary btn-sm w-full sm:w-auto text-[0.8rem]"
                  onClick={(e) => {
                    e.stopPropagation();
                    adminAPI.approveVenture(venture.id).then(() => onRefresh?.()).catch((err) => {
                      alert(err?.response?.data?.error || 'Approval failed.');
                    });
                  }}
                >
                  Approve Listing
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm w-full sm:w-auto text-[0.8rem]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const reason = window.prompt('Rejection reason (optional)') || '';
                    adminAPI.rejectVenture(venture.id, reason).then(() => onRefresh?.());
                  }}
                >
                  Reject Listing
                </button>
              </>
            )}
            {!profileComplete && listingApproval === 'PENDING_APPROVAL' && (
              <span className="text-xs text-amber-700 self-center">Company profile incomplete</span>
            )}
            {showGstinVerify && !venture.takenDown && onVerifyVenture && (
              <button
                type="button"
                className="btn-secondary btn-sm w-full sm:w-auto text-[0.8rem]"
                onClick={(e) => { e.stopPropagation(); onVerifyVenture(venture); }}
              >
                {isGstinVerified ? t('adminReverifyGstin') : t('adminVerifyGstin')}
              </button>
            )}
            {!venture.takenDown && (
              <button
                type="button"
                className="btn-secondary btn-sm w-full sm:w-auto text-[0.8rem]"
                onClick={handleVentureForward}
                title={forwardableApp ? t('adminForwardCoVentureTitle') : t('adminForwardRequiresApp')}
              >
                {t('adminForwardToCoBrother')}
              </button>
            )}
            {!venture.takenDown ? (
              <button
                type="button"
                className="btn-danger btn-sm w-full sm:w-auto text-[0.8rem]"
                onClick={(e) => { e.stopPropagation(); onTakeDown(venture.id, 'VENTURE', title); }}
              >
                {t('adminTakeDownVenture')}
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary btn-sm w-full sm:w-auto text-[0.75rem]"
                onClick={(e) => { e.stopPropagation(); onRestore(venture.id, 'VENTURE'); }}
              >
                {t('adminRestoreVenture')}
              </button>
            )}
          </div>

          {applicationCount > 0 && applications.length === 0 && isCoVentureListing && (
            <p style={{ fontSize: '0.82rem', color: '#b45309', marginBottom: '0.75rem' }}>
              {t('adminAppsNotLoaded', { count: applicationCount })}
            </p>
          )}

          {isCoVentureListing && applications.length > 0 ? (
            <div>
              <div className="admin-field-label admin-field-label--spaced">{t('adminCoVentureApplications')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {applications.map(app => (
                  <div
                    key={app.id}
                    style={{ padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                          {app.fullName || (app.applicant ? `${app.applicant.firstname || ''} ${app.applicant.lastname || ''}`.trim() : t('adminApplicant'))}
                        </div>
                        <div className="admin-field-meta">
                          {app.applicant?.email || '—'}
                          {app.phone ? ` · ${app.phone}` : ''}
                        </div>
                        <div className="admin-field-meta" style={{ marginTop: '0.2rem', fontSize: '0.72rem' }}>
                          {t('adminApplicationIdStatus', { id: app.id, status: app.status })}
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
                          {t('adminForwardToCoBrother')}
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
          ) : !isCoVentureListing && pitches.length > 0 ? (
            <div>
              <div className="admin-field-label admin-field-label--spaced">Buyer bids</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pitches.map((pitch) => (
                  <div
                    key={pitch.id}
                    style={{ padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                      {pitch.buyerName || pitch.buyer?.firstname || 'Buyer'}
                    </div>
                    <div className="admin-field-meta">
                      {pitch.buyerEmail || pitch.buyer?.email || '—'}
                    </div>
                    <div className="admin-field-meta" style={{ marginTop: '0.25rem' }}>
                      Offer: {formatInr(pitch.offeredAmount || 0)}
                      {pitch.requestedEquityPercent != null ? ` · ${formatEquityPercent(pitch.requestedEquityPercent)}% equity requested` : ''}
                    </div>
                    <div className="admin-field-meta" style={{ marginTop: '0.2rem', fontSize: '0.72rem' }}>
                      {t('adminApplicationIdStatus', { id: pitch.id, status: pitch.status })}
                    </div>
                    {pitch.investmentProposal && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem', marginBottom: 0, fontStyle: 'italic' }}>
                        {pitch.investmentProposal}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="admin-muted-note" style={{ margin: 0 }}>
              {isCoVentureListing ? t('adminNoCoVentureApps') : 'No buyer bids yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AdminRow({ item, tabType, onForward, onTakeDown, onRestore, onVerifyDomain, onVerifyVenture, onRefresh }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);

  const getTitle = () => {
    if (tabType === 'domains')    return (item.domainName || '') + (item.domainExtension || '');
    return item.name || `${t('adminFeeSoftware')} #${item.id}`;
  };

  const getType = () => {
    if (tabType === 'domains')    return 'DOMAIN';
    return 'COCREATION';
  };

  const lister    = item.listedBy;
  const applicant = item.purchasedBy;

  return (
    <div className={`admin-record-card ${item.takenDown ? '!border-red-200' : ''}`}>
      <div className="flex items-center gap-4 p-4 sm:px-5 sm:py-4 cursor-pointer"
           onClick={() => setExpanded(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="admin-record-title flex items-center gap-2 flex-wrap">
            {getTitle()}
            {item.takenDown && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c86e6e',
                             background: 'rgba(200,110,110,0.12)',
                             border: '1px solid rgba(200,110,110,0.3)',
                             padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                {t('adminTakenDown')}
              </span>
            )}
            {tabType === 'domains' && <DomainListingBadges item={item} />}
            {tabType === 'cocreations' && (
              <VerificationBadge
                verified={item.verified}
                verifiedLabel={t('adminTechVerified')}
                unverifiedLabel={t('adminPendingVerification')}
              />
            )}
          </div>
          <div className="admin-record-id">
            ID: {item.id}
            {tabType === 'domains' && item.askingPrice != null && (
              <> · {formatPrice(item.askingPrice)}</>
            )}
          </div>
        </div>
        <span className="admin-expand-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="admin-record-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
                        marginBottom: '1rem' }}>
            <div>
              <div className="admin-field-label">{t('adminLister')}</div>
              {lister ? (
                <>
                  <div className="admin-field-value">{lister.firstname} {lister.lastname}</div>
                  <div className="admin-field-meta">{lister.email}</div>
                  <div className="admin-field-meta">{lister.phoneNumber || '—'}</div>
                </>
              ) : <div className="admin-field-value">—</div>}
            </div>
            <div>
              <div className="admin-field-label">{t('adminBuyer')}</div>
              {applicant ? (
                <>
                  <div className="admin-field-value">{applicant.firstname} {applicant.lastname}</div>
                  <div className="admin-field-meta">{applicant.email}</div>
                  <div className="admin-field-meta">{applicant.phoneNumber || '—'}</div>
                </>
              ) : <div className="admin-field-value">{t('adminNotYet')}</div>}
            </div>
          </div>

          {item.takenDown && item.takeDownReason && (
            <div style={{ fontSize: '0.8rem', color: '#c86e6e', marginBottom: '0.75rem',
                          fontStyle: 'italic' }}>
              {t('adminTakedownReason', { reason: item.takeDownReason })}
            </div>
          )}

          {tabType === 'domains' && item.auction && (
            <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem', padding: '0.75rem',
                          background: 'rgba(124,58,237,0.06)', borderRadius: 8,
                          border: '1px solid rgba(124,58,237,0.15)' }}>
              <div className="admin-field-label" style={{ marginBottom: '0.5rem' }}>{t('adminDomainAuctionDetails')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                <div><span className="admin-field-meta">{t('adminDomainAuctionStatus')}</span><br />{item.auction.status}</div>
                <div><span className="admin-field-meta">{t('adminDomainAuctionMinBid')}</span><br />{formatPrice(item.auction.minBidPrice ?? 0)}</div>
                <div><span className="admin-field-meta">{t('adminDomainAuctionDuration')}</span><br />{item.auction.duration || '—'}</div>
                <div><span className="admin-field-meta">{t('adminDomainAuctionBids')}</span><br />{item.auction.totalBids ?? 0}</div>
              </div>
            </div>
          )}

          {tabType === 'cocreations' && (item.videoLink || item.githubLink || item.liveDemoLink) && (
            <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {item.videoLink && (
                <div>
                  <span className="admin-field-label admin-field-label--inline">{t('adminDemoVideo')}</span>{' '}
                  <a href={item.videoLink} target="_blank" rel="noreferrer" className="admin-link">
                    {item.videoLink}
                  </a>
                </div>
              )}
              {item.githubLink && (
                <div>
                  <span className="admin-field-label admin-field-label--inline">{t('adminGithub')}</span>{' '}
                  <a href={item.githubLink} target="_blank" rel="noreferrer" className="admin-link">
                    {item.githubLink}
                  </a>
                </div>
              )}
              {item.liveDemoLink && (
                <div>
                  <span className="admin-field-label admin-field-label--inline">{t('adminDemo')}</span>{' '}
                  <a href={item.liveDemoLink} target="_blank" rel="noreferrer" className="admin-link">
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
                        alert(i18n.t('adminTechMarkedVerified'));
                        onRefresh?.();
                      } catch (e) {
                        alert(e.response?.data?.error || i18n.t('adminMarkVerifiedFailed'));
                      }
                    }}
                  >
                    {t('adminMarkVerified')}
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
                  {item.verified ? t('adminReverifyDomain') : t('adminVerifyDomain')}
                </button>
                {domainNeedsMarkVerified(item) && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    style={{ fontSize: '0.8rem' }}
                    onClick={async () => {
                      try {
                        await adminAPI.markDomainVerified(item.id);
                        alert(i18n.t('adminDomainMarkedVerified'));
                        onRefresh?.();
                      } catch (e) {
                        alert(e.response?.data?.error || e.response?.data?.message || i18n.t('adminMarkVerifiedFailed'));
                      }
                    }}
                  >
                    {t('adminMarkVerified')}
                  </button>
                )}
              </>
            )}
            {!item.takenDown && (tabType === 'domains' || tabType === 'cocreations') && (
              <button className="btn-secondary btn-sm"
                onClick={() => onForward(item.id, getType())}
                style={{ fontSize: '0.8rem' }}>
                {t('adminForwardToCoBrother')}
              </button>
            )}
            {!item.takenDown ? (
              <button className="btn-danger btn-sm"
                onClick={() => onTakeDown(item.id, getType(), getTitle())}
                style={{ fontSize: '0.8rem' }}>
                {t('adminTakeDown')}
              </button>
            ) : (
              <button className="btn-secondary btn-sm"
                onClick={() => onRestore(item.id, getType())}
                style={{ fontSize: '0.75rem' }}>
                {t('adminRestore')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AuctionsAdminTable({ auctions }) {
  const { t } = useTranslation();
  if (!auctions.length) return (
    <div className="text-center py-20"><h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoAuctions')}</h3></div>
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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const domain = auction.domain || {};
  const domainName = domain.domainName || domain.domain_name || '';
  const domainExtension = domain.domainExtension || domain.domain_extension || '';
  const title = (
    auction.domainDisplayName
    || domain.fullDomain
    || `${domainName}${domainExtension}`.trim()
    || domainName
    || `${t('adminAuction')} #${String(auction.id || '').slice(0, 8)}`
  );
  const totalBids = auction.totalBids ?? auction.total_bids ?? 0;
  const currentHighestBid = Number(auction.currentHighestBid ?? auction.current_highest_bid ?? 0);
  const status = auction.status ?? '—';
  const winner = auction.currentWinner || null;
  const winnerName = winner
    ? `${winner.firstname || ''} ${winner.lastname || ''}`.trim() || winner.email
    : auction.currentWinnerName || null;

  return (
    <div className="admin-record-card">
      <div className="admin-record-row" onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div className="admin-record-title">
            {title}
          </div>
          <div className="admin-record-id">
            {t('adminBidsStatus', { count: totalBids, status })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`admin-price-amount ${currentHighestBid > 0 ? 'admin-price-amount--bid' : 'admin-price-amount--empty'}`}>
            {currentHighestBid > 0
              ? `${formatPrice(currentHighestBid)}`
              : t('adminNoBids')}
          </div>
          {winnerName && (
            <div className="admin-field-meta" style={{ fontSize: '0.72rem' }}>
              {winnerName}
            </div>
          )}
        </div>
        <span className="admin-expand-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="admin-record-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '1rem', marginBottom: '1rem' }}>
            <div><div className="admin-field-label">{t('adminLister')}</div>
              <div className="admin-field-value">
                {domain.listedBy?.firstname} {domain.listedBy?.lastname}
              </div>
              <div className="admin-field-meta">
                {domain.listedBy?.email}
              </div>
            </div>
            <div><div className="admin-field-label">{t('adminWinner')}</div>
              <div className="admin-field-value">
                {winnerName || '—'}
              </div>
              <div className="admin-field-meta">
                {winner?.email || ''}
              </div>
            </div>
            <div><div className="admin-field-label">{t('adminWinningBid')}</div>
              <div className="admin-price-amount admin-price-amount--lg admin-price-amount--bid">
                {currentHighestBid > 0
                  ? `${formatPrice(currentHighestBid)}`
                  : '—'}
              </div>
            </div>
          </div>

          {bids?.length > 0 && (
            <div>
              <div className="admin-field-label">{t('adminAllBids', { count: bids.length })}</div>
              <div className="admin-bids-panel">
                {bids.map((bid, i) => (
                  <div key={bid.id || i} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '0.4rem 0.5rem', fontSize: '0.8rem',
                                        borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ color: '#111827', fontWeight: 500 }}>
                      {bid.bidderName || bid.bidder_name}
                    </span>
                    <span style={{ color: (bid.isWinningBid || bid.is_winning_bid) ? '#059669' : '#7c3aed',
                                   fontWeight: 600 }}>
                      {formatPrice(bid.amount)}
                      {(bid.isWinningBid || bid.is_winning_bid) && ' 🏆'}
                    </span>
                    <span className="admin-field-meta" style={{ fontSize: '0.75rem' }}>
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
  const { t } = useTranslation();
  if (!auctions.length) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoCreatorAuctions')}</h3>
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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const title = auction.auctionTitle || community.name || `${t('adminTabCreatorAuctions')} #${auction.id}`;
  const totalBids = auction.totalBids ?? auction.total_bids ?? 0;
  const currentHighestBid = Number(auction.currentHighestBid ?? auction.current_highest_bid ?? 0);
  const winner = auction.currentWinner;
  const winnerName = winner
    ? `${winner.firstname || ''} ${winner.lastname || ''}`.trim() || winner.email
    : null;

  return (
    <div className="admin-record-card">
      <div className="admin-record-row" onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div className="admin-record-title">{title}</div>
          <div className="admin-record-id">
            {t('adminBidsStatus', { count: totalBids, status: auction.status })}
            {community.role ? ` · ${String(community.role).replace(/_/g, ' ')}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`admin-price-amount ${currentHighestBid > 0 ? 'admin-price-amount--bid' : 'admin-price-amount--empty'}`}>
            {currentHighestBid > 0 ? `${formatPrice(currentHighestBid)}` : t('adminNoBids')}
          </div>
          {winnerName && (
            <div className="admin-field-meta" style={{ fontSize: '0.72rem' }}>{winnerName}</div>
          )}
        </div>
        <span className="admin-expand-chevron">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="admin-record-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <div className="admin-field-label">{t('adminCreatorProfile')}</div>
              <div className="admin-field-value">{community.name || '—'}</div>
              <div className="admin-field-meta">{community.email || '—'}</div>
            </div>
            <div>
              <div className="admin-field-label">{t('adminWinner')}</div>
              <div className="admin-field-value">{winnerName || '—'}</div>
              <div className="admin-field-meta">{winner?.email || ''}</div>
            </div>
            <div>
              <div className="admin-field-label">{t('adminMinBid')}</div>
              <div className="admin-field-value">
                {formatPrice(auction.minBidPrice ?? auction.min_bid_price ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VentureAuctionsAdminTable({ auctions, onRefresh }) {
  const { t } = useTranslation();
  if (!auctions.length) return (
    <div className="text-center py-20"><h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoVentureAuctions')}</h3></div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {auctions.map((item) => {
        const auction = item.auction ?? item;
        const bids    = item.bids ?? [];
        return (
            <VentureAuctionAdminRow key={auction.id} auction={auction} bids={bids} onRefresh={onRefresh} />
        );
      })}
    </div>
  );
}

function VentureAuctionAdminRow({ auction, bids, onRefresh }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const venture = auction.venture || {};
  const brand   = venture.brandDetails || {};
  const isPending = auction.approvalStatus === 'PENDING_APPROVAL' || auction.approvalStatus === 'AWAITING_GSTIN';

  const handleApprove = async (e) => {
    e.stopPropagation();
    if (!confirm('Approve this venture auction and go live?')) return;
    setLoading(true);
    try {
      await ventureAuctionAPI.adminApprove(auction.id);
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Approval failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    const reason = prompt('Rejection reason (required):');
    if (!reason?.trim()) return;
    setLoading(true);
    try {
      await ventureAuctionAPI.adminReject(auction.id, reason.trim());
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Rejection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-record-card">
      <div className="admin-record-row" onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div className="admin-record-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {brand.brandName || t('adminVentureFallback', { id: auction.id })}
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed',
                           background: 'rgba(124,58,237,0.08)',
                           border: '1px solid rgba(124,58,237,0.25)',
                           padding: '0.15rem 0.45rem', borderRadius: 4 }}>
              {t('adminEquityAuction')}
            </span>
            {venture.verified && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669',
                             background: 'rgba(5,150,105,0.08)',
                             border: '1px solid rgba(5,150,105,0.25)',
                             padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                ✓ {t('adminGstinVerified')}
              </span>
            )}
          </div>
          <div className="admin-record-id">
            {t('adminBidsStatus', { count: auction.totalBids, status: auction.status })}
            {brand.industry && ` · ${brand.industry.replace(/_/g, ' ')}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`admin-price-amount ${auction.currentHighestBid > 0 ? 'admin-price-amount--bid' : 'admin-price-amount--empty'}`}>
            {auction.currentHighestBid > 0
              ? `${formatPrice(auction.currentHighestBid)}`
              : t('adminNoBids')}
          </div>
          {auction.currentWinner && (
            <div className="admin-field-meta" style={{ fontSize: '0.72rem' }}>
              {auction.currentWinner.firstname} {auction.currentWinner.lastname}
            </div>
          )}
        </div>
        <span className="admin-expand-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="admin-record-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '1rem', marginBottom: '1rem' }}>
            <div><div className="admin-field-label">{t('adminVentureOwner')}</div>
              <div className="admin-field-value">
                {venture.listedBy?.firstname} {venture.listedBy?.lastname}
              </div>
              <div className="admin-field-meta">
                {venture.listedBy?.email}
              </div>
            </div>
            <div><div className="admin-field-label">{t('adminCurrentWinner')}</div>
              <div className="admin-field-value">
                {auction.currentWinner
                  ? `${auction.currentWinner.firstname} ${auction.currentWinner.lastname}`
                  : '—'}
              </div>
              <div className="admin-field-meta">
                {auction.currentWinner?.email || ''}
              </div>
            </div>
            <div><div className="admin-field-label">{t('adminAuctionDetails')}</div>
              <div className="admin-field-value">
                {t('adminMin', { price: formatPrice(auction.minBidPrice || 0) })}
              </div>
              <div className="admin-field-meta">
                {t('adminDuration', { duration: auction.duration?.replace(/_/g, ' ') || '—' })}
              </div>
              <div className="admin-field-meta">
                {auction.startTime ? t('adminStart', { date: formatAuctionDate(auction.startTime) }) : ''}
              </div>
            </div>
          </div>

          {isPending && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button type="button" disabled={loading} onClick={handleApprove}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                Approve & Go Live
              </button>
              <button type="button" disabled={loading} onClick={handleReject}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                Reject
              </button>
            </div>
          )}

          {bids?.length > 0 && (
            <div>
              <div className="admin-field-label">{t('adminAllBids', { count: bids.length })}</div>
              <div className="admin-bids-panel">
                {bids.map((bid, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '0.4rem 0.5rem', fontSize: '0.8rem',
                                        borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ color: '#111827', fontWeight: 500 }}>{bid.bidderName}</span>
                    <span style={{ color: bid.isWinningBid ? '#059669' : '#7c3aed',
                                   fontWeight: 600 }}>
                      {formatPrice(bid.amount)}
                      {bid.isWinningBid && ' 🏆'}
                    </span>
                    <span className="admin-field-meta" style={{ fontSize: '0.75rem' }}>
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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  if (enquiries.length === 0) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{t('adminNoDomainEnquiries')}</h3>
      <p className="text-gray-600">{t('adminDomainEnquiriesHint')}</p>
    </div>
  );

  const ENQUIRY_STATUS = { PENDING: '#b45309', FORWARDED: '#7c3aed', CLOSED: '#059669' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {enquiries.map(e => (
        <div key={e.id} className="admin-record-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <div className="admin-record-title">
                {e.domain?.domainName}{e.domain?.domainExtension}
              </div>
              <div className="admin-record-id">
                {formatPrice(e.domain?.askingPrice || 0)}
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700,
                           color: ENQUIRY_STATUS[e.status] || '#6b7280' }}>
              {e.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <div className="admin-field-label">{t('adminEnquirer')}</div>
              <div className="admin-field-value">{e.fullName}</div>
              <div className="admin-field-meta">{e.email}</div>
              <div className="admin-field-meta">{e.phone}</div>
            </div>
            <div>
              <div className="admin-field-label">{t('adminDomainLister')}</div>
              <div className="admin-field-value">
                {e.domain?.listedBy?.firstname} {e.domain?.listedBy?.lastname}
              </div>
              <div className="admin-field-meta">{e.domain?.listedBy?.email}</div>
            </div>
          </div>

          {e.message && (
            <div className="admin-quote">
              "{e.message}"
            </div>
          )}

          {e.status === 'PENDING' && (
            <button className="btn-secondary btn-sm"
              onClick={() => onForward(e.id, 'DOMAIN_ENQUIRY')}
              style={{ fontSize: '0.8rem' }}>
              {t('adminForwardToCoBrother')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function RequestsTable({ requests }) {
  const { t } = useTranslation();
  if (requests.length === 0) return (
    <div className="text-center py-20"><h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoCoBrotherRequests')}</h3></div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {requests.map(r => (
        <div key={r.id} className="admin-record-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <span className="admin-record-title">{r.entityTitle}</span>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                {formatAdminRequestType(r.requestType, t)}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700,
                           color: STATUS_COLORS[r.status] || '#6b7280' }}>
              {r.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="admin-field-meta">
            {t('adminListerLine', { name: r.listerName, email: r.listerEmail })}
          </div>
          {r.applicantName && (
            <div className="admin-field-meta">
              {t('adminApplicantLine', { name: r.applicantName, email: r.applicantEmail })}
            </div>
          )}
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>
            {t('adminCoBrotherLine', { first: r.assignedCoBrother?.firstname, last: r.assignedCoBrother?.lastname })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ForwardModal({ entityId, type, coBrothers, requests, onForward, onClose }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
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
      alert(i18n.t('adminNoCoBrotherYet'));
      return;
    }
    if (!selectedCoBrother) { alert(i18n.t('adminSelectCoBrotherAlert')); return; }
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
          <div className="modal-badge">{t('adminForwardModalBadge')}</div>
          <h2>{t('adminAssignCoBrother')}</h2>
          <p>{t('adminForwardSelectDesc', { type: formatAdminRequestType(type, t).toLowerCase() })}</p>
        </div>

        {noCoBrothers && (
          <div style={{ padding: '0.875rem', background: 'rgba(200,110,110,0.08)',
                        border: '1px solid rgba(200,110,110,0.25)', borderRadius: 8,
                        marginBottom: '1rem', fontSize: '0.83rem', color: '#c86e6e' }}>
            {t('adminNoCoBrotherAccounts')}
          </div>
        )}

        {!noCoBrothers && alreadyAccepted && (
          <div style={{ padding: '0.875rem', background: 'rgba(200,110,110,0.08)',
                        border: '1px solid rgba(200,110,110,0.25)', borderRadius: 8,
                        marginBottom: '1rem', fontSize: '0.83rem', color: '#c86e6e' }}>
            {t('adminAlreadyAccepted')}
          </div>
        )}

        {!noCoBrothers && !alreadyAccepted && pendingPayment && (
          <div className="admin-alert-banner admin-alert-banner--warning">
            {t('adminPendingPayment')}
          </div>
        )}

        <div className="form-group" style={{ margin: '1rem 0' }}>
          <label className="admin-form-label">{t('adminSelectCoBrother')}</label>
          <select value={selectedCoBrother} onChange={e => setSelectedCoBrother(e.target.value)} disabled={noCoBrothers}>
            <option value="">{t('adminChooseCoBrother')}</option>
            {coBrothers.map(cb => {
              const alreadyAssigned = activeRequests.some(r => String(r.assignedCoBrother?.id) === String(cb.id));
              return (
                <option key={cb.id} value={cb.id} disabled={alreadyAssigned}>
                  {cb.firstname} {cb.lastname} ({cb.email})
                  {alreadyAssigned ? t('adminAlreadyAssigned') : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="admin-alert-banner admin-alert-banner--warning" style={{ marginBottom: '1.25rem' }}>
          <span>{t('adminPaymentRequestNote', { amount: formatPrice(1000) })}</span>
          {' '}
          <LearnMoreTooltip>
            {t('adminPaymentLearnMore', { amount: formatPrice(1000) })}
          </LearnMoreTooltip>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={handleSubmit}
            disabled={loading || noCoBrothers || !selectedCoBrother || alreadyAccepted || pendingPayment}
            style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : t('adminSendPaymentRequest')}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}

function TakeDownModal({ target, onConfirm, onClose }) {
  const { t } = useTranslation();
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { alert(i18n.t('adminReasonRequired')); return; }
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
            {t('adminTakeDownModalBadge')}
          </div>
          <h2>{target.title}</h2>
          <p>{target.type}</p>
        </div>

        <div style={{ padding: '0.875rem', background: 'rgba(200,110,110,0.07)',
                      border: '1px solid rgba(200,110,110,0.2)', borderRadius: 8,
                      marginBottom: '1.25rem', fontSize: '0.83rem', color: '#c86e6e' }}>
          {t('adminTakeDownWarning')}
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="admin-form-label">
            {t('adminReason')} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder={t('adminReasonPlaceholder')}
            rows={3} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-danger" onClick={handleSubmit}
            disabled={loading || !reason.trim()} style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : t('adminConfirmTakedown')}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Meetings Admin Tab ───────────────────────────────────────────────────────
function MeetingsAdminTab({ meetings }) {
  const { t } = useTranslation();
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
    PENDING:   { color: '#b45309', label: t('adminMeetingPending')   },
    CONFIRMED: { color: '#059669', label: t('adminMeetingConfirmed')  },
    CANCELLED: { color: '#dc2626', label: t('adminMeetingCancelled')  },
    COMPLETED: { color: '#4b5563', label: t('adminMeetingCompleted')  },
  };

  if (meetings.length === 0) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoMeetings')}</h3>
      <p className="text-gray-600 mt-1">{t('adminMeetingsHint')}</p>
    </div>
  );

  return (
    <div>
      {/* Sub-filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all',      label: t('adminMeetingsAll', { count: meetings.length }) },
          { id: 'ongoing',  label: t('adminMeetingsOngoing', { count: countOngoing }) },
          { id: 'upcoming', label: t('adminMeetingsUpcoming', { count: countUpcoming }) },
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
        <div className="text-center py-16 text-gray-400 text-sm">{t('adminNoMeetingsFilter')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(m => {
            const cat    = categorise(m);
            const sc     = MEETING_STATUS[m.status] || { color: '#6b7280', label: m.status };
            const lister    = m.lister    || {};
            const requester = m.requester || {};

            return (
              <div key={m.id} className={`admin-record-card ${
                cat === 'ongoing' ? 'admin-meeting-card--ongoing'
                : cat === 'upcoming' ? 'admin-meeting-card--upcoming'
                : 'admin-meeting-card--past'
              }`} style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Left: topic + participants */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                        {m.topic || t('adminNoTopic')}
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
                          {t('adminLiveNow')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div>
                        <div className="admin-field-label">{t('adminProfileOwner')}</div>
                        <div className="admin-field-value">{lister.firstname || lister.firstName || '—'} {lister.lastname || lister.lastName || ''}</div>
                        <div className="admin-field-meta">{lister.email || '—'}</div>
                      </div>
                      <div>
                        <div className="admin-field-label">{t('adminRequester')}</div>
                        <div className="admin-field-value">{requester.firstname || requester.firstName || '—'} {requester.lastname || requester.lastName || ''}</div>
                        <div className="admin-field-meta">{requester.email || '—'}</div>
                      </div>
                    </div>

                    {m.message && (
                      <div className="admin-quote" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
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
                          {t('adminJoinGoogleMeet')}
                        </a>
                        {m.calendarEventLink && (
                          <a href={m.calendarEventLink} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.7rem', color: '#1a73e8', textDecoration: 'none' }}>
                            {t('adminCalendarEvent')}
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
  const { t } = useTranslation();
  if (!orders.length) return (
    <div className="text-center py-20">
      <h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoAddonOrders')}</h3>
      <p className="text-gray-600 mt-2">{t('adminAddonOrdersHint')}</p>
    </div>
  );

  const STATUS_COLOR = {
    COMPLETED:       '#059669',
    CONTACT_PENDING: '#b45309',
    CREATED:         '#0284c7',
    FAILED:          '#dc2626',
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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const services = order.selectedServices ? order.selectedServices.split(',') : [];

  return (
    <div className="admin-record-card">
      <div className="admin-record-row" onClick={() => setExpanded(v => !v)}>
        <div style={{ flex: 1 }}>
          <div className="admin-record-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            #{order.id} — {order.buyerName || order.buyerEmail || '—'}
            <span style={{ fontSize: '0.68rem', fontWeight: 700,
                           color: order.purchaseType === 'DOMAIN' ? '#0369a1' : '#7c3aed',
                           background: order.purchaseType === 'DOMAIN' ? 'rgba(3,105,161,0.08)' : 'rgba(124,58,237,0.08)',
                           border: `1px solid ${order.purchaseType === 'DOMAIN' ? 'rgba(3,105,161,0.25)' : 'rgba(124,58,237,0.25)'}`,
                           padding: '0.15rem 0.45rem', borderRadius: 4 }}>
              {order.purchaseType}
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700,
                           color: statusColor[order.paymentStatus] || '#6b7280',
                           background: 'rgba(0,0,0,0.04)',
                           border: '1px solid rgba(0,0,0,0.1)',
                           padding: '0.15rem 0.45rem', borderRadius: 4 }}>
              {order.paymentStatus?.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="admin-record-id">
            {order.buyerEmail || '—'}
            {order.buyerPhone ? ` · ${order.buyerPhone}` : ''}
          </div>
          <div className="admin-field-meta" style={{ marginTop: '0.15rem' }}>
            {t('adminServicesCount', { count: services.length })} · {formatPrice(order.totalAmount || 0)}
            {order.createdAt && ` · ${formatAuctionDate(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="admin-price-amount" style={{ color: statusColor[order.paymentStatus] || '#6b7280' }}>
            {formatPrice(order.totalAmount || 0)}
          </div>
        </div>
        <span className="admin-expand-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="admin-record-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div className="admin-field-label">{t('adminBuyer')}</div>
              <div className="admin-field-value">{order.buyerName || '—'}</div>
              <div className="admin-field-meta">{order.buyerEmail || '—'}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.15rem' }}>
                {t('adminPhone', { phone: order.buyerPhone
                  || order.buyer?.phoneNumber
                  || order.buyer?.phone_number
                  || '—' })}
              </div>
            </div>
            <div>
              <div className="admin-field-label">{t('adminLinkedPurchase')}</div>
              <div className="admin-field-value">{order.purchaseType} #{order.purchaseId}</div>
              <div className="admin-field-meta">{t('adminAddonOrder', { id: order.id })}</div>
            </div>
            <div>
              <div className="admin-field-label">{t('adminPayment')}</div>
              <div className="admin-field-value" style={{ color: statusColor[order.paymentStatus] || '#6b7280' }}>
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
              <div className="admin-field-label">{t('adminServicesSelected')}</div>
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

