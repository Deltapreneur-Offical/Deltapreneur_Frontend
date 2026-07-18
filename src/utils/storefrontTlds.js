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
//   • Return the FULL set (no subset) so the page can show/lazy-load all of them.
//   • Never expose the underlying registrar/provider (`source`) to the UI.
//
// The backend caps `page_size` at 200 (pydantic `le=200`), so we paginate in
// chunks of 200 and concatenate every page. Each request stays within the
// validation limit while we still collect the complete result set.
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_TLDS_PAGE_SIZE = 200;
const SEARCH_TLDS_MAX_PAGES = 25;

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

/**
 * Fetch every AVAILABLE TLD for a label from the storefront backend endpoint,
 * price-sorted ascending, with the registrar stripped out.
 *
 * @param {string} label bare domain label e.g. "mybrand" (no extension)
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<Array<object>>} available TLDs, cheapest first.
 */
export async function fetchStorefrontAvailableTlds(label, options = {}) {
  const { force = false } = options;
  const safeLabel = normalizeLabel(label);
  if (!safeLabel) return [];

  const cacheKey = `storefront-tlds:${safeLabel}`;
  if (!force && storefrontTldCache.has(cacheKey)) {
    return storefrontTldCache.get(cacheKey);
  }

  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await domainAPI.searchTlds({
      name: safeLabel,
      page,
      pageSize: SEARCH_TLDS_PAGE_SIZE,
    });

    const payload = data?.data ?? data;
    const pageItems = Array.isArray(payload?.items) ? payload.items : [];

    for (const it of pageItems) {
      const isAvailable =
        it.available === true ||
        (it.status && String(it.status).toLowerCase() === 'available');
      if (!isAvailable) continue; // storefront shows available TLDs only
      items.push(mapItem(it, safeLabel));
    }

    const reportedTotalPages = payload?.totalPages;
    if (Number.isInteger(reportedTotalPages) && reportedTotalPages > 0) {
      totalPages = reportedTotalPages;
    } else if (pageItems.length < SEARCH_TLDS_PAGE_SIZE) {
      totalPages = page;
    }

    page += 1;
  } while (page <= totalPages && page <= SEARCH_TLDS_MAX_PAGES);

  // Cheapest registration price first; unpriced entries sink to the bottom.
  items.sort((a, b) => {
    const pa = a.registrationPrice != null ? Number(a.registrationPrice) : Infinity;
    const pb = b.registrationPrice != null ? Number(b.registrationPrice) : Infinity;
    return pa - pb;
  });

  storefrontTldCache.set(cacheKey, items);
  return items;
}
