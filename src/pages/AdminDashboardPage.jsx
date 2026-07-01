import { useState, useEffect, useCallback, useContext, useMemo, useRef, createContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import '../styles/admin-panel.css';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Cpu,
  FileQuestion,
  Filter,
  Gauge,
  Globe,
  Headset,
  Inbox,
  Info,
  LayoutDashboard,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
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
import { unwrapApiData } from '../utils/apiResponse';
import { readApiError } from '../utils/apiError';
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

function domainNeedsMarkUnverified(item) {
  const isAuction = domainListingType(item) === 'domain_auction';
  const status = String(item.verificationStatus ?? (item.verified ? 'VERIFIED' : 'PENDING')).toUpperCase();
  if (isAuction) {
    return status === 'VERIFIED';
  }
  return !!item.verified || status === 'VERIFIED';
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

// ─────────────────────────────────────────────────────────────────────────────
// Inline toast notifications (replaces alert() on in-scope admin actions).
// Lives inside this file so no new component/folder is created.
// ─────────────────────────────────────────────────────────────────────────────

const AdminToastContext = createContext(null);

const ADMIN_TOAST_TONE = {
  success: { Icon: CheckCircle2, border: 'border-emerald-200', iconColor: 'text-emerald-600', text: 'text-emerald-900' },
  error:   { Icon: XCircle,      border: 'border-red-200',     iconColor: 'text-red-600',     text: 'text-red-900' },
  info:    { Icon: Info,         border: 'border-indigo-200',  iconColor: 'text-indigo-600',  text: 'text-gray-900' },
};

function AdminToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed right-4 top-4 z-[1100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const tone = ADMIN_TOAST_TONE[toast.type] || ADMIN_TOAST_TONE.info;
        const Icon = tone.Icon;
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-xl border ${tone.border} bg-white p-3 text-sm shadow-lg ring-1 ring-black/5`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconColor}`} aria-hidden />
            <p className={`min-w-0 flex-1 leading-5 ${tone.text}`}>{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useAdminToastInternal() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, { duration = 4500 } = {}) => {
      if (!message) return null;
      idRef.current += 1;
      const id = idRef.current;
      setToasts((current) => [...current, { id, type, message }]);
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const api = useMemo(
    () => ({
      push,
      success: (message, opts) => push('success', message, opts),
      error:   (message, opts) => push('error', message, opts),
      info:    (message, opts) => push('info', message, opts),
      dismiss,
    }),
    [push, dismiss],
  );

  return { toasts, dismiss, api };
}

function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  if (!ctx) {
    return {
      push: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline pending-counts aggregator. Reads existing admin endpoints only.
// Used by the Overview header chips and the Review queue tab.
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_ADMIN_PENDING = Object.freeze({
  ventures: 0,
  softwareAuctions: 0,
  technologies: 0,
  domains: 0,
  domainEnquiries: 0,
  cobrotherPayments: 0,
  operations: 0,
});

function isUnverifiedTechnology(item) {
  if (item?.takenDown || item?.taken_down) return false;
  return !item?.verified;
}

function isPendingDomainVerification(item) {
  if (item?.takenDown || item?.taken_down) return false;
  const status = String(item?.verificationStatus ?? '').toUpperCase();
  if (status === 'VERIFIED' || status === 'REJECTED') return false;
  if (status === 'PENDING') return true;
  return !item?.verified;
}

function isPendingDomainEnquiry(item) {
  const status = String(item?.status ?? '').toUpperCase();
  return status === 'PENDING' || status === '' || status === 'NEW';
}

function isPendingCoBrotherPayment(item) {
  const status = String(item?.status ?? '').toUpperCase();
  return status === 'PAYMENT_PENDING';
}

function isPendingOperationsRequest(item) {
  const status = String(item?.status ?? '').toUpperCase();
  return status === 'PENDING' || status === 'NEW';
}

async function safeAdminCount(promise, predicate) {
  try {
    const response = await promise;
    const list = extractAdminList(response?.data);
    if (!predicate) return list.length;
    return list.filter(predicate).length;
  } catch {
    return 0;
  }
}

function useAdminPendingCounts({ enabled = true, intervalMs = 90000 } = {}) {
  const [counts, setCounts] = useState(EMPTY_ADMIN_PENDING);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const inflightRef = useRef(false);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refresh = useCallback(async () => {
    if (!enabledRef.current) return;
    if (inflightRef.current) return;
    inflightRef.current = true;
    if (mountedRef.current) setRefreshing(true);

    const updateOne = (key, value) => {
      if (!mountedRef.current) return;
      setCounts((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
    };

    // Update each count independently as it arrives — no waiting on the
    // slowest endpoint to show progress on the others.
    await Promise.allSettled([
      safeAdminCount(adminAPI.getPendingVentures()).then((v) => updateOne('ventures', v)),
      safeAdminCount(adminAPI.getPendingSoftwareAuctions()).then((v) => updateOne('softwareAuctions', v)),
      safeAdminCount(adminAPI.getTechnologies(), isUnverifiedTechnology).then((v) => updateOne('technologies', v)),
      safeAdminCount(adminAPI.getDomains(), isPendingDomainVerification).then((v) => updateOne('domains', v)),
      safeAdminCount(adminAPI.getDomainEnquiries(), isPendingDomainEnquiry).then((v) => updateOne('domainEnquiries', v)),
      safeAdminCount(adminAPI.getCoBrotherRequests(), isPendingCoBrotherPayment).then((v) => updateOne('cobrotherPayments', v)),
      safeAdminCount(operationsAdminAPI.listRequests(), isPendingOperationsRequest).then((v) => updateOne('operations', v)),
    ]);

    if (mountedRef.current) {
      setRefreshing(false);
      setInitialLoading(false);
      setLastFetchedAt(Date.now());
    }
    inflightRef.current = false;
  }, []); // intentionally empty — uses refs to avoid the infinite re-run loop.

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setInitialLoading(false);
      return undefined;
    }
    refresh();
    if (!intervalMs || intervalMs <= 0) return undefined;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') refresh();
    }, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      window.clearInterval(id);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [enabled, intervalMs, refresh]);

  const total =
    counts.ventures +
    counts.softwareAuctions +
    counts.technologies +
    counts.domains +
    counts.domainEnquiries +
    counts.cobrotherPayments +
    counts.operations;

  return { counts, total, loading: initialLoading, refreshing, lastFetchedAt, refresh };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { toasts: toastList, dismiss: dismissToast, api: toast } = useAdminToastInternal();
  const [tab, setTab]                       = useState('overview');
  const [cocreationsSubTab, setCocreationsSubTab] = useState('listings');
  const [venturesSubTab, setVenturesSubTab]       = useState('all');
  const [data, setData]                     = useState([]);
  const [coBrothers, setCoBrothers]         = useState([]);
  const [requests, setRequests]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [forwardModal, setForwardModal]     = useState(null);
  const [takeDownTarget, setTakeDownTarget] = useState(null);
  const [verifyDomain, setVerifyDomain]   = useState(null);
  const [verifyVenture, setVerifyVenture] = useState(null);
  const [listCount, setListCount]         = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const {
    counts: pendingCounts,
    total: pendingTotal,
    loading: pendingLoading,
    refreshing: pendingRefreshing,
    lastFetchedAt: pendingLastFetchedAt,
    refresh: refreshPendingCounts,
  } = useAdminPendingCounts({ enabled: tab !== 'fees-charges' && tab !== 'domain-transfers' && tab !== 'venture-deals' });

  const loadTab = (currentTab, options = {}) => {
    const { silent = false } = options;
    const fetchers = {
      ventures:            adminAPI.getVentures,
      domains:             adminAPI.getDomains,
      'domain-enquiries':  adminAPI.getDomainEnquiries,
      cocreations:         cocreationsSubTab === 'payouts' ? adminAPI.getTechnologyTransfers : adminAPI.getTechnologies,
      auctions:            adminAPI.getAllAuctions,
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
        if (currentTab === 'addon-orders') {
          rows = normalizeAddonOrders(rows);
        }
        setData(rows);
        setListCount(rows.length);
      })
      .catch((e) => {
        setData([]);
        setListCount(0);
        toast.error(readApiError(e, t('adminLoadFailed', { tab: currentTab })));
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
    let cancelled = false;
    setStatsLoading(true);
    adminAPI
      .getDashboard()
      .then((response) => {
        if (cancelled) return;
        const payload = unwrapApiData(response);
        setDashboardStats(payload && typeof payload === 'object' ? payload : {});
      })
      .catch(() => {
        if (!cancelled) setDashboardStats({});
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab');
    const allowedTabs = new Set([
      'overview',
      'review-queue',
      'ventures',
      'domains',
      'domain-enquiries',
      'cocreations',
      'requests',
      'auctions',
      'meetings',
      'operations',
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
  }, [tab, cocreationsSubTab]);


  const handleForward = async (entityId, type, coBrotherId) => {
    try {
      const { data } = await adminAPI.forward({ entityId, type, coBrotherId });
      toast.success(data?.message || t('adminPaymentSent'));
      setForwardModal(null);
      adminAPI.getCoBrotherRequests()
        .then(({ data }) => setRequests(asArray(data)));
      refreshPendingCounts();
    } catch (e) {
      toast.error(e.response?.data?.error || t('adminForwardFailed'));
    }
  };

  const handleTakeDown = (entityId, type, title) =>
    setTakeDownTarget({ entityId, type, title });

  const confirmTakeDown = async (reason) => {
    try {
      const { data } = await adminAPI.takeDown(takeDownTarget.type, takeDownTarget.entityId, reason);
      if (data?.success === false) {
        toast.error(data?.error || t('adminTakeDownFailed'));
        return;
      }
      setTakeDownTarget(null);
      loadTab(tab);
      refreshPendingCounts();
      toast.success(t('adminTakeDownSuccess', { defaultValue: 'Listing taken down.' }));
    } catch (e) {
      toast.error(e.response?.data?.error || t('adminTakeDownFailed'));
    }
  };

  const handleRestore = async (entityId, type) => {
    try {
      const { data } = await adminAPI.restore(type, entityId);
      if (data?.success === false) {
        toast.error(data?.error || t('adminRestoreFailed'));
        return;
      }
      loadTab(tab);
      refreshPendingCounts();
      toast.success(t('adminRestoreSuccess', { defaultValue: 'Listing restored.' }));
    } catch (e) {
      toast.error(e.response?.data?.error || t('adminRestoreFailed'));
    }
  };

  const tabs = [
    { id: 'overview',           label: t('adminTabOverview', { defaultValue: 'Overview' }),       icon: null, Icon: LayoutDashboard, badge: pendingTotal },
    { id: 'review-queue',       label: t('adminTabReviewQueue', { defaultValue: 'Review queue' }), icon: null, Icon: Inbox,           badge: pendingTotal },
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
      <AdminToastContext.Provider value={toast}>
      <div className="admin-page w-full min-w-0 max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex items-start gap-3 sm:gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200 sm:flex">
                <Gauge size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 m-0 break-words">
                  {t('adminDashboardTitle')}
                </h1>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">{t('adminDashboardSubtitle')}</p>
                <AdminPendingChips
                  counts={pendingCounts}
                  total={pendingTotal}
                  loading={pendingLoading}
                  onJump={setTab}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  refreshPendingCounts();
                  if (tab !== 'overview' && tab !== 'review-queue') loadTab(tab, { silent: true });
                }}
                disabled={pendingRefreshing}
                aria-busy={pendingRefreshing || undefined}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw size={14} strokeWidth={2.2} className={pendingRefreshing ? 'animate-spin' : ''} aria-hidden />
                <span>
                  {pendingRefreshing
                    ? t('adminRefreshing', { defaultValue: 'Refreshing…' })
                    : t('adminRefresh', { defaultValue: 'Refresh' })}
                </span>
              </button>
              <Link
                to="/analytics"
                className="dashboard-admin-header__btn dashboard-admin-header__btn--primary shadow-sm"
              >
                <BarChart3 size={16} strokeWidth={2} aria-hidden />
                <span>{t('adminViewAnalytics', { defaultValue: 'View analytics' })}</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 -mx-1 sm:mx-0 min-w-0">
          <div className="admin-dashboard-tabs">
            {tabs.map(tabItem => {
              const isPrimary = tabItem.id === 'overview' || tabItem.id === 'review-queue';
              const badgeValue = tabItem.badge && tabItem.badge > 0 ? tabItem.badge : null;
              return (
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
                  {isPrimary && badgeValue ? (
                    <span
                      aria-label={`${badgeValue} pending`}
                      className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200"
                    >
                      {badgeValue > 99 ? '99+' : badgeValue}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="admin-page-content bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 text-gray-900 min-w-0 overflow-hidden"
          data-admin-section={tab}
        >
          {tab === 'cocreations' && (
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl mb-5 w-fit border border-gray-200 shadow-inner">
              <button
                type="button"
                className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 ${
                  cocreationsSubTab === 'listings' 
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
                onClick={() => setCocreationsSubTab('listings')}
              >
                Listing Verifications (Unsold)
              </button>
              <button
                type="button"
                className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 ${
                  cocreationsSubTab === 'payouts' 
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
                onClick={() => setCocreationsSubTab('payouts')}
              >
                Sales & Payouts (Sold)
              </button>
            </div>
          )}

          {tab === 'ventures' && (() => {
            const totalCount = data.length;
            const coVentureCount = data.filter(item => item.listingMode === 'CO_VENTURE' || item.listing_mode === 'CO_VENTURE').length;
            const ventureCount = totalCount - coVentureCount;
            return (
              <div className="operations-section-tabs-wrap">
                <p className="operations-section-tabs-eyebrow">
                  Venture Categories & Filters
                </p>
                <div className="operations-section-tabs operations-section-tabs--admin operations-admin-partition-tabs mb-6" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={venturesSubTab === 'all'}
                    className={`operations-section-tab operations-section-tab--assistance ${venturesSubTab === 'all' ? 'is-active' : ''}`}
                    onClick={() => setVenturesSubTab('all')}
                  >
                    <span className="operations-section-tab-accent" aria-hidden />
                    <span className="operations-section-tab-main">
                      <span className="operations-section-tab-icon-wrap">
                        <ClipboardList size={18} strokeWidth={2} aria-hidden />
                      </span>
                      <span className="operations-section-tab-copy">
                        <span className="operations-section-tab-label">All Records</span>
                        <span className="operations-section-tab-hint">Every registered venture & partner request</span>
                      </span>
                    </span>
                    <span className="operations-section-tab-count">{totalCount}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={venturesSubTab === 'ventures'}
                    className={`operations-section-tab operations-section-tab--compliance ${venturesSubTab === 'ventures' ? 'is-active' : ''}`}
                    onClick={() => setVenturesSubTab('ventures')}
                  >
                    <span className="operations-section-tab-accent" aria-hidden />
                    <span className="operations-section-tab-main">
                      <span className="operations-section-tab-icon-wrap">
                        <Briefcase size={18} strokeWidth={2} aria-hidden />
                      </span>
                      <span className="operations-section-tab-copy">
                        <span className="operations-section-tab-label">Standard Ventures</span>
                        <span className="operations-section-tab-hint">Venture profiles, equity sales & pitches</span>
                      </span>
                    </span>
                    <span className="operations-section-tab-count">{ventureCount}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={venturesSubTab === 'coventures'}
                    className={`operations-section-tab operations-section-tab--requests ${venturesSubTab === 'coventures' ? 'is-active' : ''}`}
                    onClick={() => setVenturesSubTab('coventures')}
                  >
                    <span className="operations-section-tab-accent" aria-hidden />
                    <span className="operations-section-tab-main">
                      <span className="operations-section-tab-icon-wrap">
                        <UsersRound size={18} strokeWidth={2} aria-hidden />
                      </span>
                      <span className="operations-section-tab-copy">
                        <span className="operations-section-tab-label">CoVentures</span>
                        <span className="operations-section-tab-hint">Co-branding partnerships & applications</span>
                      </span>
                    </span>
                    <span className="operations-section-tab-count">{coVentureCount}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {tab === 'overview' && (
            <AdminOverviewSection
              stats={dashboardStats}
              statsLoading={statsLoading}
              counts={pendingCounts}
              countsLoading={pendingLoading}
              total={pendingTotal}
              onJump={setTab}
            />
          )}

          {tab === 'review-queue' && (
            <AdminReviewQueueSection
              counts={pendingCounts}
              loading={pendingLoading}
              onJump={setTab}
              onRefresh={refreshPendingCounts}
            />
          )}

          {tab === 'fees-charges' && (
            <AdminFeesAndChargesTab />
          )}

          {tab === 'venture-deals' && (
            <VentureDealsAdminTab />
          )}

          {tab !== 'overview' && tab !== 'review-queue' && tab !== 'fees-charges' && tab !== 'venture-deals' && (
            loading ? (
              <PageContentSkeleton variant="table" rows={7} />
            ) : tab === 'domain-enquiries' ? (
              <DomainEnquiriesTable
                enquiries={data}
                onForward={(entityId, type) => setForwardModal({ entityId, type })}
              />
            ) : tab === 'auctions' ? (
              <AuctionsAdminTable auctions={data} />
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
                <HomepageFeatureSelector type="coventure" />
                <HomepageFeatureSelector type="software" />
                <HomepageFeatureSelector type="community" />
                <HomepageFeatureSelector type="auction" />
              </div>
            ) : tab === 'domain-transfers' ? (
              <DomainTransferAdminTab />
            ) : tab === 'requests' ? (
              <RequestsTable requests={requests} />
            ) : tab === 'cocreations' && cocreationsSubTab === 'payouts' ? (
              <DomainTransferAdminTab isTechnologyOnly={true} />
            ) : data.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoRecords')}</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {listCount != null && data.length > 0 && (
                  <p className="text-sm text-gray-500 mb-3">{t('adminRecordsShown', { count: data.length })}</p>
                )}
                {data.filter(item => {
                  if (tab !== 'ventures') return true;
                  if (venturesSubTab === 'all') return true;
                  const isCoVenture = item.listingMode === 'CO_VENTURE' || item.listing_mode === 'CO_VENTURE';
                  if (venturesSubTab === 'coventures') return isCoVenture;
                  if (venturesSubTab === 'ventures') return !isCoVenture;
                  return true;
                }).map(item => (
                  tab === 'ventures' ? (
                    <VentureAdminRow
                      key={`venture-${item.id}`}
                      venture={item}
                      onForward={(entityId, type) => setForwardModal({ entityId, type })}
                      onTakeDown={handleTakeDown}
                      onRestore={handleRestore}
                      onVerifyVenture={setVerifyVenture}
                      onRefresh={() => {
                        loadTab(tab, { silent: true });
                        refreshPendingCounts();
                      }}
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
                      onRefresh={() => {
                        loadTab(tab, { silent: true });
                        refreshPendingCounts();
                      }}
                    />
                  )
                ))}
              </div>
            )
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

      <AdminToastStack toasts={toastList} onDismiss={dismissToast} />
      </AdminToastContext.Provider>
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
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const title = venture.brandDetails?.brandName || t('adminVentureFallback', { id: venture.id });
  const listingMode = venture.listingMode || venture.listing_mode || 'VENTURE';
  const isCoVentureListing = listingMode === 'CO_VENTURE';
  const applications = venture.coVentureApplications || venture.co_venture_applications || [];
  const pitches = venture.pitches || venture.acquisitionApplications || venture.acquisition_applications || [];
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
  const submissionRows = isCoVentureListing ? applications : pitches;
  const submissionTitle = isCoVentureListing ? t('adminCoVentureApplications') : 'Buyer bids';
  const submissionEmpty = isCoVentureListing ? t('adminNoCoVentureApps') : 'No buyer bids yet.';

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
                {t('adminVentureVerificationReview', 'Document/video verification')}
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {t('adminVentureVerificationReviewHint', 'Review seller proof separately from marketplace listing approval.')}
              </p>
              <div className="text-sm text-gray-700 space-y-1">
                <div>{t('adminVentureVerificationStatus', 'Verification status')}: {listingVerificationStatus}</div>
                {venture.verificationVideoUrl && (
                  <div>
                    {t('adminVentureVerificationVideo', 'Verification video')}:{' '}
                    <a href={venture.verificationVideoUrl} target="_blank" rel="noreferrer" className="admin-link">
                      {venture.verificationVideoUrl}
                    </a>
                  </div>
                )}
                {(venture.verificationDocuments || []).map((doc) => (
                  <div key={doc.id}>
                    {t('adminVentureVerificationDocument', 'Verification document')}:{' '}
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
                    {t('adminVentureApproveVerification', 'Approve verification')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm text-[0.8rem]"
                    onClick={(e) => {
                      e.stopPropagation();
                      const reason = window.prompt(t('adminVentureVerificationRejectPrompt', 'Rejection reason (optional)')) || '';
                      adminAPI.rejectVentureVerification(venture.id, reason).then(() => onRefresh?.());
                    }}
                  >
                    {t('adminVentureRejectVerification', 'Reject verification')}
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

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="admin-field-label admin-field-label--spaced">{submissionTitle}</div>
                <p className="admin-muted-note" style={{ margin: 0 }}>
                  {submissionRows.length > 0
                    ? `${submissionRows.length} record${submissionRows.length !== 1 ? 's' : ''}`
                    : submissionEmpty}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm w-full sm:w-auto text-[0.8rem]"
                onClick={(e) => {
                  e.stopPropagation();
                  setSubmissionsOpen(true);
                }}
                disabled={submissionRows.length === 0}
              >
                View {submissionTitle.toLowerCase()}
              </button>
            </div>
          </div>

          {false ? (
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
          ) : false ? (
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
          ) : null}
        </div>
      )}

      {submissionsOpen && (
        <div
          className="fixed inset-0 z-[1050] bg-black/30"
          onClick={() => setSubmissionsOpen(false)}
          role="presentation"
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={submissionTitle}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4">
              <div className="min-w-0">
                <h3 className="m-0 text-base font-semibold text-gray-900">{submissionTitle}</h3>
                <p className="mt-1 text-xs text-gray-500 break-words">{title}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => setSubmissionsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {submissionRows.length === 0 ? (
                <p className="admin-muted-note" style={{ margin: 0 }}>{submissionEmpty}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {isCoVentureListing ? applications.map((app) => (
                    <div key={app.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900">
                            {app.fullName || (app.applicant ? `${app.applicant.firstname || ''} ${app.applicant.lastname || ''}`.trim() : t('adminApplicant'))}
                          </div>
                          <div className="admin-field-meta break-all">
                            {app.applicant?.email || 'N/A'}{app.phone ? ` - ${app.phone}` : ''}
                          </div>
                          <div className="admin-field-meta mt-1 text-[0.72rem]">
                            {t('adminApplicationIdStatus', { id: app.id, status: app.status })}
                          </div>
                        </div>
                        {!venture.takenDown && (
                          <button
                            type="button"
                            className="btn-secondary btn-sm text-[0.75rem]"
                            onClick={() => onForward(app.id, 'COVENTURE')}
                          >
                            {t('adminForwardToCoBrother')}
                          </button>
                        )}
                      </div>
                      {app.description && (
                        <p className="mt-2 mb-0 text-xs italic text-gray-500">{app.description}</p>
                      )}
                    </div>
                  )) : pitches.map((pitch) => (
                    <div key={pitch.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="font-semibold text-sm text-gray-900">
                        {pitch.buyerName || pitch.buyer?.firstname || 'Buyer'}
                      </div>
                      <div className="admin-field-meta break-all">
                        {pitch.buyerEmail || pitch.buyer?.email || 'N/A'}
                      </div>
                      <div className="admin-field-meta mt-1">
                        Offer: {formatInr(pitch.offeredAmount || 0)}
                        {pitch.requestedEquityPercent != null ? ` - ${formatEquityPercent(pitch.requestedEquityPercent)}% equity requested` : ''}
                      </div>
                      <div className="admin-field-meta mt-1 text-[0.72rem]">
                        {t('adminApplicationIdStatus', { id: pitch.id, status: pitch.status })}
                      </div>
                      {pitch.investmentProposal && (
                        <p className="mt-2 mb-0 text-xs italic text-gray-500">{pitch.investmentProposal}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function AdminRow({ item, tabType, onForward, onTakeDown, onRestore, onVerifyDomain, onVerifyVenture, onRefresh }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const adminToast = useAdminToast();
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
                        adminToast.success(i18n.t('adminTechMarkedVerified'));
                        onRefresh?.();
                      } catch (e) {
                        adminToast.error(e.response?.data?.error || i18n.t('adminMarkVerifiedFailed'));
                      }
                    }}
                  >
                    {t('adminMarkVerified')}
                  </button>
                )}
                {item.verified && (
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    style={{ fontSize: '0.8rem', border: '1px solid gray' }}
                    onClick={async () => {
                      try {
                        // Assuming you might need an API endpoint for this, we use a placeholder or handle it if it exists.
                        // I will assume adminAPI.markTechnologyUnverified doesn't exist yet, but I can add it to services.js
                        if (adminAPI.markTechnologyUnverified) {
                          await adminAPI.markTechnologyUnverified(item.id);
                          adminToast.success("Technology marked as unverified.");
                          onRefresh?.();
                        } else {
                          alert("markTechnologyUnverified API is not defined yet.");
                        }
                      } catch (e) {
                        adminToast.error(e.response?.data?.error || "Could not mark unverified.");
                      }
                    }}
                  >
                    Mark Unverified
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
                {domainNeedsMarkUnverified(item) && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    style={{ fontSize: '0.8rem' }}
                    onClick={async () => {
                      try {
                        await adminAPI.markDomainUnverified(item.id);
                        alert("Domain marked as unverified.");
                        onRefresh?.();
                      } catch (e) {
                        alert(e.response?.data?.error || e.response?.data?.message || "Could not mark unverified.");
                      }
                    }}
                  >
                    Mark Unverified
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
  const [filter, setFilter] = useState('ALL');

  if (!auctions.length) return (
    <div className="text-center py-20"><h3 className="font-display text-2xl font-bold text-gray-900">{t('adminNoAuctions')}</h3></div>
  );

  const filteredAuctions = auctions.filter((item) => {
    if (filter === 'ALL') return true;
    const auction = item.auction ?? item;
    return auction.status === filter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
        <span className="text-sm font-semibold text-gray-700">Filter Auctions:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="form-select text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="ALL">All Auctions</option>
          <option value="ACTIVE">Active</option>
          <option value="UNSOLD">Unsold</option>
          <option value="SOLD">Sold</option>
          <option value="DRAFT">Draft</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      
      {!filteredAuctions.length ? (
        <div className="text-center py-10 text-gray-500">No auctions found matching this status.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredAuctions.map((item) => {
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
      )}
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
  const adminToast = useAdminToast();
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
      adminToast.error(i18n.t('adminNoCoBrotherYet'));
      return;
    }
    if (!selectedCoBrother) {
      adminToast.error(i18n.t('adminSelectCoBrotherAlert'));
      return;
    }
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
  const adminToast = useAdminToast();
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      adminToast.error(i18n.t('adminReasonRequired'));
      return;
    }
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
  const serviceLabels = Array.isArray(order.selectedServiceLabels)
    ? order.selectedServiceLabels
    : services.map((key) => key.replace(/_/g, ' '));

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
                {serviceLabels.map((label, index) => (
                  <span key={`${label}-${index}`} style={{ fontSize: '0.75rem', fontWeight: 600,
                                           background: '#eef2ff', color: '#4338ca',
                                           border: '1px solid #c7d2fe',
                                           padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                    {label}
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

// === Inline admin overview + review queue components =======================
// Defined here so no new files/folders are created. Used only by the
// in-place AdminDashboardPage above.

const ADMIN_PENDING_CHIPS = [
  { key: 'ventures',          tab: 'ventures',          label: 'Ventures',         color: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  { key: 'softwareAuctions',  tab: 'software-auctions', label: 'Software auctions', color: 'bg-violet-100 text-violet-700 ring-violet-200' },
  { key: 'technologies',      tab: 'cocreations',       label: 'Technology',       color: 'bg-rose-100 text-rose-700 ring-rose-200' },
  { key: 'domains',           tab: 'domains',           label: 'Domains',          color: 'bg-sky-100 text-sky-700 ring-sky-200' },
  { key: 'domainEnquiries',   tab: 'domain-enquiries',  label: 'Domain enquiries', color: 'bg-sky-100 text-sky-700 ring-sky-200' },
  { key: 'cobrotherPayments', tab: 'requests',          label: 'CoBrother payments', color: 'bg-amber-100 text-amber-700 ring-amber-200' },
  { key: 'operations',        tab: 'operations',        label: 'Operations',       color: 'bg-indigo-100 text-indigo-700 ring-indigo-200' },
];

function formatNumberIN(n) {
  const value = Number(n ?? 0);
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-IN');
}

function AdminPendingChips({ counts, total, loading, onJump }) {
  if (loading && total === 0) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2" role="status" aria-live="polite" aria-label="Loading pending counts">
        <span className="admin-loading-pill">
          <span className="admin-loading-dot" aria-hidden />
          Live counts
        </span>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="admin-skeleton admin-skeleton--chip" aria-hidden />
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={12} strokeWidth={2.4} aria-hidden />
        <span>You are all caught up</span>
      </div>
    );
  }

  const visible = ADMIN_PENDING_CHIPS.filter((chip) => (counts?.[chip.key] || 0) > 0);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {visible.map((chip) => {
        const count = counts[chip.key] || 0;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onJump(chip.tab)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition hover:scale-[1.02] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${chip.color}`}
            aria-label={`${count} ${chip.label} pending. Open tab.`}
          >
            <span className="rounded-full bg-white/80 px-1.5 text-[11px] font-bold">{count}</span>
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AdminStatTile({ icon: Icon, label, value, accent, loading }) {
  const accents = {
    indigo:  'bg-indigo-50 text-indigo-600 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    sky:     'bg-sky-50 text-sky-600 ring-sky-100',
    amber:   'bg-amber-50 text-amber-600 ring-amber-100',
    violet:  'bg-violet-50 text-violet-600 ring-violet-100',
    rose:    'bg-rose-50 text-rose-600 ring-rose-100',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${accents[accent] || accents.indigo}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        {loading ? (
          <div className="mt-1 flex items-center gap-2" role="status" aria-live="polite">
            <span className="admin-skeleton admin-skeleton--stat-value" aria-hidden />
            <span className="sr-only">{`Loading ${label}`}</span>
          </div>
        ) : (
          <p className="mt-0.5 truncate text-2xl font-semibold text-gray-900">{formatNumberIN(value)}</p>
        )}
      </div>
    </div>
  );
}

function AdminPendingCard({ icon: Icon, label, hint, count, accent, loading, onClick }) {
  const accents = {
    amber:   { bar: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
    indigo:  { bar: 'bg-indigo-500',  chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
    sky:     { bar: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
    violet:  { bar: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
    emerald: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    rose:    { bar: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 ring-rose-200' },
  };
  const tone = accents[accent] || accents.indigo;
  const isEmpty = !loading && (!count || count <= 0);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      className={`group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        loading
          ? 'border-gray-200 cursor-progress'
          : 'border-gray-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${tone.bar} ${loading ? 'opacity-60' : ''}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${tone.chip}`}>
            <Icon size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
          </div>
        </div>
        <ArrowUpRight size={16} className={`mt-1 text-gray-400 transition ${loading ? 'opacity-40' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gray-700'}`} />
      </div>
      <div className="flex items-end justify-between gap-3">
        {loading ? (
          <span className="admin-skeleton admin-skeleton--card-value" role="status" aria-live="polite" aria-label={`Loading ${label} count`} />
        ) : (
          <p className={`text-2xl font-semibold ${isEmpty ? 'text-gray-400' : 'text-gray-900'}`}>{formatNumberIN(count)}</p>
        )}
        {loading ? (
          <span className="admin-loading-pill">
            <span className="admin-loading-dot" aria-hidden />
            Loading
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${isEmpty ? 'bg-gray-50 text-gray-500 ring-gray-200' : tone.chip}`}>
            {isEmpty ? 'All clear' : 'Open'}
          </span>
        )}
      </div>
    </button>
  );
}

function AdminOverviewSection({ stats, statsLoading, counts, countsLoading, total, onJump }) {
  const platformStats = [
    { key: 'totalUsers',        Icon: UsersRound,   label: 'Users',       value: stats?.totalUsers,        accent: 'indigo'  },
    { key: 'totalCoBrothers',   Icon: Sparkles,     label: 'CoBrothers',  value: stats?.totalCoBrothers,   accent: 'violet'  },
    { key: 'totalVentures',     Icon: Briefcase,    label: 'Ventures',    value: stats?.totalVentures,     accent: 'emerald' },
    { key: 'totalDomains',      Icon: Globe,        label: 'Domains',     value: stats?.totalDomains,      accent: 'sky'     },
    { key: 'totalTechnologies', Icon: Cpu,          label: 'Technology',  value: stats?.totalTechnologies, accent: 'rose'    },
    { key: 'totalCreators',     Icon: UsersRound,   label: 'Creators',    value: stats?.totalCreators,     accent: 'amber'   },
  ];

  const pendingCards = [
    { key: 'ventures',          Icon: Briefcase,      label: 'Pending ventures',         hint: 'Approve or reject venture submissions',   count: counts?.ventures,          tab: 'ventures',          accent: 'emerald' },
    { key: 'domains',           Icon: Globe,          label: 'Domain verifications',     hint: 'Awaiting verification from owners',       count: counts?.domains,           tab: 'domains',           accent: 'sky'     },
    { key: 'domainEnquiries',   Icon: FileQuestion,   label: 'Domain enquiries',         hint: 'Buyer enquiries pending action',          count: counts?.domainEnquiries,   tab: 'domain-enquiries',  accent: 'sky'     },
    { key: 'technologies',      Icon: Cpu,            label: 'Technology verifications', hint: 'Software/technology awaiting verification', count: counts?.technologies,    tab: 'cocreations',       accent: 'rose'    },
    { key: 'softwareAuctions',  Icon: Package,        label: 'Software auctions',        hint: 'Pending approval to go live',             count: counts?.softwareAuctions,  tab: 'software-auctions', accent: 'violet'  },
    { key: 'cobrotherPayments', Icon: ClipboardList,  label: 'CoBrother payments',       hint: 'Listers with payment pending',            count: counts?.cobrotherPayments, tab: 'requests',          accent: 'amber'   },
    { key: 'operations',        Icon: Headset,        label: 'Operations requests',      hint: 'Customer service requests pending',       count: counts?.operations,        tab: 'operations',        accent: 'indigo'  },
  ];

  const quickLinks = [
    { Icon: Activity,  label: 'Auctions overview',  hint: 'All live auction activity', tab: 'auctions' },
    { Icon: Sparkles,  label: 'Homepage features',  hint: 'Pin items to the homepage', tab: 'homepage-features' },
    { Icon: Inbox,     label: 'Review queue',       hint: 'Items awaiting your review', tab: 'review-queue' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="admin-stats-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="admin-stats-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-500">Platform stats</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {platformStats.map((stat) => (
            <AdminStatTile
              key={stat.key}
              icon={stat.Icon}
              label={stat.label}
              value={stat.value}
              accent={stat.accent}
              loading={statsLoading}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-attention-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="admin-attention-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
              Needs your attention
              {countsLoading ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                  Fetching live data
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {countsLoading
                ? 'Counting items across all queues — numbers will appear as soon as each source responds.'
                : total > 0
                  ? `${total} item${total === 1 ? '' : 's'} waiting on you. Click a card to open the relevant tab.`
                  : 'You are all caught up. New submissions appear here automatically.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onJump('review-queue')}
            className="inline-flex items-center gap-1 rounded-md px-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Open review queue
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pendingCards.map((card) => (
            <AdminPendingCard
              key={card.key}
              icon={card.Icon}
              label={card.label}
              hint={card.hint}
              count={card.count}
              accent={card.accent}
              loading={countsLoading}
              onClick={() => onJump(card.tab)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-quick-links" className="flex flex-col gap-3">
        <h2 id="admin-quick-links" className="text-sm font-semibold uppercase tracking-wide text-gray-500">Quick links</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.Icon;
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => onJump(link.tab)}
                className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-700 ring-1 ring-gray-200">
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{link.label}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{link.hint}</p>
                </div>
                <ArrowUpRight size={14} className="text-gray-400 transition group-hover:text-gray-700" aria-hidden />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const QUEUE_TYPE_META = {
  venture:           { label: 'Venture',           Icon: Briefcase,     chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', tab: 'ventures' },
  domain:            { label: 'Domain',            Icon: Globe,         chip: 'bg-sky-50 text-sky-700 ring-sky-200',             tab: 'domains' },
  domain_enquiry:    { label: 'Domain enquiry',    Icon: FileQuestion,  chip: 'bg-sky-50 text-sky-700 ring-sky-200',             tab: 'domain-enquiries' },
  technology:        { label: 'Technology',        Icon: Cpu,           chip: 'bg-rose-50 text-rose-700 ring-rose-200',          tab: 'cocreations' },
  software_auction:  { label: 'Software auction',  Icon: Package,       chip: 'bg-violet-50 text-violet-700 ring-violet-200',    tab: 'software-auctions' },
  cobrother_payment: { label: 'CoBrother payment', Icon: ClipboardList, chip: 'bg-amber-50 text-amber-700 ring-amber-200',       tab: 'requests' },
  operations:        { label: 'Operations',        Icon: Headset,       chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200',    tab: 'operations' },
};

const QUEUE_FILTER_OPTIONS = [
  { id: 'all',               label: 'All' },
  { id: 'venture',           label: 'Ventures' },
  { id: 'domain',            label: 'Domains' },
  { id: 'domain_enquiry',    label: 'Domain enquiries' },
  { id: 'technology',        label: 'Technology' },
  { id: 'software_auction',  label: 'Software auctions' },
  { id: 'cobrother_payment', label: 'CoBrother payments' },
  { id: 'operations',        label: 'Operations' },
];

function getString(...candidates) {
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return '';
}

function getTimestamp(item) {
  const candidates = [
    item?.updatedAt, item?.updated_at,
    item?.createdAt, item?.created_at,
    item?.submittedAt, item?.submitted_at,
    item?.requestedAt, item?.requested_at,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(ts).toLocaleDateString();
}

function mapQueueItem(item, type) {
  const meta = QUEUE_TYPE_META[type];
  const titleByType = {
    venture: getString(item?.brandDetails?.brandName, item?.brand_details?.brand_name, item?.name, item?.title, 'Untitled venture'),
    domain: getString(item?.domainName, item?.name, 'Domain'),
    domain_enquiry: getString(item?.domainName, item?.domain?.domainName, 'Domain enquiry'),
    technology: getString(item?.name, item?.title, 'Technology'),
    software_auction: getString(item?.softwareName, item?.software?.title, item?.software?.name, item?.title, 'Software auction'),
    cobrother_payment: getString(item?.ventureTitle, item?.title, item?.entityTitle, 'CoBrother request'),
    operations: getString(item?.title, item?.serviceName, item?.requestType, 'Operations request'),
  };
  return {
    id: `${type}-${item?.id ?? Math.random().toString(36).slice(2)}`,
    type,
    title: titleByType[type] || 'Item',
    owner: getString(item?.ownerName, item?.userName, item?.user?.name, item?.email, item?.listedBy?.email, item?.buyerName, item?.listerName),
    status: getString(
      type === 'venture' ? 'PENDING_APPROVAL' : null,
      type === 'technology' ? 'PENDING_VERIFICATION' : null,
      item?.verificationStatus,
      item?.approvalStatus,
      item?.status,
      'PENDING',
    ),
    timestamp: getTimestamp(item),
    tab: meta?.tab,
  };
}

function QueueTypeChip({ type }) {
  const meta = QUEUE_TYPE_META[type];
  if (!meta) return null;
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${meta.chip}`}>
      <Icon size={11} strokeWidth={2.4} />
      <span className="whitespace-nowrap">{meta.label}</span>
    </span>
  );
}

function QueueStatusPill({ status }) {
  const upper = String(status || '').toUpperCase();
  const tone = upper.includes('PENDING') || upper === 'NEW'
    ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : upper.includes('REJECT')
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : upper.includes('APPROV') || upper.includes('VERIFI')
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : 'bg-gray-50 text-gray-700 ring-gray-200';
  const label = String(status || '—').replace(/_/g, ' ').toLowerCase();
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ${tone}`}>
      {label}
    </span>
  );
}

async function fetchQueueList(promise) {
  try {
    const res = await promise;
    return extractAdminList(res?.data);
  } catch {
    return [];
  }
}

function AdminReviewQueueSection({ counts, loading: countsLoading, onJump, onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [search, setSearch] = useState('');
  const toast = useAdminToast();

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [
        ventures,
        domains,
        domainEnquiries,
        technologies,
        softwareAuctions,
        cobrotherRequests,
        operations,
      ] = await Promise.all([
        fetchQueueList(adminAPI.getPendingVentures()),
        fetchQueueList(adminAPI.getDomains()),
        fetchQueueList(adminAPI.getDomainEnquiries()),
        fetchQueueList(adminAPI.getTechnologies()),
        fetchQueueList(adminAPI.getPendingSoftwareAuctions()),
        fetchQueueList(adminAPI.getCoBrotherRequests()),
        fetchQueueList(operationsAdminAPI.listRequests()),
      ]);

      const merged = [
        ...ventures.map((it) => mapQueueItem(it, 'venture')),
        ...domains.filter(isPendingDomainVerification).map((it) => mapQueueItem(it, 'domain')),
        ...domainEnquiries.filter(isPendingDomainEnquiry).map((it) => mapQueueItem(it, 'domain_enquiry')),
        ...technologies.filter(isUnverifiedTechnology).map((it) => mapQueueItem(it, 'technology')),
        ...softwareAuctions.map((it) => mapQueueItem(it, 'software_auction')),
        ...cobrotherRequests.filter(isPendingCoBrotherPayment).map((it) => mapQueueItem(it, 'cobrother_payment')),
        ...operations.filter(isPendingOperationsRequest).map((it) => mapQueueItem(it, 'operations')),
      ];
      merged.sort((a, b) => b.timestamp - a.timestamp);
      setItems(merged);
      if (silent) toast.success('Queue refreshed.');
      onRefresh?.();
    } catch {
      if (silent) toast.error('Could not refresh queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, onRefresh]);

  useEffect(() => {
    load(false);
  }, [load]);

  const typeCounts = useMemo(() => {
    const map = { all: items.length };
    QUEUE_FILTER_OPTIONS.forEach((opt) => { if (opt.id !== 'all') map[opt.id] = 0; });
    for (const item of items) {
      if (map[item.type] !== undefined) map[item.type] += 1;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeType !== 'all' && item.type !== activeType) return false;
      if (!q) return true;
      const haystack = `${item.title} ${item.owner} ${item.status}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, activeType, search]);

  const hasFilters = activeType !== 'all' || search.trim().length > 0;
  const isLoading = loading || (countsLoading && items.length === 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Items waiting for your review</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Read-only view across all admin sections. Click <span className="font-medium">Open</span> on a row to act on it inside the relevant tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:self-auto"
        >
          <RefreshCw size={14} strokeWidth={2.2} className={refreshing ? 'animate-spin' : ''} aria-hidden />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, owner, status..."
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => { setActiveType('all'); setSearch(''); }}
              className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 lg:self-auto"
            >
              <X size={14} />
              <span>Clear filters</span>
            </button>
          ) : null}
        </div>
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
          <span className="hidden shrink-0 items-center gap-1.5 pr-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:inline-flex">
            <Filter size={12} strokeWidth={2.4} />
            Type
          </span>
          {QUEUE_FILTER_OPTIONS.map((opt) => {
            const isActive = activeType === opt.id;
            const count = typeCounts[opt.id] ?? 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveType(opt.id)}
                className={[
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100',
                ].join(' ')}
              >
                <span>{opt.label}</span>
                <span className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'}`}>
                  {count > 99 ? '99+' : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />
                <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
                <div className="hidden h-4 w-32 animate-pulse rounded bg-gray-100 md:block" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                <div className="h-8 w-20 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
              <Inbox size={22} />
            </div>
            <p className="text-base font-semibold text-gray-900">
              {hasFilters ? 'No items match your filter' : 'You are all caught up'}
            </p>
            <p className="max-w-sm text-sm text-gray-500">
              {hasFilters
                ? 'Try clearing filters or search to see everything.'
                : 'Nothing needs your review right now. New submissions will appear here automatically.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => { setActiveType('all'); setSearch(''); }}
                className="mt-1 inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <X size={14} />
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Owner</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Updated</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((row) => (
                    <tr key={row.id} className="transition hover:bg-gray-50/60">
                      <td className="px-4 py-3 align-middle"><QueueTypeChip type={row.type} /></td>
                      <td className="px-4 py-3 align-middle">
                        <p className="truncate font-semibold text-gray-900" title={row.title}>{row.title}</p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <p className="truncate text-gray-700" title={row.owner || '—'}>{row.owner || '—'}</p>
                      </td>
                      <td className="px-4 py-3 align-middle"><QueueStatusPill status={row.status} /></td>
                      <td className="px-4 py-3 align-middle text-gray-500">{formatRelativeTime(row.timestamp)}</td>
                      <td className="px-4 py-3 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => onJump(row.tab)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                          Open
                          <ArrowUpRight size={12} strokeWidth={2.4} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-gray-100 md:hidden">
              {filtered.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <QueueTypeChip type={row.type} />
                    <span className="text-xs text-gray-500">{formatRelativeTime(row.timestamp)}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-gray-900" title={row.title}>{row.title}</p>
                  <p className="truncate text-xs text-gray-600" title={row.owner || '—'}>{row.owner || '—'}</p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <QueueStatusPill status={row.status} />
                    <button
                      type="button"
                      onClick={() => onJump(row.tab)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                      Open
                      <ArrowUpRight size={12} strokeWidth={2.4} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

