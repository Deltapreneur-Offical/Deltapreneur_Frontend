import { describe, expect, it } from 'vitest';
import { isOpenProviderShowcaseRow, pickHomepagePreviewListings } from './homepageListings';

describe('isOpenProviderShowcaseRow', () => {
  it('detects OpenProvider showcase rows', () => {
    expect(isOpenProviderShowcaseRow({ source: 'openprovider_showcase' })).toBe(true);
    expect(isOpenProviderShowcaseRow({ showcaseId: 'abc' })).toBe(true);
    expect(isOpenProviderShowcaseRow({ id: 'm1', featured: true })).toBe(false);
  });
});

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

  it('keeps extra public domains after featured rows when the limit allows', () => {
    const marketplace = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i}`,
      featured: i < 2,
      verified: true,
      status: true,
      domainName: `listed${i}.com`,
    }));

    const picked = pickHomepagePreviewListings(marketplace, 'domain', 48);

    expect(picked).toHaveLength(8);
    expect(picked.slice(0, 2).every((row) => row.featured)).toBe(true);
  });

  it('defaults to 16 homepage preview cards', () => {
    const marketplace = Array.from({ length: 24 }, (_, i) => ({
      id: `m${i}`,
      featured: true,
      verified: true,
      status: true,
      domainName: `listed${i}.com`,
    }));

    expect(pickHomepagePreviewListings(marketplace, 'domain')).toHaveLength(16);
  });
});
