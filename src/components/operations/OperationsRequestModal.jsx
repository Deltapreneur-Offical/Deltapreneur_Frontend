import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { operationsRequestAPI } from '../../api/services';
import { readApiError } from '../../utils/apiError';
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

  const timelinePlaceholder = isCompliance
    ? t('operationsBookTimelinePlaceholder', { defaultValue: 'e.g. Within 2 weeks' })
    : t('operationsHireTimelinePlaceholder', { defaultValue: 'e.g. Start next month' });

  return (
    <div
      className="operations-request-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`operations-request-modal ${isCompliance ? 'operations-request-modal--booking' : 'operations-request-modal--hire'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="operations-request-modal-title"
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
            <button type="submit" disabled={loading} className="btn-glow operations-request-modal-submit">
              {loading ? (
                <span className="operations-request-modal-spinner" aria-hidden />
              ) : (
                submitLabel
              )}
            </button>
            <button type="button" onClick={onClose} className="operations-request-modal-cancel">
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
