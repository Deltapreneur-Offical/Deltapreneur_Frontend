import { DEFAULT_LANGUAGE, normalizeLanguage } from '../i18n/languageUtils';

/** Default display currency for each supported UI language. */
const LANGUAGE_TO_CURRENCY = {
  'en-IN': 'INR',
  hi: 'INR',
  ur: 'PKR',
  ar: 'AED',
  zh: 'CNY',
  es: 'EUR',
  fr: 'EUR',
  pt: 'EUR',
  de: 'EUR',
};

const INR_LANGUAGES = new Set(['en-IN', 'hi']);
const EUR_LANGUAGES = new Set(['es', 'fr', 'pt', 'de']);

export function currencyForLanguage(langCode) {
  const lang = normalizeLanguage(langCode);
  return LANGUAGE_TO_CURRENCY[lang] || null;
}

/**
 * Canonical language for a currency, or null if language should not change.
 * USD and unmapped codes return null to avoid INR <-> English loops.
 */
export function languageForCurrency(currencyCode, currentLang) {
  const code = String(currencyCode || '').toUpperCase();
  const current = normalizeLanguage(currentLang);

  if (code === 'INR') {
    return INR_LANGUAGES.has(current) ? null : DEFAULT_LANGUAGE;
  }
  if (code === 'CNY') return current === 'zh' ? null : 'zh';
  if (code === 'PKR') return current === 'ur' ? null : 'ur';
  if (code === 'AED') return current === 'ar' ? null : 'ar';
  if (code === 'EUR') return EUR_LANGUAGES.has(current) ? null : 'fr';
  return null;
}
