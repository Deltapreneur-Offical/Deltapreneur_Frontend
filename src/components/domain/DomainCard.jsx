import { useCurrency } from '../../context/CurrencyContext';
import AddToCartButton from '../cart/AddToCartButton';
import { domainRegistrationCartProps } from '../../utils/domainRegistrationCart';
import { DomainCardSkeleton } from '../common/DomainExtensionsLoader';
import RegistryPremiumBadge from './RegistryPremiumBadge';
import RegistryStandardBadge from './RegistryStandardBadge';
import { isRegistryPremium } from '../../utils/registryPremium';
import ShareButton from '../share/ShareButton';
import { useTranslation } from 'react-i18next';

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
  // Aftermarket origin (afternic/sedo) + managed-acquisition flag are carried
  // through so the shared card keeps routing/metadata intact when reused by the
  // OP Premium Showcase. Never rendered as text.
  const premiumProvider = raw.premiumProvider
    ? String(raw.premiumProvider).toLowerCase()
    : null;

  // [RENEWAL_PRICE_DEBUG] Log raw vs normalized renewal price to trace the pipeline.
  if (raw.isPremium || registryPremium) {
    console.debug(
      '[RENEWAL_PRICE] DomainCard.normalizeDomainCardItem domain=%s ' +
      'raw.renewalPrice=%o raw.renewalPriceInr=%o normalized_renewalPriceInr=%o',
      domain,
      raw.renewalPrice,
      raw.renewalPriceInr,
      Number.isFinite(renewalPriceInr) && renewalPriceInr > 0 ? renewalPriceInr : null,
    );
  }

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
    premiumProvider,
    managedAcquisition: raw.managedAcquisition === true || raw.managed_acquisition === true,
  };
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const map = {
    available: ['bg-emerald-50 text-emerald-700 border-emerald-200', t('domainCardAvailable', { defaultValue: 'Available' }), true],
    taken: ['bg-red-50 text-red-600 border-red-200', t('domainCardTaken', { defaultValue: 'Taken' })],
    error: ['bg-amber-50 text-amber-700 border-amber-200', t('domainCardCheckFailed', { defaultValue: 'Check failed' })],
    marketplace: ['bg-indigo-50 text-indigo-700 border-indigo-200', t('domainCardMarketplace', { defaultValue: 'Marketplace' })],
    loading: ['bg-gray-50 text-gray-400 border-gray-200', t('domainCardChecking', { defaultValue: 'Checking...' })],
  };
  const [cls, label, showCheck] = map[status] ?? map.taken;
  return (
    <span
      className={`inline-flex w-fit max-w-full shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {showCheck ? '\u2713 ' : ''}{label}
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
  /** { shareType, originalQuery } — enables the Share & Earn button on this card. */
  shareContext = null,
}) {
  const { t } = useTranslation();
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
        // Aftermarket origin (Afternic/Sedo) — backend revalidation/confirm uses
        // this to route through the aftermarket/managed-acquisition path.
        premiumProvider: item.premiumProvider || undefined,
      })
    : null;

  const priceText =
    item.registrationPriceInr != null ? formatDomainPrice(item.registrationPriceInr) : null;
  const renewalText =
    item.renewalPriceInr != null ? formatDomainPrice(item.renewalPriceInr) : null;

  // [RENEWAL_PRICE_DEBUG] Log the value actually rendered for premium domains.
  if (item.isPremium) {
    console.debug(
      '[RENEWAL_PRICE] DomainCard.render domain=%s renewalPriceInr=%o renewalText=%o ' +
      '(null renewalText → shows "Renewal price unavailable")',
      item.domain,
      item.renewalPriceInr,
      renewalText,
    );
  }

  if (featured) {
    return (
      <div
        className={`domain-search-card domain-search-card--featured relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
          item.available
            ? item.isPremium
              ? 'border-amber-300 ring-1 ring-amber-200/70 bg-gradient-to-br from-amber-50/50 via-white to-white shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_8px_28px_rgba(180,83,9,0.1),0_0_24px_rgba(251,191,36,0.12)]'
              : 'domain-search-card--standard border-teal-300 ring-1 ring-teal-200/70 bg-white shadow-[0_0_0_1px_rgba(94,234,212,0.28),0_8px_28px_rgba(15,118,110,0.08)]'
            : 'border-gray-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]'
        } ${className}`}
      >
        {shareContext && item.available ? (
          <div className="absolute top-3 right-3 z-10">
            <ShareButton
              shareType={shareContext.shareType}
              domain={item.domain}
              originalQuery={shareContext.originalQuery}
              availability={{ status: item.status, is_premium: item.isPremium, price_inr: item.registrationPriceInr }}
              compact
            />
          </div>
        ) : null}
        <div className="pr-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.isPremium ? <RegistryPremiumBadge /> : item.available ? <RegistryStandardBadge /> : null}
          </div>
          {showStyleBadge && item.style ? (
            <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
              {item.style}
            </span>
          ) : null}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-950 leading-tight">
            <span translate="no">{item.name}</span>
            <span translate="no" className={item.isPremium ? 'text-amber-700' : 'domain-card-standard-tld text-teal-700'}>.{item.tld}</span>
          </h2>
          {item.isPremium ? (
            <p className="text-xs font-semibold text-amber-800/85">{t('domainCardPremiumDomain', { defaultValue: 'Premium Domain' })}</p>
          ) : item.available ? (
            <p className="domain-card-standard-label text-xs font-semibold text-teal-700">{t('domainCardStandardDomain', { defaultValue: 'Standard Domain' })}</p>
          ) : null}
          {priceText ? (
            <p className="text-xl sm:text-2xl font-extrabold text-gray-950 leading-none" translate="no">
              {priceText}
              <span className="text-xs font-medium text-gray-400 ml-1.5">
                {item.isPremium ? t('domainCardFirstYearSuffix', { defaultValue: ' (1st Year)' }) : t('domainCardYearSuffix', { defaultValue: '/yr' })}
              </span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-gray-400">{t('domainCardPriceUnavailable', { defaultValue: 'Price unavailable' })}</p>
          )}
          {renewalText ? (
            <p className="text-xs text-gray-500">
              {t('domainCardRenewsAt', { defaultValue: 'Renews at {{price}}/yr', price: renewalText })}
            </p>
          ) : item.isPremium ? (
            <p className="text-xs text-gray-400">{t('domainCardRenewalUnavailable', { defaultValue: 'Renewal price unavailable' })}</p>
          ) : null}
          {item.managedAcquisition && (
            <div className="mt-1.5 space-y-0.5">
              <div className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                {t('domainCardManagedAcquisition', { defaultValue: 'Managed acquisition' })}
              </div>
              <p className="text-xs leading-snug text-amber-700/90">
                {t('domainCardManagedAcquisitionDesc', { defaultValue: 'Personalized acquisition - no online payment. Our team guides you through the purchase.' })}
              </p>
            </div>
          )}
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {cartProps ? (
            <AddToCartButton
              {...cartProps}
              tone="dark"
              size="sm"
              wrapperClassName="w-fit max-w-full"
              className="!flex-none !min-w-0 !w-auto !justify-center !rounded-lg !px-4 !py-2.5 !text-sm !font-bold !whitespace-nowrap"
            />
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex w-fit min-w-[8.5rem] px-4 py-2.5 rounded-lg font-bold text-sm bg-gray-100 text-gray-400 cursor-not-allowed whitespace-nowrap"
            >
              {item.status === 'error'
                ? t('domainCardCouldNotCheck', { defaultValue: 'Could not check' })
                : t('domainCardTaken', { defaultValue: 'Taken' })}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`domain-search-card relative flex flex-col border rounded-2xl p-4 hover:-translate-y-0.5 transition-all duration-200 ${
        item.available
          ? item.isPremium
            ? 'border-amber-200 ring-1 ring-amber-100 bg-gradient-to-br from-amber-50/40 via-white to-white shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_8px_24px_rgba(180,83,9,0.08),0_0_20px_rgba(251,191,36,0.1)] hover:shadow-[0_0_0_1px_rgba(251,191,36,0.28),0_10px_28px_rgba(180,83,9,0.12),0_0_28px_rgba(251,191,36,0.16)]'
            : 'domain-search-card--standard border-teal-300 ring-1 ring-teal-200/70 bg-white shadow-[0_0_0_1px_rgba(94,234,212,0.22),0_8px_24px_rgba(15,118,110,0.07)] hover:shadow-[0_0_0_1px_rgba(94,234,212,0.4),0_10px_28px_rgba(15,118,110,0.12)]'
          : 'border-gray-200 bg-white opacity-70 shadow-[0_4px_16px_rgba(15,23,42,0.05)]'
      } ${className}`}
    >
      {shareContext && item.available ? (
        <div className="absolute top-2.5 right-2.5 z-10">
          <ShareButton
            shareType={shareContext.shareType}
            domain={item.domain}
            originalQuery={shareContext.originalQuery}
            availability={{ status: item.status, is_premium: item.isPremium, price_inr: item.registrationPriceInr }}
            compact
          />
        </div>
      ) : null}
      <div className="pr-9 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={item.status} />
          {item.isPremium ? <RegistryPremiumBadge /> : item.available ? <RegistryStandardBadge /> : null}
        </div>
        {showStyleBadge && item.style ? (
          <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
            {item.style}
          </span>
        ) : null}
        <h3 className="text-lg font-extrabold tracking-tight text-gray-950 leading-snug">
          <span translate="no">{item.name}</span>
          <span translate="no" className={item.isPremium ? 'text-amber-700' : 'domain-card-standard-tld text-teal-700'}>.{item.tld}</span>
        </h3>
        {item.isPremium ? (
          <p className="text-[11px] font-semibold text-amber-800/80">{t('domainCardPremiumDomain', { defaultValue: 'Premium Domain' })}</p>
        ) : item.available ? (
          <p className="domain-card-standard-label text-[11px] font-semibold text-teal-700">{t('domainCardStandardDomain', { defaultValue: 'Standard Domain' })}</p>
        ) : null}
        {priceText ? (
          <p className="text-base font-extrabold text-gray-950 leading-none pt-0.5" translate="no">
            {priceText}
            <span className="text-[11px] font-medium text-gray-400 ml-1">
              {item.isPremium ? t('domainCardFirstYearSuffix', { defaultValue: ' (1st Year)' }) : t('domainCardYearSuffix', { defaultValue: '/yr' })}
            </span>
          </p>
        ) : (
          <p className="text-xs font-semibold text-gray-400">{t('domainCardPriceUnavailable', { defaultValue: 'Price unavailable' })}</p>
        )}
        {renewalText ? (
          <p className="text-[11px] text-gray-500">
            {t('domainCardRenewsAt', { defaultValue: 'Renews at {{price}}/yr', price: renewalText })}
          </p>
        ) : item.isPremium ? (
          <p className="text-[11px] text-gray-400">{t('domainCardRenewalUnavailable', { defaultValue: 'Renewal price unavailable' })}</p>
        ) : null}
        {item.managedAcquisition && (
          <div className="mt-1.5 space-y-0.5">
            <div className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
              {t('domainCardManagedAcquisition', { defaultValue: 'Managed acquisition' })}
            </div>
            <p className="text-[11px] leading-snug text-amber-700/90">
              {t('domainCardManagedAcquisitionDesc', { defaultValue: 'Personalized acquisition - no online payment. Our team guides you through the purchase.' })}
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {cartProps ? (
          <AddToCartButton
            {...cartProps}
            tone="dark"
            size="sm"
            wrapperClassName="w-fit max-w-full"
            className="!flex-none !min-w-0 !w-auto !justify-center !rounded-lg !px-3.5 sm:!px-4 !py-2.5 !text-xs sm:!text-sm !font-bold !whitespace-nowrap"
          />
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex w-fit min-w-[8rem] px-3.5 sm:px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm bg-gray-100 text-gray-400 cursor-not-allowed whitespace-nowrap"
          >
            {item.status === 'error'
              ? t('domainCardCouldNotCheck', { defaultValue: 'Could not check' })
              : t('domainCardTaken', { defaultValue: 'Taken' })}
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
  /** { shareType, originalQuery } — enables Share & Earn on rendered cards. */
  shareContext = null,
}) {
  const list = (items || []).map(normalizeDomainCardItem).filter((it) => it.domain);
  const featured = featuredFirst && list.length ? list[0] : null;
  const rest = featuredFirst && list.length > 1 ? list.slice(1) : featuredFirst ? [] : list;

  return (
    <div className="space-y-4">
      {featured ? (
        <DomainCard item={featured} featured showStyleBadge={showStyleBadge} shareContext={shareContext} />
      ) : null}
      {(rest.length > 0 || skeletonCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rest.map((it) => (
            <DomainCard key={it.domain} item={it} showStyleBadge={showStyleBadge} shareContext={shareContext} />
          ))}
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <DomainCardSkeleton key={`sk-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}
