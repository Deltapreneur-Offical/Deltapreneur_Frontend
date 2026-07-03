import { describe, expect, it } from 'vitest';
import {
  canViewListingDetail,
  filterMyListings,
  isCommunityProfilePublic,
  isListingOwner,
  isPublicMarketplaceListing,
} from './listingVisibility';

describe('listingVisibility', () => {
  it('shows verified active listings publicly', () => {
    expect(
      isPublicMarketplaceListing({
        active: true,
        status: true,
        verified: true,
      }),
    ).toBe(true);
  });

  it('hides unverified listings from the public', () => {
    expect(
      isPublicMarketplaceListing({
        active: true,
        status: true,
        verified: false,
      }, 'software'),
    ).toBe(false);
  });

  it('allows owners to see their own listing details', () => {
    const item = { active: true, status: true, verified: false, listedBy: { id: 'u1' } };
    expect(isListingOwner(item, { id: 'u1' })).toBe(true);
    expect(canViewListingDetail(item, { id: 'u1' })).toBe(true);
  });

  it('falls back to owner-scoped payloads for my listings', () => {
    const rows = [
      { id: '1', listedByUserId: null, verified: false },
      { id: '2', listedByUserId: null, verified: false },
    ];
    expect(filterMyListings(rows, { id: 'u1' })).toHaveLength(2);
  });

  it('considers completed creator profiles public', () => {
    const profile = {
      active: true,
      status: true,
      name: 'Jane',
      role: 'DEV',
      industry: 'TECH',
      skills: 'React,TypeScript',
      location: 'Bengaluru',
      linked_in_id: 'sub-1',
      why_im_here: 'Build',
      expected_rate: '5000/month',
    };
    expect(isCommunityProfilePublic(profile)).toBe(true);
  });
});
