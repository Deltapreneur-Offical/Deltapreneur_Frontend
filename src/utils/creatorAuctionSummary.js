const ENDED_STATUSES = new Set(['ENDED', 'COMPLETED', 'UNSOLD', 'CLOSED']);
const LIVE_STATUSES = new Set(['ACTIVE', 'EXTENDED']);

export function mapAuctionStatusToDisplay(status) {
  const normalized = String(status || '').toUpperCase();
  if (LIVE_STATUSES.has(normalized)) return 'LIVE';
  if (normalized === 'PAYMENT_PENDING') return 'DRAFT';
  if (ENDED_STATUSES.has(normalized)) return 'ENDED';
  return 'DRAFT';
}

export function normalizeCreatorAuctionSummary(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const communityId = raw.communityId
    ?? raw.community_id
    ?? raw.creatorId
    ?? raw.creator_id;
  if (!communityId) return null;

  const displayStatus = raw.displayStatus
    ?? mapAuctionStatusToDisplay(raw.status);

  return {
    auctionId: raw.auctionId ?? raw.auction_id ?? raw.id ?? null,
    communityId: String(communityId),
    startingBid: Number(
      raw.startingBid ?? raw.minBidPrice ?? raw.min_bid_price ?? 0,
    ),
    currentBid: Number(
      raw.currentBid ?? raw.currentHighestBid ?? raw.current_highest_bid ?? 0,
    ),
    totalBids: Number(raw.totalBids ?? raw.total_bids ?? 0),
    status: raw.status ?? null,
    displayStatus,
    endTime: raw.endTime ?? raw.end_time ?? null,
    startTime: raw.startTime ?? raw.start_time ?? null,
    visibility: raw.visibility ?? (displayStatus === 'LIVE' ? 'PUBLIC' : 'DRAFT'),
    auctionTitle: raw.auctionTitle ?? raw.auction_title ?? null,
    winnerPaymentPaid: Boolean(raw.winnerPaymentPaid ?? raw.winner_payment_paid),
  };
}

export function auctionSummaryFromAuction(auction) {
  return normalizeCreatorAuctionSummary(auction);
}

export function buildAuctionsMapFromProfiles(profiles = []) {
  const map = {};
  profiles.forEach((profile) => {
    const summary = normalizeCreatorAuctionSummary(profile?.auctionSummary);
    if (summary) {
      map[String(profile.id)] = summary;
    }
  });
  return map;
}

export function hasActiveProfileAuction(summary) {
  if (!summary) return false;
  return summary.displayStatus === 'LIVE' || summary.displayStatus === 'DRAFT';
}
