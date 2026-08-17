import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  FileText,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Globe,
  Server,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Calendar,
  Lock,
  Unlock,
  Shield,
  Plus,
  ArrowUpRight,
  Sparkles,
  Search,
  Trash2,
  Key,
  ShieldAlert,
  Edit2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { domainStorefrontAPI } from '../api/services';
import { generateInvoice } from '../utils/generateInvoice';
import { readApiError } from '../utils/domainRegistrationOrder';
import { formatInr } from '../utils/money';
import {
  displayNameserverHost,
  formatNameserversForDisplay,
  isPlatformNameserverSet,
  resolveNameserverForSubmit,
  scrubRegistrarVendorNames,
} from '../utils/registrarDisplay';

function unwrapOrder(data) { return data?.data ?? data; }

/* ─── Premium Copy Button ─── */
function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handle}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-all duration-200 select-none ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

/* ─── Premium Status Badge ─── */
function StatusBadge({ status, lifecycleStatus, isTransfer, transferStatus }) {
  if (isTransfer) {
    const ts = (transferStatus || '').toUpperCase();
    if (ts === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50/70 border border-emerald-200/80 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> TRANSFER COMPLETED
        </span>
      );
    }
    if (ts === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50/70 border border-rose-200/80 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> TRANSFER FAILED
        </span>
      );
    }
    // Unpaid/cancelled checkout — the customer never completed payment, so it
    // is NOT an active/pending transfer and must never read as one.
    if (ts === 'PAYMENT_PENDING' || ['CREATED', 'EXPIRED', 'PAYMENT_FAILED'].includes((status || '').toUpperCase())) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50/70 border border-amber-200/80 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> PAYMENT CANCELLED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] inline-block animate-pulse" /> TRANSFER {ts ? ts.replace(/_/g, ' ') : 'PENDING'}
      </span>
    );
  }

  const life = (lifecycleStatus || '').toLowerCase();
  const s    = (status || '').toUpperCase();

  if (life === 'registration_confirmed' || s === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50/70 border border-emerald-200/80 px-3 py-1 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Active
      </span>
    );
  }
  if (life === 'registration_failed' || s.includes('FAIL')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50/70 border border-rose-200/80 px-3 py-1 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Failed
      </span>
    );
  }
  if (life === 'refunded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200/80 px-3 py-1 rounded-full shadow-sm">
        Refunded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] inline-block animate-pulse" />
      {life ? life.replace(/_/g, ' ').toUpperCase() : (s || 'PENDING')}
    </span>
  );
}

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'dns',       label: 'DNS & Nameservers' },
  { id: 'products',  label: 'Email & Security' },
  { id: 'details',   label: 'Order Details' },
];

export default function DomainRegistrationOrderPage() {
  const { orderId }  = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [order,         setOrder]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [actionError,   setActionError]   = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [activeTab,     setActiveTab]     = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return TABS.some(t => t.id === hash) ? hash : 'overview';
  });

  const [showRenewCheckout, setShowRenewCheckout] = useState(false);
  const [renewPeriod, setRenewPeriod] = useState(1);
  const [renewPayLoading, setRenewPayLoading] = useState(false);
  const [retryPayLoading, setRetryPayLoading] = useState(false);
  const [renewQuote, setRenewQuote] = useState(null);
  const [renewQuoteLoading, setRenewQuoteLoading] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    domainStorefrontAPI.getConfig()
      .then(({ data }) => {
        setConfig(data?.data ?? data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showRenewCheckout || !orderId) return undefined;
    let cancelled = false;
    setRenewQuoteLoading(true);
    domainStorefrontAPI
      .getRenewDomainQuote(orderId, renewPeriod)
      .then(({ data }) => {
        if (!cancelled) setRenewQuote(data?.data ?? data);
      })
      .catch(() => {
        if (!cancelled) setRenewQuote(null);
      })
      .finally(() => {
        if (!cancelled) setRenewQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showRenewCheckout, orderId, renewPeriod]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && TABS.some(t => t.id === hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run once on mount / update
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  /* ─ Load order ─ */
  const loadOrder = useCallback(async (sync = true) => {
    if (!orderId) return;
    setActionError('');
    try {
      const { data } = await domainStorefrontAPI.getOrder(orderId, { sync });
      setOrder(unwrapOrder(data));
    } catch (err) {
      setActionError(readApiError(err, 'Could not load order.'));
      setOrder(null);
    } finally { setLoading(false); setSyncing(false); }
  }, [orderId]);

  useEffect(() => { setLoading(true); loadOrder(true); }, [loadOrder]);

  /* ─ Actions ─ */
  const handleSync = async () => {
    setSyncing(true); setActionMessage(''); setActionError('');
    try {
      const { data } = await domainStorefrontAPI.syncOrder(orderId);
      setOrder(unwrapOrder(data));
      setActionMessage('Status refreshed successfully.');
    } catch (err) { setActionError(readApiError(err, 'Sync failed.')); }
    finally { setSyncing(false); }
  };

  const handleResend = async () => {
    setActionError(''); setActionMessage('');
    try {
      const { data } = await domainStorefrontAPI.resendVerification(orderId);
      const body = data?.data ?? data;
      setActionMessage(body?.message || 'Verification email sent to your inbox.');
    } catch (err) { setActionError(readApiError(err, 'Could not resend verification email.')); }
  };

  const handleRetry = async () => {
    setActionError(''); setActionMessage('');
    try {
      const { data } = await domainStorefrontAPI.retryProvision(orderId);
      const body = data?.data ?? data;
      setActionMessage(body?.message || 'Registration retry started.');
      await loadOrder(false);
    } catch (err) { setActionError(readApiError(err, 'Retry failed.')); }
  };

  const handleRetryPayment = async () => {
    setActionError(''); setActionMessage('');
    setRetryPayLoading(true);
    try {
      // Backend reuses the existing unpaid Razorpay order (or mints a fresh one)
      // for this cancelled attempt — it never touches OpenProvider here.
      const { data: payPayload } = await domainStorefrontAPI.retryTransferPayment(orderId);
      const payData = payPayload?.data ?? payPayload;
      const { openRazorpayCheckout } = await import('../utils/razorpayCheckout');
      await new Promise((resolve, reject) => {
        openRazorpayCheckout({
          orderData: payData,
          user,
          description: `Transfer ${order?.domain || 'domain'}`,
          onSuccess: async (response) => {
            try {
              const { data } = await domainStorefrontAPI.verifyTransferPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                registrationOrderId: payData.registrationOrderId,
              });
              resolve(data?.data ?? data);
            } catch (err) { reject(err); }
          },
          onFailure: (err) => reject(err),
          onDismiss: () => reject(new Error('Payment cancelled')),
        });
      });
      setActionMessage('Payment received — your domain transfer is being processed.');
      await loadOrder(false);
    } catch (err) {
      // A plain Razorpay dismissal/cancel is not an error: the order stays
      // PAYMENT CANCELLED and Retry Payment remains available.
      if ((err?.message || '').toLowerCase().includes('payment cancelled')) {
        setActionError('');
      } else {
        setActionError(readApiError(err, 'Retry payment failed.'));
      }
    } finally { setRetryPayLoading(false); }
  };

   const handleRenew = () => {
    setShowRenewCheckout(true);
    // Scroll to renewal checkout panel
    setTimeout(() => {
      document.getElementById('renew-checkout-panel')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleRenewPayment = async () => {
    setActionError(''); setActionMessage('');
    setRenewPayLoading(true);
    try {
      const { payDomainRenewal } = await import('../utils/domainRenewalCheckout');
      const updated = await payDomainRenewal({
        orderId,
        period: renewPeriod,
        user,
        description: `Renew ${order.domain} for ${renewPeriod} Year(s)`,
      });
      setSyncing(true);
      setOrder(unwrapOrder(updated));
      setActionMessage(`Domain successfully renewed for ${renewPeriod} year(s)!`);
      setShowRenewCheckout(false);
    } catch (err) {
      setActionError(readApiError(err, 'Renewal payment failed.'));
    } finally {
      setSyncing(false);
      setRenewPayLoading(false);
    }
  };

  const handleInvoice = () => {
    if (!order) return;
    if (!(order.taxInvoiceNumber || order.invoiceNumber)) {
      window.alert(
        'Invoice is available only after the domain is successfully registered. '
        + 'Failed or refunded purchases do not receive an invoice number.',
      );
      return;
    }
    const customerName =
      order.buyerFullName ||
      order.buyer_full_name ||
      [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim() ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      user?.fullName ||
      user?.username ||
      '';
    generateInvoice({
      type: 'domain_registration',
      item: order,
      user: {
        ...user,
        name: customerName,
        email: order.buyerEmail || user?.email || '',
        phone: order.buyerPhone || user?.phoneNumber || user?.phone || '',
        gstin: order.buyerGstin || '',
        address: user?.address || '',
      },
    });
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-32 bg-gray-50/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-gray-500">Fetching settings...</p>
        </div>
      </div>
    </AppLayout>
  );

  if (!order) return (
    <AppLayout>
      <div className="max-w-lg mx-auto py-20 text-center px-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <p className="text-gray-700 font-semibold mb-6">{actionError || 'Order not found.'}</p>
        <Link to="/storefront" className="inline-flex h-10 items-center justify-center bg-indigo-600 text-white rounded-lg px-6 font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          Back to Storefront
        </Link>
      </div>
    </AppLayout>
  );

  const isActive     = order.status === 'ACTIVE' || order.lifecycleStatus === 'registration_confirmed';
  const nameservers  = Array.isArray(order.domainManagement?.nameservers) ? order.domainManagement.nameservers : [];
  const legacyResellerClub = Boolean(order.domainManagement?.legacyResellerClub);
  // Payment was never actually completed (cancelled/abandoned checkout): no
  // captured Razorpay payment and the order is still in an unpaid state. The
  // Transfer Progress box must NOT appear for these — it only describes a
  // transfer that is actually being processed after payment.
  const paymentNotCompleted =
    !order.razorpayPaymentId &&
    (['CREATED', 'EXPIRED', 'PAYMENT_FAILED'].includes((order.status || '').toUpperCase()) ||
     (order.transferStatus || '').toUpperCase() === 'PAYMENT_PENDING');
  const expiresAt    = order.expiresAt ? new Date(order.expiresAt) : null;
  const daysLeft     = expiresAt ? Math.floor((expiresAt - Date.now()) / 86400000) : null;
  const expiringSoon = daysLeft !== null && daysLeft < 90;

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50/50 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

          {/* Back Nav */}
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors select-none">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          {/* Header Panel */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[0.7rem] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                  {order.isTransfer ? "Domain Transfer" : "Active Domain"}
                </p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{order.domain}</h1>
              {order.registrarOrderId && (
                <p className="text-xs text-gray-400 font-mono">Registrar Order ID: {order.registrarOrderId}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} lifecycleStatus={order.lifecycleStatus} isTransfer={order.isTransfer} transferStatus={order.transferStatus} />
            </div>
          </div>

          {/* Alerts */}
          {actionMessage && (
            <div className="flex items-start gap-2.5 text-sm text-emerald-800 bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 mb-6 shadow-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
          )}
          {actionError && (
            <div className="flex items-start gap-2.5 text-sm text-rose-800 bg-rose-50/60 border border-rose-200 rounded-xl p-4 mb-6 shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <span className="font-semibold">{actionError}</span>
            </div>
          )}

          {/* Expiry Banner */}
          {expiringSoon && daysLeft !== null && isActive && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50/80 border border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900">Domain Expiring Soon</h4>
                <p className="text-xs text-amber-700">
                  {daysLeft > 7 ? (
                    `Your domain will expire in ${daysLeft} days (${fmtDateShort(order.expiresAt)}). Renewal opens 7 days before expiry.`
                  ) : (
                    `Your domain will expire in ${daysLeft} days (${fmtDateShort(order.expiresAt)}). Renew now to prevent service disruption.`
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRenew}
                disabled={syncing || daysLeft > 7}
                className="w-full sm:w-auto shrink-0 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                title={daysLeft > 7 ? "Domain renewal is only available within 7 days of expiration." : undefined}
              >
                {daysLeft > 7 ? "Renew (Unavailable)" : "Renew Domain"}
              </button>
            </div>
          )}

          {showRenewCheckout && (
            <div id="renew-checkout-panel" className="bg-white border border-indigo-150 rounded-2xl p-6 shadow-sm mb-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Renew Domain Checkout</h3>
                <button type="button" onClick={() => setShowRenewCheckout(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Renewal Period</span>
                  <select
                    value={renewPeriod}
                    onChange={(e) => setRenewPeriod(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-950 focus:bg-white focus:border-indigo-400 outline-none transition-all font-semibold"
                  >
                    {[1, 2, 3, 5, 10].map((y) => (
                      <option key={y} value={y}>
                        {y} {y === 1 ? 'Year' : 'Years'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 flex flex-col justify-center">
                  {renewQuoteLoading ? (
                    <p className="text-xs text-gray-500">Loading live renewal price…</p>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Base Renewal Price:</span>
                        <span>
                          {formatInr(
                            renewQuote?.subtotalInr
                              ?? ((config?.renewalFallbackUnitInr || 799) * renewPeriod),
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>
                          GST{renewQuote?.gstRate != null ? ` (${renewQuote.gstRate}%)` : ''}:
                        </span>
                        <span>
                          {formatInr(
                            renewQuote?.gstInr
                              ?? Math.round((config?.renewalFallbackUnitInr || 799) * renewPeriod * 0.18 * 100) / 100,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold text-gray-950 mt-2 border-t border-gray-200 pt-2">
                        <span>Total Amount:</span>
                        <span>
                          {formatInr(
                            renewQuote?.totalInr
                              ?? Math.round((config?.renewalFallbackUnitInr || 799) * renewPeriod * 1.18 * 100) / 100,
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRenewPayment}
                  disabled={renewPayLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-8 rounded-xl transition-all shadow-sm select-none"
                >
                  {renewPayLoading ? 'Loading Secure Checkout...' : 'Make Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Tab Selector */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center overflow-x-auto gap-1 mb-8 max-w-fit shadow-inner">
            {TABS.map((t) => {
              const isLocked = order.isTransfer && order.transferStatus !== 'COMPLETED' && (t.id === 'dns' || t.id === 'products');
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => !isLocked && setActiveTab(t.id)}
                  title={isLocked ? "Available after transfer completes" : undefined}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5 ${
                    activeTab === t.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : isLocked
                        ? 'text-gray-400 opacity-60 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {isLocked && <Lock className="w-3.5 h-3.5" />}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === 'overview' && (
            <>
              {order.isTransfer ? (
                /* ── TRANSFER DETAILS UI ── */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main summary */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Transfer Information</h2>
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="divide-y divide-gray-100/70">
                        <InfoRow icon={Globe} label="Domain" value={order.domain} />
                        <InfoRow 
                          icon={Calendar} 
                          label="Transfer Requested" 
                          value={fmtDateShort(order.createdAt)} 
                        />
                        <InfoRow 
                          icon={Activity} 
                          label="Transfer Status" 
                          value={
                            order.transferStatus === 'PAYMENT_PENDING' ? 'Payment Cancelled — the payment was not completed. Use Retry Payment below to try again.' :
                            order.transferStatus === 'PROCESSING' ? 'Processing Transfer' :
                            order.transferStatus === 'COMPLETED' ? 'Transfer Completed' :
                            order.transferStatus === 'FAILED' ? 'Transfer Failed' :
                            (order.transferStatus || 'Pending')
                          } 
                        />
                        {order.buyerEmail && (
                          <InfoRow icon={Mail} label="Registered Email" value={order.buyerEmail} />
                        )}
                      </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button type="button" onClick={handleSync} disabled={syncing}
                          className="inline-flex items-center justify-center gap-2 h-11 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm">
                          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                          Refresh Transfer Status
                        </button>

                        {order.canRetry && order.transferStatus === 'FAILED' && (
                          <button type="button" onClick={handleRetry}
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-sm">
                            Retry Transfer
                          </button>
                        )}

                        {order.canRetryPayment && (
                          <button type="button" onClick={handleRetryPayment} disabled={retryPayLoading}
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-sm disabled:opacity-50">
                            {retryPayLoading ? 'Opening Checkout...' : 'Retry Payment'}
                          </button>
                        )}

                        {(order.taxInvoiceNumber || order.invoiceNumber) && (
                          <button type="button" onClick={handleInvoice}
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                            <FileText className="w-4 h-4 text-gray-500" />
                            Download Invoice Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar stats/info — Transfer Progress only once payment has
                      actually been completed and the transfer is processing */}
                  {!paymentNotCompleted && (
                    <div className="space-y-6">
                      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Activity className="w-5 h-5" />
                          <h3 className="text-sm font-bold uppercase tracking-wider">Transfer Progress</h3>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Domain transfers typically take 5-7 days to complete after initiation. Ensure you have unlocked the domain at your previous registrar and provided the correct EPP/Auth code.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* ── REGISTRATION DETAILS UI ── */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main summary */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Domain Information</h2>
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="divide-y divide-gray-100/70">
                        <InfoRow icon={Globe} label="Domain" value={order.domain} />
                        <InfoRow
                          icon={Calendar}
                          label="Registration Period"
                          value={`${order.periodYears || 1} ${(order.periodYears || 1) === 1 ? 'Year' : 'Years'}`}
                        />
                        <InfoRow icon={Calendar} label="Registered On" value={fmtDateShort(order.completedAt || order.createdAt)} />
                        {expiresAt && (
                          <InfoRow icon={Calendar} label="Expires On"
                            value={<span className={expiringSoon ? 'text-rose-600 font-bold' : ''}>{fmtDateShort(order.expiresAt)}</span>}
                          />
                        )}
                        {order.buyerEmail && (
                          <InfoRow icon={Mail} label="Registered Email" value={order.buyerEmail} />
                        )}
                      </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button type="button" onClick={handleSync} disabled={syncing}
                          className="inline-flex items-center justify-center gap-2 h-11 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm">
                          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                          Refresh Domain Status
                        </button>

                        {isActive && (
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={handleRenew}
                              disabled={syncing || (daysLeft !== null && daysLeft > 7)}
                              className="w-full inline-flex items-center justify-center gap-2 h-11 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-200 disabled:cursor-not-allowed transition-all rounded-xl shadow-sm"
                              title={daysLeft !== null && daysLeft > 7 ? "Domain renewal is only available within 7 days of expiration." : undefined}
                            >
                              {daysLeft !== null && daysLeft > 7 ? "Renew (Unavailable)" : "Renew Domain"}
                            </button>
                            {daysLeft !== null && daysLeft > 7 && (
                              <span className="text-[10px] text-gray-500 text-center font-medium">
                                Available {daysLeft - 7} days from now
                              </span>
                            )}
                          </div>
                        )}

                        {order.canRetry && (
                          <button type="button" onClick={handleRetry}
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-sm">
                            Retry Registration
                          </button>
                        )}

                        {order.canResendVerification && (
                          <button type="button" onClick={handleResend}
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                            <Mail className="w-4 h-4 text-gray-500" />
                            Resend Verification Email
                          </button>
                        )}

                        {(order.taxInvoiceNumber || order.invoiceNumber) && (
                          <button type="button" onClick={handleInvoice}
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                            <FileText className="w-4 h-4 text-gray-500" />
                            Download Invoice Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar stats/info */}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <Shield className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">Security & DNS</h3>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Make sure to keep your nameservers updated. Any DNS updates will automatically propagate globally within 24-48 hours.
                      </p>
                      <button type="button" onClick={() => setActiveTab('dns')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        Manage DNS Setup <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

          {/* ══ DNS TAB ══ */}
          {activeTab === 'dns' && (
            <DnsManagementSection
              orderId={orderId}
              nameservers={nameservers}
              legacyResellerClub={legacyResellerClub}
              onUpdateSuccess={() => loadOrder(false)}
            />
          )}

          {/* ══ PRODUCTS TAB ══ */}
          {activeTab === 'products' && (
            <AddonProductsSection
              order={order}
              user={user}
              onUpdateSuccess={() => loadOrder(false)}
            />
          )}

          {/* ══ ORDER DETAILS TAB ══ */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Payment Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Payment Summary</h2>
                  </div>
                  <div className="divide-y divide-gray-100/70">
                    {order.subtotalInr != null && (
                      <DetailRow label="Subtotal" value={formatInr(order.subtotalInr, { forceDecimals: true })} />
                    )}
                    {order.gstInr != null && Number(order.gstInr) > 0 && (
                      <DetailRow label={`GST${order.gstRate ? ` (${order.gstRate}%)` : ''}`} value={formatInr(order.gstInr, { forceDecimals: true })} />
                    )}
                    <DetailRow
                      label="Total Paid"
                      value={formatInr(order.priceInr || 0, { forceDecimals: true })}
                      valueClass="font-bold text-gray-900 text-base"
                    />
                  </div>
                </div>

                {/* Identity Summary */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Order Identifiers</h2>
                  </div>
                  <div className="divide-y divide-gray-100/70">
                    <MonoDetailRow label="Order ID" value={order.id} />
                    {order.razorpayPaymentId && (
                      <MonoDetailRow label="Razorpay Payment ID" value={order.razorpayPaymentId} />
                    )}
                    {order.registrarOrderId && (
                      <MonoDetailRow label="Registrar Order ID" value={order.registrarOrderId} />
                    )}
                    <DetailRow label="Status" value={<StatusBadge status={order.status} lifecycleStatus={order.lifecycleStatus} isTransfer={order.isTransfer} transferStatus={order.transferStatus} />} />
                  </div>
                </div>
              </div>

              {/* Sidebar timelines */}
              <div className="space-y-6">
                <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Registration Timeline</h3>
                  <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-200">
                    
                    <TimelineNode label="Order Created" date={fmtDate(order.createdAt)} active />
                    
                    {order.completedAt && (
                      <TimelineNode label="Completed" date={fmtDate(order.completedAt)} active />
                    )}
                    
                    {expiresAt && (
                      <TimelineNode label="Expires" date={fmtDateShort(order.expiresAt)} active={false} />
                    )}

                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}

/* ─── Timeline Node ─── */
function TimelineNode({ label, date, active }) {
  return (
    <div className="flex items-start gap-4 relative pl-1">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 relative z-10 ${active ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-gray-300'}`} />
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-gray-900">{label}</h4>
        <p className="text-[0.7rem] text-gray-400 font-medium">{date}</p>
      </div>
    </div>
  );
}

/* ─── DNS SECTION COMPONENT WITH NAMESERVER UPDATE FORM & VISUAL RECORDS EDITOR ─── */
function DnsManagementSection({ orderId, nameservers, legacyResellerClub = false, onUpdateSuccess }) {
  const [ns1, setNs1] = useState('');
  const [ns2, setNs2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // DNS records table states
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [dnsError, setDnsError] = useState('');
  const [dnsSuccess, setDnsSuccess] = useState('');

  // Form states to add a record
  const [recType, setRecType] = useState('A');
  const [recName, setRecName] = useState('');
  const [recValue, setRecValue] = useState('');
  const [recTtl, setRecTtl] = useState(3600);
  const [recPriority, setRecPriority] = useState(10);
  const [addingRecord, setAddingRecord] = useState(false);

  // States for inline editing and deleting
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [updatingRecord, setUpdatingRecord] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState(null);

  // Ref + brief highlight for the DNS Zone Records section (Open DNS Panel
  // now scrolls here instead of opening the external registrar panel).
  const dnsZoneRef = useRef(null);
  const [dnsZoneHighlight, setDnsZoneHighlight] = useState(false);

  const scrollToDnsZone = useCallback(() => {
    const el = dnsZoneRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setDnsZoneHighlight(true);
    window.setTimeout(() => setDnsZoneHighlight(false), 1800);
  }, []);

  const fetchDnsRecords = useCallback(async () => {
    setRecordsLoading(true);
    setDnsError('');
    try {
      const { data } = await domainStorefrontAPI.getDnsRecords(orderId);
      setRecords(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      setDnsError(scrubRegistrarVendorNames(readApiError(err, 'Could not fetch DNS records.'), 'Could not fetch DNS records.'));
    } finally { setRecordsLoading(false); }
  }, [orderId]);

  useEffect(() => {
    if (nameservers.length > 0) {
      setNs1(displayNameserverHost(nameservers[0] || '', 0));
      setNs2(displayNameserverHost(nameservers[1] || '', 1));
    }
    fetchDnsRecords();
  }, [nameservers, fetchDnsRecords]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const resolvedNs1 = resolveNameserverForSubmit(ns1, 0, nameservers);
    const resolvedNs2 = resolveNameserverForSubmit(ns2, 1, nameservers);
    if (!resolvedNs1.trim() || !resolvedNs2.trim()) {
      setError('Both nameservers are required.');
      return;
    }
    setLoading(true);
    try {
      await domainStorefrontAPI.updateNameservers(orderId, [resolvedNs1.trim(), resolvedNs2.trim()]);
      setSuccess('Nameservers successfully updated!');
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      setError(scrubRegistrarVendorNames(readApiError(err, 'Failed to update nameservers.'), 'Failed to update nameservers.'));
    } finally { setLoading(false); }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    setDnsError(''); setDnsSuccess('');
    if (!recName.trim() || !recValue.trim()) {
      setDnsError('Name and Target/Value fields are required.');
      return;
    }
    setAddingRecord(true);
    try {
      const payload = {
        type: recType,
        name: recName.trim(),
        value: recValue.trim(),
        ttl: Number(recTtl),
      };
      if (recType === 'MX') {
        payload.priority = Number(recPriority);
      }
      await domainStorefrontAPI.createDnsRecord(orderId, payload);
      setDnsSuccess('DNS record successfully added!');
      setRecName('');
      setRecValue('');
      await fetchDnsRecords();
    } catch (err) {
      setDnsError(scrubRegistrarVendorNames(
        readApiError(err, 'Could not create DNS record. Make sure nameservers are set to default.'),
        'Could not create DNS record. Make sure nameservers are set to CoBrother managed DNS.',
      ));
    } finally { setAddingRecord(false); }
  };

  const handleDeleteRecord = async (recordId) => {
    setDnsError(''); setDnsSuccess('');
    setDeletingRecordId(recordId);
    try {
      await domainStorefrontAPI.deleteDnsRecord(orderId, recordId);
      setDnsSuccess('DNS record deleted.');
      await fetchDnsRecords();
    } catch (err) {
      setDnsError(readApiError(err, 'Could not delete DNS record.'));
    } finally {
      setDeletingRecordId(null);
    }
  };

  const handleEditClick = (record) => {
    setEditingRecordId(record.id);
    setEditingData({
      type: record.type,
      name: record.name,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority ?? 10
    });
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
  };

  const handleUpdateRecord = async (recordId) => {
    setDnsError(''); setDnsSuccess('');
    if (!editingData.name?.trim() || !editingData.value?.trim()) {
      setDnsError('Name and Target/Value fields are required.');
      return;
    }
    setUpdatingRecord(true);
    try {
      const payload = {
        type: editingData.type,
        name: editingData.name.trim(),
        value: editingData.value.trim(),
        ttl: Number(editingData.ttl),
      };
      if (editingData.type === 'MX') {
        payload.priority = Number(editingData.priority);
      }
      await domainStorefrontAPI.updateDnsRecord(orderId, recordId, payload);
      setDnsSuccess('DNS record updated.');
      setEditingRecordId(null);
      await fetchDnsRecords();
    } catch (err) {
      setDnsError(readApiError(err, 'Could not update DNS record.'));
    } finally {
      setUpdatingRecord(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {legacyResellerClub && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="font-bold">Domain DNS setup required</p>
            <p className="mt-1 text-amber-800/90">
              DNS and nameserver management for this domain is not fully enabled in CoBrother yet.
              Please contact CoBrother support to finish setup.
            </p>
          </div>
        )}
        
        {/* Form Card (Nameservers) */}
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Configure Nameservers</h2>
            <p className="text-xs text-gray-500 mt-1">
              Provide primary and secondary DNS hosts to connect your domain with custom hosting providers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Nameserver 1
                </label>
                <input
                  type="text"
                  value={ns1}
                  onChange={(e) => setNs1(e.target.value)}
                  placeholder="e.g. ns1.cobrother.com"
                  className="w-full bg-gray-50 border border-gray-200/80 focus:border-indigo-500 focus:bg-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Nameserver 2
                </label>
                <input
                  type="text"
                  value={ns2}
                  onChange={(e) => setNs2(e.target.value)}
                  placeholder="e.g. ns2.cobrother.com"
                  className="w-full bg-gray-50 border border-gray-200/80 focus:border-indigo-500 focus:bg-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Custom Nameservers
              </button>
            </div>
          </form>

          {nameservers.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3 justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">
                Current Settings: {formatNameserversForDisplay(nameservers)}
              </span>
              {!isPlatformNameserverSet(nameservers) && (
                <CopyBtn
                  text={nameservers.map((host, i) => displayNameserverHost(host, i)).join('\n')}
                  label="Copy Settings"
                />
              )}
            </div>
          )}
        </div>

        {/* Visual DNS Records Editor */}
        <div
          ref={dnsZoneRef}
          className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all duration-700 ${
            dnsZoneHighlight
              ? 'border-indigo-400 ring-4 ring-indigo-100'
              : 'border-gray-200/80'
          }`}
        >
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">DNS Zone Records</h2>
              <p className="text-xs text-gray-500 mt-1">Configure individual A, CNAME, TXT, or MX records for custom service configurations.</p>
            </div>
            <button
              onClick={fetchDnsRecords}
              type="button"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Records
            </button>
          </div>

          <div className="p-6 space-y-6">
            {dnsError && (
              <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                {dnsError}
              </div>
            )}
            {dnsSuccess && (
              <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                {dnsSuccess}
              </div>
            )}

            {/* List Table */}
            {(() => {
              const displayRecords = records.filter(r => !['SOA', 'NS'].includes(r.type));
              const hasSystemRecords = records.length > displayRecords.length;

              return (
                <div className="space-y-4">
                  {hasSystemRecords && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-start gap-3">
                      <div className="text-indigo-600 mt-0.5">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-indigo-900">System-managed DNS</h4>
                        <p className="text-xs text-indigo-700 mt-0.5">Core DNS infrastructure is managed automatically by CoBrother.</p>
                      </div>
                    </div>
                  )}
                  {recordsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : displayRecords.length === 0 ? (
                    <p className="text-xs text-gray-400 font-semibold italic text-center py-4 bg-gray-50/50 rounded-xl">
                      No custom DNS records configured. Add an A, CNAME, TXT, or MX record to configure your domain.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-gray-150 rounded-xl">
                      <table className="min-w-full text-xs text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-150 uppercase tracking-wider text-gray-400 font-bold">
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5">Name / Host</th>
                            <th className="px-4 py-2.5">Value / Target</th>
                            <th className="px-4 py-2.5">TTL</th>
                            <th className="px-4 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {displayRecords.map((r, idx) => {
                            const rowKey = [
                              r.id,
                              r.type,
                              r.name,
                              r.value,
                              r.priority,
                              idx,
                            ]
                              .filter((part) => part !== undefined && part !== null && part !== '')
                              .join('|');
                            const isEditing = editingRecordId === r.id;

                            if (isEditing) {
                        return (
                          <tr key={rowKey} className="bg-indigo-50/30">
                            <td className="px-4 py-3">
                              <select
                                value={editingData.type}
                                onChange={(e) => setEditingData({ ...editingData, type: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400"
                              >
                                {['A', 'CNAME', 'TXT', 'MX'].map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={editingData.name}
                                onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs font-mono outline-none focus:border-indigo-400"
                                placeholder="@"
                              />
                            </td>
                            <td className="px-4 py-3 space-y-2">
                              <input
                                type="text"
                                value={editingData.value}
                                onChange={(e) => setEditingData({ ...editingData, value: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs font-mono outline-none focus:border-indigo-400"
                                placeholder="Target"
                              />
                              {editingData.type === 'MX' && (
                                <input
                                  type="number"
                                  value={editingData.priority}
                                  onChange={(e) => setEditingData({ ...editingData, priority: e.target.value })}
                                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400"
                                  placeholder="Priority (e.g. 10)"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={editingData.ttl}
                                onChange={(e) => setEditingData({ ...editingData, ttl: e.target.value })}
                                className="w-20 bg-white border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400"
                              />
                            </td>
                            <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => handleUpdateRecord(r.id)}
                                disabled={updatingRecord}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold disabled:opacity-50"
                              >
                                {updatingRecord && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {updatingRecord ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={updatingRecord}
                                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                      <tr key={rowKey} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-bold text-indigo-700">
                          {r.type}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-800">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-gray-800 break-all max-w-xs">{r.value} {r.priority != null && `(Priority: ${r.priority})`}</td>
                        <td className="px-4 py-3 text-gray-400">{r.ttl}s</td>
                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleEditClick(r)}
                            type="button"
                            className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            type="button"
                            disabled={deletingRecordId === r.id}
                            className="inline-flex items-center gap-1 text-gray-400 hover:text-rose-600 transition-colors p-1 disabled:opacity-50 disabled:hover:text-gray-400"
                            title="Delete Record"
                          >
                            {deletingRecordId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {deletingRecordId === r.id && <span className="text-[10px] font-bold">Deleting...</span>}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

            {/* Add Record Form */}
            <form onSubmit={handleAddRecord} className="border-t border-gray-100 pt-5 space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Add Custom Record</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Type</span>
                  <select
                    value={recType}
                    onChange={(e) => setRecType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                  >
                    {['A', 'CNAME', 'TXT', 'MX'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Name</span>
                  <input
                    type="text"
                    value={recName}
                    onChange={(e) => setRecName(e.target.value)}
                    placeholder="@, www"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                    required
                  />
                </div>

                <div className="col-span-2 md:col-span-2 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Target / Value</span>
                  <input
                    type="text"
                    value={recValue}
                    onChange={(e) => setRecValue(e.target.value)}
                    placeholder="IP address or host target"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                    required
                  />
                </div>

                {recType === 'MX' ? (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Priority</span>
                    <input
                      type="number"
                      value={recPriority}
                      onChange={(e) => setRecPriority(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">TTL</span>
                    <input
                      type="number"
                      value={recTtl}
                      onChange={(e) => setRecTtl(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingRecord}
                  className="inline-flex h-9 items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 rounded-lg shadow-sm"
                >
                  {addingRecord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {addingRecord ? 'Adding...' : 'Add DNS Record'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Advanced DNS Records — moved below the DNS Zone Records section */}
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Advanced DNS records</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              If your nameservers are set to our defaults, you can manage individual A, MX, CNAME or TXT records directly from the DNS Zone Records section above.
            </p>
          </div>
          <div className="px-6 py-5">
            <button
              type="button"
              onClick={scrollToDnsZone}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Open DNS Panel <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* DNS Sidebar Info */}
      <div className="space-y-6" />
    </div>
  );
}

/* ─── ADDONS / PRODUCTS MANAGEMENT SECTION ─── */
function AddonProductsSection({ order, onUpdateSuccess, user }) {
  const [mailboxPrefix, setMailboxPrefix] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingSSL, setLoadingSSL] = useState(false);
  const [loadingDnssec, setLoadingDnssec] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [sslProducts, setSslProducts] = useState([]);
  const [sslProductId, setSslProductId] = useState('');
  const [sslPeriod, setSslPeriod] = useState('1');
  const [sslApproverEmail, setSslApproverEmail] = useState(user?.email || '');
  const [sslValidationMethod, setSslValidationMethod] = useState('email');
  const [sslPricesLoading, setSslPricesLoading] = useState(true);

  const [passwords, setPasswords] = useState({});
  const [loadingPass, setLoadingPass] = useState({});

  useEffect(() => {
    domainStorefrontAPI.getPrices()
      .then(({ data }) => {
        const prices = data?.data ?? data;
        const list = Array.isArray(prices?.ssl?.products) ? prices.ssl.products : [];
        setSslProducts(list);
        if (list.length > 0) {
          const preferred = list.find((p) => !p.wildcard) || list[0];
          setSslProductId(String(preferred.id));
        }
      })
      .catch(() => setSslProducts([]))
      .finally(() => setSslPricesLoading(false));
  }, []);

  const addons = (() => {
    try {
      return JSON.parse(order.dnsRecords || '{}');
    } catch {
      return {};
    }
  })();

  const mailboxes = Array.isArray(addons.mailboxes)
    ? addons.mailboxes.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return String(item.address || item.email || '').trim();
        return '';
      }).filter(Boolean)
    : [];
  const sslState = addons.ssl && typeof addons.ssl === 'object' ? addons.ssl : null;
  const sslActive = Boolean(sslState?.active || addons.ssl_active);
  const sslExpiry = sslState?.expiresAt
    ? new Date(sslState.expiresAt)
    : (addons.ssl_expiry ? new Date(addons.ssl_expiry) : null);
  const sslStatus = sslState?.status || (sslActive ? 'ACT' : null);
  const dnssecEnabled = Boolean(addons.dnssec_enabled);

  const selectedSslProduct = sslProducts.find((p) => String(p.id) === String(sslProductId));
  const sslMaxPeriod = Math.max(1, Number(selectedSslProduct?.periodYearsMax) || 1);

  const handleOrderEmail = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const prefix = mailboxPrefix.trim().toLowerCase();
    if (!prefix) {
      setError('Please specify a mailbox prefix.');
      return;
    }
    setLoadingEmail(true);
    try {
      const { payEmailAddon } = await import('../utils/domainAddonCheckout');
      await payEmailAddon({
        orderId: order.id,
        mailbox: prefix,
        user,
        description: `Email mailbox ${prefix}@${order.domain}`,
      });
      setSuccess(`Mailbox ${prefix}@${order.domain} successfully configured!`);
      setMailboxPrefix('');
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      setError(readApiError(err, 'Failed to configure mailbox.'));
    } finally { setLoadingEmail(false); }
  };

  const handleOrderSSL = async () => {
    setError(''); setSuccess('');
    if (!sslProductId) {
      setError('Select an SSL product.');
      return;
    }
    if (!sslApproverEmail.trim()) {
      setError('Approver email is required.');
      return;
    }
    setLoadingSSL(true);
    try {
      const { paySslAddon } = await import('../utils/domainAddonCheckout');
      await paySslAddon({
        orderId: order.id,
        productId: Number(sslProductId),
        period: Number(sslPeriod),
        approverEmail: sslApproverEmail.trim(),
        validationMethod: sslValidationMethod,
        user,
        description: `SSL certificate for ${order.domain}`,
      });
      setSuccess('SSL certificate ordered with the registrar. Status will update after validation.');
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      setError(readApiError(err, 'Failed to order SSL.'));
    } finally { setLoadingSSL(false); }
  };

  const handleToggleDnssec = async () => {
    setError(''); setSuccess('');
    setLoadingDnssec(true);
    try {
      const { data } = await domainStorefrontAPI.toggleDnssec(order.id, !dnssecEnabled);
      const res = unwrapOrder(data);
      const resAddons = JSON.parse(res.dnsRecords || '{}');
      setSuccess(
        resAddons.dnssec_enabled
          ? 'DNSSEC Security Extension enabled on your domain registry.'
          : 'DNSSEC Security Extension disabled.'
      );
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      setError(readApiError(err, 'Failed to update DNSSEC settings.'));
    } finally { setLoadingDnssec(false); }
  };

  const handleUpdatePassword = async (mailbox) => {
    setError(''); setSuccess('');
    const pass = (passwords[mailbox] || '').trim();
    if (!pass) {
      setError(`Specify a password for ${mailbox}.`);
      return;
    }
    setLoadingPass((prev) => ({ ...prev, [mailbox]: true }));
    try {
      const prefix = mailbox.split('@')[0];
      await domainStorefrontAPI.updateMailboxPassword(order.id, prefix, pass);
      setSuccess(`Password for ${mailbox} updated successfully!`);
      setPasswords((prev) => ({ ...prev, [mailbox]: '' }));
    } catch (err) {
      setError(readApiError(err, 'Failed to update password.'));
    } finally {
      setLoadingPass((prev) => ({ ...prev, [mailbox]: false }));
    }
  };

  const downloadPrivateKey = () => {
    if (!sslState?.privateKey) return;
    const blob = new Blob([sslState.privateKey], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.domain || 'ssl'}-private.key`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">

        {error && (
          <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
            {success}
          </div>
        )}

        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">SSL Security protection</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Order an SSL certificate for this domain. Prices include Admin SSL Certificates commission.
              </p>
              {sslState && (
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full border ${
                    sslActive
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-amber-800 bg-amber-50 border-amber-200'
                  }`}>
                    <span className={`w-1 h-1 rounded-full inline-block ${sslActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {sslActive ? 'SSL Active' : `SSL ${sslStatus || 'Pending'}`}
                  </span>
                  {sslState.productName && (
                    <span className="text-xs text-gray-500 font-semibold">{sslState.productName}</span>
                  )}
                  {sslExpiry && !Number.isNaN(sslExpiry.getTime()) && (
                    <span className="text-xs text-gray-400 font-semibold">
                      Expires: {sslExpiry.toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {sslState?.opOrderId ? (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">
                Registrar order #{sslState.opOrderId}
                {sslState.approverEmail ? ` · Approver ${sslState.approverEmail}` : ''}
              </p>
              {sslState.privateKey && (
                <button
                  type="button"
                  onClick={downloadPrivateKey}
                  className="inline-flex h-9 items-center justify-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-4 rounded-lg"
                >
                  Download private key
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              {sslPricesLoading ? (
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading live SSL prices…
                </p>
              ) : sslProducts.length === 0 ? (
                <p className="text-xs text-amber-700">SSL products are currently unavailable.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Product</label>
                      <select
                        value={sslProductId}
                        onChange={(e) => setSslProductId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                      >
                        {sslProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.wildcard ? ' (Wildcard)' : ''} — {p.label || `₹${p.unitInr}/yr`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Period</label>
                      <select
                        value={sslPeriod}
                        onChange={(e) => setSslPeriod(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                      >
                        {Array.from({ length: sslMaxPeriod }, (_, i) => i + 1).map((y) => (
                          <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Approver email</label>
                      <input
                        type="email"
                        value={sslApproverEmail}
                        onChange={(e) => setSslApproverEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                        placeholder="admin@yourdomain.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Validation</label>
                      <select
                        value={sslValidationMethod}
                        onChange={(e) => setSslValidationMethod(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-400"
                      >
                        <option value="email">Email</option>
                        <option value="https">HTTPS</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleOrderSSL}
                    disabled={loadingSSL || !sslProductId}
                    className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
                  >
                    {loadingSSL && <Loader2 className="w-4 h-4 animate-spin" />}
                    {selectedSslProduct?.label
                      ? `Order SSL (${selectedSslProduct.label})`
                      : 'Order SSL Protection'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">DNSSEC Extension</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Protect your DNS records against spoofing or cache poisoning by signing your zone files cryptographically.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[0.7rem] font-bold border px-2.5 py-0.5 rounded-full ${
                  dnssecEnabled ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-gray-600 bg-gray-50 border-gray-200'
                }`}>
                  {dnssecEnabled ? 'DNSSEC Enabled' : 'DNSSEC Disabled'}
                </span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <button
              onClick={handleToggleDnssec}
              disabled={loadingDnssec}
              className={`inline-flex h-10 items-center justify-center gap-2 text-xs font-bold rounded-xl px-5 border transition-all shadow-sm ${
                dnssecEnabled
                  ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
              }`}
            >
              {loadingDnssec && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {dnssecEnabled ? 'Disable DNSSEC' : 'Enable DNSSEC'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex items-start gap-4 border-b border-gray-100 pb-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Professional Emails</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Configure branded mailboxes with your custom domain name to run business communications professionally.
              </p>
            </div>
          </div>

          {mailboxes.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Active Mailboxes</h4>
              <div className="space-y-3">
                {mailboxes.map((email) => (
                  <div key={email} className="border border-gray-150 rounded-xl p-4 space-y-3 bg-gray-50/30">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-800 font-mono">{email}</span>
                      <span className="text-[0.65rem] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                      <div className="relative flex-1 min-w-[200px]">
                        <input
                          type="password"
                          value={passwords[email] || ''}
                          onChange={(e) => setPasswords((prev) => ({ ...prev, [email]: e.target.value }))}
                          placeholder="Set new mailbox password"
                          className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs outline-none focus:border-indigo-400"
                        />
                        <Key className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                      </div>
                      <button
                        onClick={() => handleUpdatePassword(email)}
                        disabled={loadingPass[email]}
                        type="button"
                        className="inline-flex h-8 items-center justify-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 rounded-lg shadow-sm"
                      >
                        {loadingPass[email] && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleOrderEmail} className="pt-4 border-t border-gray-50 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                Create New Mailbox prefix
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={mailboxPrefix}
                  onChange={(e) => setMailboxPrefix(e.target.value)}
                  placeholder="e.g. sales, query"
                  className="w-full bg-gray-50 border border-gray-200/80 focus:border-indigo-500 focus:bg-white text-sm font-medium pl-4 pr-32 py-2.5 rounded-xl outline-none transition-all"
                  required
                />
                <span className="absolute right-4 text-xs text-gray-400 font-semibold select-none">
                  @{order.domain}
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={loadingEmail}
              className="inline-flex h-11 items-center justify-center gap-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
            >
              {loadingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Mailbox
            </button>
          </form>
        </div>

      </div>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Business suite tips</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            SSL prices include your Admin SSL Certificates commission. Download and store the private key securely after purchase — the registrar does not keep it.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper row components ─── */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider shrink-0 flex items-center gap-2 select-none">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
      </span>
      <span className="text-sm text-gray-800 font-semibold text-right">{value}</span>
    </div>
  );
}

function DetailRow({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider shrink-0 select-none">{label}</span>
      <span className={`text-sm text-gray-800 font-semibold text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function MonoDetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between px-6 py-4 gap-4">
      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider shrink-0 select-none">{label}</span>
      <span className="text-xs font-mono text-gray-800 text-right break-all max-w-xs">{value}</span>
    </div>
  );
}
