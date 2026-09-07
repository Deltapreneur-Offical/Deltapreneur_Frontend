/** Admin Showcase exact-domain lookup helpers (no OpenProvider discovery). */

export function normalizeShowcaseLookupTld(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^\.+/, '')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/^\.+|\.+$/g, '');
}

export function normalizeShowcaseLookupName(raw) {
  const text = String(raw || '').trim().toLowerCase();
  if (text.includes('.')) {
    return { error: 'Enter the domain name without the extension (e.g. example).' };
  }
  const name = text.replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 63);
  if (!name) {
    return { error: 'Enter a domain name (e.g. example).' };
  }
  return { name };
}

export function buildShowcaseLookupPayload(domainName, tld) {
  const parsedName = normalizeShowcaseLookupName(domainName);
  if (parsedName.error) {
    return { error: parsedName.error };
  }
  const ext = normalizeShowcaseLookupTld(tld);
  if (!ext) {
    return { error: 'Enter a TLD (e.g. .com).' };
  }
  return {
    domain_name: parsedName.name,
    tld: ext,
  };
}

export function showcaseLookupTickDisabled(result) {
  if (!result) return 'Search a premium domain first.';
  if (result.alreadySelected) return 'Already ticked. Use Untick on the live list if you want to hide it.';
  if (!result.canSelect || !result.item?.id) {
    return result.message || 'This result cannot be ticked as a Showcase domain.';
  }
  return null;
}

export function showcaseLookupCardModel(result) {
  if (!result?.live) return null;
  const live = result.live;
  return {
    id: result.item?.id || null,
    domainName: live.domainName,
    tld: live.tld,
    available: !!live.available,
    isPremium: !!live.isPremium,
    source: live.source,
    createPriceInr: live.createPriceInr,
    renewalPriceInr: live.renewalPriceInr,
    payableInr: live.payableInr,
    isSelected: !!result.item?.isSelected,
    canSelect: !!result.canSelect && !!result.item?.id,
    reason: result.reason || live.reason || null,
    message: result.message || null,
    alreadySelected: !!result.alreadySelected,
  };
}
