/** Checkout + navbar supported currencies (must match backend). */
export const SUPPORTED_CURRENCIES = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD',
];

/** Shared with TopNavbar and listing price fields */
export const CURRENCY_LABELS = {
  INR: '₹ INR',
  USD: '$ USD',
  EUR: '€ EUR',
  GBP: '£ GBP',
  AED: 'AED',
  SGD: 'S$ SGD',
  AUD: 'A$ AUD',
  CAD: 'C$ CAD',
};

export const DEFAULT_LISTING_CURRENCY = 'INR';

/**
 * Display formatting per currency (locale + symbol rules).
 * Add new currencies here only — business logic stays unchanged.
 */
export const CURRENCY_FORMAT = {
  INR: { locale: 'en-IN', symbol: '₹', prefixWithCode: false },
  USD: { locale: 'en-US', symbol: '$', prefixWithCode: false },
  EUR: { locale: 'de-DE', symbol: '€', prefixWithCode: false },
  GBP: { locale: 'en-GB', symbol: '£', prefixWithCode: false },
  AED: { locale: 'en-AE', symbol: 'د.إ', prefixWithCode: true, code: 'AED' },
  SGD: { locale: 'en-SG', symbol: 'S$', prefixWithCode: false },
  AUD: { locale: 'en-AU', symbol: 'A$', prefixWithCode: false },
  CAD: { locale: 'en-CA', symbol: 'C$', prefixWithCode: false },
};

/** Client-side cache duration for exchange rates (30 minutes). */
export const EXCHANGE_RATE_CACHE_TTL_MS = 30 * 60 * 1000;
