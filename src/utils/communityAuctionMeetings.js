export function hasPlacedCommunityAuctionBid(bids, userId) {
  if (!userId) return false;
  const normalizedUserId = String(userId);
  return Array.isArray(bids) && bids.some((bid) => {
    const bidderId = bid?.bidderId ?? bid?.bidder_id ?? bid?.requesterId ?? bid?.requester_id;
    return bidderId != null && String(bidderId) === normalizedUserId;
  });
}
