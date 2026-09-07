import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  User,
  PackageCheck,
  Calendar,
  Layers,
  Copy,
  Pencil,
  Save,
} from 'lucide-react';
import { adminAPI } from '../../api/services';
import { getStoredAccessToken } from '../../utils/authSession';
import { formatInr } from '../../utils/money';

/** Only treat a 401 as expiry when the interceptor has already dropped the live token. */
export function isTrackRecordsCurrentSessionLost(err) {
  return err?.response?.status === 401 && !getStoredAccessToken();
}

const CATEGORIES = [
  'All Categories',
  'Domain Registration (OpenProvider)',
  'Domain Registration (Reseller)',
  'Domain Marketplace',
  'Technology Purchase',
  'Technology Services',
  'Venture / Deal Payment',
  'Domain Addon (Email)',
  'Domain Addon (SSL)',
  'Domain Renewal',
  'Domain Transfer',
  'OpenProvider Managed Acquisition',
  'Operations',
  'Other',
];

const OVERALL_STATUSES = [
  'All Statuses',
  'Success',
  'Failed',
  'Pending',
  'Partial',
  'Refunded',
  'Expired',
  'Cancelled',
];

export default function AdminTrackRecordsTab() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Detail Record Drawer
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const authExpiredRef = useRef(false);
  /** recordId -> draft invoice string while editing */
  const [invoiceDrafts, setInvoiceDrafts] = useState({});
  /** recordId currently in edit mode */
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  /** recordId -> saving */
  const [savingInvoiceId, setSavingInvoiceId] = useState(null);
  /** recordId -> short success message for admin (what user will see) */
  const [invoiceSavedMsg, setInvoiceSavedMsg] = useState({});
  const [invoiceErrorById, setInvoiceErrorById] = useState({});

  const fetchTrackRecords = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      // Fire-and-forget the historical backfill: the page must render from
      // existing records immediately — never wait on the full-table sync (or
      // its Razorpay calls) before showing data. The backend also runs the
      // sync as a background task and returns instantly.
      if (!authExpiredRef.current) {
        adminAPI.syncTrackRecords().catch((syncErr) => {
          // Background sync must not paint a session-expired banner; the list
          // request is the source of truth for whether this tab can load.
          console.warn('Track Records sync skipped:', syncErr);
        });
      }

      const params = {
        page,
        limit,
        search: searchTerm.trim() || undefined,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        overallStatus: selectedStatus !== 'All Statuses' ? selectedStatus : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        sortBy: 'timestamp',
        sortDir: 'desc',
      };

      const res = await adminAPI.getTrackRecords(params);
      const data = res.data;
      if (data && data.success) {
        authExpiredRef.current = false;
        setAuthExpired(false);
        setRecords(data.items || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setRecords([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch Track Records:', err);
      if (isTrackRecordsCurrentSessionLost(err)) {
        authExpiredRef.current = true;
        setAuthExpired(true);
        setFetchError('Session expired. Please sign in again to load Track Records.');
      } else {
        setFetchError('Failed to load Track Records. Try Refresh.');
      }
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedCategory, selectedStatus, startDate, endDate]);

  useEffect(() => {
    fetchTrackRecords();
  }, [fetchTrackRecords]);

  // Standard modal behavior: close the details dialog on Escape and lock page
  // scrolling while it is open (only the modal content scrolls).
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All Categories');
    setSelectedStatus('All Statuses');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const openRecordDetails = (rec) => {
    setSelectedRecord(rec);
    setDrawerOpen(true);
  };

  const paymentOkOf = (r) =>
    typeof r.paymentOk === 'boolean'
      ? r.paymentOk
      : ['CAPTURED', 'SUCCESS', 'PAID', 'AUTHORIZED'].includes(
          String(r.paymentStatus || '').toUpperCase(),
        );

  /** Category-aware operation. The backend sends operationType for every
   *  category (registration / transfer / renewal / fulfillment / provisioning /
   *  acquisition / deal / service) so a technology purchase is never shown a
   *  Registration status. Falls back to deriving from the category for older
   *  API responses without operationType. */
  const operationOf = (r) => {
    const t = String(r.operationType || r.operation_type || '').toLowerCase();
    const titles = {
      registration: 'Registration',
      transfer: 'Transfer',
      renewal: 'Renewal',
      fulfillment: 'Fulfillment',
      provisioning: 'Provisioning',
      acquisition: 'Acquisition',
      deal: 'Deal',
      service: 'Service',
    };
    if (titles[t]) return { type: t, title: titles[t] };
    const cat = String(r.category || '').toLowerCase();
    if (cat.includes('domain transfer')) return { type: 'transfer', title: 'Transfer' };
    if (cat.includes('renewal')) return { type: 'renewal', title: 'Renewal' };
    if (cat.includes('domain registration')) return { type: 'registration', title: 'Registration' };
    if (cat.includes('technology services')) return { type: 'provisioning', title: 'Provisioning' };
    if (cat.includes('technology purchase')) return { type: 'fulfillment', title: 'Fulfillment' };
    if (cat.includes('marketplace') || cat.includes('managed acquisition')) return { type: 'acquisition', title: 'Acquisition' };
    if (cat.includes('venture')) return { type: 'deal', title: 'Deal' };
    if (cat.includes('addon')) return { type: 'service', title: 'Service' };
    return { type: null, title: null };
  };

  /** Raw status token for the category's own operation (OK / FAIL / PENDING /
   *  EXPIRED / CANCELLED / REFUNDED). Prefers the backend operationStatus;
   *  falls back to the registration label for domain ops. Used for badge
   *  coloring and the full "Operation — Status" label. */
  const operationStatusOf = (r) => {
    const op = String(r.operationStatus || r.operation_status || '');
    if (op && op !== '—') return op.toUpperCase();
    return registrationLabelOf(r);
  };

  /** Status word for the operation label — success is worded per category:
   *  provider-powered subscriptions are "Active", everything else "Success". */
  const operationStatusWordOf = (status, type) => {
    const s = String(status || '').toUpperCase();
    if (['OK', 'PROVISIONED', 'ACTIVE', 'SUCCESS'].includes(s)) {
      return type === 'provisioning' ? 'Active' : 'Success';
    }
    if (s === 'FAIL' || s === 'FAILED') return 'Failed';
    if (['PENDING', 'IN_PROGRESS', 'NOT_STARTED'].includes(s)) return 'Pending';
    if (s === 'EXPIRED') return 'Expired';
    if (s === 'CANCELLED') return 'Cancelled';
    if (s === 'REFUNDED') return 'Refunded';
    return null;
  };

  /** Full category-aware operation label, e.g. "Provisioning — Active",
   *  "Fulfillment — Success", "Registration — Pending". Prefers the backend
   *  operationLabel; composes it locally for older API responses. */
  const operationLabelOf = (r) => {
    const raw = r.operationLabel || r.operation_label;
    if (raw && raw !== '—') return String(raw);
    const op = operationOf(r);
    if (!op.type) return '—';
    const word = operationStatusWordOf(operationStatusOf(r), op.type);
    return word ? `${op.title} — ${word}` : '—';
  };

  /** True only for real domain operation categories (registration / transfer /
   *  renewal). Non-domain categories have no registration operation at all. */
  const isDomainOperation = (r) => {
    const t = operationOf(r).type;
    return t === 'registration' || t === 'transfer' || t === 'renewal';
  };

  /** Registration label is only meaningful for domain operations — everything
   *  else must render '—', never a guessed OK/FAIL/PENDING registration. */
  const registrationLabelOf = (r) => {
    if (!isDomainOperation(r)) return '—';
    if (r.registrationLabel && r.registrationLabel !== '—') return String(r.registrationLabel).toUpperCase();
    if (r.registrationOk === true) return 'OK';
    const overall = String(r.overallStatus || '').toUpperCase();
    const fulfill = String(r.fulfillmentStatus || '').toUpperCase();
    const isDomainReg = operationOf(r).type === 'registration';
    const opId = String(r.openproviderDomainId || '').trim();
    // The label follows the real fulfillment state — an in-progress domain
    // (payment captured, provider processing) is PENDING, never FAIL just
    // because the provider id is not stamped yet.
    if (overall === 'FAILED' || fulfill.includes('FAIL')) return 'FAIL';
    if (overall === 'SUCCESS' && isDomainReg && (!opId || opId.toUpperCase().startsWith('DEMO-'))) return 'FAIL';
    if ((overall === 'SUCCESS' || fulfill.includes('PROVISION')) && (!isDomainReg || opId)) return 'OK';
    return 'PENDING';
  };

  /** Unpaid/abandoned domain attempt: a domain operation with no captured payment
   *  and no Razorpay payment id (e.g. an expired duplicate checkout). Kept as a
   *  distinct record for audit — clearly labeled, never merged with the paid one. */
  const isUnpaidAttempt = (r) => {
    const cat = String(r.category || '').toLowerCase();
    const isDomainOp =
      cat.includes('domain registration') ||
      cat.includes('domain transfer') ||
      cat.includes('renewal');
    if (!isDomainOp) return false;
    if (paymentOkOf(r)) return false;
    return !String(r.razorpayPaymentId || '').trim();
  };

  const domainOf = (r) => {
    if (r.domainName) return String(r.domainName);
    const name = String(r.itemName || '').trim();
    if (!name || name.startsWith('Payment #') || name.startsWith('Unprovisioned')) return '';
    if (name.includes('.') && !name.includes(' ') && !name.includes('@')) return name;
    return '';
  };

  const shortId = (value, keep = 10) => {
    const s = String(value || '');
    if (!s) return '—';
    if (s.length <= keep + 4) return s;
    return `${s.slice(0, keep)}…`;
  };

  /** Refunded/reversed records keep their invoice number in the DB for
   * finance/audit but it must not be displayed (or edited) in the admin UI. */
  const isRefundedRecord = (r) => {
    const o = String(r.overallStatus || '').toUpperCase();
    const p = String(r.paymentStatus || '').toUpperCase();
    return o.includes('REFUND') || p.includes('REFUND');
  };

  const canEditInvoice = (r) => {
    if (isRefundedRecord(r)) return false;
    const cat = String(r.category || '').toLowerCase();
    if (!cat.includes('domain registration') && !cat.includes('domain transfer')) return false;
    return Boolean(r.registrationOrderId);
  };

  const startEditInvoice = (r) => {
    if (!canEditInvoice(r)) return;
    setEditingInvoiceId(r.id);
    setInvoiceDrafts((prev) => ({
      ...prev,
      [r.id]: r.taxInvoiceNumber || r.invoiceNumber || '',
    }));
    setInvoiceErrorById((prev) => {
      const next = { ...prev };
      delete next[r.id];
      return next;
    });
    setInvoiceSavedMsg((prev) => {
      const next = { ...prev };
      delete next[r.id];
      return next;
    });
  };

  const cancelEditInvoice = (recordId) => {
    setEditingInvoiceId(null);
    setInvoiceDrafts((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  };

  const saveInvoiceNumber = async (r) => {
    const orderId = r.registrationOrderId;
    if (!orderId) return;
    const draft = String(invoiceDrafts[r.id] ?? '').trim().toUpperCase();
    if (!/^AI\d{7}$/.test(draft)) {
      setInvoiceErrorById((prev) => ({
        ...prev,
        [r.id]: 'Use format AI + year + 5 digits (e.g. AI2600001).',
      }));
      return;
    }
    setSavingInvoiceId(r.id);
    setInvoiceErrorById((prev) => {
      const next = { ...prev };
      delete next[r.id];
      return next;
    });
    try {
      const { data } = await adminAPI.updateDomainTaxInvoice(orderId, draft);
      const saved =
        data?.taxInvoiceNumber || data?.invoiceNumber || draft;
      setRecords((prev) =>
        prev.map((row) =>
          row.id === r.id
            ? { ...row, taxInvoiceNumber: saved, invoiceNumber: saved }
            : row,
        ),
      );
      setSelectedRecord((prev) =>
        prev && prev.id === r.id
          ? { ...prev, taxInvoiceNumber: saved, invoiceNumber: saved }
          : prev,
      );
      setInvoiceSavedMsg((prev) => ({
        ...prev,
        [r.id]: `Updated — user will see ${saved}`,
      }));
      setEditingInvoiceId(null);
      window.setTimeout(() => {
        setInvoiceSavedMsg((prev) => {
          const next = { ...prev };
          delete next[r.id];
          return next;
        });
      }, 6000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        'Could not update invoice number.';
      setInvoiceErrorById((prev) => ({ ...prev, [r.id]: String(msg) }));
    } finally {
      setSavingInvoiceId(null);
    }
  };

  const copyDiagnostics = async (r) => {
    const text =
      r.developerSummary ||
      [
        'Deltapreneur Track Record Diagnostics',
        '---------------------------------',
        `InternalOrderId: ${r.internalOrderId || 'n/a'}`,
        `RazorpayPaymentId: ${r.razorpayPaymentId || 'n/a'}`,
        `RazorpayOrderId: ${r.razorpayOrderId || 'n/a'}`,
        `Domain/Item: ${r.itemName || 'n/a'}`,
        `Payment: ${paymentOkOf(r) ? 'OK' : 'FAIL'} (${r.paymentStatus || 'n/a'})`,
        `Operation: ${operationLabelOf(r)}`,
        `OpenProviderDomainId: ${r.openproviderDomainId || '(none)'}`,
        `ErrorSource: ${r.errorSource || 'n/a'}`,
        `ErrorCode: ${r.errorCode || 'n/a'}`,
        `ErrorMessage: ${r.errorMessage || 'n/a'}`,
      ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('Clipboard copy failed', err);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" />
          Success
        </span>
      );
    }
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={13} className="text-rose-600" />
          Failed
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={13} className="text-amber-600" />
          Pending
        </span>
      );
    }
    if (s === 'PARTIAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <AlertTriangle size={13} className="text-purple-600" />
          Partial
        </span>
      );
    }
    if (s === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          Refunded
        </span>
      );
    }
    if (s === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <Clock size={13} className="text-orange-600" />
          Expired
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
          <X size={13} className="text-slate-500" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
        {status}
      </span>
    );
  };

  // Calculate quick metrics from current slice
  const successCount = records.filter((r) => (r.overallStatus || '').toUpperCase() === 'SUCCESS').length;
  const failedCount = records.filter((r) => (r.overallStatus || '').toUpperCase() === 'FAILED').length;
  const totalVolume = records.reduce((sum, r) => sum + (Number(r.amountCharged) || 0), 0);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-widest mb-1">
            <ClipboardList size={15} /> Single Source of Truth
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">
            Track Records Audit Trail
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Centralized tracking of every paid transaction attempt across domain registrations, marketplace purchases, technology orders, and venture deal payments.
          </p>
        </div>
        <button
          onClick={() => {
            authExpiredRef.current = false;
            setAuthExpired(false);
            setFetchError('');
            fetchTrackRecords();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-xs backdrop-blur transition-all border border-white/15 active:scale-95 shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Audit Trail
        </button>
      </div>

      {fetchError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
          <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">{authExpired ? 'Authentication required' : 'Could not load records'}</p>
            <p className="mt-0.5 text-amber-800/90">{fetchError}</p>
          </div>
        </div>
      ) : null}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Records</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Provisioned Page Batch</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{successCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attention Required</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">{failedCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Page Volume (INR)</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{formatInr(totalVolume)}</div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Multi-field Search */}
          <div className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Buyer Name, Email, Phone, Domain, Payment ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {OVERALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFilters}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Clear Filters
            </button>
          </div>
        </div>

        {/* Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
            <Calendar size={12} /> Date Range:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Track Records Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mb-3" />
            <p className="text-xs font-semibold">Loading Track Records audit data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <ClipboardList size={36} className="text-slate-300 mb-3" />
            <h4 className="text-base font-bold text-slate-800">No Track Records Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No transactions match your current search or filter criteria. Try clearing active filters.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Internal Order ID</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Item / Domain</th>
                  <th className="py-3.5 px-4">Buyer</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">RZP Order</th>
                  <th className="py-3.5 px-4">RZP Pay</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Payment Mode</th>
                  <th className="py-3.5 px-4">Operation</th>
                  <th className="py-3.5 px-4">Error</th>
                  <th className="py-3.5 px-4">Overall</th>
                  <th className="py-3.5 px-4">Invoice No</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      <div>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</div>
                      <div className="text-[10px] text-slate-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {r.internalOrderId}
                      {r.cartBatchId && (
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          Batch: {r.cartBatchId}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px]" title={domainOf(r) || r.itemName}>
                      {domainOf(r) ? (
                        <>
                          <div className="font-bold text-slate-900 truncate">{domainOf(r)}</div>
                          <div className="text-[10px] text-slate-400">Qty/Years: {r.quantityYears}</div>
                          {isUnpaidAttempt(r) && (
                            <div className="text-[10px] font-bold text-amber-700 mt-0.5 inline-flex items-center gap-1">
                              <AlertTriangle size={10} /> Unpaid / abandoned attempt
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-900 truncate">
                            {r.itemName || (isDomainOperation(r) ? 'Domain not recovered' : '—')}
                          </div>
                          {isDomainOperation(r) && (
                            <div className="text-[10px] text-amber-600">
                              Open Details / re-sync to recover from Razorpay
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{r.buyerName || 'Buyer'}</div>
                      <div className="text-[10px] text-slate-400">{r.buyerEmail || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                      {r.buyerPhone || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {formatInr(r.amountCharged)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700" title={r.razorpayOrderId || undefined}>
                      {r.razorpayOrderId ? shortId(r.razorpayOrderId, 12) : '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700" title={r.razorpayPaymentId || undefined}>
                      {r.razorpayPaymentId ? shortId(r.razorpayPaymentId, 12) : '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${
                          paymentOkOf(r)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.paymentStatus === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {paymentOkOf(r) ? 'OK' : (r.paymentStatus === 'CAPTURED' ? 'SUCCESS' : r.paymentStatus || '—')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.paymentMode ? (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${
                            r.paymentMode === 'TEST'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : r.paymentMode === 'LIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {r.paymentMode}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {operationOf(r).type ? (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${
                            operationStatusOf(r) === 'OK'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : operationStatusOf(r) === 'FAIL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : ['EXPIRED', 'CANCELLED', 'REFUNDED'].includes(operationStatusOf(r))
                              ? 'bg-slate-100 text-slate-600 border border-slate-300'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                          title={operationLabelOf(r)}
                        >
                          {operationLabelOf(r)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap max-w-[140px]">
                      {r.errorCode ? (
                        <span
                          className="text-[10px] font-bold text-rose-700 truncate inline-block max-w-full"
                          title={r.errorMessage || r.errorCode}
                        >
                          {r.errorCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{renderStatusBadge(r.overallStatus)}</td>
                    <td className="py-3.5 px-4 min-w-[160px] max-w-[220px] align-top">
                      {!canEditInvoice(r) ? (
                        isRefundedRecord(r) ? (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voided (refunded)</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )
                      ) : editingInvoiceId === r.id ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={invoiceDrafts[r.id] ?? ''}
                            onChange={(e) =>
                              setInvoiceDrafts((prev) => ({
                                ...prev,
                                [r.id]: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9),
                              }))
                            }
                            className="w-full rounded-lg border border-indigo-300 bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="AI2600001"
                            disabled={savingInvoiceId === r.id}
                            autoFocus
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={savingInvoiceId === r.id}
                              onClick={() => saveInvoiceNumber(r)}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              <Save size={11} />
                              {savingInvoiceId === r.id ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              disabled={savingInvoiceId === r.id}
                              onClick={() => cancelEditInvoice(r.id)}
                              className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                          {invoiceErrorById[r.id] && (
                            <p className="text-[10px] font-semibold text-rose-600 leading-snug">
                              {invoiceErrorById[r.id]}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-900">
                              {r.taxInvoiceNumber || r.invoiceNumber || (
                                <span className="font-sans font-semibold text-slate-400">None</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditInvoice(r)}
                              className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                              title="Edit invoice number"
                            >
                              <Pencil size={11} />
                              Edit
                            </button>
                          </div>
                          {invoiceSavedMsg[r.id] && (
                            <p className="text-[10px] font-semibold text-emerald-700 leading-snug">
                              {invoiceSavedMsg[r.id]}
                            </p>
                          )}
                          {invoiceErrorById[r.id] && (
                            <p className="text-[10px] font-semibold text-rose-600 leading-snug">
                              {invoiceErrorById[r.id]}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openRecordDetails(r)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1"
                      >
                        Details <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && records.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
            <div>
              Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span> ({totalCount} total records)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal — centered dialog with dimmed overlay */}
      {drawerOpen && selectedRecord && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 transition-opacity"
          onClick={() => setDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header — fixed at the top of the dialog */}
            <div className="shrink-0">
              <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                    <ClipboardList size={14} /> Track Record Inspection
                  </div>
                  <h3 className="text-xl font-bold font-display mt-1 text-white">
                    {selectedRecord.internalOrderId}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1">
                    Created: {selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString() : '-'}
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  aria-label="Close details"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Overall:</span>
                  {renderStatusBadge(selectedRecord.overallStatus)}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      paymentOkOf(selectedRecord)
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    Payment {paymentOkOf(selectedRecord) ? 'OK' : 'FAIL'}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      operationStatusOf(selectedRecord) === 'OK'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : operationStatusOf(selectedRecord) === 'FAIL'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {operationLabelOf(selectedRecord)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyDiagnostics(selectedRecord)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Copy size={13} /> Copy diagnostics for developer
                </button>
              </div>

              {/* Modal Content Body — only this area scrolls */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-6 space-y-6 text-xs text-slate-700">
                {/* Always-visible developer diagnostics (false Success rows need this too) */}
                <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
                      <ShieldAlert size={16} /> Developer diagnostics
                    </div>
                    <button
                      type="button"
                      onClick={() => copyDiagnostics(selectedRecord)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Copy size={13} /> Copy for developer
                    </button>
                  </div>
                  <pre className="p-3 bg-black/40 border border-slate-700 rounded-xl text-[11px] font-mono whitespace-pre-wrap break-all text-slate-200 max-h-56 overflow-y-auto">
                    {selectedRecord.developerSummary ||
                      [
                        `InternalOrderId: ${selectedRecord.internalOrderId || 'n/a'}`,
                        `RazorpayPaymentId: ${selectedRecord.razorpayPaymentId || 'n/a'}`,
                        `Domain/Item: ${selectedRecord.itemName || 'n/a'}`,
                        `Payment: ${paymentOkOf(selectedRecord) ? 'OK' : 'FAIL'} (${selectedRecord.paymentStatus || 'n/a'})`,
                        `Operation: ${operationLabelOf(selectedRecord)}`,
                        `OpenProviderDomainId: ${selectedRecord.openproviderDomainId || '(none)'}`,
                        `Overall: ${selectedRecord.overallStatus || 'n/a'}`,
                        `Fulfillment: ${selectedRecord.fulfillmentStatus || 'n/a'}`,
                        `ErrorSource: ${selectedRecord.errorSource || 'n/a'}`,
                        `ErrorCode: ${selectedRecord.errorCode || 'n/a'}`,
                        `ErrorMessage: ${selectedRecord.errorMessage || 'n/a'}`,
                      ].join('\n')}
                  </pre>
                </div>

                {/* Error Diagnostics — show only when there is an actual error
                    (a pending transfer is not an error, so no empty red box) */}
                {(selectedRecord.errorCode || registrationLabelOf(selectedRecord) === 'FAIL') && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <ShieldAlert size={16} /> Provisioning / Fulfillment Error Diagnostics
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                      <div>
                        <span className="text-slate-500 font-normal">Error Source:</span>{' '}
                        <span className="font-bold text-rose-700">{selectedRecord.errorSource || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-normal">Error Code:</span>{' '}
                        <span className="font-bold text-rose-700">{selectedRecord.errorCode || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-500 font-normal">Error Message:</span>
                      <pre className="mt-1 p-2.5 bg-white border border-rose-100 rounded-xl text-rose-800 text-[11px] font-mono whitespace-pre-wrap break-all">
                        {selectedRecord.errorMessage ||
                          (String(selectedRecord.itemName || '').startsWith('Payment #')
                            ? 'Payment captured but no linked domain registration / OpenProvider id. This is not a completed registration.'
                            : 'No detailed error message captured.')}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Buyer Information Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" /> Buyer Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">Name:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.buyerName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Email:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.buyerEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Phone:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.buyerPhone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">User ID:</span>{' '}
                      <span className="font-mono text-[11px] text-slate-800">{selectedRecord.buyerUserId || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Purchase Details Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <PackageCheck size={14} className="text-indigo-600" /> Purchase Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="col-span-2">
                      <span className="text-slate-500">Item / Domain:</span>{' '}
                      <span className="font-bold text-slate-900">
                        {domainOf(selectedRecord) || selectedRecord.domainName || selectedRecord.itemName || 'Not recovered'}
                      </span>
                    </div>
                    <div className="col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2">
                      <span className="text-slate-500">Tax invoice (user sees):</span>{' '}
                      {isRefundedRecord(selectedRecord) ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voided (refunded) — kept for finance/audit</span>
                      ) : (
                        <span className="font-mono font-bold text-emerald-800">
                          {selectedRecord.taxInvoiceNumber || selectedRecord.invoiceNumber || 'None yet'}
                        </span>
                      )}
                      {!isRefundedRecord(selectedRecord) && selectedRecord.registrationOrderId ? (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Edit from the Invoice No column in the table. Purchases page uses this same value.
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <span className="text-slate-500">Category:</span>{' '}
                      <span className="font-semibold text-indigo-700">{selectedRecord.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Sub-Category:</span>{' '}
                      <span className="font-medium text-slate-800">{selectedRecord.providerSubcategory || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Quantity / Years:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.quantityYears}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Item ID:</span>{' '}
                      <span className="font-mono text-[11px] text-slate-800">{selectedRecord.itemId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Amount Charged:</span>{' '}
                      <span className="font-bold text-emerald-700 text-sm">{formatInr(selectedRecord.amountCharged)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Currency:</span>{' '}
                      <span className="font-semibold text-slate-800">{selectedRecord.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Category Business Details Section — real per-category fields,
                    never domain-registration status for non-domain transactions */}
                {selectedRecord.businessDetails && (
                  <div className="space-y-3">
                    <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                      <PackageCheck size={14} className="text-indigo-600" />{' '}
                      {selectedRecord.businessDetails.type === 'technology_purchase' && 'Technology Purchase Details'}
                      {selectedRecord.businessDetails.type === 'technology_service' && 'Technology Service / Subscription Details'}
                      {selectedRecord.businessDetails.type === 'venture' && 'Venture / Deal Details'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {selectedRecord.businessDetails.type === 'technology_purchase' && (
                        <>
                          <div className="col-span-2">
                            <span className="text-slate-500">Product:</span>{' '}
                            <span className="font-bold text-slate-900">{selectedRecord.businessDetails.product || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Plan:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRecord.businessDetails.plan || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Completion:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRecord.businessDetails.completionStatus || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Expiry:</span>{' '}
                            <span className="font-semibold text-slate-800">
                              {selectedRecord.businessDetails.expiryDate
                                ? new Date(selectedRecord.businessDetails.expiryDate).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Sold At:</span>{' '}
                            <span className="font-semibold text-slate-800">
                              {selectedRecord.businessDetails.soldAt
                                ? new Date(selectedRecord.businessDetails.soldAt).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                        </>
                      )}
                      {selectedRecord.businessDetails.type === 'technology_service' && (
                        <>
                          <div className="col-span-2">
                            <span className="text-slate-500">Service:</span>{' '}
                            <span className="font-bold text-slate-900">{selectedRecord.businessDetails.service || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Plan:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRecord.businessDetails.plan || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Billing Cycle:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRecord.businessDetails.billingCycle || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Subscription Status:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRecord.businessDetails.subscriptionStatus || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Period Start:</span>{' '}
                            <span className="font-semibold text-slate-800">
                              {selectedRecord.businessDetails.periodStart
                                ? new Date(selectedRecord.businessDetails.periodStart).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Period End:</span>{' '}
                            <span className="font-semibold text-slate-800">
                              {selectedRecord.businessDetails.periodEnd
                                ? new Date(selectedRecord.businessDetails.periodEnd).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                        </>
                      )}
                      {selectedRecord.businessDetails.type === 'venture' && (
                        <>
                          <div className="col-span-2">
                            <span className="text-slate-500">Venture:</span>{' '}
                            <span className="font-bold text-slate-900">{selectedRecord.businessDetails.venture || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Deal Status:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRecord.businessDetails.dealStatus || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Escrow Status:</span>{' '}
                            <span className="font-semibold text-slate-800">{selectedRecord.businessDetails.escrowStatus || '—'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500">Seller ID:</span>{' '}
                            <span className="font-mono text-[11px] text-slate-800">{selectedRecord.businessDetails.sellerId || '—'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Information Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-indigo-600" /> Payment Gateway Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">Razorpay Order ID:</span>{' '}
                      <span className="font-mono text-[11px] font-bold text-slate-900">{selectedRecord.razorpayOrderId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Razorpay Payment ID:</span>{' '}
                      <span className="font-mono text-[11px] font-bold text-slate-900">{selectedRecord.razorpayPaymentId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Razorpay Refund ID:</span>{' '}
                      <span className="font-mono text-[11px] text-slate-800">{selectedRecord.razorpayRefundId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Payment Status:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Fulfillment / Provider Section */}
                <div className="space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" /> Fulfillment & Provider Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500">Fulfillment Status:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.fulfillmentStatus}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Provision Attempts:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedRecord.provisionAttempts}</span>
                    </div>
                    {isDomainOperation(selectedRecord) && (
                      <div className="col-span-2">
                        <span className="text-slate-500">OpenProvider Domain ID:</span>{' '}
                        <span className="font-mono text-[11px] font-bold text-slate-900">
                          {selectedRecord.openproviderDomainId || 'N/A'}
                        </span>
                      </div>
                    )}
                    {selectedRecord.renewalState && selectedRecord.renewalState !== 'N/A' && (
                      <div>
                        <span className="text-slate-500">Renewal State:</span>{' '}
                        <span className="font-semibold text-slate-800">{selectedRecord.renewalState}</span>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>

            {/* Modal Footer — fixed at the bottom of the dialog */}
            <div className="shrink-0 p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-xs">Read-Only Audit Record</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
