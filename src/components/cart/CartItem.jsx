import { Trash2, AlertCircle, Globe, Cpu, Rocket, ShoppingBag, Loader2, Info } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { planLabelForKey } from '../../utils/technologyPricingPlans';
import { useTranslation } from 'react-i18next';

const TYPE_META = {
  DOMAIN_LISTING: {
    label: 'Domain',
    labelKey: 'domain',
    icon: Globe,
    badge: 'bg-sky-50 text-sky-700 border-sky-100',
    avatar: 'from-sky-100 to-sky-50 text-sky-600',
  },
  TECHNOLOGY: {
    label: 'Technology',
    labelKey: 'technology',
    icon: Cpu,
    badge: 'bg-violet-50 text-violet-700 border-violet-100',
    avatar: 'from-violet-100 to-violet-50 text-violet-600',
  },
  DOMAIN_REGISTRATION: {
    label: 'Domain Registration',
    labelKey: 'cartProductDomainRegistration',
    icon: Globe,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    avatar: 'from-emerald-100 to-emerald-50 text-emerald-600',
  },
  VENTURE_DEAL: {
    label: 'Venture',
    labelKey: 'venture',
    icon: Rocket,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    avatar: 'from-indigo-100 to-indigo-50 text-indigo-600',
  },
};

/** Standard registration period options (years). Filtered by each TLD's minPeriodYears. */
export const DOMAIN_REGISTRATION_PERIOD_OPTIONS = [1, 2, 3, 5, 10];

export default function CartItem({
  item,
  onRemove,
  removingId,
  onPeriodChange,
  periodUpdatingId,
}) {
  const { t } = useTranslation();
  const { formatPrice, formatDomainPrice } = useCurrency();
  const formatMoney =
    item.productType === 'DOMAIN_REGISTRATION' ? formatDomainPrice : formatPrice;
  const meta = TYPE_META[item.productType] || {
    label: item.productType,
    labelKey: 'product',
    icon: ShoppingBag,
    badge: 'bg-gray-50 text-gray-600 border-gray-100',
    avatar: 'from-gray-100 to-gray-50 text-gray-500',
  };
  const Icon = meta.icon;
  const isRemoving = removingId === item.id;
  const isDomainReg = item.productType === 'DOMAIN_REGISTRATION';
  const isDomainListing = item.productType === 'DOMAIN_LISTING';
  const listingDisplayTotal = isDomainListing && Number(item.metadata?.buyerPayableInr) > 0
    ? Number(item.metadata.buyerPayableInr)
      + (Number(item.addonAmount) || 0)
      + (Number(item.coBrotherFee) || 0)
    : null;
  const minPeriod = Math.max(1, Number(item.metadata?.minPeriodYears || 1));
  const registrationTld = (() => {
    const fromMeta = String(item.metadata?.tld || '').replace(/^\./, '').toLowerCase();
    if (fromMeta) return fromMeta;
    const name = String(item.metadata?.domainName || item.productName || '');
    if (name.includes('.')) return name.split('.').slice(1).join('.').toLowerCase();
    return '';
  })();
  const selectedPeriod = Math.max(
    minPeriod,
    Number(item.metadata?.period || minPeriod),
  );
  const periodOptions = DOMAIN_REGISTRATION_PERIOD_OPTIONS.filter((y) => y >= minPeriod);
  const isPeriodUpdating = periodUpdatingId === item.id;

  const handlePeriodSelect = (nextYears) => {
    const years = Math.max(minPeriod, Number(nextYears) || minPeriod);
    if (years === selectedPeriod || !onPeriodChange || isPeriodUpdating) return;
    onPeriodChange(item.id, years);
  };

  return (
    <article
      className={`relative flex items-start gap-4 p-5 rounded-[14px] border transition-all duration-200 ${
        item.available
          ? isPeriodUpdating
            ? 'border-indigo-200 bg-indigo-50/30 ring-1 ring-indigo-100 shadow-sm'
            : 'border-gray-200/80 bg-white shadow-sm hover:shadow-md hover:border-gray-300/80'
          : 'border-red-200 bg-red-50/40 opacity-75'
      }`}
      aria-busy={isPeriodUpdating || undefined}
    >
      {isPeriodUpdating && (
        <div className="absolute inset-0 z-10 rounded-[14px] bg-white/55 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-white border border-indigo-100 shadow-sm px-3.5 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">
              {t('cartUpdatingRegistrationPrice', { defaultValue: 'Updating registration price...' })}
            </span>
          </div>
        </div>
      )}

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
            {t(meta.labelKey, { defaultValue: meta.label })}
          </span>
          {!item.available && (
            <span className="text-[11px] text-red-600 flex items-center gap-1 font-medium">
              <AlertCircle size={12} /> {t('listingCardUnavailable', { defaultValue: 'Unavailable' })}
            </span>
          )}
        </div>
        <h4
          className="font-display text-[15px] font-semibold text-gray-900 mt-1.5 truncate"
          translate={item.productName ? 'no' : undefined}
        >
          {item.productName || t('unknownItem', { defaultValue: 'Unknown Item' })}
        </h4>
        {isDomainReg && (item.metadata?.isPremium === true) && (
          <p className="mt-0.5 text-xs font-semibold text-amber-800">{t('domainCardPremiumDomain', { defaultValue: 'Delta Domains' })}</p>
        )}
        {(item.basePrice > 0 || item.addonAmount > 0 || item.coBrotherFee > 0 || item.selectedPlan || isDomainReg) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
            {item.productType === 'TECHNOLOGY' && item.selectedPlan && (
              <span className="text-indigo-600 font-medium">{planLabelForKey(item.selectedPlan)}</span>
            )}
            {item.basePrice > 0 && !isDomainListing && (
              <span>
                {t('basePriceInline', { defaultValue: 'Base {{price}}', price: formatMoney(item.basePrice) })}
                {isDomainReg && selectedPeriod > 1
                  ? t('selectedYearsSuffix', { defaultValue: ' - {{count}} years', count: selectedPeriod })
                  : ''}
              </span>
            )}
            {isDomainListing && listingDisplayTotal != null && (
              <span>{t('inclusiveTaxes', { defaultValue: 'Inclusive of applicable taxes' })}</span>
            )}
            {item.addonAmount > 0 && <span>{t('addonsPriceInline', { defaultValue: 'Add-ons {{price}}', price: formatMoney(item.addonAmount) })}</span>}
            {item.coBrotherFee > 0 && <span>CoBrother {formatMoney(item.coBrotherFee)}</span>}
          </div>
        )}

        {isDomainReg && item.available && onPeriodChange && (
          <div className="mt-3 space-y-1.5 max-w-[14rem]">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                {t('storefrontPeriod', { defaultValue: 'Registration period' })}
              </span>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodSelect(e.target.value)}
                disabled={isPeriodUpdating || isRemoving}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm font-medium text-gray-900 focus:border-indigo-400 outline-none disabled:opacity-70 disabled:cursor-wait"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem center',
                }}
              >
                {periodOptions.map((y) => (
                  <option key={y} value={y}>
                    {t('cartYearOption', { defaultValue: '{{count}} year', count: y })}
                    {y === minPeriod && minPeriod > 1 ? t('minimumSuffix', { defaultValue: ' (min)' }) : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-gray-400 leading-snug">
              {t('cartPriceUpdatesInstantly', { defaultValue: 'Price updates instantly when you change years.' })}
            </p>
            {minPeriod > 1 && registrationTld ? (
              <div className="mt-0.5 flex items-start gap-1.5 text-[11px] leading-snug text-gray-500">
                <Info
                  className="mt-0.5 h-3 w-3 shrink-0 text-gray-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <p>
                  {t('cartTldMinimumPeriodNote', {
                    defaultValue: 'Note: .{{tld}} domains require a minimum {{count}}-year registration period as mandated by the registry.',
                    tld: registrationTld,
                    count: minPeriod,
                  })}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
        <span
          className={`font-display text-base font-bold tabular-nums ${
            isPeriodUpdating ? 'text-indigo-400 animate-pulse' : 'text-gray-900'
          }`}
        >
          {formatMoney(listingDisplayTotal != null ? listingDisplayTotal : item.lineTotal)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving || isPeriodUpdating}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors duration-150 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          title={t('removeFromCart', { defaultValue: 'Remove from cart' })}
          aria-label={t('removeFromCart', { defaultValue: 'Remove from cart' })}
        >
          {isRemoving ? (
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
          ) : (
            <Trash2 size={14} strokeWidth={2} />
          )}
        </button>
      </div>
    </article>
  );
}
