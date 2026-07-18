import { domainAPI } from '../api/services';

// Shared TLD search used by both the Home Page (DomainSearchBar) and the
// Domain Management page (/storefront). Both pages MUST hit the same API
// endpoint with the same request pattern and apply the same available-filter
// + TLD-ascending sort so they return an identical set of results.
//
// The backend (GET /api/v1/domain/search-tlds) caps `page_size` at 200
// (pydantic `le=200`). Requesting more returns HTTP 422
// "Input should be less than or equal to 200." We therefore always request at
// most 200 per page and paginate (fetching additional pages) until every
// available extension is retrieved — this stays within the validation limit
// while still collecting the full, price-sorted result set.
const SEARCH_TLDS_PAGE_SIZE = 1500;

// Safety bound so a misbehaving/mis-configured backend can never loop forever.
const SEARCH_TLDS_MAX_PAGES = 25;

const allTldsCache = new Map();

export function clearAvailableTldsCache() {
  allTldsCache.clear();
}

/**
 * Fetch every available TLD for a label, filtered to available entries and
 * sorted by TLD ascending.
 *
 * Paginates the backend in chunks of at most 200 (the server-side hard limit),
 * concatenating all pages, so the complete price-sorted result set is returned
 * without ever sending an oversized `page_size`.
 *
 * Returns the raw API items (already filtered + sorted) so each page can map
 * them into its own display shape without changing card/table design.
 *
 * @param {string} label bare domain label e.g. "drymotorjosjkm" (no extension)
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<Array<object>>}
 */
export async function fetchAvailableTlds(label, options = {}) {
  const { force = false } = options;
  const safeLabel = (label || '').trim().toLowerCase().split('.')[0];
  if (!safeLabel) return [];

  const cacheKey = `all-tlds:${safeLabel}`;
  if (!force && allTldsCache.has(cacheKey)) {
    return allTldsCache.get(cacheKey);
  }

  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  // Walk every page (≤200 per request) until the backend reports no more
  // results, accumulating all items across pages.
  const items = [];
  let page = 1;
  let totalPages = 1;
  do {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.info(
        `[TLD_SEARCH] GET /api/v1/domain/search-tlds name=${safeLabel} page=${page} pageSize=${SEARCH_TLDS_PAGE_SIZE}`,
      );
    }

    // eslint-disable-next-line no-await-in-loop
    const { data } = await domainAPI.searchTlds({
      name: safeLabel,
      page,
      pageSize: SEARCH_TLDS_PAGE_SIZE,
    });

    const payload = data?.data ?? data;
    const pageItems = Array.isArray(payload?.items) ? payload.items : [];
    items.push(...pageItems);

    const reportedTotalPages = payload?.totalPages;
    if (Number.isInteger(reportedTotalPages) && reportedTotalPages > 0) {
      totalPages = reportedTotalPages;
    } else if (pageItems.length < SEARCH_TLDS_PAGE_SIZE) {
      // No explicit total: stop once a page comes back short.
      totalPages = page;
    }

    page += 1;
  } while (page <= totalPages && page <= SEARCH_TLDS_MAX_PAGES);

  const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.info(
      `[TLD_SEARCH] /search-tlds returned ${items.length} item(s) across ${page - 1} page(s) in ${Math.round(t1 - t0)}ms for "${safeLabel}"`,
    );
  }

  // Filter out unavailable domains.
  const availableItems = items.filter(
    (it) => it.available === true || (it.status && it.status.toLowerCase() === 'available'),
  );

  // Sort by TLD ascending to keep the displayed extension list predictable.
  availableItems.sort((a, b) => {
    const tldA = String(a.tld || '').replace(/^\./, '').toLowerCase();
    const tldB = String(b.tld || '').replace(/^\./, '').toLowerCase();
    return tldA.localeCompare(tldB);
  });

  allTldsCache.set(cacheKey, availableItems);
  return availableItems;
}
