import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { operationsRequestAPI } from '../../api/services';
import { readApiError } from '../../utils/apiError';
import {
  formatOperationsPrice,
  isComplianceService,
} from '../../utils/operationsPricing';

export default function OperationsRequestModal({ service, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isCompliance = isComplianceService(service);
  const priceInfo = formatOperationsPrice(service, { t });
  const [mounted, setMounted] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await operationsRequestAPI.submit({
        operationsServiceId: service.id,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim() || null,
        cityState: isCompliance ? (form.cityState.trim() || null) : null,
        message: form.message.trim() || null,
        preferredTimeline: form.preferredTimeline.trim() || null,
      });
      onSuccess({
        type: isCompliance ? 'booking' : 'hire',
        serviceName: service.name,
        quotedPrice: Number(service.price) || 0,
        billingPeriod: isCompliance ? 'one_time' : 'monthly',
      });
    } catch (err) {
      setError(
        readApiError(err)
          || t('operationsRequestSubmitFailed', { defaultValue: 'Failed to submit request.' }),
      );
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = isCompliance
    ? t('operationsBookModalTitle', { defaultValue: 'Book Your Slot' })
    : t('operationsHireModalTitle', { defaultValue: 'Hire Virtual Role' });

  const submitLabel = isCompliance
    ? t('operationsBookSlot', { defaultValue: 'Book Your Slot' })
    : t('operationsHireSubmit', { defaultValue: 'Submit Hire Request' });

  const priceHint = isCompliance
    ? t('operationsBookPriceHint', { defaultValue: 'Single registration / filing service' })
    : t('operationsHirePriceHint', { defaultValue: 'Ongoing monthly engagement' });

  if (!mounted) return null;

  return createPortal(
    <div
      className="operations-request-modal fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="operations-request-modal-title"
    >
      <div className="operations-request-modal__panel relative flex w-full max-w-[520px] max-h-[min(92vh,calc(100dvh-2rem))] flex-col overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-slideUp">
        <div
          className={`pointer-events-none absolute -right-24 -top-24 h-[300px] w-[300px] rounded-full blur-3xl ${isCompliance ? 'bg-emerald-100/30' : 'bg-indigo-100/30'}`}
          aria-hidden
        />
        <button
          type="button"
          className="absolute right-4 top-4 z-20 border-none bg-transparent text-xl text-gray-400 transition-colors hover:text-gray-700"
          onClick={onClose}
          aria-label={t('close', { defaultValue: 'Close' })}
        >
          ✕
        </button>

        <div className="relative z-10 shrink-0 border-b border-gray-100 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
          <div className={`mb-3 inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${isCompliance ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
            {t(priceInfo.billingKey, { defaultValue: priceInfo.billingDefault })}
          </div>
          <h2
            id="operations-request-modal-title"
            className="m-0 mb-2 font-display text-2xl font-bold text-gray-900"
          >
            {modalTitle}
          </h2>
          <p className="m-0 mb-1 text-sm font-semibold text-gray-900">{service.name}</p>
          <p className="m-0 mb-1 text-sm text-gray-500">{priceInfo.label}</p>
          <p className="m-0 text-xs text-gray-400">{priceHint}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 sm:px-8 sm:pb-8"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('operationsRequestFullName', { defaultValue: 'Full Name' })} <span className="text-red-500">*</span>
            </label>
            <input
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              required
              className="w-full min-w-0 rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('operationsRequestEmail', { defaultValue: 'Email' })} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                className="w-full min-w-0 rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('operationsRequestPhone', { defaultValue: 'Phone' })} <span className="text-red-500">*</span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                required
                className="w-full min-w-0 rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('operationsRequestCompany', { defaultValue: 'Company / Business Name' })}
            </label>
            <input
              value={form.companyName}
              onChange={(e) => setField('companyName', e.target.value)}
              className="w-full min-w-0 rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          {isCompliance && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('operationsRequestCityState', { defaultValue: 'City / State' })}
              </label>
              <input
                value={form.cityState}
                onChange={(e) => setField('cityState', e.target.value)}
                placeholder={t('operationsRequestCityStatePlaceholder', { defaultValue: 'e.g. Mumbai, Maharashtra' })}
                className="w-full min-w-0 rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('operationsRequestTimeline', { defaultValue: 'Preferred Timeline' })}
            </label>
            <input
              value={form.preferredTimeline}
              onChange={(e) => setField('preferredTimeline', e.target.value)}
              placeholder={
                isCompliance
                  ? t('operationsBookTimelinePlaceholder', { defaultValue: 'e.g. Within 2 weeks' })
                  : t('operationsHireTimelinePlaceholder', { defaultValue: 'e.g. Start next month' })
              }
              className="w-full min-w-0 rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('operationsRequestMessage', { defaultValue: 'Requirements / Notes' })}
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
              rows={3}
              className="w-full min-w-0 resize-y rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          {error && (
            <div className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 mt-1 flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-white pt-4 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="btn-glow flex flex-1 items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-800" />
              ) : (
                submitLabel
              )}
            </button>
            <button type="button" onClick={onClose} className="btn-glow shrink-0 whitespace-nowrap sm:min-w-[7rem]">
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
