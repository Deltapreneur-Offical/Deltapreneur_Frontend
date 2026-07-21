/**
 * Thin re-export for backward compatibility.
 * Prefer importing from `./domainSearch` for new code.
 */
export {
  clearDomainSearchCache as clearStorefrontTldCache,
  fetchDomainTldsPage as fetchStorefrontAvailableTldsPage,
  fetchDomainTlds as fetchStorefrontAvailableTlds,
} from './domainSearch';
