import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { operationsRequestAPI } from '../../api/services';
import { readApiError } from '../../utils/apiError';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import {
  formatOperationsPrice,
  isComplianceService,
} from '../../utils/operationsPricing';

const inputClass =
  'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm outline-none transition-shadow focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]';

const labelClass = 'text-xs font-semibold text-gray-600';

export default function OperationsRequestModal({ service, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isCompliance = isComplianceService(service);
  const priceInfo = formatOperationsPrice(service, { t });
  const [mounted, setMounted] = useState(false);

  // phase: 'form' | 'processing' | 'success' | 'failed'
  const [phase, setPhase] = useState('form');
  const [resultData, setResultData] = useState(null);
  const requestIdRef = useRef(null);

  const [form, setForm] = useState({
    fullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim(),
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    companyName: '',
    cityState: '',
    message: '',
    preferredTimeline: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePaymentSuccess = useCallback(async (response) => {
    // response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
    // Use ref to get the latest requestId (avoids stale closure after setResultData)
    const reqId = requestIdRef.current;
    try {
      const verifyRes = await operationsRequestAPI.verifyPayment({
        requestId: reqId,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });
      setResultData(verifyRes?.data?.data || verifyRes?.data);
      setPhase('success');
      onSuccess?.({
        type: isCompliance ? 'booking' : 'hire',
        serviceName: service.name,
        quotedPrice: Number(service.price) || 0,
        billingPeriod: isCompliance ? 'one_time' : 'monthly',
      });
    } catch (err) {
      setError(
        readApiError(err)
          || t('operationsRequestVerifyFailed', { defaultValue: 'Payment verification failed. Please contact support.' }),
      );
      setPhase('failed');
    }
  }, [isCompliance, service, onSuccess, t]);

  const handlePaymentDismiss = useCallback(() => {
    // User closed Razorpay without paying — stay on form, allow retry
    setLoading(false);
  }, []);

  const handlePaymentFailure = useCallback(() => {
    setError(
      t('operationsRequestPaymentFailed', { defaultValue: 'Payment failed. Please try again.' }),
    );
    setLoading(false);
  }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPhase('form');
    try {
      const orderRes = await operationsRequestAPI.createOrder({
        operationsServiceId: service.id,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim() || null,
        cityState: isCompliance ? (form.cityState.trim() || null) : null,
        message: form.message.trim() || null,
        preferredTimeline: form.preferredTimeline.trim() || null,
      });
      const orderData = orderRes?.data?.data || orderRes?.data;
      if (!orderData?.orderId) {
        throw new Error('Invalid payment order from server.');
      }
      setResultData(orderData);
      requestIdRef.current = orderData?.requestId;
      setLoading(false);

      // Open Razorpay Checkout
      openRazorpayCheckout({
        orderData,
        user,
        description: `Deltapreneur - ${service.name}`,
        onSuccess: handlePaymentSuccess,
        onFailure: handlePaymentFailure,
        onDismiss: handlePaymentDismiss,
      });
    } catch (err) {
      setError(
        readApiError(err)
          || t('operationsRequestSubmitFailed', { defaultValue: 'Failed to submit request.' }),
      );
      setLoading(false);
    }
  };

  const modalTitle = isCompliance
    ? t('operationsBookModalTitle', { defaultValue: 'Book Your Slot' })
    : t('operationsHireModalTitle', { defaultValue: 'Hire Virtual Role' });

  const payAmount = isCompliance && priceInfo.showPrice ? priceInfo.amount : null;
  const submitLabel = isCompliance
    ? (loading
      ? t('operationsProcessing', { defaultValue: 'Processing...' })
      : payAmount
        ? t('operationsPayAmount', { defaultValue: `Pay ${payAmount}` })
        : t('operationsBookSlot', { defaultValue: 'Book Your Slot' }))
    : (loading
      ? t('operationsProcessing', { defaultValue: 'Processing...' })
      : t('operationsHireSubmit', { defaultValue: 'Submit Hire Request' }));

  const priceHint = isCompliance
    ? t('operationsBookPriceHint', { defaultValue: 'Single registration / filing service' })
    : t('operationsHirePriceHint', { defaultValue: 'Ongoing monthly engagement' });

  const timelinePlaceholder = isCompliance
    ? t('operationsBookTimelinePlaceholder', { defaultValue: 'e.g. Within 2 weeks' })
    : t('operationsHireTimelinePlaceholder', { defaultValue: 'e.g. Start next month' });

  if (!mounted) return null;

  return createPortal(
    <div
      className="operations-request-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="operations-request-modal-title"
    >
      <div
        className={`operations-request-modal ${isCompliance ? 'operations-request-modal--booking' : 'operations-request-modal--hire'}`}
      >
        <div className={`operations-request-modal-glow ${isCompliance ? 'operations-request-modal-glow--booking' : 'operations-request-modal-glow--hire'}`} />

        <button
          type="button"
          className="operations-request-modal-close"
          onClick={onClose}
          aria-label={t('close', { defaultValue: 'Close' })}
        >
          <X size={18} />
        </button>

        <div className="operations-request-modal-header">
          <span className={`operations-request-modal-badge ${isCompliance ? 'operations-request-modal-badge--booking' : 'operations-request-modal-badge--hire'}`}>
            {t(priceInfo.billingKey, { defaultValue: priceInfo.billingDefault })}
          </span>
          <h2 id="operations-request-modal-title" className="operations-request-modal-title">
            {modalTitle}
          </h2>
          <div className="operations-request-modal-service">
            <p className="operations-request-modal-service-name">{service.name}</p>
            <p className="operations-request-modal-service-price">{priceInfo.label}</p>
            <p className="operations-request-modal-service-hint">{priceHint}</p>
          </div>
        </div>

        {/* ── SUCCESS STATE ── */}
        {phase === 'success' && (
          <div className="operations-request-modal-success" style={{ padding: '2rem', textAlign: 'center' }}>
            <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#22c55e' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
              {t('operationsPaymentSuccess', { defaultValue: 'Payment Successful' })}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              {t('operationsPaymentSuccessMsg', { defaultValue: 'Payment received. Your booking is now pending admin contact.' })}
            </p>
            <div style={{ background: '#f9fafb', borderRadius: '0.75rem', padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', color: '#374151' }}>
              <p style={{ marginBottom: '0.375rem' }}><strong>{t('operationsRequestService', { defaultValue: 'Service' })}:</strong> {service.name}</p>
              <p style={{ marginBottom: '0.375rem' }}><strong>{t('operationsRequestAmountPaid', { defaultValue: 'Amount Paid' })}:</strong> {priceInfo.amount}</p>
              {resultData?.razorpayPaymentId && (
                <p><strong>{t('operationsRequestPaymentId', { defaultValue: 'Payment ID' })}:</strong> {resultData.razorpayPaymentId}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-glow operations-request-modal-submit operations-request-modal-submit--pay"
              style={{ marginTop: '1.25rem', width: '100%' }}
            >
              {t('close', { defaultValue: 'Close' })}
            </button>
          </div>
        )}

        {/* ── FAILED STATE ── */}
        {phase === 'failed' && (
          <div className="operations-request-modal-failed" style={{ padding: '2rem', textAlign: 'center' }}>
            <XCircle size={56} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
              {t('operationsPaymentFailed', { defaultValue: 'Payment Failed' })}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              {t('operationsPaymentFailedMsg', { defaultValue: 'Your payment could not be completed. Please try again.' })}
            </p>
            <div className="operations-request-modal-actions">
              <button type="button" onClick={() => { setPhase('form'); setError(''); }} className="btn-glow operations-request-modal-submit operations-request-modal-submit--pay">
                {t('retry', { defaultValue: 'Retry' })}
              </button>
              <button type="button" onClick={onClose} className="operations-request-modal-cancel">
                {t('cancel', { defaultValue: 'Cancel' })}
              </button>
            </div>
          </div>
        )}

        {/* ── FORM STATE ── */}
        {phase === 'form' && (
        <form onSubmit={handleSubmit} className="operations-request-modal-form">
          <div className="operations-request-modal-fields">
            <div className="operations-request-modal-field operations-request-modal-field--full">
              <label className={labelClass}>
                {t('operationsRequestFullName', { defaultValue: 'Full Name' })}
                {' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="operations-request-modal-field">
              <label className={labelClass}>
                {t('operationsRequestEmail', { defaultValue: 'Email' })}
                {' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="operations-request-modal-field">
              <label className={labelClass}>
                {t('operationsRequestPhone', { defaultValue: 'Phone' })}
                {' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                maxLength={10}
                required
                className={inputClass}
              />
            </div>

            <div className="operations-request-modal-field">
              <label className={labelClass}>
                {t('operationsRequestCompany', { defaultValue: 'Company / Business Name' })}
              </label>
              <input
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                className={inputClass}
              />
            </div>

            {isCompliance ? (
              <div className="operations-request-modal-field">
                <label className={labelClass}>
                  {t('operationsRequestCityState', { defaultValue: 'City / State' })}
                </label>
                <input
                  value={form.cityState}
                  onChange={(e) => setField('cityState', e.target.value)}
                  placeholder={t('operationsRequestCityStatePlaceholder', { defaultValue: 'e.g. Mumbai, Maharashtra' })}
                  className={inputClass}
                />
              </div>
            ) : (
              <div className="operations-request-modal-field">
                <label className={labelClass}>
                  {t('operationsRequestTimeline', { defaultValue: 'Preferred Timeline' })}
                </label>
                <input
                  value={form.preferredTimeline}
                  onChange={(e) => setField('preferredTimeline', e.target.value)}
                  placeholder={timelinePlaceholder}
                  className={inputClass}
                />
              </div>
            )}

            {isCompliance && (
              <div className="operations-request-modal-field operations-request-modal-field--full">
                <label className={labelClass}>
                  {t('operationsRequestTimeline', { defaultValue: 'Preferred Timeline' })}
                </label>
                <input
                  value={form.preferredTimeline}
                  onChange={(e) => setField('preferredTimeline', e.target.value)}
                  placeholder={timelinePlaceholder}
                  className={inputClass}
                />
              </div>
            )}

            <div className="operations-request-modal-field operations-request-modal-field--full">
              <label className={labelClass}>
                {t('operationsRequestMessage', { defaultValue: 'Requirements / Notes' })}
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setField('message', e.target.value)}
                rows={2}
                className={`${inputClass} operations-request-modal-textarea`}
              />
            </div>
          </div>

          {error && (
            <div className="operations-request-modal-error">{error}</div>
          )}

          <div className="operations-request-modal-actions">
            <button
              type="submit"
              disabled={loading}
              className={`btn-glow operations-request-modal-submit ${isCompliance && payAmount ? 'operations-request-modal-submit--pay' : ''}`}
            >
              {loading ? (
                <>
                  <span className="operations-request-modal-spinner" aria-hidden />
                  <span>{submitLabel}</span>
                </>
              ) : (
                submitLabel
              )}
            </button>
            <button type="button" onClick={onClose} className="operations-request-modal-cancel">
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
