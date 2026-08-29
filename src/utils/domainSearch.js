import { domainAPI } from '../api/services';

/**
 * Single source of truth for Homepage Domain Names + Storefront TLD search.
 * Both surfaces MUST use this module so filters, sort, paging, and cache stay aligned.
 */

export const DOMAIN_SEARCH_PAGE_SIZE = 25;
/**
 * Preferred/default TLD display order for Standard Domains.
 * These appear first (in this exact order, when available); every remaining
 * TLD returned by the registrar is appended after them. Nothing is dropped.
 */
export const DOMAIN_PRIORITY_TLDS = [
  'com', 'in', 'net', 'org', 'co', 'io', 'ai', 'app', 'asia', 'biz',
  'blog', 'club', 'de', 'dev', 'edu.pl', 'icu', 'live', 'me', 'monster',
  'online', 'page', 'space', 'store', 'website', 'xyz', 'pro', 'study',
  'eu', 'uk', 'co.uk', 'org.uk', 'fr', 'es', 'it', 'net.in', 'co.in',
  'org.in', 'nl', 'be', 'ch', 'at', 'ie', 'se', 'no', 'fi', 'dk',
  'pl', 'cz', 'pt',
];
/** Homepage progressive first-page wave size (matches backend default). */
export const DOMAIN_SEARCH_CHUNK_SIZE = 12;

/** Rank in the preferred order; Infinity when not a preferred TLD. */
export function preferredTldRank(ext) {
  const idx = DOMAIN_PRIORITY_TLDS.indexOf(String(ext || '').replace(/^\./, '').toLowerCase());
  return idx === -1 ? Infinity : idx;
}

const tldCache = new Map();
let supportedTldsCatalogCache = null;
let supportedTldsCatalogPromise = null;

export function clearDomainSearchCache() {
  tldCache.clear();
  supportedTldsCatalogCache = null;
  supportedTldsCatalogPromise = null;
}

const SLD_MAX_LEN = 63;

/** DNS SLD for Domain Register: drop spaces/punctuation, keep letters, digits, hyphen. */
export function normalizeDomainLabel(raw) {
  const head = String(raw || '').trim().toLowerCase().split('.')[0];
  return head.replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, SLD_MAX_LEN);
}

/** Safe TLD / multi-part extension after the first dot (e.g. co.uk). */
export function normalizeDomainExtension(raw) {
  const text = String(raw || '').trim().toLowerCase();
  const dot = text.indexOf('.');
  if (dot === -1) return '';
  return text.slice(dot + 1).replace(/[^a-z0-9.-]/g, '').replace(/^\.+|\.+$/g, '');
}

/** Domain Register FQDN. Bare phrases default to .com. Search box text is unchanged. */
export function normalizeSearchFqdn(raw, defaultExt = 'com') {
  const label = normalizeDomainLabel(raw);
  if (!label) return '';
  const ext = normalizeDomainExtension(raw) || String(defaultExt || 'com').replace(/[^a-z0-9.-]/g, '') || 'com';
  return `${label}.${ext}`;
}

function mapItem(item, label) {
  const tld = String(item.tld || '').replace(/^\./, '').toLowerCase();
  const isPremium = item.isPremium === true || item.is_premium === true;
  return {
    domain: item.domain || `${item.name || label}.${tld}`,
    name: item.name || label,
    tld,
    status: 'available',
    available: true,
    registrationPrice: item.registrationPrice ?? null,
    renewalPrice: item.renewalPrice ?? null,
    currency: item.currency || 'INR',
    isPremium,
    registryTier: item.registryTier || (isPremium ? 'premium' : 'standard'),
    minPeriodYears: item.minPeriodYears || 1,
  };
}

function filterMapSort(items, label) {
  const out = [];
  for (const it of items) {
    const isAvailable =
      it.available === true ||
      (it.status && String(it.status).toLowerCase() === 'available');
    if (!isAvailable) continue;
    // Never drop valid TLDs (including premiums) — only prioritise the order.
    out.push(mapItem(it, label));
  }

  out.sort((a, b) => {
    const aRank = preferredTldRank(a.tld);
    const bRank = preferredTldRank(b.tld);
    if (aRank !== bRank) return aRank - bRank;

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

/** OpenProvider-supported TLD catalog (same backend source as domain search). */
export function getCachedSupportedTlds() {
  return supportedTldsCatalogCache;
}

export async function fetchSupportedTlds(options = {}) {
  const { force = false } = options;
  if (!force && supportedTldsCatalogCache) {
    return supportedTldsCatalogCache;
  }
  if (!force && supportedTldsCatalogPromise) {
    return supportedTldsCatalogPromise;
  }
  supportedTldsCatalogPromise = domainAPI.listTlds()
    .then(({ data }) => {
      const tlds = Array.isArray(data?.tlds) ? data.tlds : [];
      supportedTldsCatalogCache = tlds;
      return tlds;
    })
    .finally(() => {
      supportedTldsCatalogPromise = null;
    });
  return supportedTldsCatalogPromise;
}
