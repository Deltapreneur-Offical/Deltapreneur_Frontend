/** Shared UI rules for technology (software) auction requests on listing cards / dashboard. */

import { matchUserId } from './auctionLister';

const LIVE_AUCTION_STATUSES = new Set(['ACTIVE', 'EXTENDED']);

function softwareListingStatus(item) {
  return String(item?.softwareStatus ?? item?.software_status ?? '').toUpperCase();
}

/** True when the logged-in user created this technology listing. */
export function isTechnologyListingOwner(item, user) {
  if (!item || !user?.id) return false;
  return matchUserId(
    user.id,
    item.listedBy?.id,
    item.listedByUserId,
    item.listed_by_user_id,
  );
}

export function resolveTechnologyAuctionMeta(item, auctionStatus) {
  if (auctionStatus) return auctionStatus;
  if (!item?.auctionId && !item?.auctionApprovalStatus) return null;
  return {
    id: item.auctionId,
    approvalStatus: item.auctionApprovalStatus,
    status: item.auctionStatus,
  };
}

export function isTechnologyAuctionPending(item, auctionStatus) {
  if (isTechnologyAuctionLive(item, auctionStatus)) return false;
  const meta = resolveTechnologyAuctionMeta(item, auctionStatus);
  return (
    meta?.approvalStatus === 'PENDING_APPROVAL'
    || item?.auctionApprovalStatus === 'PENDING_APPROVAL'
  );
}

export function isTechnologyAuctionLive(item, auctionStatus) {
  const meta = resolveTechnologyAuctionMeta(item, auctionStatus);
  if (!meta?.id && !item?.auctionId) return false;

  const approval = String(meta?.approvalStatus || item?.auctionApprovalStatus || '').toUpperCase();
  if (approval && approval !== 'APPROVED') return false;

  const status = String(meta?.status || item?.auctionStatus || '').toUpperCase();
  if (status) return LIVE_AUCTION_STATUSES.has(status);

  return item?.purchaseType === 'AUCTION' && approval === 'APPROVED';
}

export function canRequestTechnologyAuction(item, auctionStatus) {
  const status = softwareListingStatus(item);
  if (!item || status === 'SOLD') return false;
  if (isTechnologyAuctionPending(item, auctionStatus)) return false;
  if (isTechnologyAuctionLive(item, auctionStatus)) return false;
  if (isTechnologyAuctionAwaitingWinner(item, auctionStatus)) return false;

  const meta = resolveTechnologyAuctionMeta(item, auctionStatus);
  const approval = String(meta?.approvalStatus || item?.auctionApprovalStatus || '').toUpperCase();
  if (approval === 'REJECTED') return true;

  const ended = String(meta?.status || item?.auctionStatus || '').toUpperCase();
  if (approval === 'APPROVED' && ['UNSOLD', 'CLOSED'].includes(ended)) {
    return true;
  }

  return (status === 'AVAILABLE' || status === '') && !approval;
}

export function isTechnologyAuctionAwaitingWinner(item, auctionStatus) {
  const meta = resolveTechnologyAuctionMeta(item, auctionStatus);
  const status = String(meta?.status || item?.auctionStatus || '').toUpperCase();
  return ['ENDED', 'PAYMENT_PENDING', 'COMPLETED'].includes(status);
}

export function technologyAuctionId(item, auctionStatus) {
  const meta = resolveTechnologyAuctionMeta(item, auctionStatus);
  return meta?.id || item?.auctionId || null;
}
