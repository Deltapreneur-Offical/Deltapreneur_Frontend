import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';

/**
 * Confirmation overlay shown after a hire / booking request is submitted.
 * Reused by the Operations page and the Home page Operations section so the
 * success state is identical everywhere.
 */
export default function OperationsRequestSuccess({ payload, onClose }) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] text-center bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(17,24,39,0.16)] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <div className="text-green-600 flex justify-center mb-4">
          <CheckCircle size={46} />
        </div>
        <h2 className="font-display text-[1.75rem] text-gray-900 mb-2">
          {payload?.type === 'booking'
            ? t('operationsBookSuccessTitle', { defaultValue: 'Slot Booked!' })
            : t('operationsHireSuccessTitle', { defaultValue: 'Hire Request Confirmed!' })}
        </h2>
        <p className="text-gray-500 mb-2">
          {payload?.type === 'booking'
            ? t('operationsBookSuccessBody', {
                defaultValue:
                  "You'll be notified soon. Our team will contact you regarding this one-time service and next steps.",
              })
            : t('operationsHireSuccessBody', {
                defaultValue:
                  "You'll be notified soon. Our team will contact you to confirm your monthly engagement and onboarding.",
              })}
        </p>
        {payload?.serviceName && (
          <p className="text-sm font-semibold text-gray-800 mb-4">{payload.serviceName}</p>
        )}
        <button type="button" className="btn-glow w-full" onClick={onClose}>
          {t('close', { defaultValue: 'Close' })}
        </button>
      </div>
    </div>
  );
}
