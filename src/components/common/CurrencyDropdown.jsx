import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_LABELS } from '../../constants/currencies';

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
  const ref = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const isDark = variant === 'dark';
  const isMinimal = variant === 'minimal';

  const triggerCls = isMinimal
    ? 'home-nav-util-btn inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-body text-[13px] font-medium tracking-wide text-slate-600 transition-colors duration-300 hover:text-[var(--cobrother-hover-color)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/80 focus-visible:ring-offset-1 rounded-md'
    : isDark
      ? 'text-white text-xs md:text-sm font-normal no-underline flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-1.5 rounded transition-colors duration-200 cursor-pointer bg-transparent border-none font-body hover:bg-white/15 hover:text-gray-200'
      : 'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300/90 bg-white px-3 py-1.5 text-xs font-medium tracking-wide text-slate-700 shadow-sm transition-all duration-300 hover:border-[var(--cobrother-hover-color)] hover:text-[var(--cobrother-hover-color)] hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-200/80';

  const panelCls = isMinimal
    ? 'home-nav-util-panel absolute top-full right-0 z-[1002] mt-1.5 min-w-[8.5rem] overflow-hidden rounded-xl border border-slate-100 bg-white/95 py-1 shadow-[0_12px_40px_rgba(15,23,42,0.1)] backdrop-blur-md'
    : isDark
      ? 'absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[140px] overflow-hidden z-[1001]'
      : 'absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[140px] overflow-hidden z-[1002]';

  const fullLabel = CURRENCY_LABELS[currency] || currency;
  const shortLabel = CURRENCY_SHORT[currency] || currency;
  const isNavUtil = className.includes('home-nav-util-currency');

  const itemCls = (active) =>
    isMinimal
      ? `block w-full cursor-pointer border-none bg-transparent px-3.5 py-2 text-left text-[13px] transition-colors ${
          active ? 'bg-slate-50 font-semibold text-[var(--cobrother-hover-color)]' : 'text-slate-600 hover:bg-slate-50/80 hover:text-[var(--cobrother-hover-color)]'
        }`
      : `block w-full px-4 py-2.5 text-left text-sm cursor-pointer transition-colors ${
          active ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
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
          <>
            <span className="home-nav-currency-label home-nav-currency-label--full truncate">{fullLabel}</span>
            <span className="home-nav-currency-label home-nav-currency-label--short truncate">{shortLabel}</span>
            <ChevronDown size={13} className="shrink-0 text-slate-500" strokeWidth={2} />
          </>
        )}
      </button>
      {open && (
        <div className={panelCls} role="listbox">
          {supportedCurrencies.map((code) => (
            <button
              type="button"
              key={code}
              aria-selected={currency === code}
              onClick={() => {
                setCurrency(code);
                setOpen(false);
              }}
              className={itemCls(currency === code)}
            >
              {isMinimal ? (
                <span className="flex items-center justify-between gap-3 tabular-nums">
                  <span className="font-medium">
                    {CURRENCY_SHORT[code] || ''} {code}
                  </span>
                  <span className="truncate text-slate-500">{CURRENCY_LABELS[code] || code}</span>
                </span>
              ) : (
                CURRENCY_LABELS[code] || code
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
