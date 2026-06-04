import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { domainAPI, domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';

const TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];

function readApiError(err, fallback) {
  const payload = err?.response?.data;
  if (typeof payload === 'string') return payload;
  if (payload?.message) return payload.message;
  if (payload?.error) return payload.error;
  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((x) => x?.msg || String(x)).join(', ');
  }
  return fallback;
}

function parseDomainInput(raw, fallbackTld) {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const dot = q.indexOf('.');
  if (dot !== -1) return q;
  return `${q}.${fallbackTld}`;
}

function statusBadgeClass(status, lifecycleStatus) {
  const life = (lifecycleStatus || '').toLowerCase();
  if (life === 'registration_confirmed' || (status || '').toUpperCase() === 'ACTIVE') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (
    life === 'payment_success' ||
    life === 'registration_pending' ||
    ['CREATED', 'PAYMENT_COMPLETED', 'REGISTRATION_PENDING'].includes((status || '').toUpperCase())
  ) {
    return 'bg-amber-100 text-amber-800';
  }
  if (life === 'registration_failed' || (status || '').toUpperCase().includes('FAIL')) {
    return 'bg-red-100 text-red-700';
  }
  return 'bg-gray-100 text-gray-700';
}

function statusLabel(status, lifecycleStatus, t) {
  const life = lifecycleStatus || '';
  if (life === 'registration_confirmed') return t('storefrontStatusConfirmed');
  if (life === 'registration_pending') return t('storefrontStatusPending');
  if (life === 'payment_success') return t('storefrontStatusPaid');
  if (life === 'registration_failed') return t('storefrontStatusFailed');
  return status || life;
}

function buildContactFromUser(user) {
  const first =
    user?.firstname || user?.firstName || user?.name?.split?.(' ')?.[0] || '';
  const last =
    user?.lastname ||
    user?.lastName ||
    user?.name?.split?.(' ')?.slice(1).join(' ') ||
    '';
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

export default function DomainStorefrontPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDomain = searchParams.get('domain') || '';

  const [query, setQuery] = useState(initialDomain);
  const [tld, setTld] = useState('com');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState('');

  const [config, setConfig] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [contact, setContact] = useState(() => buildContactFromUser(user));
  const [period, setPeriod] = useState(1);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const runCheck = useCallback(
    async (raw) => {
      const fqdn = parseDomainInput(raw, tld);
      if (!fqdn) return;

      setChecking(true);
      setCheckError('');
      setCheckResult(null);
      setSuccessMessage('');
      setPayError('');

      try {
        const { data } = await domainAPI.check(encodeURIComponent(fqdn));
        const result = data?.data ?? data;
        setCheckResult(result);
        setSearchParams({ domain: fqdn }, { replace: true });
        if (result?.minPeriodYears && result.minPeriodYears > period) {
          setPeriod(result.minPeriodYears);
        }
      } catch (err) {
        setCheckError(readApiError(err, t('storefrontCheckFailed')));
      } finally {
        setChecking(false);
      }
    },
    [period, setSearchParams, t, tld],
  );

  useEffect(() => {
    if (initialDomain) {
      runCheck(initialDomain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    runCheck(query);
  };

  const canRegister = checkResult?.status === 'available';
  const isMarketplace = checkResult?.status === 'marketplace';

  const displayPrice = useMemo(() => {
    if (!checkResult?.price) return null;
    const unit = Number(checkResult.unitPrice || checkResult.price);
    const years = Math.max(period, checkResult.minPeriodYears || 1);
    if (checkResult.unitPrice) return unit * years;
    return Number(checkResult.price);
  }, [checkResult, period]);

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
            if (verify?.success) {
              setSuccessMessage(
                verify.message ||
                  t('storefrontRegisterSuccess', { domain: checkResult.domain }),
              );
              await loadOrders();
              setCheckResult(null);
              setQuery('');
              setSearchParams({}, { replace: true });
            } else {
              setPayError(verify?.message || t('storefrontProvisionPending'));
              await loadOrders();
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            {t('storefrontEyebrow')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('storefrontTitle')}</h1>
          <p className="text-gray-600 mt-2 max-w-2xl">{t('storefrontSubtitle')}</p>
        </div>

        {config && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
            {(config.registrarSandbox || config.openProviderSandbox) && (
              <span className="font-semibold mr-2">{t('storefrontSandboxBadge')}</span>
            )}
            {config.demoMode && (
              <span className="font-semibold mr-2">{t('storefrontDemoBadge')}</span>
            )}
            {config.message}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('storefrontSearchTitle')}</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('domainSearchPlaceholder')}
                className="flex-1 border-none outline-none text-gray-900 placeholder:text-gray-400"
              />
              <select
                value={tld}
                onChange={(e) => setTld(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm font-medium text-gray-800"
                aria-label="TLD"
              >
                {TLDS.map((ext) => (
                  <option key={ext} value={ext}>
                    .{ext}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-glow px-6 py-3 shrink-0" disabled={checking}>
              {checking ? t('storefrontChecking') : t('search')}
            </button>
          </form>

          {checkError && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{checkError}</span>
            </div>
          )}

          {checkResult && !checkError && (
            <div className="mt-5 rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xl font-bold text-gray-900">{checkResult.domain}</span>
                {checkResult.status === 'available' && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    {t('storefrontAvailable')}
                  </span>
                )}
                {checkResult.status === 'taken' && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                    {t('storefrontTaken')}
                  </span>
                )}
                {isMarketplace && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    {t('storefrontMarketplace')}
                  </span>
                )}
              </div>

              {checkResult.status === 'available' && displayPrice != null && (
                <p className="text-2xl font-extrabold text-gray-900 mb-1">
                  ₹{Number(displayPrice).toLocaleString('en-IN')}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    / {period} {period === 1 ? t('storefrontYear') : t('storefrontYears')}
                  </span>
                </p>
              )}

              {isMarketplace && (
                <p className="text-sm text-indigo-700 mb-2">{t('storefrontMarketplaceHint')}</p>
              )}

              {checkResult.demoMode && (
                <p className="text-xs text-amber-700 mb-2">{t('storefrontDemoHint')}</p>
              )}
            </div>
          )}
        </section>

        {canRegister && (
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('storefrontContactTitle')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['firstName', t('storefrontFirstName')],
                ['lastName', t('storefrontLastName')],
                ['email', t('storefrontEmail')],
                ['phone', t('storefrontPhone')],
                ['street', t('storefrontStreet')],
                ['city', t('storefrontCity')],
                ['state', t('storefrontState')],
                ['zip', t('storefrontZip')],
              ].map(([field, label]) => (
                <label key={field} className="block text-sm">
                  <span className="text-gray-600 mb-1 block">{label}</span>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={contact[field] || ''}
                    onChange={(e) => updateContact(field, e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:border-indigo-400 focus:outline-none"
                    required
                  />
                </label>
              ))}
              <label className="block text-sm">
                <span className="text-gray-600 mb-1 block">{t('storefrontPeriod')}</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                >
                  {[1, 2, 3, 5, 10].map((y) => (
                    <option key={y} value={y} disabled={y < (checkResult?.minPeriodYears || 1)}>
                      {y} {y === 1 ? t('storefrontYear') : t('storefrontYears')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {payError && (
              <div className="text-sm text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{payError}</span>
              </div>
            )}

            <button
              type="button"
              className="btn-glow w-full sm:w-auto px-8 py-3"
              onClick={handlePay}
              disabled={payLoading}
            >
              {payLoading ? t('storefrontPayOpening') : t('storefrontPayNow')}
            </button>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('storefrontOrdersTitle')}</h2>
            <button
              type="button"
              onClick={loadOrders}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <RefreshCw className="w-4 h-4" />
              {t('storefrontRefresh')}
            </button>
          </div>

          {ordersLoading ? (
            <p className="text-sm text-gray-500">{t('storefrontOrdersLoading')}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500">{t('storefrontOrdersEmpty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-4 font-medium">{t('storefrontColDomain')}</th>
                    <th className="py-2 pr-4 font-medium">{t('storefrontColPrice')}</th>
                    <th className="py-2 pr-4 font-medium">{t('storefrontColStatus')}</th>
                    <th className="py-2 font-medium">{t('storefrontColAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-900">{order.domain}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        ₹{Number(order.priceInr || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${statusBadgeClass(order.status, order.lifecycleStatus)}`}
                        >
                          {statusLabel(order.status, order.lifecycleStatus, t)}
                        </span>
                      </td>
                      <td className="py-3">
                        {order.lifecycleStatus === 'registration_failed' ||
                        String(order.status || '').toUpperCase().includes('FAIL') ||
                        order.lifecycleStatus === 'payment_success' ||
                        order.lifecycleStatus === 'registration_pending' ||
                        order.status === 'PAYMENT_COMPLETED' ? (
                          <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                            onClick={() => handleRetry(order.id)}
                          >
                            {t('storefrontRetry')}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
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
    </AppLayout>
  );
}
