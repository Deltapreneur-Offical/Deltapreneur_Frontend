/**
 * Thin re-export for backward compatibility.
 * Prefer importing from `./domainSearch` for new code.
 */
export {
  clearDomainSearchCache as clearAvailableTldsCache,
  fetchDomainTldsPage as fetchAvailableTldsPage,
  fetchDomainTldsChunk as fetchAvailableTldsChunk,
  fetchDomainTlds as fetchAvailableTlds,
  DOMAIN_PRIORITY_TLDS as PRIORITY_TLDS,
  DOMAIN_SEARCH_CHUNK_SIZE,
} from './domainSearch';
