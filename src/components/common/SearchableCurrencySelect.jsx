import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_LABELS } from '../../constants/currencies';
import { getCurrencySymbol, getCurrencyFlag } from '../../utils/currencyDisplay';

export default function SearchableCurrencySelect({
  value,
  onChange,
  className = '',
  wrapperClassName = '',
  iconClassName = 'text-gray-500',
  disabled = false,
  style,
  showFlag = false,
}) {
  const { supportedCurrencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const selectedSymbol = getCurrencySymbol(value);
  const selectedFlag = getCurrencyFlag(value);

  const filteredCurrencies = supportedCurrencies.filter((code) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const label = (CURRENCY_LABELS[code] || '').toLowerCase();
    return code.toLowerCase().includes(term) || label.includes(term);
  });

  const handleSelect = (code) => {
    if (onChange) {
      onChange(code);
    }
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative ${wrapperClassName}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={style}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {showFlag && (
            <img src={selectedFlag} alt="" className="w-5 h-3.5 object-cover rounded-[3px] shrink-0 border border-gray-200/60 shadow-sm mr-0.5" />
          )}
          <span className="font-semibold tabular-nums">{value}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 ${iconClassName}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-[2000] flex flex-col">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              placeholder="Search currency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
            {filteredCurrencies.map((code) => {
              const flag = getCurrencyFlag(code);
              const symbol = getCurrencySymbol(code);
              const label = CURRENCY_LABELS[code] || code;
              const cleanLabel = label.includes(symbol) ? label.replace(symbol, '').trim() : label;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelect(code)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors border-none cursor-pointer ${
                    value === code ? 'bg-indigo-50 font-semibold text-indigo-800' : 'bg-transparent text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {showFlag && (
                      <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-[3px] shrink-0 border border-gray-200/60 shadow-sm" />
                    )}
                    <div className="min-w-0">
                      <span className="block font-medium text-gray-900 leading-tight">{code}</span>
                      <span className="block text-[10px] text-gray-400 truncate leading-tight mt-0.5">{cleanLabel}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 shrink-0">{symbol}</span>
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
