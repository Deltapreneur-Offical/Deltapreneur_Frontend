import { asArray } from './asArray';

/** Default page size for browse pages that load the full catalog in chunks. */
export const BROWSE_LIST_PAGE_SIZE = 50;

/** Home sections scan listings in chunks until enough featured rows are found. */
export const HOME_PREVIEW_PAGE_SIZE = 48;

/** @deprecated Use fetchHomepageSectionPreview from homepagePreview.js */
export const HOME_FEATURED_LIST_PARAMS = {
  page: 1,
  pageSize: HOME_PREVIEW_PAGE_SIZE,
};

/**
 * Fetch one page from a list API that accepts { page, page_size }.
 * @param {function(object): Promise} requestFn - e.g. (p) => domainAPI.getAll(p)
 */
export async function fetchListPage(requestFn, { page = 1, pageSize = BROWSE_LIST_PAGE_SIZE, ...extraParams } = {}) {
  const { data } = await requestFn({ page, page_size: pageSize, ...extraParams });
  const items = asArray(data);
  const total = Number(data?.total ?? items.length);
  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
    page: data?.page ?? page,
    pageSize: data?.page_size ?? data?.pageSize ?? pageSize,
  };
}

/**
 * @deprecated Use fetchHomepageSectionPreview from homepagePreview.js
 */
export async function fetchHomepageFeaturedPreview(requestFn, type = 'domain', limit = 5) {
  const { fetchHomepageSectionPreview } = await import('./homepagePreview');
  return fetchHomepageSectionPreview(requestFn, type, limit);
}

/**
 * Load every page and merge (keeps client-side search/filter working on browse pages).
 * Stops when all rows are fetched or a page returns no items.
 */
export async function fetchAllListPages(
  requestFn,
  { pageSize = BROWSE_LIST_PAGE_SIZE, maxPages = 200 } = {},
) {
  const merged = [];
  let total = null;
  let page = 1;

  while (page <= maxPages) {
    const { items, total: reportedTotal } = await fetchListPage(requestFn, { page, pageSize });
    if (total == null) {
      total = reportedTotal;
    }
    if (!items.length) {
      break;
    }
    merged.push(...items);
    if (merged.length >= total) {
      break;
    }
    if (items.length < pageSize) {
      break;
    }
    page += 1;
  }

  return merged;
}
