import { useEffect } from 'react';
import { Mail, Phone, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatRequestAdminPrice } from '../../utils/operationsPricing';

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export default function OperationsContactModal({ request, loading, onClose, onMarkContacted }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [loading, onClose]);

  if (!request) return null;

  const email = String(request.email || '').trim();
  const phone = normalizePhone(request.phone);
  const isHire = request.requestType === 'hire';

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-gray-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operations-contact-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('close', { defaultValue: 'Close' })}
          onClick={onClose}
          disabled={loading}
        >
          <X size={18} />
        </button>

        <div className="border-b border-gray-100 px-5 py-4 pr-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 mb-1">
            {t('adminOperationsContactModalEyebrow', { defaultValue: 'Contact customer' })}
          </p>
          <h2 id="operations-contact-modal-title" className="font-display text-lg font-semibold text-gray-900">
            {request.fullName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{request.serviceName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`operations-admin-request-type operations-admin-request-type--${isHire ? 'hire' : 'booking'}`}>
              {isHire
                ? t('operationsHire', { defaultValue: 'Hire' })
                : t('operationsBookSlot', { defaultValue: 'Book Your Slot' })}
            </span>
            <span className="text-xs font-medium text-gray-500">{formatRequestAdminPrice(request)}</span>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
              {t('operationsRequestEmail', { defaultValue: 'Email' })}
            </p>
            <p className="text-sm font-medium text-gray-900 break-all">{email || '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
              {t('operationsRequestPhone', { defaultValue: 'Phone' })}
            </p>
            <p className="text-sm font-medium text-gray-900">{phone || '—'}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {email && (
              <a
                href={`mailto:${email}`}
                className="operations-contact-modal-action operations-contact-modal-action--email"
              >
                <Mail size={16} aria-hidden />
                {t('adminOperationsContactViaEmail', { defaultValue: 'Email customer' })}
              </a>
            )}
            {phone && (
              <a
                href={`tel:+91${phone}`}
                className="operations-contact-modal-action operations-contact-modal-action--phone"
              >
                <Phone size={16} aria-hidden />
                {t('adminOperationsContactViaPhone', { defaultValue: 'Call customer' })}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="operations-contact-modal-btn operations-contact-modal-btn--muted"
            onClick={onClose}
            disabled={loading}
          >
            {t('cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            className="operations-contact-modal-btn operations-contact-modal-btn--primary"
            onClick={onMarkContacted}
            disabled={loading}
          >
            {loading
              ? t('loading', { defaultValue: 'Loading…' })
              : t('adminOperationsMarkContactedConfirm', { defaultValue: 'Mark as Contacted' })}
          </button>
        </div>
      </div>
    </div>
  );
}
