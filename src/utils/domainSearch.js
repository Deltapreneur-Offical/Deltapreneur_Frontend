import { domainAPI } from '../api/services';

/**
 * Single source of truth for Homepage Domain Names + Storefront TLD search.
 * Both surfaces MUST use this module so filters, sort, paging, and cache stay aligned.
 */

export const DOMAIN_SEARCH_PAGE_SIZE = 25;
export const DOMAIN_PRIORITY_TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];
/** Homepage progressive first-page wave size (matches backend default). */
export const DOMAIN_SEARCH_CHUNK_SIZE = 12;

const tldCache = new Map();

export function clearDomainSearchCache() {
  tldCache.clear();
}

export function normalizeDomainLabel(raw) {
  return (raw || '').trim().toLowerCase().split('.')[0];
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
    if (!isAvailable) continue;

    const ext = (it.tld || '').replace(/^\./, '').toLowerCase();
    const isPriority = DOMAIN_PRIORITY_TLDS.indexOf(ext) !== -1;
    const price = it.registrationPrice != null ? Number(it.registrationPrice) : Infinity;
    if (!isPriority && price >= 3000) continue;

    out.push(mapItem(it, label));
  }

  out.sort((a, b) => {
    const aExt = (a.tld || '').replace(/^\./, '').toLowerCase();
    const bExt = (b.tld || '').replace(/^\./, '').toLowerCase();
    const aPriority = DOMAIN_PRIORITY_TLDS.indexOf(aExt);
    const bPriority = DOMAIN_PRIORITY_TLDS.indexOf(bExt);
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
 * Fetch one page of available TLDs (price-sorted, priority TLDs first).
 * @param {string} label bare domain label
 * @param {number} page 1-based
 * @param {{ force?: boolean, signal?: AbortSignal, chunk?: number, chunkSize?: number }} [options]
 */
export async function fetchDomainTldsPage(label, page = 1, options = {}) {
  const safeLabel = normalizeDomainLabel(label);
  if (!safeLabel) {
    return {
      items: [],
      moreAvailable: false,
      total: 0,
      chunkIndex: null,
      chunkTotal: null,
      moreChunks: false,
    };
  }

  const { signal, chunk, chunkSize = DOMAIN_SEARCH_CHUNK_SIZE } = options;
  const { data } = await domainAPI.searchTlds(
    {
      name: safeLabel,
      page,
      pageSize: DOMAIN_SEARCH_PAGE_SIZE,
      ...(chunk != null ? { chunk, chunkSize } : {}),
    },
    signal ? { signal } : {},
  );

  const payload = data?.data ?? data;
  const pageItems = Array.isArray(payload?.items) ? payload.items : [];
  // Trust backend paging flag (windowed load-more can return empty available pages).
  const moreAvailable = payload?.moreAvailable === true;
  const total = Number.isInteger(payload?.total) ? payload.total : pageItems.length;
  const chunkIndex = Number.isInteger(payload?.chunkIndex) ? payload.chunkIndex : null;
  const chunkTotal = Number.isInteger(payload?.chunkTotal) ? payload.chunkTotal : null;
  const moreChunks = payload?.moreChunks === true;

  return {
    items: filterMapSort(pageItems, safeLabel),
    moreAvailable,
    total,
    chunkIndex,
    chunkTotal,
    moreChunks,
  };
}

/**
 * Fetch one progressive first-page wave (Homepage Domain Names loader).
 */
export async function fetchDomainTldsChunk(label, chunkIndex = 0, options = {}) {
  return fetchDomainTldsPage(label, 1, {
    ...options,
    chunk: chunkIndex,
    chunkSize: options.chunkSize ?? DOMAIN_SEARCH_CHUNK_SIZE,
  });
}

/**
 * Fetch and cache the first page of available TLDs for a label.
 */
export async function fetchDomainTlds(label, options = {}) {
  const { force = false } = options;
  const safeLabel = normalizeDomainLabel(label);
  if (!safeLabel) return [];

  const cacheKey = `domain-tlds:${safeLabel}`;
  if (!force && tldCache.has(cacheKey)) {
    return tldCache.get(cacheKey);
  }

  const { items } = await fetchDomainTldsPage(safeLabel, 1, options);
  tldCache.set(cacheKey, items);
  return items;
}
