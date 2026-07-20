import { domainAPI } from '../api/services';

// Shared TLD search used by both the Home Page (DomainSearchBar) and the
// Domain Management page (/storefront). Both pages MUST hit the same API
// endpoint with the same request pattern and apply the same available-filter
// + TLD-ascending sort so they return an identical set of results.
//
// Incremental / paginated loading (fix for the gateway 504):
//   • The backend returns the FIRST PAGE only (page=1, pageSize=50) of the
//     curated priority TLDs, so the first response arrives in <1s.
//   • The caller renders those 50 results immediately, then fetches the next
//     page (page=2, pageSize=50) on demand via a "View More" action and appends
//     to the existing list. Each subsequent click fetches page=3, page=4, …
//   • Pages are contiguous and price-sorted; previously loaded pages are never
    //     re-fetched. When the backend reports `moreAvailable=false` (or an empty
    //     page) the View More control is hidden / disabled.
    const PAGE_SIZE = 25;
    
    const PRIORITY_TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];
    
const allTldsCache = new Map();

export function clearAvailableTldsCache() {
  allTldsCache.clear();
}

function filterAndSort(items) {
  const availableItems = items.filter((it) => {
    const isAvail = it.available === true || (it.status && it.status.toLowerCase() === 'available');
    if (!isAvail) return false;
    
    const ext = (it.tld || '').replace(/^\./, '').toLowerCase();
    const isPriority = PRIORITY_TLDS.indexOf(ext) !== -1;
    if (isPriority) return true;
    
    const price = it.registrationPrice != null ? Number(it.registrationPrice) : Infinity;
    return price < 3000;
  });

  availableItems.sort((a, b) => {
    const aExt = (a.tld || '').replace(/^\./, '').toLowerCase();
    const bExt = (b.tld || '').replace(/^\./, '').toLowerCase();
    
    const aPriority = PRIORITY_TLDS.indexOf(aExt);
    const bPriority = PRIORITY_TLDS.indexOf(bExt);
    
    const aIsPriority = aPriority !== -1;
    const bIsPriority = bPriority !== -1;
    
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    if (aIsPriority && bIsPriority) return aPriority - bPriority;
    
    const priceA = a.registrationPrice != null ? Number(a.registrationPrice) : Infinity;
    const priceB = b.registrationPrice != null ? Number(b.registrationPrice) : Infinity;
    
    return priceA - priceB;
  });
  return availableItems;
}

/**
 * Fetch one page of available TLDs for a label, filtered to available entries
 * and sorted by price ascending. Returns the raw API page so the caller can
 * append it to previously loaded results and drive "View More" pagination.
 *
 * @param {string} label bare domain label e.g. "drymotorjosjkm" (no extension)
 * @param {number} page 1-based page number
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ items: Array<object>, moreAvailable: boolean, total: number }>}
 */
export async function fetchAvailableTldsPage(label, page = 1, options = {}) {
  const safeLabel = (label || '').trim().toLowerCase().split('.')[0];
  if (!safeLabel) return { items: [], moreAvailable: false, total: 0 };

  const { data } = await domainAPI.searchTlds({
    name: safeLabel,
    page,
    pageSize: PAGE_SIZE,
  });

  const payload = data?.data ?? data;
  const pageItems = Array.isArray(payload?.items) ? payload.items : [];
  const moreAvailable = payload?.moreAvailable === true && pageItems.length > 0;
  const total = Number.isInteger(payload?.total) ? payload.total : pageItems.length;

  return { items: filterAndSort(pageItems), moreAvailable, total };
}

/**
 * Fetch the FIRST page of available TLDs for a label and cache it. Used by the
 * page loaders so the first 50 results render immediately. Subsequent pages are
 * loaded via `fetchAvailableTldsPage` and appended by the caller.
 *
 * @param {string} label bare domain label e.g. "drymotorjosjkm" (no extension)
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<Array<object>>} first page of price-sorted available TLDs.
 */
export async function fetchAvailableTlds(label, options = {}) {
  const { force = false } = options;
  const safeLabel = (label || '').trim().toLowerCase().split('.')[0];
  if (!safeLabel) return [];

  const cacheKey = `all-tlds:${safeLabel}`;
  if (!force && allTldsCache.has(cacheKey)) {
    return allTldsCache.get(cacheKey);
  }

  const { items } = await fetchAvailableTldsPage(safeLabel, 1, { force });
  allTldsCache.set(cacheKey, items);
  return items;
}
