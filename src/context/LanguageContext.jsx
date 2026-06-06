import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n, { ensureLanguageLoaded } from '../i18n/index';
import {
  applyDocumentLanguage,
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  readStoredLanguage,
  saveLanguageToStorage,
  supportedLanguages,
} from '../i18n/languageUtils';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export function getCurrentLanguage() {
  return normalizeLanguage(readStoredLanguage() || i18n.language || DEFAULT_LANGUAGE);
}

export function saveLanguage(langCode) {
  const normalized = normalizeLanguage(langCode);
  saveLanguageToStorage(normalized);
  return normalized;
}

export async function restoreLanguage() {
  const target = normalizeLanguage(readStoredLanguage() || DEFAULT_LANGUAGE);
  await ensureLanguageLoaded(target);
  applyDocumentLanguage(target);
  if (i18n.language !== target) {
    await i18n.changeLanguage(target);
  }
  return target;
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => getCurrentLanguage());
  const [ready, setReady] = useState(false);

  const syncLanguage = useCallback(async (langCode) => {
    const normalized = normalizeLanguage(langCode);
    if (!supportedLanguages.includes(normalized)) return normalized;

    await ensureLanguageLoaded(normalized);
    saveLanguageToStorage(normalized);
    applyDocumentLanguage(normalized);
    setLanguage(normalized);

    if (i18n.language !== normalized) {
      await i18n.changeLanguage(normalized);
    }

    return normalized;
  }, []);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        const restored = await restoreLanguage();
        if (active) {
          setLanguage(restored);
          setReady(true);
        }
      } catch {
        if (active) setReady(true);
      }
    };

    if (i18n.isInitialized) {
      void boot();
    } else {
      i18n.on('initialized', boot);
    }

    return () => {
      active = false;
      i18n.off('initialized', boot);
    };
  }, []);

  useEffect(() => {
    const handleLanguageChange = (lng) => {
      const normalized = normalizeLanguage(lng);
      setLanguage(normalized);
      applyDocumentLanguage(normalized);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const changeLanguage = useCallback(
    async (langCode) => {
      await syncLanguage(langCode);
    },
    [syncLanguage],
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        ready,
        changeLanguage,
        getCurrentLanguage,
        saveLanguage,
        restoreLanguage,
        supportedLanguages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
