/** GST-aware pricing for domain registration storefront checkout. */

export function roundInrMoney(amount) {
  return Math.round(Number(amount || 0) * 100) / 100;
}

/**
 * @param {number} unitPrice - Per-year registrar base (ex-GST)
 * @param {number} years
 * @param {{ enabled?: boolean, rate?: number, priceInclusive?: boolean } | null | undefined} gstConfig
 */
export function computeRegistrationPricing(unitPrice, years, gstConfig) {
  const y = Math.max(1, Number(years) || 1);
  const unit = Number(unitPrice) || 0;
  const subtotal = roundInrMoney(unit * y);
  const enabled = Boolean(gstConfig?.enabled);
  const rate = Number(gstConfig?.rate ?? 18);

  if (!enabled || rate <= 0) {
    return {
      unitPrice: unit,
      years: y,
      subtotal,
      gst: 0,
      total: subtotal,
      gstRate: null,
      gstEnabled: false,
    };
  }

  if (gstConfig?.priceInclusive) {
    const total = subtotal;
    const gst = roundInrMoney(total - total / (1 + rate / 100));
    return {
      unitPrice: unit,
      years: y,
      subtotal: roundInrMoney(total - gst),
      gst,
      total,
      gstRate: rate,
      gstEnabled: true,
    };
  }

  const gst = roundInrMoney(subtotal * (rate / 100));
  return {
    unitPrice: unit,
    years: y,
    subtotal,
    gst,
    total: roundInrMoney(subtotal + gst),
    gstRate: rate,
    gstEnabled: true,
  };
}

/**
 * Prefer API breakdown when period matches; otherwise recompute from unit price.
 */
export function resolveRegistrationPricing(checkResult, period, gstConfig) {
  if (!checkResult || checkResult.status !== 'available') return null;

  const years = Math.max(Number(period) || 1, checkResult.minPeriodYears || 1);
  const unit = Number(checkResult.unitPrice ?? 0);

  if (
    checkResult.totalInr != null &&
    checkResult.subtotalInr != null &&
    years === Math.max(checkResult.minPeriodYears || 1, 1) &&
    period === years
  ) {
    return {
      unitPrice: unit,
      years,
      subtotal: Number(checkResult.subtotalInr),
      gst: Number(checkResult.gstInr ?? 0),
      total: Number(checkResult.totalInr ?? checkResult.price ?? 0),
      gstRate: checkResult.gstRate ?? null,
      gstEnabled: Boolean(checkResult.gstEnabled),
    };
  }

  return computeRegistrationPricing(unit, years, gstConfig);
}
