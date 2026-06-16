import { normalizeContactInfo } from './ventureProfileUtils';

export function normalizeDomainRecord(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const auctionRaw = raw.auction ?? null;
  const auction = auctionRaw && typeof auctionRaw === 'object'
    ? {
        ...auctionRaw,
        id: auctionRaw.id ?? null,
        status: auctionRaw.status ?? null,
        minBidPrice: Number(auctionRaw.minBidPrice ?? auctionRaw.min_bid_price ?? 0),
        currentHighestBid: Number(auctionRaw.currentHighestBid ?? auctionRaw.current_highest_bid ?? 0),
        totalBids: Number(auctionRaw.totalBids ?? auctionRaw.total_bids ?? 0),
        endTime: auctionRaw.endTime ?? auctionRaw.end_time ?? null,
        startTime: auctionRaw.startTime ?? auctionRaw.start_time ?? null,
      }
    : null;
  return {
    ...raw,
    domainName: raw.domainName ?? raw.domain_name ?? '',
    domainExtension: raw.domainExtension ?? raw.domain_extension ?? '',
    domainStatus: raw.domainStatus ?? raw.domain_status ?? 'AVAILABLE',
    askingPrice: Number(raw.askingPrice ?? raw.asking_price ?? 0),
    listingPrice: Number(raw.listingPrice ?? raw.listing_price ?? raw.askingPrice ?? raw.asking_price ?? 0),
    commissionPercentage: Number(raw.commissionPercentage ?? raw.commission_percentage ?? raw.platformCommissionPercent ?? raw.platform_commission_percent ?? 0),
    commissionAmount: Number(raw.commissionAmount ?? raw.commission_amount ?? raw.platformCommissionAmount ?? raw.platform_commission_amount ?? 0),
    sellerPayoutAmount: Number(raw.sellerPayoutAmount ?? raw.seller_payout_amount ?? raw.sellerPrice ?? raw.seller_price ?? 0),
    pricingDemand: raw.pricingDemand ?? raw.pricing_demand ?? null,
    saleType: raw.saleType ?? raw.sale_type ?? 'ONE_TIME',
    listingType: raw.listingType ?? raw.listing_type ?? (
      (raw.saleType ?? raw.sale_type) === 'AUCTION' ? 'domain_auction' : 'normal_domain'
    ),
    verificationStatus: raw.verificationStatus ?? raw.verification_status ?? 'PENDING',
    verificationRejectionReason: raw.verificationRejectionReason ?? raw.verification_rejection_reason ?? null,
    verificationAdminNote: raw.verificationAdminNote ?? raw.verification_admin_note ?? null,
    adminListed: Boolean(raw.adminListed ?? raw.admin_listed ?? false),
    listedBy: raw.listedBy ?? raw.listed_by ?? null,
    listedByUserId: raw.listedByUserId ?? raw.listed_by_user_id ?? null,
    paymentStatus: raw.paymentStatus ?? raw.payment_status ?? null,
    purchasedByUserId: raw.purchasedByUserId ?? raw.purchased_by_user_id ?? null,
    soldAt: raw.soldAt ?? raw.sold_at ?? null,
    verified: Boolean(raw.verified ?? raw.is_verified ?? false),
    takenDown: Boolean(raw.takenDown ?? raw.taken_down ?? false),
    takeDownReason: raw.takeDownReason ?? raw.take_down_reason ?? null,
    status: raw.status !== false,
    featured: Boolean(raw.featured ?? false),
    likeCount: Number(raw.likeCount ?? raw.like_count ?? 0),
    views: Number(raw.views ?? raw.view_count ?? raw.viewCount ?? 0),
    auction,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    contactInfo: normalizeContactInfo(raw.contactInfo, raw.contact_info),
  };
}

export function extractDomainList(payload) {
  const data = payload?.data ?? payload;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
        ? data.data
        : [];
  return list.map(normalizeDomainRecord);
}
