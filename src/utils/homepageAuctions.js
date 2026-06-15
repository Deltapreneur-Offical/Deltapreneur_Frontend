import { resolveAuctionEndTime } from './auctionDate';
import { resolveAuctionDomainTitle } from './domainDisplay';
import { pickMediaUrl } from './mediaUrl';
import { HOMEPAGE_PREVIEW_LIMIT } from './homepageListings';

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const extractActiveList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export function normalizeDomainAuction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const domainRaw = raw.domain || {};
  return {
    category: 'domain',
    id: raw.id ?? raw.auctionId ?? raw.auction_id ?? null,
    status: String(raw.status || 'ACTIVE').toUpperCase(),
    minBidPrice: toNum(raw.minBidPrice ?? raw.min_bid_price, 0),
    currentHighestBid: toNum(raw.currentHighestBid ?? raw.current_highest_bid, 0),
    totalBids: toNum(raw.totalBids ?? raw.total_bids, 0),
    endTime: resolveAuctionEndTime(raw) ?? raw.endTime ?? raw.end_time ?? null,
    domainDisplayName: raw.domainDisplayName ?? raw.domain_display_name ?? null,
    domain: {
      ...domainRaw,
      fullDomain: domainRaw.fullDomain ?? domainRaw.full_domain ?? '',
      domainName: domainRaw.domainName ?? domainRaw.domain_name ?? '',
      domainExtension: domainRaw.domainExtension ?? domainRaw.domain_extension ?? '',
      verified: Boolean(domainRaw.verified ?? domainRaw.is_verified ?? false),
      logo: domainRaw.logo ?? domainRaw.imageUrl ?? null,
    },
  };
}

export function normalizeSoftwareAuction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const software = raw.software || {};
  let endTime = resolveAuctionEndTime(raw) ?? raw.endTime ?? raw.end_time ?? null;
  if (typeof endTime === 'string' && endTime && !endTime.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(endTime)) {
    endTime = `${endTime}Z`;
  }
  const base = normalizeDomainAuction(raw);
  if (!base) return null;
  return {
    ...base,
    category: 'technology',
    endTime,
    auctionTitle: raw.name || software.name || 'Technology',
    imageUrl: pickMediaUrl(raw) || pickMediaUrl(software) || raw.imageUrl || software.imageUrl || null,
    software,
  };
}

export function normalizeCommunityAuction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = normalizeDomainAuction(raw);
  if (!base) return null;
  const community = raw.community || {};
  return {
    ...base,
    category: 'community',
    auctionTitle: raw.auctionTitle ?? raw.auction_title ?? community.name ?? null,
    imageUrl: pickMediaUrl(community) || community.profileImageUrl || community.profilePicture || null,
    community,
  };
}

export function normalizeVentureAuction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const venture = raw.venture || {};
  const brand = venture.brandDetails || {};
  return {
    category: 'venture',
    id: raw.id ?? raw.auctionId ?? raw.auction_id ?? null,
    status: String(raw.status || 'ACTIVE').toUpperCase(),
    minBidPrice: toNum(raw.minBidPrice ?? raw.min_bid_price, 0),
    currentHighestBid: toNum(raw.currentHighestBid ?? raw.current_highest_bid, 0),
    totalBids: toNum(raw.totalBids ?? raw.total_bids, 0),
    endTime: resolveAuctionEndTime(raw) ?? raw.endTime ?? raw.end_time ?? null,
    auctionTitle: brand.brandName ?? brand.brand_name ?? null,
    imageUrl: pickMediaUrl(brand) || brand.ventureImageUrl || brand.logoUrl || null,
    venture: {
      ...venture,
      verified: Boolean(venture.verified),
      gstinVerified: Boolean(venture.gstinVerified ?? venture.gstin_verified),
    },
  };
}

export function normalizeListedVentureAuction(ventureRaw) {
  if (!ventureRaw || typeof ventureRaw !== 'object') return null;
  if (ventureRaw.status === false || ventureRaw.takenDown === true || ventureRaw.taken_down === true) {
    return null;
  }
  const auction = ventureRaw.auction;
  if (!auction || typeof auction !== 'object' || !auction.id) return null;

  const brand = ventureRaw.brandDetails || {};
  return normalizeVentureAuction({
    ...auction,
    venture: {
      id: ventureRaw.id,
      stage: ventureRaw.stage,
      verified: Boolean(ventureRaw.verified),
      gstinVerified: Boolean(ventureRaw.gstinVerified ?? ventureRaw.gstin_verified),
      brandDetails: {
        brandName: brand.brandName ?? brand.brand_name ?? '',
        industry: brand.industry ?? null,
        ventureImageUrl: pickMediaUrl(brand),
        logoUrl: pickMediaUrl(brand),
      },
    },
  });
}

export function isLiveHomepageAuction(auction) {
  if (!auction?.id) return false;
  const status = String(auction.status || '').toUpperCase();
  return status === 'ACTIVE' || status === 'EXTENDED';
}

export function resolveHomeAuctionTitle(auction) {
  if (!auction) return 'Auction';
  if (auction.category === 'domain') {
    return resolveAuctionDomainTitle(auction) || auction.domain?.fullDomain || 'Unnamed domain';
  }
  return auction.auctionTitle
    || auction.community?.name
    || auction.software?.name
    || auction.venture?.brandDetails?.brandName
    || 'Auction';
}

export function resolveHomeAuctionImage(auction) {
  if (!auction) return null;
  if (auction.category === 'domain') {
    return auction.domain?.logo || null;
  }
  return auction.imageUrl || null;
}

export function resolveHomeAuctionVerified(auction) {
  if (!auction) return false;
  if (auction.category === 'domain') {
    return Boolean(auction.domain?.verified ?? auction.verified);
  }
  if (auction.category === 'technology') return Boolean(auction.software?.verified);
  if (auction.category === 'venture') {
    return Boolean(auction.venture?.verified || auction.venture?.gstinVerified);
  }
  return true;
}

export function resolveHomeAuctionBidAmount(auction) {
  const highest = toNum(auction?.currentHighestBid, 0);
  const minimum = toNum(auction?.minBidPrice, 0);
  return highest > 0 ? highest : minimum;
}

export function resolveHomeAuctionPath(auction) {
  if (!auction?.id) return '/auctions';
  if (auction.category === 'domain') return `/auction/${auction.id}`;
  if (auction.category === 'venture') return `/venture-auction/${auction.id}`;
  if (auction.category === 'technology') return `/technology/auction/${auction.id}`;
  if (auction.category === 'community') return `/creator-auction/${auction.id}`;
  return '/auctions';
}

const HOME_AUCTION_CATEGORY_META = {
  domain: {
    labelKey: 'homeAuctionCategoryDomain',
    badgeClass: 'home-auction-preview-card__category-badge--domain',
  },
  venture: {
    labelKey: 'homeAuctionCategoryVenture',
    badgeClass: 'home-auction-preview-card__category-badge--venture',
  },
  technology: {
    labelKey: 'homeAuctionCategoryTechnology',
    badgeClass: 'home-auction-preview-card__category-badge--technology',
  },
  community: {
    labelKey: 'homeAuctionCategoryCreator',
    badgeClass: 'home-auction-preview-card__category-badge--creator',
  },
};

export function resolveHomeAuctionCategoryMeta(auction) {
  const category = auction?.category || 'domain';
  return HOME_AUCTION_CATEGORY_META[category] || HOME_AUCTION_CATEGORY_META.domain;
}

export function mergeHomepageAuctions({
  domains = [],
  ventures = [],
  community = [],
  software = [],
}) {
  const merged = [];
  const seen = new Set();

  const add = (item) => {
    if (!item?.id || !isLiveHomepageAuction(item)) return;
    const key = `${item.category}:${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };

  extractActiveList(domains).map((row) => (
    row?.category === 'domain' ? row : normalizeDomainAuction(row)
  )).filter(Boolean).forEach(add);
  extractActiveList(ventures).map((row) => (
    row?.category === 'venture' ? row : normalizeVentureAuction(row)
  )).filter(Boolean).forEach(add);
  extractActiveList(community).map((row) => (
    row?.category === 'community' ? row : normalizeCommunityAuction(row)
  )).filter(Boolean).forEach(add);
  extractActiveList(software).map((row) => (
    row?.category === 'technology' ? row : normalizeSoftwareAuction(row)
  )).filter(Boolean).forEach(add);

  return merged.sort((a, b) => {
    const endA = Date.parse(a.endTime || '') || Number.MAX_SAFE_INTEGER;
    const endB = Date.parse(b.endTime || '') || Number.MAX_SAFE_INTEGER;
    return endA - endB;
  });
}

export function pickHomepagePreviewAuctions(auctions, limit = HOMEPAGE_PREVIEW_LIMIT) {
  return mergeHomepageAuctions(auctions).slice(0, limit);
}

export { extractActiveList };
