import { Trash2, AlertCircle, Globe, Cpu, Rocket, ShoppingBag } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { planLabelForKey } from '../../utils/technologyPricingPlans';

const TYPE_META = {
  DOMAIN_LISTING: {
    label: 'Domain',
    icon: Globe,
    badge: 'bg-sky-50 text-sky-700 border-sky-100',
    avatar: 'from-sky-100 to-sky-50 text-sky-600',
  },
  TECHNOLOGY: {
    label: 'Technology',
    icon: Cpu,
    badge: 'bg-violet-50 text-violet-700 border-violet-100',
    avatar: 'from-violet-100 to-violet-50 text-violet-600',
  },
  DOMAIN_REGISTRATION: {
    label: 'Domain Registration',
    icon: Globe,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    avatar: 'from-emerald-100 to-emerald-50 text-emerald-600',
  },
  VENTURE_DEAL: {
    label: 'Venture',
    icon: Rocket,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    avatar: 'from-indigo-100 to-indigo-50 text-indigo-600',
  },
};

export default function CartItem({ item, onRemove, removingId }) {
  const { formatPrice, formatDomainPrice } = useCurrency();
  const formatMoney =
    item.productType === 'DOMAIN_REGISTRATION' ? formatDomainPrice : formatPrice;
  const meta = TYPE_META[item.productType] || {
    label: item.productType,
    icon: ShoppingBag,
    badge: 'bg-gray-50 text-gray-600 border-gray-100',
    avatar: 'from-gray-100 to-gray-50 text-gray-500',
  };
  const Icon = meta.icon;
  const isRemoving = removingId === item.id;

  return (
    <article
      className={`group relative flex items-start gap-4 p-5 rounded-[14px] border transition-all duration-200 ${
        item.available
          ? 'border-gray-200/80 bg-white shadow-sm hover:shadow-md hover:border-gray-300/80'
          : 'border-red-200 bg-red-50/40 opacity-75'
      }`}
    >
      {item.productImage ? (
        <img
          src={item.productImage}
          alt={item.productName}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-1 ring-gray-100"
        />
      ) : (
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${meta.avatar} flex items-center justify-center flex-shrink-0 ring-1 ring-black/5`}>
          <Icon size={22} strokeWidth={1.75} />
        </div>
      )}

      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold tracking-wide ${meta.badge}`}>
            {meta.label}
          </span>
          {!item.available && (
            <span className="text-[11px] text-red-600 flex items-center gap-1 font-medium">
              <AlertCircle size={12} /> Unavailable
            </span>
          )}
        </div>
        <h4 className="font-display text-[15px] font-semibold text-gray-900 mt-1.5 truncate">
          {item.productName || 'Unknown Item'}
        </h4>
        {(item.basePrice > 0 || item.addonAmount > 0 || item.coBrotherFee > 0 || item.selectedPlan) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
            {item.productType === 'TECHNOLOGY' && item.selectedPlan && (
              <span className="text-indigo-600 font-medium">{planLabelForKey(item.selectedPlan)}</span>
            )}
            {item.basePrice > 0 && (
              <span>
                Base {formatMoney(item.basePrice)}
                {item.productType === 'DOMAIN_REGISTRATION' && item.metadata?.period > 1
                  ? ` · ${item.metadata.period} years`
                  : ''}
              </span>
            )}
            {item.addonAmount > 0 && <span>Add-ons {formatMoney(item.addonAmount)}</span>}
            {item.coBrotherFee > 0 && <span>CoBrother {formatMoney(item.coBrotherFee)}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
        <span className="font-display text-base font-bold text-gray-900 tabular-nums">
          {formatMoney(item.lineTotal)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
          className="p-2 rounded-lg text-gray-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all duration-200 disabled:opacity-50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          title="Remove from cart"
          aria-label="Remove from cart"
        >
          {isRemoving ? (
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <Trash2 size={15} />
          )}
        </button>
      </div>
    </article>
  );
}
