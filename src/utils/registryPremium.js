/**
 * Registry (OpenProvider) premium helpers.
 *
 * Intentionally isolated from marketplace high-value "Premium" (`domainPricing.js`
 * / DomainsPage `mode: 'premium'`). Do not import marketplace premium utilities here.
 */

/** @param {Record<string, unknown>|null|undefined} item */
export function isRegistryPremium(item) {
  if (!item || typeof item !== 'object') return false;
  return (
    item.isPremium === true ||
    item.is_premium === true ||
    String(item.registryTier || item.registry_tier || '').toLowerCase() === 'premium'
  );
}

export const REGISTRY_PREMIUM_SEGMENT = {
  STANDARD: 'standard',
  PREMIUM: 'premium',
};
