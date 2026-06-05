function toSafeText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return `${value}`;
  } catch {
    return '';
  }
}

function toSafeLower(value) {
  const text = toSafeText(value);
  if (typeof text === 'string') return text.toLowerCase();
  return '';
}

export function normalizeDomainExtension(ext) {
  const trimmed = toSafeText(ext).trim();
  if (!trimmed || trimmed === '.') return null;
  const full = trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
  const key = toSafeLower(full.replace(/^\./, ''));
  if (!key) return null;
  const known = ['com', 'in', 'io', 'net', 'org', 'co', 'ai'];
  return {
    label: full.toUpperCase(),
    cssKey: known.includes(key) ? key : 'default',
    full,
  };
}

/** Split name + extension for display (handles legacy rows with extension only in domainName). */
export function resolveDomainDisplay(domain) {
  let name = toSafeText(domain?.domainName).trim();
  let rawExt = toSafeText(domain?.domainExtension).trim();

  if (!rawExt && name.includes('.')) {
    const dot = name.indexOf('.');
    if (dot > 0) {
      rawExt = name.slice(dot);
      name = name.slice(0, dot);
    }
  }

  const ext = normalizeDomainExtension(rawExt);
  const cleanName = name.replace(/^[\s|.\-—]+$/g, '') ? name : '';
  const displayName = cleanName || (ext ? 'domain' : 'Unnamed');
  return {
    name: displayName,
    ext,
    fullDomain: ext ? `${displayName}${ext.full}` : displayName,
  };
}

/** Title for domain auction cards and detail pages. */
export function resolveAuctionDomainTitle(auction) {
  const domain = auction?.domain || {};
  return (
    auction?.domainDisplayName
    || domain.fullDomain
    || `${domain.domainName || ''}${domain.domainExtension || ''}`.trim()
    || null
  );
}
