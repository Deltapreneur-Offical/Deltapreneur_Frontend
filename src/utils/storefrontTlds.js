import { domainAPI } from '../api/services';

// ─────────────────────────────────────────────────────────────────────────────
// INDEPENDENT Domain Storefront TLD search.
//
// This module is intentionally SEPARATE from the Home page's
// `src/utils/availableTlds.js` (used by DomainSearchBar). Changes here must not
// affect the Home page and vice-versa. The two implementations share the same
// backend endpoint but keep their own cache, sorting, filtering and rendering
// rules so they can evolve independently.
//
// Behaviour required by the Domain Storefront page:
//   • Retrieve available TLDs from the backend / OpenProvider integration.
//   • Display ONLY available TLDs (never Taken / Registered / Unavailable /
//     Reserved / error rows).
//   • Sort ascending by registration price (cheapest first).
//   • Keep loading more via "View More" (page=2, 3, …) until exhausted.
//   • Never expose the underlying registrar/provider (`source`) to the UI.
//
// Incremental / paginated loading (fix for the gateway 504):
//   • The first request returns the first 50 available TLDs (page=1, pageSize=50)
//     and arrives in <1s. The caller fetches the next page on demand via a
//     "View More" control and appends. Pages are contiguous and price-sorted;
//     previously loaded pages are never re-fetched.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;
const PRIORITY_TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];

// Separate cache from the Home page so storefront results never collide with or
// evict Home page results.
const storefrontTldCache = new Map();

export function clearStorefrontTldCache() {
  storefrontTldCache.clear();
}

function normalizeLabel(raw) {
  const safe = (raw || '').trim().toLowerCase().split('.')[0];
  return safe;
}

function mapItem(item, label) {
  const tld = String(item.tld || '').replace(/^\./, '').toLowerCase();
  return {
    domain: item.domain || `${item.name || label}.${tld}`,
    name: item.name || label,
    tld,
    status: 'available',
    available: true,
    registrationPrice: item.registrationPrice ?? null,
    renewalPrice: item.renewalPrice ?? null,
    currency: item.currency || 'INR',
  };
}

function filterMapSort(items, label) {
  const out = [];
  for (const it of items) {
    const isAvailable =
      it.available === true ||
      (it.status && String(it.status).toLowerCase() === 'available');
    if (!isAvailable) continue; // storefront shows available TLDs only
    
    const ext = (it.tld || '').replace(/^\./, '').toLowerCase();
    const isPriority = PRIORITY_TLDS.indexOf(ext) !== -1;
    
    const price = it.registrationPrice != null ? Number(it.registrationPrice) : Infinity;
    if (!isPriority && price >= 3000) continue;
    
    out.push(mapItem(it, label));
  }
  out.sort((a, b) => {
    const aExt = (a.tld || '').replace(/^\./, '').toLowerCase();
    const bExt = (b.tld || '').replace(/^\./, '').toLowerCase();
    
    const aPriority = PRIORITY_TLDS.indexOf(aExt);
    const bPriority = PRIORITY_TLDS.indexOf(bExt);
    
    const aIsPriority = aPriority !== -1;
    const bIsPriority = bPriority !== -1;
    
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    if (aIsPriority && bIsPriority) return aPriority - bPriority;
    
    const pa = a.registrationPrice != null ? Number(a.registrationPrice) : Infinity;
    const pb = b.registrationPrice != null ? Number(b.registrationPrice) : Infinity;
    
    return pa - pb;
  });
  return out;
}

/**
 * Fetch one page of available TLDs for the storefront, price-sorted ascending,
 * with the registrar stripped out. Returns the raw API page so the caller can
 * append it and drive "View More" pagination.
 *
 * @param {string} label bare domain label e.g. "mybrand" (no extension)
 * @param {number} page 1-based page number
 * @returns {Promise<{ items: Array<object>, moreAvailable: boolean, total: number }>}
 */
export async function fetchStorefrontAvailableTldsPage(label, page = 1) {
  const safeLabel = normalizeLabel(label);
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

  return { items: filterMapSort(pageItems, safeLabel), moreAvailable, total };
}

/**
 * Fetch the FIRST page of available storefront TLDs and cache it. Subsequent
 * pages are loaded via `fetchStorefrontAvailableTldsPage` and appended by the
 * caller's "View More" control.
 *
 * @param {string} label bare domain label e.g. "mybrand" (no extension)
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<Array<object>>} first page of price-sorted available TLDs.
 */
export async function fetchStorefrontAvailableTlds(label, options = {}) {
  const { force = false } = options;
  const safeLabel = normalizeLabel(label);
  if (!safeLabel) return [];

  const cacheKey = `storefront-tlds:${safeLabel}`;
  if (!force && storefrontTldCache.has(cacheKey)) {
    return storefrontTldCache.get(cacheKey);
  }

  const { items } = await fetchStorefrontAvailableTldsPage(safeLabel, 1, { force });
  storefrontTldCache.set(cacheKey, items);
  return items;
}
