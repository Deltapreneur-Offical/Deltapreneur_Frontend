import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';

const LANGUAGES = [
  { code: 'en-IN', name: 'English (IND)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' },
  { code: 'ur', name: 'Urdu' },
  { code: 'zh', name: '中文' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'de', name: 'Deutsch' },
];

const LANG_SHORT = {
  'en-IN': 'EN',
  hi: 'HI',
  es: 'ES',
  ar: 'AR',
  ur: 'UR',
  zh: 'ZH',
  fr: 'FR',
  pt: 'PT',
  de: 'DE',
};

function languageLabel(i18nLanguage) {
  const normalized = i18nLanguage === 'en' ? 'en-IN' : i18nLanguage;
  const exact = LANGUAGES.find((l) => l.code === normalized);
  if (exact) return exact.name;
  const base = (normalized || '').split('-')[0];
  return LANGUAGES.find((l) => l.code === base)?.name || 'English (IND)';
}

function languageShortCode(i18nLanguage) {
  const normalized = i18nLanguage === 'en' ? 'en-IN' : i18nLanguage;
  if (LANG_SHORT[normalized]) return LANG_SHORT[normalized];
  const base = (normalized || '').split('-')[0];
  return LANG_SHORT[base] || 'EN';
}

function isActiveLanguage(current, code) {
  const normalized = current === 'en' ? 'en-IN' : current;
  return normalized === code;
}

export default function LanguageDropdown({ variant = 'dark', className = '' }) {
  const { t, i18n } = useTranslation();
  const { changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (variant === 'profile-menu') {
    const sectionItemCls = (active) =>
      `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors border-none bg-transparent cursor-pointer ${
        active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
      }`;

    return (
      <div className={`border-b border-gray-100 px-3 py-3 ${className}`.trim()}>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t('language')}
        </p>
        <div className="space-y-0.5" role="listbox" aria-label={t('language')}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={sectionItemCls(isActiveLanguage(i18n.language, lang.code))}
              aria-selected={isActiveLanguage(i18n.language, lang.code)}
              onClick={() => changeLanguage(lang.code)}
            >
              <span className="font-medium tabular-nums">{languageShortCode(lang.code)}</span>
              <span className="text-gray-500">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isDark = variant === 'dark';
  const isMinimal = variant === 'minimal';

  const triggerCls = isMinimal
    ? 'home-nav-util-btn inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-body text-[13px] font-medium tracking-wide text-slate-600 transition-colors duration-300 hover:text-[var(--cobrother-hover-color)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/80 focus-visible:ring-offset-1 rounded-md'
    : isDark
      ? 'text-white text-xs md:text-sm font-normal no-underline flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-1.5 rounded transition-colors duration-200 cursor-pointer bg-transparent border-none font-body hover:bg-white/15 hover:text-gray-200 max-w-[min(100%,11rem)]'
      : 'inline-flex max-w-[min(100%,11rem)] cursor-pointer items-center gap-1.5 rounded-md border border-slate-300/90 bg-white px-3 py-1.5 text-xs font-medium tracking-wide text-slate-700 shadow-sm transition-all duration-300 hover:border-[var(--cobrother-hover-color)] hover:text-[var(--cobrother-hover-color)] hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-200/80';

  const panelCls = isMinimal
    ? 'home-nav-util-panel absolute top-full right-0 z-[1002] mt-1.5 min-w-[9.5rem] overflow-hidden rounded-xl border border-slate-100 bg-white/95 py-1 shadow-[0_12px_40px_rgba(15,23,42,0.1)] backdrop-blur-md'
    : 'absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px] overflow-hidden z-[1002]';

  const isNavUtil = className.includes('home-nav-util-language');
  const itemCls = isMinimal
    ? (active) =>
        `block w-full cursor-pointer border-none bg-transparent px-3.5 py-2 text-left text-[13px] transition-colors ${
          active ? 'bg-slate-50 font-semibold text-[var(--cobrother-hover-color)]' : 'text-slate-600 hover:bg-slate-50/80 hover:text-[var(--cobrother-hover-color)]'
        }`
    : (active) =>
        `w-full px-4 py-2.5 bg-transparent border-none text-left text-sm cursor-pointer transition-colors duration-200 font-body ${
          active ? 'bg-purple-50 text-purple font-semibold' : 'text-gray-700 hover:bg-gray-100'
        }`;

  return (
    <div className={`relative shrink-0 ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className={`${triggerCls}${isNavUtil && !isMinimal ? ' home-nav-util-btn' : ''}`.trim()}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={languageLabel(i18n.language)}
      >
        <Globe
          size={14}
          className={`shrink-0 ${isMinimal ? 'text-slate-400' : 'text-slate-500 md:h-3.5 md:w-3.5'}`}
          strokeWidth={1.75}
        />
        {isMinimal ? (
          <span className="home-nav-language-compact tabular-nums">{languageShortCode(i18n.language)}</span>
        ) : (
          <span className="home-nav-language-label truncate">{languageLabel(i18n.language)}</span>
        )}
        {!isMinimal ? <ChevronDown size={13} className="shrink-0 text-slate-500" strokeWidth={2} /> : null}
      </button>
      {open && (
        <div className={panelCls} role="listbox">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={itemCls(isActiveLanguage(i18n.language, lang.code))}
              aria-selected={isActiveLanguage(i18n.language, lang.code)}
              onClick={() => {
                changeLanguage(lang.code);
                setOpen(false);
              }}
            >
              {isMinimal ? (
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium tabular-nums">{languageShortCode(lang.code)}</span>
                  <span className="text-slate-500">{lang.name}</span>
                </span>
              ) : (
                lang.name
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
