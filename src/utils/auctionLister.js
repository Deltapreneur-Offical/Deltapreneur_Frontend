/** Detect auction lister/owner — must not pay participation fee or bid (Java parity). */

export function matchUserId(userId, ...candidates) {
  if (userId == null || userId === '') return false;
  const uid = String(userId);
  return candidates.filter(v => v != null && v !== '').map(String).includes(uid);
}

export function isCommunityAuctionLister(auction, userId) {
  if (!auction) return false;
  const community = auction.community || {};
  return matchUserId(
    userId,
    community.appUser?.id,
    community.appUserId,
    community.user?.id,
    auction.createdBy,
    auction.created_by,
  );
}

export function isSoftwareAuctionLister(auction, userId) {
  if (!auction) return false;
  const software = auction.software || {};
  return matchUserId(
    userId,
    software.listedBy?.id,
    software.listedByUserId,
    software.listed_by_user_id,
  );
}

export function isDomainAuctionLister(auction, userId) {
  if (!auction) return false;
  const domain = auction.domain || {};
  return matchUserId(
    userId,
    domain.listedBy?.id,
    domain.listedByUserId,
    domain.listed_by_user_id,
    auction.createdBy,
    auction.created_by,
  );
}

/** Merge local lister detection with API participation status. */
export function resolveAuctionLister(localLister, participationStatus) {
  if (localLister) return true;
  return Boolean(participationStatus?.isOwner);
}

/** Display name for the member who listed an auction. */
export function resolveAuctionListerName(auction) {
  if (!auction || typeof auction !== 'object') return null;

  const listedBy = auction.listedBy
    ?? auction.domain?.listedBy
    ?? auction.software?.listedBy
    ?? auction.community?.listedBy
    ?? auction.community?.appUser
    ?? auction.creator;

  if (listedBy && typeof listedBy === 'object') {
    const fullName = [listedBy.firstname, listedBy.lastname].filter(Boolean).join(' ').trim();
    const name = fullName || listedBy.name || listedBy.fullName || listedBy.username || listedBy.email;
    if (name) return name;
  }

  const community = auction.community;
  if (community && typeof community === 'object') {
    const profileName = community.name || community.displayName;
    if (profileName) return profileName;
  }

  return null;
}
