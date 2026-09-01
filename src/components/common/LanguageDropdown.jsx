import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { currencyForLanguage } from '../../utils/languageCurrencyMap';

const LANGUAGES = [
  { code: 'en-IN', name: 'English' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'ur', name: 'Urdu' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'hi', name: 'Hindi' },
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
  return LANGUAGES.find((l) => l.code === base)?.name || 'English';
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
  const { setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = 168;
    const panelHeight = Math.min(192, window.innerHeight - 16);
    let left = rect.right - panelWidth;
    if (left < 8) left = 8;
    if (left + panelWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - panelWidth - 8);
    }
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < panelHeight && spaceAbove > spaceBelow;
    setCoords({
      top: openUp ? Math.max(8, rect.top - panelHeight - 6) : rect.bottom + 6,
      left,
      width: panelWidth,
      maxHeight: openUp ? Math.min(panelHeight, spaceAbove - 6) : Math.min(panelHeight, spaceBelow - 6),
    });
  }, []);

  const selectLanguage = useCallback((code) => {
    changeLanguage(code);
    const nextCurrency = currencyForLanguage(code);
    if (nextCurrency) setCurrency(nextCurrency);
  }, [changeLanguage, setCurrency]);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

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
        <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1" role="listbox" aria-label={t('language')}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={sectionItemCls(isActiveLanguage(i18n.language, lang.code))}
              aria-selected={isActiveLanguage(i18n.language, lang.code)}
              onClick={() => selectLanguage(lang.code)}
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

  const isNavUtil = className.includes('home-nav-util-language');
  const itemCls = isMinimal
    ? (active) =>
        `block w-full cursor-pointer border-none bg-transparent px-3.5 py-2 text-left text-[13px] transition-colors ${
          active ? 'bg-slate-50 font-semibold text-[var(--cobrother-hover-color)]' : 'text-slate-600 hover:bg-slate-50/80 hover:text-[var(--cobrother-hover-color)]'
        }`
    : (active) =>
        `w-full px-4 py-2.5 bg-transparent border-none text-left text-sm cursor-pointer transition-colors duration-200 font-body ${
          active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
        }`;

  const panel = open && coords
    ? createPortal(
        <div
          ref={panelRef}
          className={`home-nav-util-panel fixed z-[10050] overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)] ${
            isMinimal ? 'backdrop-blur-md bg-white/95' : ''
          }`}
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
          }}
          role="listbox"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={itemCls(isActiveLanguage(i18n.language, lang.code))}
              aria-selected={isActiveLanguage(i18n.language, lang.code)}
              onClick={() => {
                selectLanguage(lang.code);
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
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`relative shrink-0 ${className}`.trim()} ref={triggerRef}>
      <button
        type="button"
        className={`${triggerCls}${isNavUtil && !isMinimal ? ' home-nav-util-btn' : ''}`.trim()}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          updatePosition();
          setOpen(true);
        }}
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
        <ChevronDown size={isMinimal ? 12 : 13} className="home-nav-util-chevron shrink-0 text-slate-400" strokeWidth={2} />
      </button>
      {panel}
    </div>
  );
}
