import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  invalidateTldMarqueeCache,
  readTldMarqueeCache,
  TLD_MARQUEE_CACHE_KEY,
  TLD_MARQUEE_INVALIDATED_AT_KEY,
  TLD_MARQUEE_REFRESH_EVENT,
  writeTldMarqueeCache,
} from './tldPriceMarqueeCache';

describe('TLD marquee cache', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('expires cached prices after five minutes', () => {
    writeTldMarqueeCache([{ tld: 'in', price: 575 }], 1_000);

    expect(readTldMarqueeCache(1_001)).toEqual([{ tld: '.in', price: 575 }]);
    expect(readTldMarqueeCache(301_001)).toEqual([]);
  });

  it('invalidates this tab and notifies other tabs', () => {
    const listener = vi.fn();
    window.addEventListener(TLD_MARQUEE_REFRESH_EVENT, listener);
    writeTldMarqueeCache([{ tld: '.com', price: 1197.7 }], Date.now());

    invalidateTldMarqueeCache();

    expect(sessionStorage.getItem(TLD_MARQUEE_CACHE_KEY)).toBeNull();
    expect(Number(localStorage.getItem(TLD_MARQUEE_INVALIDATED_AT_KEY))).toBeGreaterThan(0);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(TLD_MARQUEE_REFRESH_EVENT, listener);
  });

  it('rejects a session cache older than a cross-tab invalidation', () => {
    writeTldMarqueeCache([{ tld: '.org', price: 858.77 }], 2_000);
    localStorage.setItem(TLD_MARQUEE_INVALIDATED_AT_KEY, '2001');

    expect(readTldMarqueeCache(2_002)).toEqual([]);
  });
});
