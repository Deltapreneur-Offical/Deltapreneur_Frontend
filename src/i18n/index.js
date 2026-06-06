import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  buildInitialResources,
  lazyLocaleLoaders,
  withEnglishFallback,
} from './buildResources';
import {
  DEFAULT_LANGUAGE,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  normalizeLanguage,
  supportedLanguages,
} from './languageUtils';

const loadingPromises = new Map();

/** Load a language bundle on demand and register it with i18next. */
export async function ensureLanguageLoaded(langCode) {
  const normalized = normalizeLanguage(langCode);

  if (i18n.hasResourceBundle(normalized, 'translation')) {
    return normalized;
  }

  const loader = lazyLocaleLoaders[normalized];
  if (!loader) return DEFAULT_LANGUAGE;

  if (!loadingPromises.has(normalized)) {
    loadingPromises.set(
      normalized,
      loader().then((mod) => {
        const raw = mod.default || mod;
        const bundle =
          normalized === DEFAULT_LANGUAGE ? raw : withEnglishFallback(raw);
        i18n.addResourceBundle(normalized, 'translation', bundle, true, true);
        return normalized;
      }),
    );
  }

  await loadingPromises.get(normalized);
  return normalized;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: buildInitialResources(),
    supportedLngs: supportedLanguages,
    fallbackLng: DEFAULT_LANGUAGE,
    fallbackNS: false,
    lng: DEFAULT_LANGUAGE,

    load: 'currentOnly',
    nonExplicitSupportedLngs: false,

    debug: false,

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    returnEmptyString: false,
    returnNull: false,

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
      convertDetectedLanguage: (lng) => {
        if (lng === 'en') return DEFAULT_LANGUAGE;
        return normalizeLanguage(lng);
      },
    },
  });

if (typeof window !== 'undefined') {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  const current = localStorage.getItem(STORAGE_KEY);
  if (!current && legacy) {
    const migrated = normalizeLanguage(legacy);
    localStorage.setItem(STORAGE_KEY, migrated);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

export default i18n;
