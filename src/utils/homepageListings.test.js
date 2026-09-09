import { describe, expect, it } from 'vitest';
import { pickHomepagePreviewListings } from './homepageListings';

describe('pickHomepagePreviewListings', () => {
  it('keeps ticked OpenProvider showcase domains in the homepage preview', () => {
    const marketplace = Array.from({ length: 6 }, (_, i) => ({
      id: `m${i}`,
      featured: true,
      verified: true,
      status: true,
      domainName: `listed${i}.com`,
      updatedAt: `2026-09-07T12:0${i}:00Z`,
    }));
    const showcase = {
      id: 'showcase-kokini',
      source: 'openprovider_showcase',
      showcaseId: 'abc',
      featured: true,
      verified: true,
      status: true,
      domainName: 'kokini.com',
    };

    const picked = pickHomepagePreviewListings(
      [...marketplace, showcase],
      'domain',
      6,
    );

    expect(picked.some((row) => row.domainName === 'kokini.com')).toBe(true);
    expect(picked[0].domainName).toBe('kokini.com');
    expect(picked).toHaveLength(6);
  });
});
