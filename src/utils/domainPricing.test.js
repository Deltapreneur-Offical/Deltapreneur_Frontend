import { describe, expect, it } from 'vitest';
import { isPremiumDomain } from './domainPricing';

describe('domainPricing', () => {
  it('marks premium non-auction domains correctly', () => {
    expect(isPremiumDomain({ askingPrice: 600000, saleType: 'FIXED_PRICE' })).toBe(true);
    expect(isPremiumDomain({ askingPrice: 100000, saleType: 'FIXED_PRICE' })).toBe(false);
    expect(isPremiumDomain({ askingPrice: 600000, saleType: 'AUCTION' })).toBe(false);
  });
});
