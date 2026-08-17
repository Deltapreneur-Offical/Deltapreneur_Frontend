/**
 * Shared cart helpers for DOMAIN_REGISTRATION items.
 * Homepage, Storefront, and AI Brand Names must use the same productId + metadata
 * so isInCart / Added state works across surfaces and duplicates are impossible.
 */

/** Stable UUID-like id derived from FQDN (same scheme Homepage already used). */
export function domainToProductId(domain) {
  let hash = 0;
  const str = String(domain || '').toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
}

/**
 * Build cart metadata. Price is always INR (ex-GST **1-year** selling price with commission baked in).
 * Registration period is selected later in Cart/Checkout — do not bake min-period into line price here.
 * @param {{ domain: string, tld?: string, registrationPriceInr?: number, price?: number, period?: number, minPeriodYears?: number, isPremium?: boolean, premiumProvider?: string }} item
 */
export function domainRegistrationCartMetadata(item) {
  const domain = String(item.domain || '').toLowerCase().trim();
  const tld =
    String(item.tld || (domain.includes('.') ? domain.split('.').slice(1).join('.') : '')).replace(
      /^\./,
      '',
    );
  const price = Number(item.registrationPriceInr ?? item.price ?? item.registrationPrice ?? 0);
  const minPeriodYears = Math.max(1, Number(item.minPeriodYears || 1));
  // Cart line starts at 1-year unit price; period is applied only after the user
  // selects years in Cart (updateDomainRegistrationPeriod / checkout quote).
  const period = 1;
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  const isPremium = item.isPremium === true || item.is_premium === true;
  const meta = {
    domainName: domain,
    // Storefront/search prices are always 1-year selling totals.
    price: safePrice,
    pricePerYear: safePrice,
    tld,
    period,
    minPeriodYears,
    // Hint only — checkout revalidates is_premium from OpenProvider.
    isPremium,
    registryTier: isPremium ? 'premium' : 'standard',
  };
  // Aftermarket (Afternic/Sedo) origin — backend revalidation/confirm uses this
  // to route through the aftermarket/managed-acquisition path (never GetPrice).
  if (item.premiumProvider) {
    meta.premiumProvider = String(item.premiumProvider).toLowerCase();
  }
  return meta;
}

export function domainRegistrationCartProps(item) {
  const metadata = domainRegistrationCartMetadata(item);
  return {
    productType: 'DOMAIN_REGISTRATION',
    productId: domainToProductId(metadata.domainName),
    metadata,
  };
}
