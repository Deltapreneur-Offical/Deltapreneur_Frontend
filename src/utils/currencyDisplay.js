import {
  CURRENCY_FORMAT,
  DEFAULT_LISTING_CURRENCY,
  SUPPORTED_CURRENCIES,
} from '../constants/currencies';
import { normalizeInrDisplay, roundInr, roundMoney } from './money';

const SYMBOLS = {
  "AED": "AED",
  "ALL": "ALL",
  "AMD": "AMD",
  "AUD": "A$",
  "AWG": "AWG",
  "AZN": "AZN",
  "BAM": "BAM",
  "BBD": "BBD",
  "BDT": "BDT",
  "BGN": "BGN",
  "BHD": "BHD",
  "BIF": "BIF",
  "BMD": "BMD",
  "BND": "BND",
  "BOB": "BOB",
  "BRL": "BRL",
  "BSD": "BSD",
  "BTN": "BTN",
  "BWP": "BWP",
  "BZD": "BZD",
  "CAD": "C$",
  "CHF": "CHF",
  "CLP": "CLP",
  "CNY": "\u00a5",
  "COP": "COP",
  "CRC": "CRC",
  "CUP": "CUP",
  "CVE": "CVE",
  "CZK": "CZK",
  "DJF": "DJF",
  "DKK": "DKK",
  "DOP": "DOP",
  "DZD": "DZD",
  "EGP": "EGP",
  "ETB": "ETB",
  "EUR": "\u20ac",
  "FJD": "FJD",
  "GBP": "\u00a3",
  "GHS": "GHS",
  "GIP": "GIP",
  "GMD": "GMD",
  "GNF": "GNF",
  "GTQ": "GTQ",
  "GYD": "GYD",
  "HKD": "HKD",
  "HNL": "HNL",
  "HRK": "HRK",
  "HTG": "HTG",
  "HUF": "HUF",
  "IDR": "IDR",
  "ILS": "ILS",
  "INR": "\u20b9",
  "IQD": "IQD",
  "ISK": "ISK",
  "JMD": "JMD",
  "JOD": "JOD",
  "JPY": "\u00a5",
  "KES": "KES",
  "KGS": "KGS",
  "KHR": "KHR",
  "KMF": "KMF",
  "KRW": "KRW",
  "KWD": "KWD",
  "KYD": "KYD",
  "KZT": "KZT",
  "LAK": "LAK",
  "LKR": "LKR",
  "LRD": "LRD",
  "LSL": "LSL",
  "MAD": "MAD",
  "MDL": "MDL",
  "MGA": "MGA",
  "MKD": "MKD",
  "MMK": "MMK",
  "MNT": "MNT",
  "MOP": "MOP",
  "MUR": "MUR",
  "MVR": "MVR",
  "MWK": "MWK",
  "MXN": "MXN",
  "MYR": "MYR",
  "MZN": "MZN",
  "NAD": "NAD",
  "NGN": "NGN",
  "NIO": "NIO",
  "NOK": "NOK",
  "NPR": "NPR",
  "NZD": "NZD",
  "OMR": "OMR",
  "PEN": "PEN",
  "PGK": "PGK",
  "PHP": "PHP",
  "PKR": "PKR",
  "PLN": "PLN",
  "PYG": "PYG",
  "QAR": "QAR",
  "RON": "RON",
  "RSD": "RSD",
  "RUB": "RUB",
  "RWF": "RWF",
  "SAR": "SAR",
  "SCR": "SCR",
  "SEK": "SEK",
  "SGD": "S$",
  "SLL": "SLL",
  "SOS": "SOS",
  "SVC": "SVC",
  "SZL": "SZL",
  "THB": "THB",
  "TND": "TND",
  "TRY": "TRY",
  "TTD": "TTD",
  "TWD": "TWD",
  "TZS": "TZS",
  "UAH": "UAH",
  "UGX": "UGX",
  "USD": "$",
  "UYU": "UYU",
  "UZS": "UZS",
  "VND": "VND",
  "VUV": "VUV",
  "XAF": "XAF",
  "XCD": "XCD",
  "XOF": "XOF",
  "XPF": "XPF",
  "YER": "YER",
  "ZAR": "ZAR",
  "ZMW": "ZMW"
};

/**
 * Last-resort rates (updated periodically). Prefer live provider fetch in currencyRates.js.
 * Values are INR → foreign: amount_foreign = amount_inr * rateFromInr.
 */
/** Aligned with Wise/Google mid-market (Jun 2026); live fetch uses min across providers. */
const FALLBACK_RATES_FROM_INR = {
  "INR": 1,
  "AED": 0.044,
  "ALL": 1.0,
  "AMD": 1.0,
  "AUD": 0.012,
  "AWG": 1.0,
  "AZN": 1.0,
  "BAM": 1.0,
  "BBD": 1.0,
  "BDT": 1.0,
  "BGN": 1.0,
  "BHD": 1.0,
  "BIF": 1.0,
  "BMD": 1.0,
  "BND": 1.0,
  "BOB": 1.0,
  "BRL": 1.0,
  "BSD": 1.0,
  "BTN": 1.0,
  "BWP": 1.0,
  "BZD": 1.0,
  "CAD": 0.012,
  "CHF": 0.012,
  "CLP": 1.0,
  "CNY": 1.0,
  "COP": 1.0,
  "CRC": 1.0,
  "CUP": 1.0,
  "CVE": 1.0,
  "CZK": 1.0,
  "DJF": 1.0,
  "DKK": 1.0,
  "DOP": 1.0,
  "DZD": 1.0,
  "EGP": 1.0,
  "ETB": 1.0,
  "EUR": 0.011,
  "FJD": 1.0,
  "GBP": 0.011,
  "GHS": 1.0,
  "GIP": 1.0,
  "GMD": 1.0,
  "GNF": 1.0,
  "GTQ": 1.0,
  "GYD": 1.0,
  "HKD": 1.0,
  "HNL": 1.0,
  "HRK": 1.0,
  "HTG": 1.0,
  "HUF": 1.0,
  "IDR": 1.0,
  "ILS": 1.0,
  "IQD": 1.0,
  "ISK": 1.0,
  "JMD": 1.0,
  "JOD": 1.0,
  "JPY": 1.0,
  "KES": 1.0,
  "KGS": 1.0,
  "KHR": 1.0,
  "KMF": 1.0,
  "KRW": 1.0,
  "KWD": 1.0,
  "KYD": 1.0,
  "KZT": 1.0,
  "LAK": 1.0,
  "LKR": 1.0,
  "LRD": 1.0,
  "LSL": 1.0,
  "MAD": 1.0,
  "MDL": 1.0,
  "MGA": 1.0,
  "MKD": 1.0,
  "MMK": 1.0,
  "MNT": 1.0,
  "MOP": 1.0,
  "MUR": 1.0,
  "MVR": 1.0,
  "MWK": 1.0,
  "MXN": 1.0,
  "MYR": 1.0,
  "MZN": 1.0,
  "NAD": 1.0,
  "NGN": 1.0,
  "NIO": 1.0,
  "NOK": 1.0,
  "NPR": 1.0,
  "NZD": 1.0,
  "OMR": 1.0,
  "PEN": 1.0,
  "PGK": 1.0,
  "PHP": 1.0,
  "PKR": 1.0,
  "PLN": 1.0,
  "PYG": 1.0,
  "QAR": 0.044,
  "RON": 1.0,
  "RSD": 1.0,
  "RUB": 1.0,
  "RWF": 1.0,
  "SAR": 0.044,
  "SCR": 1.0,
  "SEK": 1.0,
  "SGD": 0.012,
  "SLL": 1.0,
  "SOS": 1.0,
  "SVC": 1.0,
  "SZL": 1.0,
  "THB": 1.0,
  "TND": 1.0,
  "TRY": 1.0,
  "TTD": 1.0,
  "TWD": 1.0,
  "TZS": 1.0,
  "UAH": 1.0,
  "UGX": 1.0,
  "USD": 0.012,
  "UYU": 1.0,
  "UZS": 1.0,
  "VND": 1.0,
  "VUV": 1.0,
  "XAF": 1.0,
  "XCD": 1.0,
  "XOF": 1.0,
  "XPF": 1.0,
  "YER": 1.0,
  "ZAR": 1.0,
  "ZMW": 1.0
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

  if (code === 'INR' && !cfg.prefixWithCode) {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(amt);
    } catch {
      /* fall through to manual symbol */
    }
  }

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
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(normalizeInrDisplay(inrAmount));
    } catch {
      return `₹${normalizeInrDisplay(inrAmount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }
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

export function getCurrencyFlag(currencyCode) {
  const code = (currencyCode || '').toLowerCase();
  if (code === 'eur') return 'https://flagcdn.com/w40/eu.png';
  if (['xaf', 'xof', 'xpf'].includes(code)) return 'https://flagcdn.com/w40/un.png';
  if (code === 'ang') return 'https://flagcdn.com/w40/an.png';
  return `https://flagcdn.com/w40/${code.slice(0, 2)}.png`;
}

/**
 * Extra fields for purchase/create-order API bodies.
 * When backend is INR-only, send {} so unknown keys do not trigger 500s.
 */
export const BACKEND_ACCEPTS_ORDER_CURRENCY = true;

export function buildOrderCurrencyPayload(selectedCurrency) {
  if (!BACKEND_ACCEPTS_ORDER_CURRENCY) return {};
  const code = (selectedCurrency || DEFAULT_LISTING_CURRENCY).toUpperCase();
  if (code === DEFAULT_LISTING_CURRENCY) return {};
  return { currency: code };
}
