/**
 * Customer-facing helpers — never expose registrar vendor brand names.
 *
 * Prefer vanity HubRegistrar hosts for new domains. Legacy OpenProvider hosts
 * still map to friendly labels for existing customer orders.
 */

const PLATFORM_NS_ALIASES = {
  'ns1.cobrother.com': 'HubRegistrar DNS 1',
  'ns2.cobrother.com': 'HubRegistrar DNS 2',
  'ns3.cobrother.com': 'HubRegistrar DNS 3',
  // Legacy (existing domains registered before vanity NS cutover)
  'ns1.openprovider.nl': 'HubRegistrar DNS 1',
  'ns2.openprovider.be': 'HubRegistrar DNS 2',
  'ns3.openprovider.eu': 'HubRegistrar DNS 3',
};

/** When user picks a friendly label, submit the vanity host (not legacy OP). */
const ALIAS_TO_PLATFORM_NS = {
  'hubregistrar dns 1': 'ns1.cobrother.com',
  'hubregistrar dns 2': 'ns2.cobrother.com',
  'hubregistrar dns 3': 'ns3.cobrother.com',
};

const VENDOR_NS_PATTERN = /openprovider|resellerclub|onlyfordemo/i;

/** True when every host is a known HubRegistrar/platform nameserver. */
export function isPlatformNameserverSet(hosts = []) {
  const list = (Array.isArray(hosts) ? hosts : [])
    .map((h) => String(h || '').trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return false;
  return list.every((host) => Boolean(PLATFORM_NS_ALIASES[host]) || VENDOR_NS_PATTERN.test(host));
}

/** Friendly label for a single nameserver host (keeps custom hosts as-is). */
export function displayNameserverHost(host, index = 0) {
  const key = String(host || '').trim().toLowerCase();
  if (!key) return '';
  if (PLATFORM_NS_ALIASES[key]) return PLATFORM_NS_ALIASES[key];
  if (VENDOR_NS_PATTERN.test(key)) return `HubRegistrar DNS ${index + 1}`;
  return String(host).trim();
}

/** Map a displayed alias back to a real hostname when submitting. */
export function resolveNameserverForSubmit(value, index = 0, originalHosts = []) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const aliased = ALIAS_TO_PLATFORM_NS[raw.toLowerCase()];
  if (aliased) {
    // Prefer keeping the original host when editing an existing order so we
    // do not force-migrate legacy OP NS on a simple save.
    const original = String(originalHosts[index] || '').trim().toLowerCase();
    if (original && PLATFORM_NS_ALIASES[original]) return String(originalHosts[index]).trim();
    return aliased;
  }
  const original = String(originalHosts[index] || '').trim();
  if (original && displayNameserverHost(original, index) === raw) return original;
  return raw;
}

/** Summary line for the Current Settings strip. */
export function formatNameserversForDisplay(hosts = []) {
  const list = (Array.isArray(hosts) ? hosts : []).map((h) => String(h || '').trim()).filter(Boolean);
  if (!list.length) return 'Not set';
  if (isPlatformNameserverSet(list)) return 'HubRegistrar managed DNS';
  return list.map((host, i) => displayNameserverHost(host, i)).join(', ');
}

/** Strip vendor brand names from any customer-visible string. */
export function scrubRegistrarVendorNames(text, fallback = '') {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  if (/open\s*provider|reseller\s*club|legacy_resellerclub/i.test(raw)) {
    return fallback || 'Please contact HubRegistrar support for help with this domain.';
  }
  return raw;
}
