/**
 * Client cache for OpenProvider aftermarket premium search results.
 * Isolated from marketplace premium (DomainsPage mode=premium).
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
/** @type {Map<string, { ts: number, items: object[] }>} */
const cache = new Map();

export function premiumCacheKey(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .split('.')[0];
}

export function getCachedPremiumItems(label) {
  const key = premiumCacheKey(label);
  if (!key) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.items;
}

export function setCachedPremiumItems(label, items) {
  const key = premiumCacheKey(label);
  if (!key) return;
  cache.set(key, {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
  });
}
