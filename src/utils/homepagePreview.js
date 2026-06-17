import { asArray } from './asArray';
import { normalizeDomainRecord } from './domainApiAdapter';
import {
  HOMEPAGE_PREVIEW_LIMIT,
  pickHomepagePreviewListings,
} from './homepageListings';
import { filterPublicMarketplaceListings } from './listingVisibility';
import { fetchListPage, HOME_PREVIEW_PAGE_SIZE } from './listPagination';

/** Normalize API rows into the shape listing cards expect. */
export function normalizeHomepageListing(item, type = 'domain') {
  if (!item || typeof item !== 'object') return item;

  if (type === 'domain') {
    return normalizeDomainRecord(item);
  }

  if (type === 'software') {
    return {
      ...item,
      name: item.name ?? item.software_name ?? '',
      softwareStatus: item.softwareStatus ?? item.software_status ?? 'AVAILABLE',
      purchaseType: item.purchaseType ?? item.purchase_type ?? null,
      auctionApprovalStatus: item.auctionApprovalStatus ?? item.auction_approval_status ?? null,
      verified: Boolean(item.verified ?? item.is_verified),
      featured: Boolean(item.featured),
      logo: item.logo ?? item.image_url ?? null,
      listedBy: item.listedBy ?? item.listed_by ?? null,
      likeCount: Number(item.likeCount ?? item.like_count ?? 0),
      views: Number(item.views ?? item.view_count ?? 0),
      status: item.status !== false,
    };
  }

  if (type === 'venture') {
    const brand = item.brandDetails ?? item.brand_details ?? {};
    return {
      ...item,
      listingMode: item.listingMode ?? item.listing_mode ?? 'VENTURE',
      brandDetails: {
        ...brand,
        brandName: brand.brandName ?? brand.brand_name ?? item.name ?? '',
        description: brand.description ?? brand.brand_description ?? '',
        industry: brand.industry ?? brand.brand_industry ?? '',
        dealValue: Number(brand.dealValue ?? brand.deal_value ?? 0),
        logo: brand.logo ?? brand.brand_logo ?? item.logo ?? null,
      },
      listingApprovalStatus: item.listingApprovalStatus ?? item.listing_approval_status,
      saleType: item.saleType ?? item.sale_type ?? null,
      verified: Boolean(item.verified),
      featured: Boolean(item.featured),
      listedBy: item.listedBy ?? item.listed_by ?? null,
      likeCount: Number(item.likeCount ?? item.like_count ?? 0),
      views: Number(item.views ?? item.view_count ?? 0),
      status: item.status !== false,
    };
  }

  if (type === 'community') {
    return {
      ...item,
      name: item.name ?? '',
      role: item.role ?? '',
      industry: item.industry ?? '',
      skills: item.skills ?? '',
      location: item.location ?? '',
      imageUrl: item.imageUrl ?? item.image_url ?? null,
      whyImHere: item.whyImHere ?? item.why_im_here ?? '',
      expectedRate: item.expectedRate ?? item.expected_rate ?? null,
      featured: Boolean(item.featured),
      appUser: item.appUser ?? item.app_user ?? (item.app_user_id ? { id: item.app_user_id } : null),
      likeCount: Number(item.likeCount ?? item.like_count ?? 0),
      views: Number(item.views ?? 0),
    };
  }

  return item;
}

/** Featured rows first; fall back to public verified listings so rows never go blank. */
export function resolveHomepageSectionItems(
  items,
  type = 'domain',
  limit = HOMEPAGE_PREVIEW_LIMIT,
  { filterFn } = {},
) {
  const normalized = asArray(items)
    .map((item) => normalizeHomepageListing(item, type))
    .filter(Boolean);

  const scoped = typeof filterFn === 'function'
    ? normalized.filter(filterFn)
    : normalized;

  const featured = pickHomepagePreviewListings(scoped, type, limit);
  if (featured.length > 0) return featured;

  return filterPublicMarketplaceListings(scoped, type).slice(0, limit);
}

/** Fetch + normalize + pick homepage cards for paginated marketplace APIs. */
export async function fetchHomepageSectionPreview(
  requestFn,
  type = 'domain',
  limit = HOMEPAGE_PREVIEW_LIMIT,
  options = {},
) {
  const { filterFn, featuredQuery } = options;

  if (featuredQuery) {
    try {
      const { items } = await fetchListPage(requestFn, {
        page: 1,
        pageSize: limit,
        featured_only: true,
        ...featuredQuery,
      });
      const featuredRows = resolveHomepageSectionItems(items, type, limit, { filterFn });
      if (featuredRows.length > 0) {
        return featuredRows;
      }
    } catch {
      // Fall through to the public catalog fetch.
    }
  }

  // One page only — never scan the full catalog for a 5-card preview row.
  const { items } = await fetchListPage(requestFn, {
    page: 1,
    pageSize: HOME_PREVIEW_PAGE_SIZE,
  });
  return resolveHomepageSectionItems(items, type, limit, { filterFn });
}

/** Venture / co-venture homepage rows — featured API first, then public catalog fallback. */
export async function fetchHomepageVenturePreview(
  requestFn,
  listingMode,
  limit = HOMEPAGE_PREVIEW_LIMIT,
) {
  const filterFn = listingMode === 'CO_VENTURE'
    ? (venture) => (venture.listingMode ?? venture.listing_mode) === 'CO_VENTURE'
    : (venture) => (venture.listingMode ?? venture.listing_mode ?? 'VENTURE') !== 'CO_VENTURE';

  return fetchHomepageSectionPreview(requestFn, 'venture', limit, {
    filterFn,
    featuredQuery: { mode: listingMode },
  });
}
