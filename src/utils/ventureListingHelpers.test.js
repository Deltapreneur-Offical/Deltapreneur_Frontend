import { describe, expect, it } from 'vitest';
import {
  formatOwnershipLiquidationPercent,
  formatVentureAskingPrice,
  isCoVentureListing,
  resolveCoVentureInvestmentSeeking,
  resolveOwnershipLiquidationPercent,
  resolvePublicAskingPrice,
  resolveSellerAskSummary,
  resolveVentureListingMode,
} from './ventureListingHelpers';

describe('ventureListingHelpers', () => {
  it('resolves venture modes and ownership percentages', () => {
    const venture = {
      listingMode: 'CO_VENTURE',
      ownershipLiquidationPercent: '25',
    };
    expect(resolveVentureListingMode(venture)).toBe('CO_VENTURE');
    expect(isCoVentureListing(venture)).toBe(true);
    expect(resolveOwnershipLiquidationPercent(venture)).toBe(25);
    expect(formatOwnershipLiquidationPercent(venture)).toBe('25%');
  });

  it('resolves co-venture investment seeking from multiple shapes', () => {
    const venture = {
      listingMode: 'CO_VENTURE',
      roles: [{ investmentSeeking: '1500000' }],
    };
    expect(resolveCoVentureInvestmentSeeking(venture)).toBe(1500000);
    expect(resolvePublicAskingPrice(venture)).toBe(1500000);
  });

  it('formats seller ask summaries and asking prices', () => {
    const venture = {
      listingMode: 'VENTURE',
      dealType: 'EQUITY_SALE',
      equityPercentOffered: 30,
      brandDetails: { dealValue: 500000 },
    };

    expect(resolveSellerAskSummary(venture)).toEqual({
      price: 500000,
      equityLabel: '30%',
      dealTypeLabel: 'Equity Sale',
    });
    expect(formatVentureAskingPrice(500000, (v) => `₹${v}`)).toBe('₹500000');
  });
});
