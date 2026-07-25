import { asArray } from './asArray';
import { normalizeDomainRecord } from './domainApiAdapter';
import {
  HOMEPAGE_PREVIEW_LIMIT,
  pickHomepagePreviewListings,
} from './homepageListings';
import { filterPublicMarketplaceListings } from './listingVisibility';
import { fetchListPage, HOME_PREVIEW_PAGE_SIZE } from './listPagination';
import { resolveVaProfilePhotoUrl } from './virtualAssistantDisplay';

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

  if (type === 'virtual-assistant') {
    return {
      ...item,
      fullName: item.fullName ?? item.full_name ?? '',
      referenceNumber: item.referenceNumber ?? item.reference_number ?? '',
      applicationNumber: item.applicationNumber ?? item.application_number ?? null,
      applicationNumberDisplay: item.applicationNumberDisplay ?? item.application_number_display ?? null,
      roles: item.roles ?? '',
      bio: item.bio ?? item.shortBio ?? item.short_bio ?? '',
      skills: item.skills ?? '',
      languagesKnown: item.languagesKnown ?? item.languages_known ?? '',
      yearsExperience: item.yearsExperience ?? item.years_experience ?? '',
      availability: item.availability ?? '',
      location: item.location ?? '',
      profilePhotoUrl: resolveVaProfilePhotoUrl(item) ?? item.profilePhotoUrl ?? item.profile_photo_url ?? null,
      publicMonthlyPriceInr: item.publicMonthlyPriceInr ?? item.public_monthly_price_inr ?? null,
      publishStatus: item.publishStatus ?? item.publish_status ?? '',
      overallStatus: item.overallStatus ?? item.overall_status ?? '',
      applicationRoles: item.applicationRoles ?? item.application_roles ?? [],
      featured: Boolean(item.featured),
    };
  }

  return item;
}

/** Map a featured VA profile to the creator card shape used on the homepage. */
export function mapVirtualAssistantToCreatorCard(profile) {
  const normalized = normalizeHomepageListing(profile, 'virtual-assistant');
  if (!normalized) return null;

  const roles = (normalized.roles || '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
  const monthlyPrice = normalized.publicMonthlyPriceInr;

  return {
    ...normalized,
    name: normalized.fullName,
    role: roles[0] || 'Virtual Assistant',
    imageUrl: normalized.profilePhotoUrl,
    coverImageUrl: normalized.profilePhotoUrl,
    about: normalized.bio,
    description: normalized.bio,
    skills: normalized.skills,
    location: normalized.location,
    experience: normalized.yearsExperience,
    languagesKnown: normalized.languagesKnown,
    availability: normalized.availability,
    workType: normalized.availability,
    industry: roles[0] || 'Virtual Assistant',
    expectedRate: monthlyPrice != null && monthlyPrice !== '' ? `${monthlyPrice}/month` : '',
    featured: true,
  };
}

/** Featured rows first; fall back to public verified listings so rows never go blank. */
export function resolveHomepageSectionItems(
  items,
  type = 'domain',
  limit = HOMEPAGE_PREVIEW_LIMIT,
  { filterFn, treatAllAsFeatured = false } = {},
) {
  const normalized = asArray(items)
    .map((item) => {
      const row = normalizeHomepageListing(item, type);
      if (!row) return null;
      if (treatAllAsFeatured) return { ...row, featured: true };
      return row;
    })
    .filter(Boolean);

  const scoped = typeof filterFn === 'function'
    ? normalized.filter(filterFn)
    : normalized;

  const featured = pickHomepagePreviewListings(scoped, type, limit);
  if (featured.length > 0) return featured;

  return filterPublicMarketplaceListings(scoped, type).slice(0, limit);
}

async function fetchPublicCatalogPreview(
  requestFn,
  type,
  limit,
  { filterFn } = {},
) {
  const maxPages = 8;
  const merged = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { items, total } = await fetchListPage(requestFn, {
      page,
      pageSize: HOME_PREVIEW_PAGE_SIZE,
    });
    if (!items.length) break;

    merged.push(
      ...asArray(items)
        .map((item) => normalizeHomepageListing(item, type))
        .filter(Boolean),
    );

    let candidates = filterPublicMarketplaceListings(merged, type);
    if (typeof filterFn === 'function') {
      candidates = candidates.filter(filterFn);
    }
    if (candidates.length >= limit) {
      return candidates.slice(0, limit);
    }

    const reportedTotal = Number(total);
    if (
      items.length < HOME_PREVIEW_PAGE_SIZE
      || (Number.isFinite(reportedTotal) && merged.length >= reportedTotal)
    ) {
      break;
    }
  }

  let candidates = filterPublicMarketplaceListings(merged, type);
  if (typeof filterFn === 'function') {
    candidates = candidates.filter(filterFn);
  }
  return candidates.slice(0, limit);
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
      const featuredRows = resolveHomepageSectionItems(items, type, limit, {
        filterFn,
        treatAllAsFeatured: true,
      });
      return featuredRows;
    } catch {
      return [];
    }
  }

  return fetchPublicCatalogPreview(requestFn, type, limit, { filterFn });
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
