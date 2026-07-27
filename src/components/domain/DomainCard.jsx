import { useCurrency } from '../../context/CurrencyContext';
import AddToCartButton from '../cart/AddToCartButton';
import { domainRegistrationCartProps } from '../../utils/domainRegistrationCart';
import { DomainCardSkeleton } from '../common/DomainExtensionsLoader';
import RegistryPremiumBadge from './RegistryPremiumBadge';
import { isRegistryPremium } from '../../utils/registryPremium';

/**
 * Normalize any discovery-source item into the shared DomainCard shape.
 * Price fields are always INR (ex-GST selling price with commission baked in).
 */
export function normalizeDomainCardItem(raw = {}) {
  const name = String(raw.name || raw.domain?.split('.')?.[0] || '').toLowerCase();
  const tld = String(
    raw.tld || raw.ext || (raw.domain?.includes('.') ? raw.domain.split('.').slice(1).join('.') : ''),
  )
    .replace(/^\./, '')
    .toLowerCase();
  const domain = String(raw.domain || (name && tld ? `${name}.${tld}` : '')).toLowerCase();
  const available =
    raw.available === true ||
    String(raw.status || '').toLowerCase() === 'available';
  const status = available
    ? 'available'
    : String(raw.status || 'taken').toLowerCase();

  const registrationPriceInr = Number(
    raw.registrationPriceInr ?? raw.registrationPrice ?? raw.unitPrice ?? 0,
  );
  const renewalPriceInr = Number(raw.renewalPriceInr ?? raw.renewalPrice ?? 0);
  const minPeriodYears = Math.max(1, Number(raw.minPeriodYears || 1));
  // Display/cart base is always 1-year; minPeriodYears is metadata for checkout only.
  const period = 1;
  const registryPremium = isRegistryPremium(raw);

  return {
    domain,
    name,
    tld,
    status,
    available,
    isPremium: registryPremium,
    registrationPriceInr: Number.isFinite(registrationPriceInr) && registrationPriceInr > 0
      ? registrationPriceInr
      : null,
    renewalPriceInr: Number.isFinite(renewalPriceInr) && renewalPriceInr > 0 ? renewalPriceInr : null,
    period,
    minPeriodYears,
    style: raw.style || raw.brand_category || null,
    listing: raw.listing || null,
  };
}

function StatusBadge({ status }) {
  const map = {
    available: ['bg-emerald-50 text-emerald-700 border-emerald-200', '✓ Available'],
    taken: ['bg-red-50 text-red-600 border-red-200', 'Taken'],
    error: ['bg-amber-50 text-amber-700 border-amber-200', 'Check failed'],
    marketplace: ['bg-indigo-50 text-indigo-700 border-indigo-200', 'Marketplace'],
    loading: ['bg-gray-50 text-gray-400 border-gray-200', 'Checking…'],
  };
  const [cls, label] = map[status] ?? map.taken;
  return (
    <span
      className={`inline-flex w-fit max-w-full shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

/**
 * Shared domain result card used by Homepage Domain Names, Storefront, and AI (post-fetch).
 * Add / Remove from Cart updates instantly (cart badge + card state).
 */
export default function DomainCard({
  item: rawItem,
  featured = false,
  showStyleBadge = false,
  className = '',
}) {
  const { formatDomainPrice } = useCurrency();
  const item = normalizeDomainCardItem(rawItem);
  const canBuy = item.available && item.registrationPriceInr != null;
  const cartProps = canBuy
    ? domainRegistrationCartProps({
        domain: item.domain,
        tld: item.tld,
        registrationPriceInr: item.registrationPriceInr,
        period: item.period,
        minPeriodYears: item.minPeriodYears,
        isPremium: item.isPremium,
      })
    : null;

  const priceText =
    item.registrationPriceInr != null ? formatDomainPrice(item.registrationPriceInr) : null;
  const renewalText =
    item.renewalPriceInr != null ? formatDomainPrice(item.renewalPriceInr) : null;

  if (featured) {
    return (
      <div
        className={`domain-search-card domain-search-card--featured relative bg-white rounded-2xl border p-4 sm:p-5 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition-all duration-200 ${
          item.available
            ? item.isPremium
              ? 'border-amber-300 ring-1 ring-amber-200/70 bg-gradient-to-br from-amber-50/50 via-white to-white'
              : 'border-[var(--cobrother-brand-green)] ring-1 ring-[rgba(var(--cobrother-brand-green-rgb),0.14)]'
            : 'border-gray-200'
        } ${className}`}
      >
        {cartProps && (
          <AddToCartButton
            variant="corner"
            allowRemove
            className="absolute top-3 right-3 z-10"
            {...cartProps}
          />
        )}
        <div className="pr-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.isPremium ? <RegistryPremiumBadge /> : null}
          </div>
          {showStyleBadge && item.style ? (
            <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
              {item.style}
            </span>
          ) : null}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-950 leading-tight">
            {item.name}
            <span className={item.isPremium ? 'text-amber-700' : 'text-purple-600'}>.{item.tld}</span>
          </h2>
          {item.isPremium ? (
            <p className="text-xs font-semibold text-amber-800/85">Premium Domain</p>
          ) : null}
          {priceText ? (
            <p className="text-xl sm:text-2xl font-extrabold text-gray-950 leading-none">
              {priceText}
              <span className="text-xs font-medium text-gray-400 ml-1.5">/yr</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-gray-400">Price unavailable</p>
          )}
          {renewalText ? (
            <p className="text-xs text-gray-500">Renews at {renewalText}/yr</p>
          ) : null}
        </div>
        <div className="mt-3.5 flex justify-start">
          {cartProps ? (
            <AddToCartButton
              {...cartProps}
              tone="dark"
              size="sm"
              wrapperClassName="!w-[30%] !min-w-[7.5rem] !max-w-[9.5rem]"
              className="!w-full !justify-center !rounded-lg !px-3 !py-2.5 !text-sm !font-bold"
            />
          ) : (
            <button
              type="button"
              disabled
              className="w-[30%] min-w-[7.5rem] max-w-[9.5rem] px-3 py-2.5 rounded-lg font-bold text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              {item.status === 'error' ? 'Could not check' : 'Taken'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`domain-search-card relative flex flex-col bg-white border rounded-2xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_28px_rgba(79,70,229,0.10)] hover:-translate-y-0.5 transition-all duration-200 ${
        item.available
          ? item.isPremium
            ? 'border-amber-200 ring-1 ring-amber-100 bg-gradient-to-br from-amber-50/40 via-white to-white'
            : 'border-[rgba(var(--cobrother-brand-green-rgb),0.38)] ring-1 ring-[rgba(var(--cobrother-brand-green-rgb),0.10)]'
          : 'border-gray-200 opacity-70'
      } ${className}`}
    >
      {cartProps && (
        <AddToCartButton
          variant="corner"
          allowRemove
          className="absolute top-2.5 right-2.5 z-10"
          {...cartProps}
        />
      )}
      <div className="pr-9 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={item.status} />
          {item.isPremium ? <RegistryPremiumBadge /> : null}
        </div>
        {showStyleBadge && item.style ? (
          <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
            {item.style}
          </span>
        ) : null}
        <h3 className="text-lg font-extrabold tracking-tight text-gray-950 leading-snug">
          {item.name}
          <span className={item.isPremium ? 'text-amber-700' : 'text-purple-500'}>.{item.tld}</span>
        </h3>
        {item.isPremium ? (
          <p className="text-[11px] font-semibold text-amber-800/80">Premium Domain</p>
        ) : null}
        {priceText ? (
          <p className="text-base font-extrabold text-gray-950 leading-none pt-0.5">
            {priceText}
            <span className="text-[11px] font-medium text-gray-400 ml-1">/yr</span>
          </p>
        ) : (
          <p className="text-xs font-semibold text-gray-400">Price unavailable</p>
        )}
        {renewalText ? (
          <p className="text-[11px] text-gray-500">Renews at {renewalText}/yr</p>
        ) : null}
      </div>
      <div className="mt-3 flex justify-start">
        {cartProps ? (
          <AddToCartButton
            {...cartProps}
            tone="dark"
            size="sm"
            wrapperClassName="!w-[30%] !min-w-[7rem] !max-w-[9rem]"
            className="!w-full !justify-center !rounded-lg !px-3 !py-2.5 !text-xs !font-bold"
          />
        ) : (
          <button
            type="button"
            disabled
            className="w-[30%] min-w-[7rem] max-w-[9rem] px-3 py-2.5 rounded-lg font-bold text-xs bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            {item.status === 'error' ? 'Could not check' : 'Taken'}
          </button>
        )}
      </div>
    </div>
  );
}

export function DomainCardGrid({
  items,
  featuredFirst = true,
  showStyleBadge = false,
  /** Skeleton slots rendered in the grid after loaded secondary cards. */
  skeletonCount = 0,
}) {
  const list = (items || []).map(normalizeDomainCardItem).filter((it) => it.domain);
  const featured = featuredFirst && list.length ? list[0] : null;
  const rest = featuredFirst && list.length > 1 ? list.slice(1) : featuredFirst ? [] : list;

  return (
    <div className="space-y-4">
      {featured ? (
        <DomainCard item={featured} featured showStyleBadge={showStyleBadge} />
      ) : null}
      {(rest.length > 0 || skeletonCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rest.map((it) => (
            <DomainCard key={it.domain} item={it} showStyleBadge={showStyleBadge} />
          ))}
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <DomainCardSkeleton key={`sk-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}
