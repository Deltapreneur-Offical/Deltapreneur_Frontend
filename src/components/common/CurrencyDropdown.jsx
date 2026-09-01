import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { CURRENCY_LABELS, NAVBAR_PINNED_CURRENCIES, orderNavbarCurrencies } from '../../constants/currencies';
import { getCurrencySymbol, getCurrencyFlag } from '../../utils/currencyDisplay';
import { languageForCurrency } from '../../utils/languageCurrencyMap';

/**
 * Shared currency selector (TopNavbar dark bar + AppLayout light).
 */
const CURRENCY_SHORT = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
};

export default function CurrencyDropdown({ variant = 'dark', className = '' }) {
  const { currency, setCurrency, supportedCurrencies } = useCurrency();
  const { changeLanguage, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const selectCurrency = useCallback((code) => {
    setCurrency(code);
    const nextLang = languageForCurrency(code, language);
    if (nextLang) changeLanguage(nextLang);
  }, [setCurrency, changeLanguage, language]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = Math.min(224, window.innerWidth - 16);
    const panelHeight = Math.min(240, window.innerHeight - 16);
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

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onOutside = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
      setSearchQuery('');
    };
    const onReposition = () => updatePosition();
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  if (variant === 'profile-menu') {
    const orderedProfileCurrencies = orderNavbarCurrencies(supportedCurrencies);
    const pinnedCount = NAVBAR_PINNED_CURRENCIES.filter((code) => orderedProfileCurrencies.includes(code)).length;
    const sectionItemCls = (active) =>
      `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors border-none bg-transparent cursor-pointer ${
        active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
      }`;

    return (
      <div className={`px-3 py-3 ${className}`.trim()}>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Currency
        </p>
        <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1" role="listbox" aria-label="Currency">
          {orderedProfileCurrencies.map((code, index) => (
            <Fragment key={code}>
              <button
                type="button"
                className={sectionItemCls(currency === code)}
                aria-selected={currency === code}
                onClick={() => selectCurrency(code)}
              >
                <span className="font-medium tabular-nums">
                  {CURRENCY_SHORT[code] || ''} {code}
                </span>
                <span className="truncate text-gray-500">{CURRENCY_LABELS[code] || code}</span>
              </button>
              {index === pinnedCount - 1 && index < orderedProfileCurrencies.length - 1 ? (
                <div className="my-1 border-t border-gray-100" aria-hidden="true" />
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  const isDark = variant === 'dark';
  const isMinimal = variant === 'minimal';

  const triggerCls = isMinimal
    ? 'home-nav-util-btn inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-body text-[13px] font-medium tracking-wide text-slate-600 transition-colors duration-300 hover:text-[var(--cobrother-hover-color)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/80 focus-visible:ring-offset-1 rounded-md'
    : isDark
      ? 'text-white text-xs md:text-sm font-normal no-underline flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-1.5 rounded transition-colors duration-200 cursor-pointer bg-transparent border-none font-body hover:bg-white/15 hover:text-gray-200'
      : 'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300/90 bg-white px-3 py-1.5 text-xs font-medium tracking-wide text-slate-700 shadow-sm transition-all duration-300 hover:border-[var(--cobrother-hover-color)] hover:text-[var(--cobrother-hover-color)] hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-200/80';

  const filteredCurrencies = supportedCurrencies.filter((code) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const label = (CURRENCY_LABELS[code] || '').toLowerCase();
    return code.toLowerCase().includes(term) || label.includes(term);
  });
  const orderedCurrencies = orderNavbarCurrencies(filteredCurrencies);
  const pinnedVisibleCount = NAVBAR_PINNED_CURRENCIES.filter((code) => orderedCurrencies.includes(code)).length;
  const showPinnedDivider = !searchQuery.trim() && pinnedVisibleCount > 0 && pinnedVisibleCount < orderedCurrencies.length;

  const fullLabel = CURRENCY_LABELS[currency] || currency;
  const shortLabel = CURRENCY_SHORT[currency] || currency;
  const isNavUtil = className.includes('home-nav-util-currency');

  const itemCls = (active) =>
    `flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs cursor-pointer transition-colors border-none ${
      active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-transparent text-gray-700 hover:bg-gray-50'
    }`;

  const panel = open && coords
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[10050] flex w-56 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
          }}
          role="listbox"
        >
          <div className="border-b border-gray-100 bg-gray-50 p-2">
            <input
              type="text"
              placeholder="Search currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-indigo-500"
              autoFocus
            />
          </div>
          <div className="max-h-60 space-y-0.5 overflow-y-auto p-1">
            {orderedCurrencies.map((code, index) => {
              const flag = getCurrencyFlag(code);
              const symbol = getCurrencySymbol(code);
              const label = CURRENCY_LABELS[code] || code;
              const cleanLabel = label.includes(symbol) ? label.replace(symbol, '').trim() : label;
              return (
                <Fragment key={code}>
                  <button
                    type="button"
                    aria-selected={currency === code}
                    onClick={() => {
                      selectCurrency(code);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className={itemCls(currency === code)}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <img src={flag} alt="" className="h-3.5 w-5 shrink-0 rounded-[3px] border border-gray-200/60 object-cover shadow-sm" />
                      <span className="min-w-0">
                        <span className="block font-medium leading-tight text-gray-900">{code}</span>
                        <span className="mt-0.5 block truncate text-[10px] leading-tight text-gray-400">{cleanLabel}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-gray-500">{symbol}</span>
                  </button>
                  {showPinnedDivider && index === pinnedVisibleCount - 1 ? (
                    <div className="my-1 border-t border-gray-100" aria-hidden="true" />
                  ) : null}
                </Fragment>
              );
            })}
            {orderedCurrencies.length === 0 && (
              <div className="py-4 text-center text-xs text-gray-400">No results found</div>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`relative shrink-0 ${className}`.trim()} ref={triggerRef}>
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            setSearchQuery('');
            return;
          }
          updatePosition();
          setOpen(true);
        }}
        className={`${triggerCls}${isNavUtil && !isMinimal ? ' home-nav-util-btn' : ''}`.trim()}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={fullLabel}
      >
        {isMinimal ? (
          <span className="home-nav-currency-compact inline-flex items-center gap-1 tabular-nums">
            <span className="text-slate-500">{shortLabel}</span>
            <span>{currency}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 truncate">
            <img src={getCurrencyFlag(currency)} alt="" className="h-3.5 w-5 shrink-0 rounded-[3px] border border-gray-200/60 object-cover shadow-sm" />
            <span className="home-nav-currency-label home-nav-currency-label--full truncate">{fullLabel}</span>
            <span className="home-nav-currency-label home-nav-currency-label--short truncate">{shortLabel}</span>
          </span>
        )}
        <ChevronDown size={isMinimal ? 12 : 13} className="home-nav-util-chevron shrink-0 text-slate-400" strokeWidth={2} />
      </button>
      {panel}
    </div>
  );
}
