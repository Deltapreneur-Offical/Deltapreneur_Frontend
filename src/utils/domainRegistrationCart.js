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
 * Build cart metadata. Price is always INR (ex-GST selling price with commission baked in).
 * @param {{ domain: string, tld?: string, registrationPriceInr?: number, price?: number, period?: number }} item
 */
export function domainRegistrationCartMetadata(item) {
  const domain = String(item.domain || '').toLowerCase().trim();
  const tld =
    String(item.tld || (domain.includes('.') ? domain.split('.').slice(1).join('.') : '')).replace(
      /^\./,
      '',
    );
  const price = Number(item.registrationPriceInr ?? item.price ?? item.registrationPrice ?? 0);
  const period = Math.max(1, Number(item.period || item.minPeriodYears || 1));
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  return {
    domainName: domain,
    // Storefront/search prices are always 1-year selling totals.
    price: safePrice,
    pricePerYear: safePrice,
    tld,
    period,
  };
}

export function domainRegistrationCartProps(item) {
  const metadata = domainRegistrationCartMetadata(item);
  return {
    productType: 'DOMAIN_REGISTRATION',
    productId: domainToProductId(metadata.domainName),
    metadata,
  };
}
