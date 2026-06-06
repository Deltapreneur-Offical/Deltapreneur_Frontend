/**
 * Navigate to domain registration storefront for an available FQDN.
 * @param {string} domain e.g. "veyra.com"
 * @param {(path: string) => void} navigate react-router navigate
 */
export function goToAIDomainStorefront(domain, navigate) {
  const fqdn = String(domain || '').trim().toLowerCase();
  if (!fqdn || !navigate) return;
  navigate(`/storefront?domain=${encodeURIComponent(fqdn)}`);
}
