import { describe, expect, it } from 'vitest';
import {
  mergeHomepageAuctions,
  pickHomepagePreviewAuctions,
  resolveHomeAuctionDescription,
  resolveHomeAuctionPath,
  resolveHomeAuctionTitle,
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

  it('selects featured auctions first', () => {
    const picked = pickHomepagePreviewAuctions({
      domains: [
        { id: 'd1', status: 'ACTIVE', verified: true, featured: false, endTime: '2026-06-30T00:00:00Z' },
        { id: 'd2', status: 'ACTIVE', verified: true, featured: true, endTime: '2026-06-29T00:00:00Z' },
      ],
    }, 1);

    expect(picked[0].id).toBe('d2');
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
});
