import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { resolveOperationsIcon } from '../../utils/operationsIcons';
import { OPERATIONS_CATEGORY_LABELS, getHubRegistrarCategoryLabel } from '../../utils/operationsCategories';
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
  const cardCompliance = isComplianceService(service);
  const catLabel = cardCompliance
    ? getHubRegistrarCategoryLabel(service.category)
    : (OPERATIONS_CATEGORY_LABELS[service.category] ?? service.category);
  const priceInfo = formatOperationsPrice(service, { t, formatPrice });

  return (
    <>
    <style>{`
      .ops-badge-scroll {
        display: inline-block;
        animation: ops-badge-marquee 8s ease-in-out infinite alternate;
      }
      @keyframes ops-badge-marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-30%); }
      }
    `}</style>
    <article
      key={service.id}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm shadow-indigo-100 group-hover:bg-indigo-100 transition-colors">
          <Icon size={20} strokeWidth={2} aria-hidden />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
          {catLabel}
        </span>
      </div>
      <h3 className="font-display text-base font-bold text-gray-900 leading-snug mb-1.5">
        {service.name}
      </h3>
      <p className="text-sm text-gray-500 flex-1 leading-relaxed line-clamp-2">
        {service.description || t('operationsCardDesc', {
          defaultValue: 'Dedicated remote professional for your MSME — flexible monthly engagement.',
        })}
      </p>
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-end justify-between gap-3">
        {cardCompliance && !priceInfo.showPrice ? (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2 min-h-[2.75rem] overflow-hidden">
            <p className="ops-badge-scroll text-sm font-semibold text-indigo-700 whitespace-nowrap">
              {t('operationsContactForPricing', { defaultValue: 'Contact for pricing' })}
            </p>
          </div>
        ) : priceInfo.showPrice ? (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2">
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
          <div className="min-h-[2.75rem]" />
        )}
        {service.governmentFeesApplicable && service.governmentFeeText && (
          <div className="mt-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-center overflow-hidden">
            <p className="ops-badge-scroll text-sm font-semibold text-amber-700 whitespace-nowrap">{service.governmentFeeText}</p>
          </div>
        )}
        <button
          type="button"
          className="shrink-0 text-xs px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md transition-all duration-200 inline-flex items-center justify-center gap-1"
          onClick={() => onHire(service)}
        >
          {cardCompliance
            ? t('operationsBookSlot', { defaultValue: 'Book Your Slot' })
            : t('operationsHire', { defaultValue: 'Hire' })}
          <span className="ml-0.5">→</span>
        </button>
      </div>
    </article>
    </>
  );
}
