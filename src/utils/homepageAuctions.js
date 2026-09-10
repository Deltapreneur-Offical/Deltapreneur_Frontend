import { resolveAuctionEndTime } from './auctionDate';
import { resolveAuctionDomainTitle } from './domainDisplay';
import { pickMediaUrl } from './mediaUrl';
import { HOMEPAGE_PREVIEW_LIMIT } from './homepageListings';

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Extract list rows from active-auction API payloads (matches AuctionsPage). */
export function extractActiveList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

/** Total bids — same field resolution as useAuction / AuctionsPage. */
export function resolveAuctionTotalBids(raw) {
  if (!raw || typeof raw !== 'object') return 0;
  const direct = raw.totalBids ?? raw.total_bids ?? raw.bid_count ?? raw.bidCount ?? raw.totalBidCount;
  if (direct != null && direct !== '') {
    const n = Number(direct);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (Array.isArray(raw.bids)) return raw.bids.length;
  return 0;
}

/** Current highest bid — same field resolution as useAuction / AuctionsPage. */
export function resolveAuctionCurrentHighestBid(raw) {
  if (!raw || typeof raw !== 'object') return 0;
  const direct = raw.currentHighestBid
    ?? raw.current_highest_bid
    ?? raw.current_bid
    ?? raw.currentBid
    ?? raw.highest_bid
    ?? raw.highestBid;
  if (direct != null && direct !== '') {
    const n = Number(direct);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

/** Minimum / starting bid. */
export function resolveAuctionMinBidPrice(raw) {
  if (!raw || typeof raw !== 'object') return 0;
  return toNum(raw.minBidPrice ?? raw.min_bid_price ?? raw.startingBid ?? raw.starting_bid, 0);
}

/** Profile / listing view count from auction payload or nested listing. */
export function resolveHomeAuctionViews(auction) {
  if (!auction || typeof auction !== 'object') return 0;
  const domain = auction.domain || {};
  const community = auction.community || {};
  const software = auction.software || {};
  const candidates = [
    auction.views,
    auction.view_count,
    auction.viewCount,
    auction.profile_views,
    auction.profileViews,
    auction.total_views,
    auction.totalViews,
    domain.views,
    domain.view_count,
    domain.viewCount,
    community.views,
    community.view_count,
    community.viewCount,
    software.views,
    software.view_count,
    software.viewCount,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function formatPricingTypeLabel(value) {
  const key = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!key) return '';
  if (key === 'FIXED' || key === 'FIXED_PRICE') return 'Fixed';
  if (key === 'NEGOTIABLE') return 'Negotiable';
  if (key === 'PREMIUM') return 'Premium';
  return String(value).trim().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pricing type (Fixed / Negotiable / etc.) from listing nested on the auction. */
export function resolveHomeAuctionPricingType(auction) {
  if (!auction || typeof auction !== 'object') return '';
  const domain = auction.domain || {};
  const software = auction.software || {};
  const candidates = [
    domain.pricingDemand,
    domain.pricing_demand,
    domain.pricingType,
    domain.pricing_type,
    software.pricingDemand,
    software.pricing_demand,
    software.pricingType,
    software.pricing_type,
    auction.pricingDemand,
    auction.pricing_demand,
    auction.pricingType,
    auction.pricing_type,
  ];
  for (const value of candidates) {
    const label = formatPricingTypeLabel(value);
    if (label) return label;
  }
  return '';
}

/** Current bid display — NIL only when there are genuinely no bids. */
export function resolveHomeAuctionCurrentBidDisplay(auction, formatPrice, t) {
  const totalBids = resolveAuctionTotalBids(auction);
  const currentHighestBid = resolveAuctionCurrentHighestBid(auction);

  if (totalBids <= 0 && currentHighestBid <= 0) {
    return t('homeAuctionNoBidYet', { defaultValue: 'NIL' });
  }

  const amount = currentHighestBid > 0 ? currentHighestBid : resolveAuctionMinBidPrice(auction);
  return formatPrice(amount);
}

/** Pricing type label with fallback when the backend omits pricing metadata. */
export function resolveHomeAuctionPricingTypeLabel(auction, t) {
  const pricingType = resolveHomeAuctionPricingType(auction);
  if (pricingType) return pricingType;
  return t?.('homeAuctionPricingNotSpecified', { defaultValue: 'Not Specified' }) ?? 'Not Specified';
}

/** Entity id + like API type for the listing behind a homepage auction card. */
export function resolveHomeAuctionLikeTarget(auction) {
  if (!auction || typeof auction !== 'object') return null;
  const category = auction.category || 'domain';

  if (category === 'domain') {
    const entityId = auction.domain?.id ?? auction.domainId ?? auction.domain_id;
    return entityId ? { type: 'DOMAIN', entityId: String(entityId) } : null;
  }

  if (category === 'community') {
    const entityId = auction.community?.id ?? auction.communityId ?? auction.community_id;
    return entityId ? { type: 'COMMUNITY', entityId: String(entityId) } : null;
  }

  if (category === 'technology') {
    const entityId = auction.software?.id ?? auction.softwareId ?? auction.software_id;
    return entityId ? { type: 'SOFTWARE', entityId: String(entityId) } : null;
  }

  return null;
}

/** Build `{ id }` rows for useLikes from homepage auction cards. */
export function buildHomeAuctionLikeItems(auctions, category) {
  return (Array.isArray(auctions) ? auctions : [])
    .filter((auction) => (auction?.category || 'domain') === category)
    .map((auction) => {
      const target = resolveHomeAuctionLikeTarget(auction);
      return target ? { id: target.entityId } : null;
    })
    .filter(Boolean);
}

export function normalizeDomainAuction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const domainRaw = raw.domain || {};
  const minBidPrice = resolveAuctionMinBidPrice(raw);
  const currentHighestBid = resolveAuctionCurrentHighestBid(raw);
  const totalBids = resolveAuctionTotalBids(raw);
  const views = resolveHomeAuctionViews(raw);
  const pricingDemand = domainRaw.pricingDemand
    ?? domainRaw.pricing_demand
    ?? raw.pricingDemand
    ?? raw.pricing_demand
    ?? null;

  return {
    ...raw,
    category: raw.category || 'domain',
    id: raw.id ?? raw.auctionId ?? raw.auction_id ?? null,
    status: String(raw.status || 'ACTIVE').toUpperCase(),
    featured: Boolean(raw.featured ?? false),
    minBidPrice,
    currentHighestBid,
    totalBids,
    views,
    endTime: resolveAuctionEndTime(raw) ?? raw.endTime ?? raw.end_time ?? null,
    domainDisplayName: raw.domainDisplayName ?? raw.domain_display_name ?? null,
    listedBy: raw.listedBy ?? raw.listed_by ?? domainRaw.listedBy ?? domainRaw.listed_by ?? null,
    domain: {
      ...domainRaw,
      fullDomain: domainRaw.fullDomain ?? domainRaw.full_domain ?? '',
      domainName: domainRaw.domainName ?? domainRaw.domain_name ?? '',
      domainExtension: domainRaw.domainExtension ?? domainRaw.domain_extension ?? '',
      verified: Boolean(domainRaw.verified ?? domainRaw.is_verified ?? false),
      logo: pickMediaUrl(domainRaw),
      pricingDemand,
      views: domainRaw.views ?? domainRaw.view_count ?? domainRaw.viewCount ?? views,
      listedBy: domainRaw.listedBy ?? domainRaw.listed_by ?? null,
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
    featured: Boolean(raw.featured ?? false),
    auctionTitle: raw.name || software.name || 'Technology',
    imageUrl: pickMediaUrl(raw) || pickMediaUrl(software) || raw.imageUrl || software.imageUrl || null,
    software,
  };
}

const SKIPPED_AUCTION_BADGE_VALUES = new Set([
  'open to all',
  'open_to_all',
]);

function formatAuctionBadgeLabel(value) {
  const pricingLabel = formatPricingTypeLabel(value);
  if (pricingLabel) return pricingLabel;
  const text = String(value || '').trim();
  if (!text) return '';
  return text.replace(/_/g, ' ');
}

function pushAuctionBadge(badges, seen, value, tone = 'primary') {
  const label = formatAuctionBadgeLabel(value);
  const key = label.toLowerCase();
  if (!label || seen.has(key) || SKIPPED_AUCTION_BADGE_VALUES.has(key)) return;
  seen.add(key);
  badges.push({ label, tone });
}

/** Venture-style badge chips for homepage auction preview cards. */
export function resolveHomeAuctionBadges(auction, t) {
  if (!auction) return [];

  const badges = [];
  const seen = new Set();
  const category = auction.category || 'domain';
  const pricingLabel = resolveHomeAuctionPricingTypeLabel(auction, t);

  badges.push({ label: pricingLabel, tone: 'primary' });
  seen.add(pricingLabel.toLowerCase());

  if (category === 'community') {
    const community = auction.community || {};
    pushAuctionBadge(badges, seen, community.industry, 'secondary');
    pushAuctionBadge(badges, seen, community.role, 'secondary');
    pushAuctionBadge(badges, seen, community.niche, 'secondary');
    pushAuctionBadge(badges, seen, auction.workType ?? auction.work_type, 'secondary');

    const skillsRaw = auction.auctionSkills ?? auction.auction_skills ?? community.skills;
    if (skillsRaw) {
      String(skillsRaw)
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
        .slice(0, 2)
        .forEach((skill) => pushAuctionBadge(badges, seen, skill, 'secondary'));
    }
    return badges;
  }

  if (category === 'technology') {
    const software = auction.software || {};
    pushAuctionBadge(
      badges,
      seen,
      software.category || software.techCategory || software.type,
      'secondary',
    );
    pushAuctionBadge(badges, seen, software.subcategory || software.subCategory, 'secondary');
    return badges;
  }

  if (category === 'domain') {
    const domain = auction.domain || {};
    pushAuctionBadge(badges, seen, domain.domainCategory ?? domain.domain_category, 'secondary');
  }

  return badges;
}

function isAuctionBadgeLikeText(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (SKIPPED_AUCTION_BADGE_VALUES.has(text.toLowerCase())) return true;
  return /^[A-Z0-9_]+$/.test(text) && text.includes('_');
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
    additionalInfo: raw.additionalInfo ?? raw.additional_info ?? null,
    workType: raw.workType ?? raw.work_type ?? null,
    auctionSkills: raw.auctionSkills ?? raw.auction_skills ?? null,
    imageUrl: pickMediaUrl(community) || community.profileImageUrl || community.profilePicture || null,
    community: {
      ...community,
      listedBy: community.listedBy ?? community.listed_by ?? raw.listedBy ?? raw.listed_by ?? community.appUser ?? null,
    },
  };
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
    || 'Auction';
}

export function resolveHomeAuctionImage(auction) {
  if (!auction) return null;
  if (auction.category === 'domain') {
    return pickMediaUrl(auction.domain);
  }
  return pickMediaUrl(auction) || auction.imageUrl || null;
}

export function resolveHomeAuctionVerified(auction) {
  if (!auction) return false;
  if (auction.category === 'domain') {
    return Boolean(auction.domain?.verified ?? auction.verified);
  }
  if (auction.category === 'technology') return Boolean(auction.software?.verified);
  return Boolean(auction.community?.isApproved ?? auction.community?.is_approved);
}

export function resolveHomeAuctionBidAmount(auction) {
  const highest = resolveAuctionCurrentHighestBid(auction);
  const minimum = resolveAuctionMinBidPrice(auction);
  return highest > 0 ? highest : minimum;
}

export function resolveHomeAuctionPath(auction) {
  if (!auction?.id) return '/auctions';
  if (auction.category === 'domain') return `/auction/${auction.id}`;
  if (auction.category === 'technology') return `/technology/auction/${auction.id}`;
  if (auction.category === 'community') return `/creator-auction/${auction.id}`;
  return '/auctions';
}

const HOME_AUCTION_CATEGORY_META = {
  domain: {
    labelKey: 'homeAuctionCategoryDomain',
    badgeClass: 'home-auction-preview-card__category-badge--domain',
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

/** Subtitle + detail lines for homepage auction cards. */
export function resolveHomeAuctionDetails(auction) {
  if (!auction) return { subtitle: '', detail: '' };

  const category = auction.category || 'domain';

  if (category === 'domain') {
    const domain = auction.domain || {};
    const ext = domain.domainExtension || domain.domain_extension || '';
    const full = domain.fullDomain || domain.full_domain || '';
    const pricing = domain.pricingDemand ?? domain.pricing_demand;
    return {
      subtitle: full || (domain.domainName && ext ? `${domain.domainName}${ext}` : 'Delta Domains'),
      detail: pricing ? String(pricing).replace(/_/g, ' ') : 'Domain auction listing',
    };
  }

  if (category === 'technology') {
    const software = auction.software || {};
    const categoryLabel = software.category || software.techCategory || software.type;
    return {
      subtitle: categoryLabel ? String(categoryLabel).replace(/_/g, ' ') : 'Technology software',
      detail: software.whatItDoes || software.tagline || software.description || software.useCase || '',
    };
  }

  if (category === 'community') {
    const community = auction.community || {};
    return {
      subtitle: community.industry || community.location || '',
      detail: community.whyImHere || community.why_im_here || '',
    };
  }

  return { subtitle: '', detail: '' };
}

const GENERIC_HOME_AUCTION_DESCRIPTIONS = new Set([
  'domain auction listing',
  'creator profile auction',
  'technology software',
]);

/** Short description for homepage auction preview cards (below title). */
export function resolveHomeAuctionDescription(auction) {
  if (!auction) return '';

  const category = auction.category || 'domain';

  if (category === 'domain') {
    const domain = auction.domain || {};
    const description = String(domain.description || '').trim();
    const pricing = String(domain.pricingDemand ?? domain.pricing_demand ?? '').trim().toUpperCase();
    if (!description) return '';
    if (pricing && description.toUpperCase().replace(/\s+/g, '_') === pricing) return '';
    if (/^(NEGOTIABLE|FIXED_PRICE|FIXED)$/i.test(description.replace(/\s+/g, '_'))) return '';
    return description;
  }

  if (category === 'community') {
    const community = auction.community || {};
    const badgeLabels = new Set(
      resolveHomeAuctionBadges(auction, null).map((badge) => badge.label.toLowerCase()),
    );
    const candidates = [
      community.whyImHere,
      community.why_im_here,
      community.bio,
      community.headline,
      community.description,
      auction.additionalInfo,
    ];
    const title = resolveHomeAuctionTitle(auction);
    for (const candidate of candidates) {
      const text = String(candidate || '').trim();
      if (!text) continue;
      if (GENERIC_HOME_AUCTION_DESCRIPTIONS.has(text.toLowerCase())) continue;
      if (isAuctionBadgeLikeText(text)) continue;
      if (badgeLabels.has(text.toLowerCase())) continue;
      if (badgeLabels.has(formatAuctionBadgeLabel(text).toLowerCase())) continue;
      if (text.toLowerCase() === title.trim().toLowerCase()) continue;
      return text;
    }
    return '';
  }

  const { detail, subtitle } = resolveHomeAuctionDetails(auction);
  const detailText = String(detail || '').trim();
  if (detailText && !GENERIC_HOME_AUCTION_DESCRIPTIONS.has(detailText.toLowerCase())) {
    return detailText;
  }

  const subtitleText = String(subtitle || '').trim();
  const title = resolveHomeAuctionTitle(auction);
  if (
    subtitleText
    && !GENERIC_HOME_AUCTION_DESCRIPTIONS.has(subtitleText.toLowerCase())
    && subtitleText.toLowerCase() !== title.trim().toLowerCase()
  ) {
    return subtitleText;
  }

  return '';
}

export function mergeHomepageAuctions({
  domains = [],
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

  extractActiveList(domains).map(normalizeDomainAuction).filter(Boolean).forEach(add);
  extractActiveList(community).map(normalizeCommunityAuction).filter(Boolean).forEach(add);
  extractActiveList(software).map(normalizeSoftwareAuction).filter(Boolean).forEach(add);

  return merged.sort((a, b) => {
    const endA = Date.parse(a.endTime || '') || Number.MAX_SAFE_INTEGER;
    const endB = Date.parse(b.endTime || '') || Number.MAX_SAFE_INTEGER;
    return endA - endB;
  });
}

/** Homepage auction row: featured live auctions first, then remaining live auctions. */
export function pickHomepagePreviewAuctions(auctions, limit = HOMEPAGE_PREVIEW_LIMIT) {
  const live = mergeHomepageAuctions(auctions);
  const featured = live.filter((item) => Boolean(item.featured));
  const featuredIds = new Set(featured.map((item) => `${item.category}:${item.id}`));
  const rest = live.filter((item) => !featuredIds.has(`${item.category}:${item.id}`));
  return [...featured, ...rest].slice(0, limit);
}

/** Normalize admin auction rows into homepage-feature selector items. */
export function adminAuctionRowToFeatureItem(row, category) {
  const auctionRaw = row?.auction ?? row;
  if (!auctionRaw?.id) return null;

  let normalized;
  if (category === 'domain') {
    normalized = normalizeDomainAuction({
      ...auctionRaw,
      domain: row?.domain ?? auctionRaw.domain,
    });
  } else if (category === 'community') {
    normalized = normalizeCommunityAuction({
      ...auctionRaw,
      community: row?.community ?? auctionRaw.community,
    });
  } else {
    normalized = normalizeSoftwareAuction({
      ...auctionRaw,
      software: row?.software ?? auctionRaw.software,
    });
  }

  if (!normalized || !isLiveHomepageAuction(normalized)) return null;

  return {
    id: `${category}:${normalized.id}`,
    auctionId: normalized.id,
    category,
    status: normalized.status,
    featured: Boolean(auctionRaw.featured ?? normalized.featured),
    title: resolveHomeAuctionTitle(normalized),
  };
}

export function mergeAdminHomepageAuctionItems(domainRows = [], communityRows = [], softwareRows = []) {
  const items = [];
  extractActiveList(domainRows).forEach((row) => {
    const item = adminAuctionRowToFeatureItem(row, 'domain');
    if (item) items.push(item);
  });
  extractActiveList(communityRows).forEach((row) => {
    const item = adminAuctionRowToFeatureItem(row, 'community');
    if (item) items.push(item);
  });
  extractActiveList(softwareRows).forEach((row) => {
    const item = adminAuctionRowToFeatureItem(row, 'technology');
    if (item) items.push(item);
  });
  return items.sort((a, b) => a.title.localeCompare(b.title));
}
