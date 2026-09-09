export const TLD_MARQUEE_CACHE_KEY = 'cb-tld-marquee-registration-prices-v2';
export const TLD_MARQUEE_REFRESH_EVENT = 'domain-commission:updated';
export const TLD_MARQUEE_INVALIDATED_AT_KEY = 'domain-commission:invalidated-at';

const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeTldKey(raw) {
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return '';
  return text.startsWith('.') ? text : `.${text}`;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const tld = normalizeTldKey(item?.tld);
      const price = Number(item?.price);
      return tld && Number.isFinite(price) && price > 0 ? { tld, price } : null;
    })
    .filter(Boolean);
}

export function readTldMarqueeCache(now = Date.now()) {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem(TLD_MARQUEE_CACHE_KEY) || 'null');
    const invalidatedAt = typeof localStorage === 'undefined'
      ? 0
      : Number(localStorage.getItem(TLD_MARQUEE_INVALIDATED_AT_KEY)) || 0;
    if (
      !parsed
      || !Number.isFinite(parsed.savedAt)
      || now - parsed.savedAt > CACHE_TTL_MS
      || parsed.savedAt <= invalidatedAt
    ) {
      sessionStorage.removeItem(TLD_MARQUEE_CACHE_KEY);
      return [];
    }
    return normalizeItems(parsed.items);
  } catch {
    sessionStorage.removeItem(TLD_MARQUEE_CACHE_KEY);
    return [];
  }
}

export function writeTldMarqueeCache(items, now = Date.now()) {
  if (typeof sessionStorage === 'undefined') return;
  const normalized = normalizeItems(items);
  if (!normalized.length) return;
  try {
    sessionStorage.setItem(
      TLD_MARQUEE_CACHE_KEY,
      JSON.stringify({ savedAt: now, items: normalized }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function invalidateTldMarqueeCache({ notify = true } = {}) {
  const invalidatedAt = Date.now();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(TLD_MARQUEE_CACHE_KEY);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TLD_MARQUEE_INVALIDATED_AT_KEY, String(invalidatedAt));
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TLD_MARQUEE_REFRESH_EVENT));
  }
}
