import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_LABELS } from '../../constants/currencies';
import { getCurrencySymbol, getCurrencyFlag } from '../../utils/currencyDisplay';

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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  if (variant === 'profile-menu') {
    const sectionItemCls = (active) =>
      `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors border-none bg-transparent cursor-pointer ${
        active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
      }`;

    return (
      <div className={`px-3 py-3 ${className}`.trim()}>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Currency
        </p>
        <div className="space-y-0.5" role="listbox" aria-label="Currency">
          {supportedCurrencies.map((code) => (
            <button
              key={code}
              type="button"
              className={sectionItemCls(currency === code)}
              aria-selected={currency === code}
              onClick={() => setCurrency(code)}
            >
              <span className="font-medium tabular-nums">
                {CURRENCY_SHORT[code] || ''} {code}
              </span>
              <span className="truncate text-gray-500">{CURRENCY_LABELS[code] || code}</span>
            </button>
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

  const panelCls = 'absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg w-64 overflow-hidden z-[2000] flex flex-col';

  const fullLabel = CURRENCY_LABELS[currency] || currency;
  const shortLabel = CURRENCY_SHORT[currency] || currency;
  const isNavUtil = className.includes('home-nav-util-currency');

  const itemCls = (active) =>
    `flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs cursor-pointer transition-colors border-none ${
      active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-transparent text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <div className={`relative shrink-0 ${className}`.trim()} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
            <img src={getCurrencyFlag(currency)} alt="" className="w-5 h-3.5 object-cover rounded-[3px] shrink-0 border border-gray-200/60 shadow-sm" />
            <span className="home-nav-currency-label home-nav-currency-label--full truncate">{fullLabel}</span>
            <span className="home-nav-currency-label home-nav-currency-label--short truncate">{shortLabel}</span>
            <ChevronDown size={13} className="shrink-0 text-slate-400" strokeWidth={2} />
          </span>
        )}
      </button>
      {open && (
        <div className={panelCls} role="listbox">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              placeholder="Search currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
            {filteredCurrencies.map((code) => {
              const flag = getCurrencyFlag(code);
              const symbol = getCurrencySymbol(code);
              const label = CURRENCY_LABELS[code] || code;
              const cleanLabel = label.includes(symbol) ? label.replace(symbol, '').trim() : label;
              return (
                <button
                  type="button"
                  key={code}
                  aria-selected={currency === code}
                  onClick={() => {
                    setCurrency(code);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className={itemCls(currency === code)}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-[3px] shrink-0 border border-gray-200/60 shadow-sm" />
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900 leading-tight">{code}</span>
                      <span className="block text-[10px] text-gray-400 truncate leading-tight mt-0.5">{cleanLabel}</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-gray-500 shrink-0">{symbol}</span>
                </button>
              );
            })}
            {filteredCurrencies.length === 0 && (
              <div className="text-center py-4 text-xs text-gray-400">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
