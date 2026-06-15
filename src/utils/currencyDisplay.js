import {
  CURRENCY_FORMAT,
  DEFAULT_LISTING_CURRENCY,
  SUPPORTED_CURRENCIES,
} from '../constants/currencies';
import { normalizeInrDisplay, roundInr, roundMoney } from './money';

const SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
};

/**
 * Last-resort rates (updated periodically). Prefer live provider fetch in currencyRates.js.
 * Values are INR → foreign: amount_foreign = amount_inr * rateFromInr.
 */
/** Aligned with Wise/Google mid-market (Jun 2026); live fetch uses min across providers. */
const FALLBACK_RATES_FROM_INR = {
  INR: 1,
  USD: 0.010444,
  EUR: 0.00902,
  GBP: 0.00779,
  AED: 0.038365,
  SGD: 0.01343,
  AUD: 0.01461,
  CAD: 0.01453,
};

export function buildFallbackMetaFromRates(rates = FALLBACK_RATES_FROM_INR) {
  const meta = {};
  for (const code of SUPPORTED_CURRENCIES) {
    meta[code] = {
      symbol: SYMBOLS[code] ?? `${code} `,
      rateFromInr: code === 'INR' ? 1 : safeNumber(rates[code], 0),
    };
  }
  return meta;
}

/** @deprecated Use buildFallbackMetaFromRates() — kept for imports. */
export const FALLBACK_META = buildFallbackMetaFromRates();

export function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Build display meta from live rate table only (no stale static overrides). */
export function buildMetaFromRates(rates = {}) {
  const meta = {};
  for (const code of SUPPORTED_CURRENCIES) {
    const rate = rates[code];
    meta[code] = {
      symbol: SYMBOLS[code] ?? `${code} `,
      rateFromInr: code === 'INR' ? 1 : safeNumber(rate, 0),
    };
  }
  return meta;
}

export function mergeCurrencyMeta(apiMeta = {}) {
  if (!apiMeta || Object.keys(apiMeta).length === 0) {
    return buildFallbackMetaFromRates();
  }
  return apiMeta;
}

/**
 * Convert a foreign-currency amount to INR for storage (inverse of convertPrice).
 */
export function convertForeignToInr(amount, fromCurrency, meta = FALLBACK_META) {
  const m = meta && typeof meta === 'object' ? meta : buildFallbackMetaFromRates();
  const value = safeNumber(amount, 0);
  const code = (fromCurrency || DEFAULT_LISTING_CURRENCY).toUpperCase();
  if (code === 'INR') return roundInr(value);
  const fallback = buildFallbackMetaFromRates();
  const rate = safeNumber(m[code]?.rateFromInr ?? fallback[code]?.rateFromInr, 0);
  if (!rate) return roundInr(value);
  return roundInr(value / rate);
}

/**
 * Convert an INR-stored amount to the target currency (display only).
 */
export function convertPrice(inrAmount, currencyCode, meta = FALLBACK_META) {
  return convertInrAmount(inrAmount, currencyCode, meta);
}

/** @deprecated Alias — use convertPrice */
export function convertInrAmount(inrAmount, currencyCode, meta = FALLBACK_META) {
  const m = meta && typeof meta === 'object' ? meta : buildFallbackMetaFromRates();
  const inr = safeNumber(inrAmount, 0);
  const code = (currencyCode || DEFAULT_LISTING_CURRENCY).toUpperCase();
  if (code === 'INR') return roundInr(inr);
  const fallback = buildFallbackMetaFromRates();
  const rate = safeNumber(m[code]?.rateFromInr ?? fallback[code]?.rateFromInr, 0);
  if (!rate) return roundInr(inr);
  return roundMoney(inr * rate);
}

function fractionDigitsFor(amount, code) {
  if (code === 'INR') return 0;
  const normalized = roundMoney(amount);
  return Number.isInteger(normalized) ? 0 : 2;
}

/**
 * Format a converted amount with locale-aware grouping and currency symbols.
 */
export function formatCurrency(amount, currencyCode, meta = FALLBACK_META) {
  const code = (currencyCode || DEFAULT_LISTING_CURRENCY).toUpperCase();
  const safeMeta = meta && typeof meta === 'object' ? meta : buildFallbackMetaFromRates();
  const amt = code === 'INR' ? normalizeInrDisplay(amount) : roundMoney(safeNumber(amount, 0));
  const cfg = CURRENCY_FORMAT[code] || {};
  const locale = cfg.locale || 'en-US';
  const fractionDigits = fractionDigitsFor(amt, code);

  let formatted;
  try {
    formatted = amt.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  } catch {
    formatted = String(amt);
  }

  if (cfg.prefixWithCode) {
    const label = cfg.code || code;
    return `${label} ${formatted}`;
  }

  const fallback = buildFallbackMetaFromRates();
  const sym = safeMeta[code]?.symbol ?? cfg.symbol ?? fallback[code]?.symbol ?? `${code} `;
  return `${sym}${formatted}`;
}

/** Convert INR → selected currency and format for UI. */
export function formatInrAsCurrency(inrAmount, currencyCode, meta = FALLBACK_META) {
  try {
    const code = (currencyCode || DEFAULT_LISTING_CURRENCY).toUpperCase();
    const converted = convertPrice(inrAmount, code, meta);
    return formatCurrency(converted, code, meta);
  } catch {
    const sym = buildFallbackMetaFromRates().INR.symbol;
    return `${sym}${normalizeInrDisplay(inrAmount).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
}

export function getCurrencySymbol(code, meta = FALLBACK_META) {
  const m = meta && typeof meta === 'object' ? meta : buildFallbackMetaFromRates();
  const upper = (code || DEFAULT_LISTING_CURRENCY).toUpperCase();
  const cfg = CURRENCY_FORMAT[upper];
  if (cfg?.prefixWithCode) return cfg.code || upper;
  const fallback = buildFallbackMetaFromRates();
  return m[upper]?.symbol ?? fallback[upper]?.symbol ?? `${upper} `;
}

/**
 * Extra fields for purchase/create-order API bodies.
 * When backend is INR-only, send {} so unknown keys do not trigger 500s.
 */
export const BACKEND_ACCEPTS_ORDER_CURRENCY = false;

export function buildOrderCurrencyPayload(selectedCurrency) {
  if (!BACKEND_ACCEPTS_ORDER_CURRENCY) return {};
  const code = (selectedCurrency || DEFAULT_LISTING_CURRENCY).toUpperCase();
  if (code === DEFAULT_LISTING_CURRENCY) return {};
  return { currency: code };
}
