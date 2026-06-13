import { useState } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[500px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden animate-slideUp">
        <div className={`absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full blur-3xl pointer-events-none ${isCompliance ? 'bg-emerald-100/30' : 'bg-indigo-100/30'}`} />
        <button
          type="button"
          className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors duration-200 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="relative z-10 p-8 pb-6">
          <div className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-md mb-4 ${isCompliance ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
            {t(priceInfo.billingKey, { defaultValue: priceInfo.billingDefault })}
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900 m-0 mb-2">{modalTitle}</h2>
          <p className="text-gray-900 text-sm font-semibold m-0 mb-1">{service.name}</p>
          <p className="text-gray-500 text-sm m-0 mb-1">
            {priceInfo.showPrice ? priceInfo.label : priceInfo.label}
          </p>
          <p className="text-gray-400 text-xs m-0">{priceHint}</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 px-8 pb-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('operationsRequestFullName', { defaultValue: 'Full Name' })} <span className="text-red-500">*</span>
            </label>
            <input
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('operationsRequestEmail', { defaultValue: 'Email' })} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {t('operationsRequestPhone', { defaultValue: 'Phone' })} <span className="text-red-500">*</span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                maxLength={10}
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
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
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
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
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
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
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {t('operationsRequestMessage', { defaultValue: 'Requirements / Notes' })}
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none resize-y focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={loading} className="btn-glow flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
              ) : (
                submitLabel
              )}
            </button>
            <button type="button" onClick={onClose} className="btn-glow">
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
