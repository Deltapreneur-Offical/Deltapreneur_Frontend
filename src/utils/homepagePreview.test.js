import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./listPagination', () => ({
  HOME_PREVIEW_PAGE_SIZE: 48,
  fetchListPage: vi.fn(),
}));

import { fetchListPage } from './listPagination';
import { fetchHomepageSectionPreview } from './homepagePreview';
import { isOpenProviderShowcaseRow } from './homepageListings';

describe('fetchHomepageSectionPreview', () => {
  beforeEach(() => {
    fetchListPage.mockReset();
  });

  it('returns only featured marketplace domains when fillCatalog is false', async () => {
    fetchListPage.mockResolvedValue({
      items: [
        {
          id: 'm1',
          featured: true,
          verified: true,
          status: true,
          domainName: 'listed.com',
        },
        {
          id: 'showcase-alatona',
          source: 'openprovider_showcase',
          showcaseId: 'alatona',
          featured: true,
          verified: true,
          status: true,
          domainName: 'alatona.com',
        },
      ],
      total: 2,
    });

    const rows = await fetchHomepageSectionPreview(
      vi.fn(),
      'domain',
      48,
      {
        featuredQuery: {},
        fillCatalog: false,
        filterFn: (item) => !isOpenProviderShowcaseRow(item),
      },
    );

    expect(rows.map((row) => row.domainName)).toEqual(['listed.com']);
    expect(fetchListPage).toHaveBeenCalledTimes(1);
    expect(fetchListPage.mock.calls[0][1]).toMatchObject({ featured_only: true });
  });

  it('keeps paging featured_only until marketplace rows are reached', async () => {
    const showcasePage = Array.from({ length: 48 }, (_, i) => ({
      id: `showcase-${i}`,
      source: 'openprovider_showcase',
      showcaseId: `${i}`,
      featured: true,
      verified: true,
      status: true,
      domainName: `prem${i}.com`,
    }));
    fetchListPage
      .mockResolvedValueOnce({ items: showcasePage, total: 49 })
      .mockResolvedValueOnce({
        items: [{
          id: 'm1',
          featured: true,
          verified: true,
          status: true,
          domainName: 'listed.com',
        }],
        total: 49,
      });

    const rows = await fetchHomepageSectionPreview(
      vi.fn(),
      'domain',
      48,
      {
        featuredQuery: {},
        fillCatalog: false,
        filterFn: (item) => !isOpenProviderShowcaseRow(item),
      },
    );

    expect(rows.map((row) => row.domainName)).toEqual(['listed.com']);
    expect(fetchListPage).toHaveBeenCalledTimes(2);
  });

  it('stops featured paging at maxPages even when more marketplace rows exist', async () => {
    const showcasePage = Array.from({ length: 48 }, (_, i) => ({
      id: `showcase-${i}`,
      source: 'openprovider_showcase',
      showcaseId: `${i}`,
      featured: true,
      verified: true,
      status: true,
      domainName: `prem${i}.com`,
    }));
    fetchListPage.mockResolvedValueOnce({ items: showcasePage, total: 96 });

    const rows = await fetchHomepageSectionPreview(
      vi.fn(),
      'domain',
      48,
      {
        featuredQuery: {},
        fillCatalog: false,
        maxPages: 1,
        filterFn: (item) => !isOpenProviderShowcaseRow(item),
      },
    );

    expect(rows).toEqual([]);
    expect(fetchListPage).toHaveBeenCalledTimes(1);
  });
});
