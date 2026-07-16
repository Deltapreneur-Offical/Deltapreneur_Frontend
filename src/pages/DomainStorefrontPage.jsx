import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle2, AlertCircle, Globe, ArrowRight, Loader2, Lock, ShieldAlert, Key, Plus, Sparkles, CreditCard, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { domainAPI, domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { registrationOrderDetailPath } from '../utils/domainRegistrationOrder';
import { resolveRegistrationPricing } from '../utils/domainRegistrationPricing';
import DomainRegistrationPriceBreakdown from '../components/domain/DomainRegistrationPriceBreakdown';
import { readApiError } from '../utils/apiError';
import { canManageRegisteredDomain, domainManagementHref } from '../utils/domainManagement';
import DomainServices from '../components/storefront/DomainServices';

function statusBadgeClass(status, lifecycleStatus) {
  const life = (lifecycleStatus || '').toLowerCase();
  if (life === 'registration_confirmed' || (status || '').toUpperCase() === 'ACTIVE') {
    return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  }
  if (
    life === 'payment_success' ||
    life === 'registration_pending' ||
    ['CREATED', 'PAYMENT_COMPLETED', 'REGISTRATION_PENDING'].includes((status || '').toUpperCase())
  ) {
    return 'bg-amber-50 border-amber-200 text-amber-800';
  }
  if (life === 'registration_failed' || (status || '').toUpperCase().includes('FAIL')) {
    return 'bg-rose-50 border-rose-200 text-rose-700';
  }
  return 'bg-gray-50 border-gray-200 text-gray-700';
}

function statusLabel(status, lifecycleStatus, t) {
  const life = lifecycleStatus || '';
  if (life === 'registration_confirmed') return t('storefrontStatusConfirmed', { defaultValue: 'Confirmed' });
  if (life === 'registration_pending') return t('storefrontStatusPending', { defaultValue: 'Pending' });
  if (life === 'payment_success') return t('storefrontStatusPaid', { defaultValue: 'Paid' });
  if (life === 'registration_failed') return t('storefrontStatusFailed', { defaultValue: 'Failed' });
  return status || life;
}

function buildContactFromUser(user) {
  const first = user?.firstname || user?.firstName || user?.name?.split?.(' ')?.[0] || '';
  const last = user?.lastname || user?.lastName || user?.name?.split?.(' ')?.slice(1).join(' ') || '';
  return {
    firstName: first,
    lastName: last,
    email: user?.email || '',
    phone: user?.phoneNumber || user?.phone || '',
    street: user?.address || user?.street || '',
    city: user?.city || '',
    state: user?.state || '',
    zip: user?.zipCode || user?.zip || user?.pincode || '',
    country: user?.country || 'IN',
  };
}

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
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border transition-colors select-none ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Key className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function DomainStorefrontPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDomain = searchParams.get('domain') || '';

  const searchSectionRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'register'); // 'register' or 'transfer'
  const [transferSubMode, setTransferSubMode] = useState('in'); // 'in' or 'out'
  
  const [query, setQuery] = useState(initialDomain);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  /* ─ Multi-TLD search (every OpenProvider extension) ─ */
  const [tldResults, setTldResults] = useState([]);
  const [tldLoading, setTldLoading] = useState(false);
  const [tldError, setTldError] = useState('');
  const [tldPage, setTldPage] = useState(1);
  const [tldTotalPages, setTldTotalPages] = useState(1);
  const [tldTotal, setTldTotal] = useState(0);
  const [tldLabel, setTldLabel] = useState('');

  const [config, setConfig] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [contact, setContact] = useState(() => buildContactFromUser(user));
  const [period, setPeriod] = useState(1);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* ─ Transfer-In states ─ */
  const [transferDomain, setTransferDomain] = useState('');
  const [transferAuthCode, setTransferAuthCode] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  /* ─ Transfer-Out states ─ */
  const [outDomain, setOutDomain] = useState('');
  const [outLoading, setOutLoading] = useState(false);
  const [outError, setOutError] = useState('');
  const [outSuccessCode, setOutSuccessCode] = useState('');
  const [outSuccessMsg, setOutSuccessMsg] = useState('');

  useEffect(() => {
    setContact((prev) => ({
      ...prev,
      ...buildContactFromUser(user),
    }));
  }, [user]);

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await domainStorefrontAPI.getConfig();
      setConfig(data?.data ?? data);
    } catch {
      setConfig(null);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data } = await domainStorefrontAPI.listOrders();
      setOrders(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadOrders();
  }, [loadConfig, loadOrders]);

  const runTldSearch = useCallback(
    async (raw, page = 1) => {
      const label = (raw || '').trim().toLowerCase().split('.')[0];
      if (!label) return;

      setTldLoading(true);
      setTldError('');
      setTldLabel(label);
      setTldPage(page);

      try {
        const { data } = await domainAPI.searchTlds({ name: label, page, pageSize: 50 });
        const payload = data?.data ?? data;
        setTldResults(Array.isArray(payload?.items) ? payload.items : []);
        setTldTotal(payload?.total ?? 0);
        setTldTotalPages(payload?.totalPages ?? 1);
        setSearchParams({ domain: label }, { replace: true });
        if (page === 1) {
          // Scroll the search/results section into view once loaded.
          setTimeout(() => {
            searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
        }
      } catch (err) {
        setTldError(readApiError(err, 'Could not fetch available extensions.'));
        setTldResults([]);
      } finally {
        setTldLoading(false);
      }
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!initialDomain) return;
    // Keep the search box populated with the requested domain...
    setQuery(initialDomain);
    // ...ensure we're on the register tab so results are visible...
    setActiveTab('register');
    // ...and automatically run the multi-TLD lookup (scrolls into view on load).
    runTldSearch(initialDomain);
    // Re-run whenever the ?domain= query parameter changes (e.g. navigating
    // from another page or an order detail page), not just on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDomain]);

  const handleSearch = (e) => {
    e.preventDefault();
    runTldSearch(query);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError(''); setTransferSuccess('');
    if (!transferDomain.trim() || !transferAuthCode.trim()) {
      setTransferError('Domain name and EPP/Authorization code are required.');
      return;
    }
    setTransferLoading(true);
    try {
      const { data } = await domainStorefrontAPI.initiateTransfer({
        domain: transferDomain.trim(),
        authCode: transferAuthCode.trim(),
      });
      const orderData = data?.data ?? data;
      setTransferSuccess(`Domain transfer initiated successfully for ${orderData.domain}!`);
      setTransferDomain('');
      setTransferAuthCode('');
      await loadOrders();
    } catch (err) {
      setTransferError(readApiError(err, 'Failed to initiate domain transfer.'));
    } finally { setTransferLoading(false); }
  };

  const handleTransferOutSubmit = async (e) => {
    e.preventDefault();
    setOutError(''); setOutSuccessCode(''); setOutSuccessMsg('');
    const target = outDomain.trim().toLowerCase();
    if (!target) {
      setOutError('Domain name is required.');
      return;
    }
    setOutLoading(true);
    try {
      const { data } = await domainStorefrontAPI.initiateTransferOut({ domain: target });
      const res = data?.data ?? data;
      setOutSuccessCode(res.authCode);
      setOutSuccessMsg(res.message || 'Domain successfully unlocked.');
    } catch (err) {
      setOutError(readApiError(err, 'Could not retrieve EPP code.'));
    } finally { setOutLoading(false); }
  };

  const canRegister = checkResult?.status === 'available';
  const isMarketplace = checkResult?.status === 'marketplace';

  const pricing = useMemo(() => {
    if (!canRegister || !checkResult?.unitPrice) return null;
    return resolveRegistrationPricing(checkResult, period, config?.gst);
  }, [canRegister, checkResult, period, config?.gst]);

  const displayTotal = pricing?.total ?? null;

  const updateContact = (field, value) => {
    setContact((prev) => ({ ...prev, [field]: value }));
  };

  const handlePay = async () => {
    if (!canRegister || !checkResult?.domain) return;

    setPayLoading(true);
    setPayError('');
    setSuccessMessage('');

    try {
      const { data: orderPayload } = await domainStorefrontAPI.createOrder({
        domain: checkResult.domain,
        period,
        contact,
      });
      const orderData = orderPayload?.data ?? orderPayload;

      openRazorpayCheckout({
        orderData,
        user,
        description: `Register ${checkResult.domain}`,
        onSuccess: async (response) => {
          try {
            const { data: verifyPayload } = await domainStorefrontAPI.verifyOrder({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            const verify = verifyPayload?.data ?? verifyPayload;
            const orderId = verify?.orderId;
            if (verify?.success) {
              await loadOrders();
              if (orderId) {
                navigate(registrationOrderDetailPath(orderId));
                return;
              }
              setSuccessMessage(
                verify.message || t('storefrontRegisterSuccess', { domain: checkResult.domain }),
              );
              setCheckResult(null);
              setQuery('');
              setSearchParams({}, { replace: true });
            } else {
              setPayError(verify?.message || t('storefrontProvisionPending'));
              await loadOrders();
              if (orderId) {
                navigate(registrationOrderDetailPath(orderId));
              }
            }
          } catch (err) {
            setPayError(readApiError(err, t('storefrontVerifyFailed')));
          } finally {
            setPayLoading(false);
          }
        },
        onFailure: () => {
          setPayError(t('storefrontPaymentFailed'));
          setPayLoading(false);
        },
        onDismiss: () => {
          setPayLoading(false);
        },
      });
    } catch (err) {
      setPayError(readApiError(err, t('storefrontOrderFailed')));
      setPayLoading(false);
    }
  };

  const handleRetry = async (orderId) => {
    try {
      await domainStorefrontAPI.retryProvision(orderId);
      await loadOrders();
    } catch (err) {
      setPayError(readApiError(err, t('storefrontRetryFailed')));
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50/50 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Header info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md max-w-fit">
                CoBrother Storefront
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Domain Storefront</h1>
              <p className="text-sm text-gray-500">
                Register branded domains, update DNS configuration, and manage EPP transfers in and out.
              </p>
            </div>
          </div>

          {/* Tab selector */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center overflow-x-auto gap-1 max-w-fit shadow-inner">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap select-none ${
                activeTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Register a Domain
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap select-none ${
                activeTab === 'transfer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Transfer Options
            </button>
          </div>

          {/* ══ TAB: REGISTER ══ */}
          {activeTab === 'register' && (
            <div className="space-y-6">
              {successMessage && (
                <div className="flex items-start gap-2.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="font-semibold">{successMessage}</span>
                </div>
              )}

              {/* Domain Search Card */}
              <section ref={searchSectionRef} className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-50/50 via-violet-50/10 to-transparent" aria-hidden="true" />
                <div className="relative">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Find your domain name</h2>

                  <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-200">
                    <div className="flex-1 flex items-center gap-2 px-2">
                      <Search className="h-5 w-5 shrink-0 text-gray-400" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for domain e.g. mybrand"
                        className="w-full bg-transparent border-none py-2 text-sm text-gray-950 placeholder-gray-400 outline-none focus:ring-0 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={checking}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 text-sm transition-all shadow-sm disabled:opacity-50 select-none"
                    >
                      {checking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        'Check Availability'
                      )}
                    </button>
                  </form>
                </div>

                {tldError && (
                  <div className="mt-4 flex items-start gap-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{tldError}</span>
                  </div>
                )}

                {tldLoading && (
                  <div className="mt-6 flex items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                )}

                {!tldLoading && !tldError && tldResults.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Available Extensions for “{tldLabel}”
                      </h2>
                      <span className="text-xs text-gray-400 font-medium">
                        {tldTotal} extensions · sorted by price
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-gray-150 rounded-xl bg-white">
                      <table className="min-w-full text-xs text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-150 uppercase tracking-wider text-gray-400 font-bold">
                            <th className="px-4 py-3">Domain</th>
                            <th className="px-4 py-3">TLD</th>
                            <th className="px-4 py-3">Availability</th>
                            <th className="px-4 py-3">Registration</th>
                            <th className="px-4 py-3">Renewal</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {tldResults.map((it) => {
                            const available = it.available || it.status === 'available';
                            const regPrice = it.registrationPrice != null ? formatPrice(it.registrationPrice) : '—';
                            const renPrice = it.renewalPrice != null ? formatPrice(it.renewalPrice) : '—';
                            return (
                              <tr key={it.domain} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-bold text-gray-950">{it.name}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-block text-[0.7rem] font-bold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase">
                                    {it.tld}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {available ? (
                                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-wide">
                                      Available
                                    </span>
                                  ) : (
                                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 uppercase tracking-wide">
                                      Taken
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono text-gray-800">{regPrice}</td>
                                <td className="px-4 py-3 font-mono text-gray-500">{renPrice}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    disabled={!available}
                                    onClick={() => {
                                      setCheckResult({
                                        domain: it.domain,
                                        status: 'available',
                                        unitPrice: it.registrationPrice,
                                        priceCurrency: it.currency || 'INR',
                                        minPeriodYears: 1,
                                        source: it.source,
                                      });
                                      setActiveTab('register');
                                      document.getElementById('registrant-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors"
                                  >
                                    Register
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {tldTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          disabled={tldPage <= 1}
                          onClick={() => runTldSearch(tldLabel, tldPage - 1)}
                          className="text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-gray-500 font-medium">
                          Page {tldPage} of {tldTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={tldPage >= tldTotalPages}
                          onClick={() => runTldSearch(tldLabel, tldPage + 1)}
                          className="text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!tldLoading && !tldError && tldResults.length === 0 && tldLabel && (
                  <div className="mt-6 text-center text-sm text-gray-400 font-medium py-8">
                    No extensions found for “{tldLabel}”.
                  </div>
                )}
              </section>

              {/* Domain Services */}
              <DomainServices orders={orders} />

              {/* Checkout Contact Card */}
              {canRegister && (
                <section id="registrant-details" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Registrant Details</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      ['firstName', 'First Name'],
                      ['lastName', 'Last Name'],
                      ['email', 'Email Address'],
                      ['phone', 'Phone Number'],
                      ['street', 'Street Address'],
                      ['city', 'City'],
                      ['state', 'State / Region'],
                      ['zip', 'Zip / Postal Code'],
                    ].map(([field, label]) => (
                      <div key={field} className="space-y-1.5">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                        <input
                          type={field === 'email' ? 'email' : 'text'}
                          value={contact[field] || ''}
                          onChange={(e) => updateContact(field, e.target.value)}
                          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                          required
                        />
                      </div>
                    ))}

                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Registration Period</span>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                      >
                        {[1, 2, 3, 5, 10].map((y) => (
                          <option key={y} value={y}>
                            {y} {y === 1 ? 'Year' : 'Years'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {pricing && (
                    <div className="bg-gray-50 border border-gray-150 rounded-xl p-4">
                      <DomainRegistrationPriceBreakdown pricing={pricing} />
                    </div>
                  )}

                  {payError && (
                    <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{payError}</span>
                    </div>
                  )}

                  <div className="flex justify-end border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-8 rounded-xl transition-all shadow-sm select-none"
                      onClick={handlePay}
                      disabled={payLoading}
                    >
                      {payLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Opening Secure Checkout...
                        </>
                      ) : (
                        <>
                          Proceed to Payment <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ══ TAB: TRANSFER ══ */}
          {activeTab === 'transfer' && (
            <div className="space-y-6">
              
              {/* Transfer Mode selector */}
              <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 max-w-fit shadow-inner">
                <button
                  onClick={() => setTransferSubMode('in')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all select-none ${
                    transferSubMode === 'in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Transfer to CoBrother
                </button>
                <button
                  onClick={() => setTransferSubMode('out')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all select-none ${
                    transferSubMode === 'out' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Transfer to Others
                </button>
              </div>

              {/* ══ Mode: Transfer In ══ */}
              {transferSubMode === 'in' && (
                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Transfer Domain in to CoBrother</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Move your domain hosting and registrar management over to CoBrother. A 1-year registration extension is automatically applied upon successful EPP transfer.
                    </p>
                  </div>

                  {transferError && (
                    <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                      {transferError}
                    </div>
                  )}
                  {transferSuccess && (
                    <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      {transferSuccess}
                    </div>
                  )}

                  <form onSubmit={handleTransferSubmit} className="space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Domain Name
                      </label>
                      <input
                        type="text"
                        value={transferDomain}
                        onChange={(e) => setTransferDomain(e.target.value)}
                        placeholder="e.g. mycompany.com"
                        className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                        EPP / Authorization Code
                      </label>
                      <input
                        type="text"
                        value={transferAuthCode}
                        onChange={(e) => setTransferAuthCode(e.target.value)}
                        placeholder="Verify auth code inside your current registrar"
                        className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={transferLoading}
                        className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
                      >
                        {transferLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Requesting Transfer...
                          </>
                        ) : (
                          <>
                            Submit Transfer Request <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* ══ Mode: Transfer Out ══ */}
              {transferSubMode === 'out' && (
                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Transfer Domain out to Others</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Retrieve your domain authorization EPP code and disable registrar transfer-lock to move your domain to an external provider.
                    </p>
                  </div>

                  {outError && (
                    <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                      {outError}
                    </div>
                  )}

                  {outSuccessCode ? (
                    <div className="border border-emerald-250 bg-emerald-50/40 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                        <span>{outSuccessMsg}</span>
                      </div>
                      <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2">
                        <label className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">
                          EPP Authorization Code
                        </label>
                        <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                          <span className="font-mono text-sm font-bold text-gray-800 select-all">{outSuccessCode}</span>
                          <CopyBtn text={outSuccessCode} />
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                        <span className="font-medium leading-relaxed">
                          Your registrar transfer-lock is successfully disabled. Enter the EPP code above at your new domain provider to complete your transfer-out.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setOutSuccessCode(''); setOutDomain(''); }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Unlock another domain
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleTransferOutSubmit} className="space-y-4 max-w-lg">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Domain Name
                        </label>
                        <input
                          type="text"
                          value={outDomain}
                          onChange={(e) => setOutDomain(e.target.value)}
                          placeholder="e.g. drymortar.in"
                          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                          required
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={outLoading}
                          className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
                        >
                          {outLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Unlocking Domain...
                            </>
                          ) : (
                            <>
                              Disable Lock & Get Code <Key className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              )}

            </div>
          )}

          {/* ══ ORDERS LIST ══ */}
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Your Registrations</h2>
              <button
                type="button"
                onClick={loadOrders}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh List
              </button>
            </div>

            {ordersLoading ? (
              <p className="text-xs text-gray-400 font-semibold">{t('storefrontOrdersLoading')}</p>
            ) : orders.length === 0 ? (
              <p className="text-xs text-gray-400 font-semibold">{t('storefrontOrdersEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                      <th className="py-2.5 pr-4 font-bold">Domain</th>
                      <th className="py-2.5 pr-4 font-bold">Total Price</th>
                      <th className="py-2.5 pr-4 font-bold">Status</th>
                      <th className="py-2.5 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pr-4 font-bold text-gray-950">
                          <Link
                            to={registrationOrderDetailPath(order.id)}
                            className="text-indigo-700 hover:text-indigo-900 hover:underline"
                          >
                            {order.domain}
                          </Link>
                        </td>
                        <td className="py-4 pr-4 text-gray-600 font-medium">
                          {formatPrice(order.priceInr || 0)}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadgeClass(order.status, order.lifecycleStatus)}`}
                          >
                            {statusLabel(order.status, order.lifecycleStatus, t)}
                          </span>
                        </td>
                        <td className="py-4 flex flex-wrap items-center gap-3">
                          <Link
                            to={registrationOrderDetailPath(order.id)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold"
                          >
                            Manage Domain
                          </Link>
                          {(order.lifecycleStatus === 'registration_failed' ||
                            String(order.status || '').toUpperCase().includes('FAIL') ||
                            order.lifecycleStatus === 'payment_success' ||
                            order.lifecycleStatus === 'registration_pending' ||
                            order.status === 'PAYMENT_COMPLETED') && (
                            <button
                              type="button"
                              className="text-indigo-600 hover:text-indigo-800 font-bold"
                              onClick={() => handleRetry(order.id)}
                            >
                              Retry Provision
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
