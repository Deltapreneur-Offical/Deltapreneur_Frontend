import { describe, expect, it } from 'vitest';

import { hasPlacedCommunityAuctionBid } from './communityAuctionMeetings';

describe('hasPlacedCommunityAuctionBid', () => {
  it('returns true when the user has bid on the auction', () => {
    expect(
      hasPlacedCommunityAuctionBid(
        [{ bidderId: 'user-1' }, { bidderId: 'user-2' }],
        'user-2',
      ),
    ).toBe(true);
  });

  it('returns false when the user has not bid on the auction', () => {
    expect(
      hasPlacedCommunityAuctionBid(
        [{ bidderId: 'user-1' }],
        'user-2',
      ),
    ).toBe(false);
  });

  it('returns false without a user id', () => {
    expect(hasPlacedCommunityAuctionBid([{ bidderId: 'user-1' }], null)).toBe(false);
  });
});
