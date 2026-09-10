/** Domain marketplace auction phase for listing cards. */

const LIVE = new Set(['ACTIVE', 'EXTENDED', 'DRAFT']);
const WINNER = new Set(['ENDED', 'PAYMENT_PENDING', 'COMPLETED']);
const IDLE = new Set(['UNSOLD', 'CANCELLED', 'CLOSED']);

export function listingAuctionStatus(item) {
  return String(
    item?.auction?.status
    ?? item?.auctionStatus
    ?? item?.auction_status
    ?? '',
  ).toUpperCase();
}

/**
 * idle   — regular sale (or auction ended with no bids)
 * live   — draft / active / extended auction
 * winner — auction ended with a winning bid
 */
export function listingAuctionPhase(item) {
  const status = listingAuctionStatus(item);
  if (IDLE.has(status)) return 'idle';
  if (WINNER.has(status)) return 'winner';
  if (LIVE.has(status)) return 'live';

  const saleType = String(item?.saleType ?? item?.sale_type ?? item?.purchaseType ?? '').toUpperCase();
  if (saleType === 'AUCTION' || item?.onAuction || item?.isAuction) return 'live';
  return 'idle';
}

export function canStartListingAuction(item) {
  if (!item) return false;
  const listingStatus = String(item.domainStatus ?? item.softwareStatus ?? item.software_status ?? '').toUpperCase();
  if (listingStatus === 'SOLD') return false;
  if (item.takenDown || item.taken_down) return false;
  return listingAuctionPhase(item) === 'idle';
}
