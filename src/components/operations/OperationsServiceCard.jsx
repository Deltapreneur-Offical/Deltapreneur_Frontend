import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { resolveOperationsIcon } from '../../utils/operationsIcons';
import { OPERATIONS_CATEGORY_LABELS } from '../../utils/operationsCategories';
import { formatOperationsPrice, isComplianceService } from '../../utils/operationsPricing';

/**
 * Single Operations service/role card.
 * Reused by both the Operations page and the Home page Operations section so
 * the role list renders identically in both places (no duplicated markup).
 */
export default function OperationsServiceCard({ service, onHire }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const Icon = resolveOperationsIcon(service);
  const catLabel = OPERATIONS_CATEGORY_LABELS[service.category] ?? service.category;
  const cardCompliance = isComplianceService(service);
  const priceInfo = formatOperationsPrice(service, { t, formatPrice });

  return (
    <article
      key={service.id}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
          <Icon size={18} strokeWidth={2} aria-hidden />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
          {catLabel}
        </span>
      </div>
      <h3 className="font-display text-[15px] font-semibold text-gray-900 leading-snug mb-1.5">
        {service.name}
      </h3>
      <p className="text-xs text-gray-500 flex-1 leading-relaxed">
        {service.description || t('operationsCardDesc', {
          defaultValue: 'Dedicated remote professional for your MSME — flexible monthly engagement.',
        })}
      </p>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between gap-2">
        {cardCompliance && !priceInfo.showPrice ? (
          <div className="min-h-[2.5rem]" />
        ) : priceInfo.showPrice ? (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5 font-medium">
              {t('operationsFrom', { defaultValue: 'Starting at' })}
            </p>
            <p className="text-base font-bold text-gray-900">
              {priceInfo.amount}
              {priceInfo.suffix && (
                <span className="text-xs font-medium text-gray-400">{priceInfo.suffix}</span>
              )}
            </p>
          </div>
        ) : (
          <div className="min-h-[2.5rem]" />
        )}
        <button
          type="button"
          className="btn-glow shrink-0 text-xs px-3.5 py-1.5"
          onClick={() => onHire(service)}
        >
          {cardCompliance
            ? t('operationsBookSlot', { defaultValue: 'Book Your Slot' })
            : t('operationsHire', { defaultValue: 'Hire' })} →
        </button>
      </div>
    </article>
  );
}
