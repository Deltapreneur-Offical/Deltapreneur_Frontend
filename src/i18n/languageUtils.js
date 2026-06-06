/** Supported UI language codes (must match LanguageDropdown + locale files). */
export const supportedLanguages = [
  'en-IN',
  'hi',
  'en-US',
  'en-GB',
  'ur',
  'zh',
  'fr',
  'pt',
  'de',
];

export const STORAGE_KEY = 'cobrother_language';
export const LEGACY_STORAGE_KEY = 'selectedLanguage';
export const DEFAULT_LANGUAGE = 'en-IN';

/** Map stored / detected codes to a supported i18n language tag. */
export function normalizeLanguage(code) {
  if (!code || typeof code !== 'string') return DEFAULT_LANGUAGE;

  const trimmed = code.trim();
  if (trimmed === 'en') return DEFAULT_LANGUAGE;
  if (supportedLanguages.includes(trimmed)) return trimmed;

  const base = trimmed.split('-')[0];
  if (base === 'en' && trimmed.length === 2) return DEFAULT_LANGUAGE;
  if (supportedLanguages.includes(base)) return base;

  return DEFAULT_LANGUAGE;
}

export function applyDocumentLanguage(lang) {
  if (typeof document === 'undefined') return;

  const normalized = normalizeLanguage(lang);
  const base = normalized.split('-')[0];

  document.documentElement.lang = normalized;
  document.documentElement.dir = base === 'ur' ? 'rtl' : 'ltr';
}

export function readStoredLanguage() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(STORAGE_KEY)
    || localStorage.getItem(LEGACY_STORAGE_KEY)
  );
}

export function saveLanguageToStorage(lang) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, normalized);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
