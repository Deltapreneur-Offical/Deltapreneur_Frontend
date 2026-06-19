import { asArray } from './asArray';
import { matchUserId } from './auctionLister';
import { isCreatorProfileComplete } from './creatorProfile';
import { isActiveListing } from './homepageListings';

/** @typedef {'domain' | 'venture' | 'software' | 'technology' | 'community'} ListingType */

export function normalizeListingType(type = 'domain') {
  if (type === 'technology') return 'software';
  return type || 'domain';
}

/** Owner user id on a listing record (supports snake_case API fields). */
export function getListingOwnerId(item, type = 'domain') {
  if (!item) return null;
  const listingType = normalizeListingType(type);

  if (listingType === 'community') {
    return (
      item.appUser?.id
      ?? item.appUserId
      ?? item.app_user_id
      ?? item.user?.id
      ?? item.userId
      ?? null
    );
  }

  if (listingType === 'venture') {
    return (
      item.listedBy?.id
      ?? item.listedByUserId
      ?? item.listed_by_user_id
      ?? item.listedBy?.userId
      ?? null
    );
  }

  return (
    item.listedBy?.id
    ?? item.listedByUserId
    ?? item.listed_by_user_id
    ?? item.userId
    ?? item.user_id
    ?? null
  );
}

/** Whether the logged-in user created this listing. */
export function isListingOwner(item, user, type = 'domain') {
  if (!item || user == null) return false;
  const userId = user.id ?? user.userId;
  if (userId == null) return false;
  const ownerId = getListingOwnerId(item, type);
  return matchUserId(userId, ownerId);
}

/** Whether a creator profile is public (homepage, browse, detail for non-owners). */
export function isCommunityProfilePublic(item) {
  if (!item || !isActiveListing(item, 'community')) return false;
  return isCreatorProfileComplete(item);
}

/** Whether a listing passed marketplace verification (domain / technology / venture / creator). */
export function isListingVerified(item, type = 'domain') {
  if (!item) return false;
  const listingType = normalizeListingType(type);

  if (listingType === 'venture') {
    const status = item.listingApprovalStatus ?? item.listing_approval_status;
    return status === 'APPROVED';
  }
  if (listingType === 'community') {
    return isCommunityProfilePublic(item);
  }
  return Boolean(item.verified);
}

/** Visible on public browse, search, homepage, and category pages. */
export function isPublicMarketplaceListing(item, type = 'domain') {
  const listingType = normalizeListingType(type);
  if (!isActiveListing(item, listingType)) return false;
  return isListingVerified(item, listingType);
}

export function filterPublicMarketplaceListings(items, type = 'domain') {
  const listingType = normalizeListingType(type);
  return asArray(items).filter((item) => isPublicMarketplaceListing(item, listingType));
}

/**
 * Owner "My Listings" tab — show every status (pending, under review, rejected, verified).
 * Does not apply verification filtering.
 */
export function filterMyListings(items, user, type = 'domain') {
  if (user?.id == null) return [];
  const listingType = normalizeListingType(type);
  const rows = asArray(items);
  const owned = rows.filter((item) => isListingOwner(item, user, listingType));

  if (owned.length > 0) return owned;

  // Owner-scoped API (/my-listings) may omit nested owner objects — trust the payload.
  if (rows.length > 0 && rows.every((item) => getListingOwnerId(item, listingType) == null)) {
    return rows;
  }

  return owned;
}

/**
 * Mixed browse: public verified listings plus the current owner's unverified ones.
 * (Use on combined feeds, not on dedicated "My Listings" tabs.)
 */
export function filterOwnerVisibleListings(items, type = 'domain', ownerId) {
  const listingType = normalizeListingType(type);
  const uid = ownerId != null ? String(ownerId) : '';

  return asArray(items).filter((item) => {
    if (!isActiveListing(item, listingType)) return false;
    if (isListingVerified(item, listingType)) return true;
    if (!uid) return false;
    const owner = getListingOwnerId(item, listingType);
    return owner != null && String(owner) === uid;
  });
}

/** Marketplace pages: "All" vs "My Listings". */
export function resolveMarketplaceListingRows(items, { tab, user, type = 'domain' }) {
  if (tab === 'mine') {
    return filterMyListings(items, user, type);
  }
  return filterPublicMarketplaceListings(items, type);
}

/**
 * Who may open a listing detail modal / deep link (?id=).
 * Public: verified listings only. Owners always see their own (any verification state).
 */
export function canViewListingDetail(item, user, type = 'domain') {
  if (!item) return false;
  const listingType = normalizeListingType(type);
  if (isListingOwner(item, user, listingType)) return true;
  return isPublicMarketplaceListing(item, listingType);
}
