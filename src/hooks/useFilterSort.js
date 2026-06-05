import { useState, useMemo, useCallback, useEffect } from 'react';
import { asArray } from '../utils/asArray';

/**
 * Universal filter/sort/paginate hook.
 * @param {Array}  items        - full unfiltered array
 * @param {Object} filterConfig - { searchFields, priceField, categoryField, dateField }
 * @param {number} pageSize     - items per page (default 20)
 */
function resolveLikeCount(item, getLikeCount) {
  if (getLikeCount) {
    const resolved = getLikeCount(item);
    if (typeof resolved === 'number') return resolved;
    if (resolved && typeof resolved.count === 'number') return resolved.count;
  }
  return Number(item?.likeCount ?? item?.like_count ?? 0);
}

function resolveViews(item) {
  return Number(item?.views ?? item?.view_count ?? item?.viewCount ?? 0);
}

function resolvePrice(item, priceField, get) {
  if (!priceField) return 0;
  const val = get(item, priceField);
  if (val != null && val !== '') return Number(val) || 0;
  if (priceField === 'brandDetails.dealValue') {
    const snake = get(item, 'brand_details.deal_value');
    if (snake != null && snake !== '') return Number(snake) || 0;
  }
  return Number(item?.price ?? item?.askingPrice ?? item?.asking_price ?? 0) || 0;
}

export function useFilterSort(items = [], filterConfig = {}, pageSize = 20, options = {}) {
  const { getLikeCount, resetPageWhen } = options;
  const safeItems = asArray(items);
  const {
    searchFields = [],
    priceField   = null,
    categoryField = null,
    dateField    = 'createdAt',
  } = filterConfig;

  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('');
  const [minPrice,    setMinPrice]    = useState('');
  const [maxPrice,    setMaxPrice]    = useState('');
  const [sortBy,      setSortBy]      = useState('newest');
  const [page,        setPage]        = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetPageWhen]);

  const resetPage = useCallback(() => setPage(1), []);

  const handleSearch   = useCallback(v => { setSearch(v);   resetPage(); }, [resetPage]);
  const handleCategory = useCallback(v => { setCategory(v); resetPage(); }, [resetPage]);
  const handleMinPrice = useCallback(v => { setMinPrice(v); resetPage(); }, [resetPage]);
  const handleMaxPrice = useCallback(v => { setMaxPrice(v); resetPage(); }, [resetPage]);
  const handleSort     = useCallback(v => { setSortBy(v);   resetPage(); }, [resetPage]);

  const clearAll = useCallback(() => {
    setSearch(''); setCategory('');
    setMinPrice(''); setMaxPrice('');
    setSortBy('newest'); setPage(1);
  }, []);

  const activeFilterCount = [
    search.trim(), category, minPrice, maxPrice
  ].filter(Boolean).length;

  const get = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };

  const filtered = useMemo(() => {
    let result = [...safeItems];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const val = get(item, field);
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }

    if (category) {
      result = result.filter(item => {
        const val = get(item, categoryField);
        return val && String(val).toUpperCase() === category.toUpperCase();
      });
    }

    if (priceField) {
      if (minPrice !== '') {
        result = result.filter(item => {
          const p = resolvePrice(item, priceField, get);
          return p >= Number(minPrice);
        });
      }
      if (maxPrice !== '') {
        result = result.filter(item => {
          const p = resolvePrice(item, priceField, get);
          return p <= Number(maxPrice);
        });
      }
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(get(b, dateField) || 0) - new Date(get(a, dateField) || 0);
        case 'oldest':
          return new Date(get(a, dateField) || 0) - new Date(get(b, dateField) || 0);
        case 'price_asc':
          return resolvePrice(a, priceField, get) - resolvePrice(b, priceField, get);
        case 'price_desc':
          return resolvePrice(b, priceField, get) - resolvePrice(a, priceField, get);
        case 'most_liked':
          return resolveLikeCount(b, getLikeCount) - resolveLikeCount(a, getLikeCount);
        case 'most_viewed':
          return resolveViews(b) - resolveViews(a);
        default:
          return 0;
      }
    });

    return result;
  }, [safeItems, search, category, minPrice, maxPrice, sortBy,
      searchFields, priceField, categoryField, dateField, getLikeCount]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const paginated   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    paginated,
    filtered,
    totalCount: filtered.length,
    search, category, minPrice, maxPrice, sortBy,
    activeFilterCount,
    handleSearch, handleCategory, handleMinPrice, handleMaxPrice, handleSort,
    clearAll,
    page: safePage,
    totalPages,
    setPage,
  };
}
