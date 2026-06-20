import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { domainStorefrontAPI } from '../api/services';
import { generateInvoice } from '../utils/generateInvoice';
import DomainManagementCard from '../components/domain/DomainManagementCard';
import DomainRegistrationPriceBreakdown from '../components/domain/DomainRegistrationPriceBreakdown';
import {
  readApiError,
  registrationStatusBadgeClass,
  registrationStatusLabel,
} from '../utils/domainRegistrationOrder';

function unwrapOrder(data) {
  return data?.data ?? data;
}

export default function DomainRegistrationOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadOrder = useCallback(
    async (sync = true) => {
      if (!orderId) return;
      setActionError('');
      try {
        const { data } = await domainStorefrontAPI.getOrder(orderId, { sync });
        setOrder(unwrapOrder(data));
      } catch (err) {
        setActionError(readApiError(err, t('regOrderLoadFailed', { defaultValue: 'Could not load order.' })));
        setOrder(null);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [orderId, t],
  );

  useEffect(() => {
    setLoading(true);
    loadOrder(true);
  }, [loadOrder]);

  const handleSync = async () => {
    setSyncing(true);
    setActionMessage('');
    try {
      const { data } = await domainStorefrontAPI.syncOrder(orderId);
      setOrder(unwrapOrder(data));
      setActionMessage(t('regOrderSynced', { defaultValue: 'Status updated from registrar.' }));
    } catch (err) {
      setActionError(readApiError(err, t('regOrderSyncFailed', { defaultValue: 'Sync failed.' })));
    } finally {
      setSyncing(false);
    }
  };

  const handleResend = async () => {
    setActionError('');
    setActionMessage('');
    try {
      const { data } = await domainStorefrontAPI.resendVerification(orderId);
      const body = data?.data ?? data;
      setActionMessage(body?.message || t('regOrderResent', { defaultValue: 'Verification email sent.' }));
    } catch (err) {
      setActionError(readApiError(err, t('regOrderResendFailed', { defaultValue: 'Could not resend verification.' })));
    }
  };

  const handleRetry = async () => {
    setActionError('');
    setActionMessage('');
    try {
      const { data } = await domainStorefrontAPI.retryProvision(orderId);
      const body = data?.data ?? data;
      setActionMessage(body?.message || t('regOrderRetryStarted', { defaultValue: 'Registration retry started.' }));
      await loadOrder(false);
    } catch (err) {
      setActionError(readApiError(err, t('storefrontRetryFailed')));
    }
  };

  const handleInvoice = () => {
    if (!order) return;
    generateInvoice({
      type: 'domain_registration',
      item: order,
      user: {
        name: order.buyerEmail || user?.email,
        email: order.buyerEmail || user?.email,
      },
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">{actionError || t('regOrderNotFound', { defaultValue: 'Order not found.' })}</p>
          <Link to="/storefront" className="btn-glow btn-glow-sm">
            {t('regOrderBackStorefront', { defaultValue: 'Back to storefront' })}
          </Link>
        </div>
      </AppLayout>
    );
  }

  const badgeClass = registrationStatusBadgeClass(order.status, order.lifecycleStatus);
  const statusText = registrationStatusLabel(order.status, order.lifecycleStatus, t);
  const steps = Array.isArray(order.nextSteps) ? order.nextSteps : [];
  const orderPricing =
    order.subtotalInr != null
      ? {
          subtotal: Number(order.subtotalInr),
          gst: Number(order.gstInr ?? 0),
          total: Number(order.priceInr ?? 0),
          gstRate: order.gstRate ?? null,
          gstEnabled: Boolean(order.gstEnabled),
          years: 1,
        }
      : null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('regOrderBack', { defaultValue: 'Back' })}
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              {t('regOrderEyebrow', { defaultValue: 'Domain registration' })}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">{order.domain}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('regOrderId', { defaultValue: 'Order' })} {order.id}
            </p>
          </div>
          <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${badgeClass}`}>
            {statusText}
          </span>
        </div>

        {actionMessage && (
          <div className="flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionMessage}</span>
          </div>
        )}
        {actionError && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {order.message && (
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">{order.message}</p>
        )}

        <DomainManagementCard domainManagement={order.domainManagement} />

        {steps.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              {t('regOrderNextSteps', { defaultValue: 'Next steps' })}
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {t('storefrontPriceBreakdownTitle', { defaultValue: 'Payment summary' })}
          </h2>
          {orderPricing ? (
            <DomainRegistrationPriceBreakdown pricing={orderPricing} />
          ) : (
            <Detail
              label={t('storefrontColPrice', { defaultValue: 'Price' })}
              value={`₹${Number(order.priceInr || 0).toLocaleString('en-IN')}`}
            />
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <Detail
            label={t('regOrderCreated', { defaultValue: 'Ordered' })}
            value={order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '—'}
          />
          {order.completedAt && (
            <Detail
              label={t('regOrderCompleted', { defaultValue: 'Completed' })}
              value={new Date(order.completedAt).toLocaleString('en-IN')}
            />
          )}
          {order.expiresAt && (
            <Detail
              label={t('regOrderExpiry', { defaultValue: 'Registrar expiry' })}
              value={new Date(order.expiresAt).toLocaleDateString('en-IN')}
            />
          )}
          {order.razorpayPaymentId && (
            <Detail label={t('regOrderPaymentId', { defaultValue: 'Payment ID' })} value={order.razorpayPaymentId} mono />
          )}
          {order.registrarOrderId && (
            <Detail label={t('regOrderRegistrarId', { defaultValue: 'Registrar order' })} value={order.registrarOrderId} mono />
          )}
          {order.icannVerificationStatus && order.icannVerificationStatus !== 'UNKNOWN' && (
            <Detail label={t('regOrderIcann', { defaultValue: 'Registrant verification' })} value={order.icannVerificationStatus} />
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-glow btn-glow-sm inline-flex items-center gap-2"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {t('regOrderRefreshStatus', { defaultValue: 'Refresh status' })}
          </button>
          {order.canResendVerification && (
            <button
              type="button"
              className="btn-glow btn-glow-sm inline-flex items-center gap-2"
              onClick={handleResend}
            >
              <Mail className="w-4 h-4" />
              {t('regOrderResendVerify', { defaultValue: 'Resend verification email' })}
            </button>
          )}
          {order.canRetry && (
            <button type="button" className="btn-glow btn-glow-sm" onClick={handleRetry}>
              {t('storefrontRetry')}
            </button>
          )}
          {(order.razorpayPaymentId || order.status === 'ACTIVE') && (
            <button
              type="button"
              className="btn-glow btn-glow-sm inline-flex items-center gap-2"
              onClick={handleInvoice}
            >
              <FileText className="w-4 h-4" />
              {t('regOrderInvoice', { defaultValue: 'Download invoice' })}
            </button>
          )}
          <Link to="/purchases" className="btn-glow btn-glow-sm text-indigo-700">
            {t('regOrderAllPurchases', { defaultValue: 'All purchases' })}
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-gray-900 font-medium ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</div>
    </div>
  );
}
