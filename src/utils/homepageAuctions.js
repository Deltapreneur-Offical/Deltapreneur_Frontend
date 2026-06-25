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
    featured: Boolean(raw.featured ?? false),
    minBidPrice: toNum(raw.minBidPrice ?? raw.min_bid_price, 0),
    currentHighestBid: toNum(raw.currentHighestBid ?? raw.current_highest_bid, 0),
    totalBids: toNum(raw.totalBids ?? raw.total_bids, 0),
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
      pricingDemand: domainRaw.pricingDemand ?? domainRaw.pricing_demand ?? null,
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
export function resolveHomeAuctionBadges(auction) {
  if (!auction) return [];

  const badges = [];
  const seen = new Set();
  const category = auction.category || 'domain';

  if (category === 'community') {
    const community = auction.community || {};
    pushAuctionBadge(badges, seen, community.industry, 'primary');
    pushAuctionBadge(badges, seen, community.role, 'primary');
    pushAuctionBadge(badges, seen, community.niche, 'primary');
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
      'primary',
    );
    pushAuctionBadge(badges, seen, software.subcategory || software.subCategory, 'secondary');
    return badges;
  }

  if (category === 'domain') {
    const domain = auction.domain || {};
    pushAuctionBadge(badges, seen, domain.pricingDemand ?? domain.pricing_demand, 'primary');
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
  const highest = toNum(auction?.currentHighestBid, 0);
  const minimum = toNum(auction?.minBidPrice, 0);
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
      subtitle: full || (domain.domainName && ext ? `${domain.domainName}${ext}` : 'Premium domain'),
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
      resolveHomeAuctionBadges(auction).map((badge) => badge.label.toLowerCase()),
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

export function pickHomepagePreviewAuctions(auctions, limit = HOMEPAGE_PREVIEW_LIMIT) {
  const merged = mergeHomepageAuctions(auctions);
  const featured = merged.filter((item) => Boolean(item.featured));
  let selected;
  if (featured.length >= limit) {
    selected = featured.slice(0, limit);
  } else if (featured.length > 0) {
    const featuredKeys = new Set(featured.map((item) => `${item.category}:${item.id}`));
    const remainder = merged.filter((item) => !featuredKeys.has(`${item.category}:${item.id}`));
    selected = [...featured, ...remainder].slice(0, limit);
  } else {
    selected = merged.slice(0, limit);
  }
  return selected;
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

export { extractActiveList };
