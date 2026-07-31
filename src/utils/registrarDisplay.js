/**
 * Customer-facing helpers — never expose registrar vendor brand names.
 */

const PLATFORM_NS_ALIASES = {
  'ns1.openprovider.nl': 'CoBrother DNS 1',
  'ns2.openprovider.be': 'CoBrother DNS 2',
  'ns3.openprovider.eu': 'CoBrother DNS 3',
};

const ALIAS_TO_PLATFORM_NS = Object.fromEntries(
  Object.entries(PLATFORM_NS_ALIASES).map(([real, alias]) => [alias.toLowerCase(), real]),
);

const VENDOR_NS_PATTERN = /openprovider|resellerclub|onlyfordemo/i;

/** True when every host is a known CoBrother/platform nameserver. */
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
  if (VENDOR_NS_PATTERN.test(key)) return `CoBrother DNS ${index + 1}`;
  return String(host).trim();
}

/** Map a displayed alias back to the real platform hostname when submitting. */
export function resolveNameserverForSubmit(value, index = 0, originalHosts = []) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const aliased = ALIAS_TO_PLATFORM_NS[raw.toLowerCase()];
  if (aliased) return aliased;
  const original = String(originalHosts[index] || '').trim();
  if (original && displayNameserverHost(original, index) === raw) return original;
  return raw;
}

/** Summary line for the Current Settings strip. */
export function formatNameserversForDisplay(hosts = []) {
  const list = (Array.isArray(hosts) ? hosts : []).map((h) => String(h || '').trim()).filter(Boolean);
  if (!list.length) return 'Not set';
  if (isPlatformNameserverSet(list)) return 'CoBrother managed DNS';
  return list.map((host, i) => displayNameserverHost(host, i)).join(', ');
}

/** Strip vendor brand names from any customer-visible string. */
export function scrubRegistrarVendorNames(text, fallback = '') {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  if (/open\s*provider|reseller\s*club|legacy_resellerclub/i.test(raw)) {
    return fallback || 'Please contact CoBrother support for help with this domain.';
  }
  return raw;
}
