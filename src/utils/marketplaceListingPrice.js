import { computeRegistrationPricing } from './domainRegistrationPricing';

/**
 * Marketplace buyer price is GST-inclusive.
 * askingPrice (L) stays ex-GST internally; never add GST on top of buyerPayableInr.
 */
export function listingAskingPrice(domain) {
  const n = Number(domain?.askingPrice ?? domain?.asking_price ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function listingBuyerPayable(domain, gstConfig) {
  const fromApi = Number(domain?.buyerPayableInr ?? domain?.buyer_payable_inr ?? 0);
  if (Number.isFinite(fromApi) && fromApi > 0) return fromApi;

  const L = listingAskingPrice(domain);
  if (L <= 0) return 0;
  if (gstConfig && typeof gstConfig === 'object') {
    return computeRegistrationPricing(L, 1, gstConfig).total;
  }
  return L;
}

export function listingGstAmount(domain, gstConfig) {
  const fromApi = domain?.gstInr ?? domain?.gst_inr;
  if (fromApi != null && fromApi !== '') {
    const n = Number(fromApi);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const L = listingAskingPrice(domain);
  const payable = listingBuyerPayable(domain, gstConfig);
  if (L > 0 && payable > L) return Math.round((payable - L) * 100) / 100;
  if (gstConfig && typeof gstConfig === 'object') {
    return computeRegistrationPricing(L, 1, gstConfig).gst;
  }
  return 0;
}

export function cartListingBuyerPayable(item) {
  const fromMeta = Number(item?.metadata?.buyerPayableInr ?? 0);
  if (Number.isFinite(fromMeta) && fromMeta > 0) {
    const extras = (Number(item?.addonAmount) || 0) + (Number(item?.coBrotherFee) || 0);
    if (extras > 0 && item?.metadata?.gstRate != null) {
      const extraGst = computeRegistrationPricing(
        extras,
        1,
        { enabled: item.metadata.gstEnabled !== false, rate: item.metadata.gstRate, priceInclusive: false },
      ).total;
      return fromMeta + extraGst;
    }
    return fromMeta + extras;
  }
  return Number(item?.lineTotal) || 0;
}
