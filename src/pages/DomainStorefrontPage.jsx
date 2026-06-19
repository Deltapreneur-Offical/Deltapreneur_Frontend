import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { domainAPI, domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { registrationOrderDetailPath } from '../utils/domainRegistrationOrder';
import { readApiError } from '../utils/apiError';
import { canManageRegisteredDomain, domainManagementHref } from '../utils/domainManagement';

const DEFAULT_TLD = 'com';

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
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDomain = searchParams.get('domain') || '';

  const [query, setQuery] = useState(initialDomain);
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
      const fqdn = parseDomainInput(raw, DEFAULT_TLD);
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
    [period, setSearchParams, t],
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
  const checkoutUnavailable =
    config?.productionReadiness && !config.productionReadiness.ready;

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
    if (!canRegister || !checkResult?.domain || checkoutUnavailable) return;

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
                verify.message ||
                  t('storefrontRegisterSuccess', { domain: checkResult.domain }),
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            {t('storefrontEyebrow')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('storefrontTitle')}</h1>
          <p className="text-gray-600 mt-2 max-w-2xl">{t('storefrontSubtitle')}</p>
        </div>

        {successMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        <section className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-50/90 via-violet-50/30 to-transparent"
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('storefrontSearchTitle')}</h2>

            <form
              onSubmit={handleSearch}
              className="storefront-search-form search-glow-focus group rounded-2xl border-2 border-indigo-300/50 bg-white/95 p-2.5 shadow-[0_8px_40px_rgba(99,102,241,0.14)] backdrop-blur-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-[0_12px_48px_rgba(99,102,241,0.24)] sm:rounded-full sm:px-3 sm:py-2"
            >
              <div className="storefront-search-form__fields">
                <Search
                  className="h-5 w-5 shrink-0 text-indigo-400 transition-colors group-focus-within:text-indigo-600"
                  strokeWidth={2.25}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('domainSearchPlaceholder')}
                  className="storefront-search-form__input border-none bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 sm:py-1.5 sm:text-[15px]"
                />
              </div>
              <button
                type="submit"
                disabled={checking}
                className="storefront-search-form__submit inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gray-900 px-5 text-sm font-semibold leading-none text-white shadow-[0_4px_14px_rgba(15,23,42,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-[0_8px_20px_rgba(15,23,42,0.28)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                {checking ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('storefrontChecking')}
                  </>
                ) : (
                  t('search')
                )}
              </button>
            </form>
          </div>

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
                  {formatPrice(displayPrice)}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    / {period} {period === 1 ? t('storefrontYear') : t('storefrontYears')}
                  </span>
                </p>
              )}

              {isMarketplace && (
                <p className="text-sm text-indigo-700 mb-2">{t('storefrontMarketplaceHint')}</p>
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
              disabled={payLoading || checkoutUnavailable}
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
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        <Link
                          to={registrationOrderDetailPath(order.id)}
                          className="text-indigo-700 hover:text-indigo-900 hover:underline"
                        >
                          {order.domain}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {formatPrice(order.priceInr || 0)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${statusBadgeClass(order.status, order.lifecycleStatus)}`}
                        >
                          {statusLabel(order.status, order.lifecycleStatus, t)}
                        </span>
                      </td>
                      <td className="py-3 flex flex-wrap gap-2">
                        {canManageRegisteredDomain(order) && domainManagementHref(order) ? (
                          <a
                            href={domainManagementHref(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-700 hover:text-indigo-900 text-xs font-semibold"
                          >
                            {t('domainMgmtOpenPanel', { defaultValue: 'Manage DNS' })}
                          </a>
                        ) : null}
                        <Link
                          to={registrationOrderDetailPath(order.id)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                        >
                          {t('regOrderView', { defaultValue: 'View' })}
                        </Link>
                        {(order.lifecycleStatus === 'registration_failed' ||
                          String(order.status || '').toUpperCase().includes('FAIL') ||
                          order.lifecycleStatus === 'payment_success' ||
                          order.lifecycleStatus === 'registration_pending' ||
                          order.status === 'PAYMENT_COMPLETED') && (
                          <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                            onClick={() => handleRetry(order.id)}
                          >
                            {t('storefrontRetry')}
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
    </AppLayout>
  );
}
