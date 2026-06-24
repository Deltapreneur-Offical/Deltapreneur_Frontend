import { describe, expect, it } from 'vitest';
import {
  computeBidLimits,
  formatBidRangeLabel,
  resolveAuctionBidLimits,
  validateBidAmount,
} from './auctionBidLimits';

describe('auctionBidLimits', () => {
  it('computes bid limits from the active bid', () => {
    expect(computeBidLimits(2000, 1000)).toEqual({
      activeBidReference: 2000,
      minNextBid: 2001,
      maxBidPrice: 3000,
    });
  });

  it('keeps API-provided limits when present', () => {
    expect(
      resolveAuctionBidLimits({
        currentHighestBid: 1000,
        minBidPrice: 500,
        minNextBid: 1100,
        maxBidPrice: 2500,
      }),
    ).toEqual({
      activeBidReference: 1000,
      minNextBid: 1100,
      maxBidPrice: 2500,
    });
  });

  it('validates bid ranges', () => {
    const limits = computeBidLimits(2000, 1000);
    expect(validateBidAmount(1999, limits, (v) => `₹${v}`)).toContain('Minimum bid');
    expect(validateBidAmount(4000, limits, (v) => `₹${v}`)).toContain('cannot exceed');
    expect(formatBidRangeLabel(limits, (v) => `₹${v}`)).toBe(`₹2001 \u2013 ₹3000`);
  });
});
