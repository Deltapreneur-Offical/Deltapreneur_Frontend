import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCurrency from '../../context/CurrencyContext';

export default function FilterBar({
  search, onSearch,
  category, onCategory, categoryOptions = [],
  technologyType, onTechnologyType,
  minPrice, maxPrice, onMinPrice, onMaxPrice,
  sortBy, onSort, sortOptions,
  onClear, activeFilterCount = 0,
  placeholder,
  priceSymbol = '₹',
  theme = 'dark',
}) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(search || '');
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(searchInput), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, onSearch]);

  useEffect(() => { if (!search) setSearchInput(''); }, [search]);

  const { getSymbol, formatPrice } = useCurrency();
  const displaySymbol = priceSymbol === '₹' ? getSymbol() : priceSymbol;

  const defaultSortOptions = useMemo(
    () => [
      { value: 'newest', label: t('sortNewestFirst') },
      { value: 'oldest', label: t('sortOldestFirst') },
      { value: 'price_asc', label: t('sortPriceLowHigh') },
      { value: 'price_desc', label: t('sortPriceHighLow') },
      { value: 'most_liked', label: t('sortMostLiked') },
      { value: 'most_viewed', label: t('sortMostViewed') },
    ],
    [t],
  );

  const sorts = sortOptions || defaultSortOptions;
  const showPrice = onMinPrice !== undefined && onMinPrice !== null;
  const isLight = theme === 'light';
  const searchPlaceholder = placeholder || t('filterSearchPlaceholder');

  const selectClass = `w-full pl-2.5 md:pl-3 pr-9 py-1.5 md:py-2 text-sm md:text-base rounded-[8px] md:rounded-[10px] border outline-none transition-all cursor-pointer appearance-none ${
    isLight
      ? 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
      : 'bg-bg-input border-border-dark text-text focus:border-gold'
  }`;

  return (
    <div className={`rounded-[14px] p-3 md:p-4 px-3 md:px-5 mb-4 md:mb-6 flex flex-col gap-2.5 md:gap-3.5 ${
      isLight
        ? 'bg-white border border-gray-200 shadow-sm'
        : 'bg-white/[0.03] border border-white/[0.08]'
    }`}>
      <div className="flex gap-2 md:gap-3 flex-wrap">
        <div className="flex-[1_1_200px] md:flex-[1_1_220px] relative">
          <span className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-700 inline-flex items-center justify-center pointer-events-none">
            <Search size={14} strokeWidth={2.4} className="md:w-[15px] md:h-[15px]" />
          </span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className={`pl-8 md:pl-9 w-full px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base rounded-[8px] md:rounded-[10px] border outline-none transition-all ${
              isLight
                ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
                : 'bg-bg-input border-border-dark text-text placeholder:text-text-faint focus:border-gold'
            }`}
          />
        </div>

        <div className="relative flex-[0_1_140px] md:flex-[0_1_180px] min-w-[120px]">
          <select
            value={sortBy}
            onChange={(e) => onSort(e.target.value)}
            aria-label={sorts.find((s) => s.value === sortBy)?.label ?? t('sortNewestFirst')}
            className={`filter-sort-select ${selectClass}`}
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown
            size={16}
            strokeWidth={2.25}
            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
            aria-hidden
          />
        </div>
      </div>

      <div className="flex gap-2 md:gap-3 flex-wrap items-center">
        {categoryOptions.length > 0 && (
          <div className="relative flex-[1_1_140px] md:flex-[1_1_160px] min-w-[120px]">
            <select
              value={category}
              onChange={(e) => onCategory(e.target.value)}
              aria-label={t('filterAllCategories')}
              className={`filter-category-select ${selectClass}`}
            >
              <option value="">{t('filterAllCategories')}</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown
              size={16}
              strokeWidth={2.25}
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
              aria-hidden
            />
          </div>
        )}

        {onTechnologyType && (
          <div className="relative flex-[1_1_140px] md:flex-[1_1_160px] min-w-[120px]">
            <select
              value={technologyType || ''}
              onChange={(e) => onTechnologyType(e.target.value)}
              aria-label="Technology Type"
              className={`filter-category-select ${selectClass}`}
            >
              <option value="">All Types</option>
              <option value="SOFTWARE">Software</option>
              <option value="HARDWARE">Hardware</option>
            </select>
            <ChevronDown
              size={16}
              strokeWidth={2.25}
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}
              aria-hidden
            />
          </div>
        )}

        {showPrice && (
          <div className="flex gap-2 items-center flex-[1_1_200px] md:flex-[1_1_220px]">
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => onMinPrice(e.target.value)}
              placeholder={`${t('filterMin')} ${displaySymbol}`}
              className={`w-[75px] md:w-[90px] px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base rounded-[8px] md:rounded-[10px] border outline-none transition-all ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
                  : 'bg-bg-input border-border-dark text-text placeholder:text-text-faint focus:border-gold'
              }`}
            />
            <span className={`text-[0.75rem] md:text-[0.8rem] ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>—</span>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => onMaxPrice(e.target.value)}
              placeholder={`${t('filterMax')} ${displaySymbol}`}
              className={`w-[75px] md:w-[90px] px-2.5 md:px-3 py-1.5 md:py-2 text-sm md:text-base rounded-[8px] md:rounded-[10px] border outline-none transition-all ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
                  : 'bg-bg-input border-border-dark text-text placeholder:text-text-faint focus:border-gold'
              }`}
            />
          </div>
        )}

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="bg-red-500/10 border border-red-500/25 rounded-lg px-2.5 md:px-3.5 py-1 md:py-1.5 text-[#c86e6e] text-xs md:text-[0.8rem] cursor-pointer flex items-center gap-1 md:gap-1.5 whitespace-nowrap hover:bg-red-500/20 transition-colors"
          >
            ✕ {t('filterClear')}
            <span className="bg-[#c86e6e] text-white rounded-full w-[16px] h-[16px] md:w-[18px] md:h-[18px] text-[0.65rem] md:text-[0.68rem] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {searchInput && (
            <Chip label={`"${searchInput}"`} onRemove={() => { setSearchInput(''); onSearch(''); }} light={isLight} />
          )}
          {category && (
            <Chip label={category.replace(/_/g, ' ')} onRemove={() => onCategory('')} light={isLight} />
          )}
          {technologyType && (
            <Chip label={technologyType === 'HARDWARE' ? 'Hardware' : 'Software'} onRemove={() => onTechnologyType('')} light={isLight} />
          )}
          {minPrice && (
            <Chip label={`${t('filterMin')} ${formatPrice(minPrice)}`} onRemove={() => onMinPrice('')} light={isLight} />
          )}
          {maxPrice && (
            <Chip label={`${t('filterMax')} ${formatPrice(maxPrice)}`} onRemove={() => onMaxPrice('')} light={isLight} />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove, light }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] text-[0.72rem] border ${
      light
        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
        : 'bg-gold/12 border-gold/25 text-gold'
    }`}>
      {label}
      <span onClick={onRemove} className="cursor-pointer opacity-70 leading-none hover:opacity-100">✕</span>
    </span>
  );
}
