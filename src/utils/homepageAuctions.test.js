import { describe, expect, it } from 'vitest';
import {
  buildHomeAuctionLikeItems,
  mergeHomepageAuctions,
  normalizeDomainAuction,
  pickHomepagePreviewAuctions,
  resolveAuctionCurrentHighestBid,
  resolveAuctionTotalBids,
  resolveHomeAuctionBadges,
  resolveHomeAuctionCurrentBidDisplay,
  resolveHomeAuctionDescription,
  resolveHomeAuctionLikeTarget,
  resolveHomeAuctionPath,
  resolveHomeAuctionPricingType,
  resolveHomeAuctionPricingTypeLabel,
  resolveHomeAuctionTitle,
  resolveHomeAuctionViews,
} from './homepageAuctions';

describe('homepageAuctions', () => {
  it('normalizes and merges auction rows across categories', () => {
    const merged = mergeHomepageAuctions({
      domains: [{ id: 'd1', status: 'ACTIVE', verified: true, endTime: '2026-06-30T00:00:00Z', domain: { fullDomain: 'alpha.com' } }],
      community: [{ id: 'c1', status: 'ACTIVE', community: { name: 'Creator One' }, endTime: '2026-06-25T00:00:00Z' }],
      software: [{ id: 's1', status: 'ACTIVE', software: { name: 'Tool One', verified: true }, endTime: '2026-06-20T00:00:00Z' }],
    });

    expect(merged.map((a) => a.id)).toEqual(['s1', 'c1', 'd1']);
  });

  it('selects only admin-featured auctions (Homepage Features rule)', () => {
    const picked = pickHomepagePreviewAuctions({
      domains: [
        { id: 'd1', status: 'ACTIVE', verified: true, featured: false, endTime: '2026-06-30T00:00:00Z' },
        { id: 'd2', status: 'ACTIVE', verified: true, featured: true, endTime: '2026-06-29T00:00:00Z' },
      ],
    }, 6);

    expect(picked.map((a) => a.id)).toEqual(['d2']);
  });

  it('returns no homepage auctions when none are featured', () => {
    const picked = pickHomepagePreviewAuctions({
      domains: [
        { id: 'd1', status: 'ACTIVE', verified: true, featured: false, endTime: '2026-06-30T00:00:00Z' },
      ],
    }, 6);

    expect(picked).toEqual([]);
  });

  it('builds category specific paths and descriptions', () => {
    const domain = {
      category: 'domain',
      id: 'd1',
      domain: { fullDomain: 'alpha.com', description: 'Great domain', pricingDemand: 'PREMIUM' },
    };
    const community = {
      category: 'community',
      id: 'c1',
      community: { name: 'Creator One', whyImHere: 'Build things' },
    };

    expect(resolveHomeAuctionPath(domain)).toBe('/auction/d1');
    expect(resolveHomeAuctionPath(community)).toBe('/creator-auction/c1');
    expect(resolveHomeAuctionTitle(domain)).toBe('alpha.com');
    expect(resolveHomeAuctionDescription(community)).toBe('Build things');
  });

  it('resolves profile views from auction and nested listing fields', () => {
    expect(resolveHomeAuctionViews({ views: 15 })).toBe(15);
    expect(resolveHomeAuctionViews({ view_count: 8 })).toBe(8);
    expect(resolveHomeAuctionViews({ domain: { views: 42 } })).toBe(42);
    expect(resolveHomeAuctionViews({ community: { view_count: 3 } })).toBe(3);
    expect(resolveHomeAuctionViews({})).toBe(0);
  });

  it('normalizes bid counts and pricing type from API payloads', () => {
    const normalized = normalizeDomainAuction({
      id: 'a1',
      status: 'ACTIVE',
      total_bids: 8,
      current_highest_bid: 1250000,
      min_bid_price: 500000,
      endTime: '2026-06-30T00:00:00Z',
      domain: {
        fullDomain: 'alpha.com',
        pricing_demand: 'NEGOTIABLE',
        views: 15,
      },
    });

    expect(normalized.totalBids).toBe(8);
    expect(normalized.currentHighestBid).toBe(1250000);
    expect(normalized.minBidPrice).toBe(500000);
    expect(normalized.views).toBe(15);
    expect(normalized.domain.pricingDemand).toBe('NEGOTIABLE');
    expect(resolveHomeAuctionPricingType(normalized)).toBe('Negotiable');
    expect(resolveAuctionTotalBids({ totalBids: 3 })).toBe(3);
    expect(resolveAuctionCurrentHighestBid({ current_highest_bid: 99 })).toBe(99);
  });

  it('shows NIL for current bid only when there are no bids', () => {
    const formatPrice = (n) => `₹${n}`;
    const t = (_key, opts) => opts?.defaultValue ?? _key;

    expect(resolveHomeAuctionCurrentBidDisplay(
      { totalBids: 0, currentHighestBid: 0, minBidPrice: 1000 },
      formatPrice,
      t,
    )).toBe('NIL');

    expect(resolveHomeAuctionCurrentBidDisplay(
      { totalBids: 2, currentHighestBid: 5000, minBidPrice: 1000 },
      formatPrice,
      t,
    )).toBe('₹5000');

    expect(resolveHomeAuctionCurrentBidDisplay(
      { totalBids: 1, currentHighestBid: 0, minBidPrice: 1000 },
      formatPrice,
      t,
    )).toBe('₹1000');
  });

  it('always shows a pricing type badge label with fallback', () => {
    const t = (_key, opts) => opts?.defaultValue ?? _key;

    expect(resolveHomeAuctionPricingTypeLabel({}, t)).toBe('Not Specified');
    expect(resolveHomeAuctionPricingTypeLabel({
      domain: { pricingDemand: 'NEGOTIABLE' },
    }, t)).toBe('Negotiable');

    const badges = resolveHomeAuctionBadges({ category: 'domain', domain: {} }, t);
    expect(badges[0]?.label).toBe('Not Specified');
  });

  it('includes pricing type badge for every domain auction with pricingDemand', () => {
    const auction = normalizeDomainAuction({
      id: 'd1',
      status: 'ACTIVE',
      endTime: '2026-06-30T00:00:00Z',
      domain: { fullDomain: 'alpha.com', pricingDemand: 'FIXED' },
    });
    const badges = resolveHomeAuctionBadges(auction);
    expect(badges.some((b) => b.label === 'Fixed')).toBe(true);
  });

  it('resolves like targets from nested listing ids', () => {
    expect(resolveHomeAuctionLikeTarget({
      category: 'domain',
      domain: { id: 'dom-1' },
    })).toEqual({ type: 'DOMAIN', entityId: 'dom-1' });

    expect(resolveHomeAuctionLikeTarget({
      category: 'community',
      communityId: 'com-1',
    })).toEqual({ type: 'COMMUNITY', entityId: 'com-1' });

    expect(buildHomeAuctionLikeItems([
      { category: 'technology', softwareId: 'sw-1' },
      { category: 'domain', domainId: 'dom-2' },
    ], 'technology')).toEqual([{ id: 'sw-1' }]);
  });
});
