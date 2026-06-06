import enIN from './locales/en-IN.json';
import { DEFAULT_LANGUAGE } from './languageUtils';

/** Merge English-India keys so partial locale files still translate the full UI. */
export function withEnglishFallback(locale) {
  return { ...enIN, ...locale };
}

/** Only the default language is bundled synchronously for fast first paint. */
export function buildInitialResources() {
  return {
    [DEFAULT_LANGUAGE]: { translation: enIN },
  };
}

/** Dynamic imports — other languages load on first selection. */
export const lazyLocaleLoaders = {
  'en-IN': () => Promise.resolve({ default: enIN }),
  hi: () => import('./locales/hi.json'),
  'en-GB': () => import('./locales/en-GB.json'),
  'en-US': () => import('./locales/en-US.json'),
  ur: () => import('./locales/ur.json'),
  zh: () => import('./locales/zh.json'),
  fr: () => import('./locales/fr.json'),
  pt: () => import('./locales/pt.json'),
  de: () => import('./locales/de.json'),
};

export { DEFAULT_LANGUAGE as defaultLanguage };
