import { matchUserId } from './auctionLister';

export function getVentureDealUserId(user) {
  return user?.id ?? user?.userId ?? null;
}

export function isVentureDealBuyer(deal, user) {
  const userId = getVentureDealUserId(user);
  if (!userId || !deal) return false;
  return matchUserId(userId, deal.buyerId, deal.buyer_id);
}

export function isVentureDealSeller(deal, user) {
  const userId = getVentureDealUserId(user);
  if (!userId || !deal) return false;
  return matchUserId(userId, deal.sellerId, deal.seller_id);
}

export function getVentureDealAmount(deal) {
  const fromDeal = Number(deal?.grossAmountInr ?? deal?.gross_amount_inr ?? 0);
  if (fromDeal > 0) return fromDeal;
  const venture = deal?.venture || {};
  const fromListing = Number(
    venture.dealValue
    ?? venture.deal_value
    ?? venture.brandDetails?.dealValue
    ?? venture.brand_details?.deal_value
    ?? 0,
  );
  return fromListing > 0 ? fromListing : 0;
}

export function ventureDealRequiresPayment(deal) {
  return getVentureDealAmount(deal) > 0;
}

export function ventureDealCanPay(deal, user) {
  return (
    isVentureDealBuyer(deal, user)
    && ventureDealRequiresPayment(deal)
    && deal?.dealStatus === 'PENDING_PAYMENT'
  );
}

export function ventureDealShowPaymentSection(deal) {
  return ventureDealRequiresPayment(deal);
}
