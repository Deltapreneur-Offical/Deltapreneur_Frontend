import { useMemo } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { VENTURE_EQUITY_TYPE_LABELS } from '../../constants/ventureLabels';
import ListingCardStatsFooter from '../listings/ListingCardStatsFooter';
import { LISTING_CARD_HEADER_CLASS } from '../listings/MarketplaceListingCardFrame';

function isListingVerified(type, listing) {
  if (type === 'domain') return Boolean(listing?.verified);
  if (type === 'technology') return Boolean(listing?.verified);
  if (type === 'venture') return Boolean(listing?.verified || listing?.gstinVerified);
  return true;
}

function pickCardMeta(type, listing) {
  if (type === 'domain') {
    const display = resolveDomainDisplay(listing);
    const isAuction = listing.saleType === 'AUCTION';
    const auction = listing.auction;
    const amount = isAuction
      ? Number(auction?.currentHighestBid || auction?.minBidPrice || 0)
      : Number(listing.askingPrice || 0);
    return {
      title: display.fullDomain || 'Unnamed domain',
      subtitle: listing.domainStatus || 'AVAILABLE',
      tagPrimary: isAuction ? 'AUCTION' : 'DIRECT',
      tagSecondary: listing.verified ? 'VERIFIED' : 'PENDING',
      amount,
      amountCaption: isAuction ? 'current bid' : 'price',
      description: listing.description || 'Domain listing on CoBrother marketplace.',
      image: listing.logo || null,
      initial: (display.name || '?').slice(0, 1).toUpperCase(),
    };
  }

  if (type === 'technology') {
    const isAuction = listing.purchaseType === 'AUCTION';
    return {
      title: listing.name || 'Unnamed technology',
      subtitle: listing.softwareStatus || 'AVAILABLE',
      tagPrimary: isAuction ? 'AUCTION' : 'REGULAR',
      tagSecondary: listing.verified ? 'VERIFIED' : 'PENDING',
      amount: Number(listing.price || 0),
      amountCaption: isAuction ? 'current bid' : 'price',
      description: listing.description || 'Technology listing on CoBrother marketplace.',
      image: listing.imageUrl || null,
      initial: (listing.name || '?').slice(0, 1).toUpperCase(),
    };
  }

  const brand = listing.brandDetails || {};
  const isAuction = listing.saleType === 'AUCTION';
  const auction = listing.auction;
  const amount = isAuction
    ? Number(auction?.currentHighestBid || auction?.minBidPrice || 0)
    : Number(brand.dealValue || 0);
  return {
    title: brand.brandName || 'Unnamed venture',
    subtitle: brand.industry
      ? brand.industry.replace(/_/g, ' ')
      : (VENTURE_EQUITY_TYPE_LABELS[brand.ventureType] || 'VENTURE'),
    tagPrimary: isAuction ? 'AUCTION' : 'REGULAR',
    tagSecondary: listing.verified || listing.gstinVerified ? 'VERIFIED' : 'PENDING',
    amount,
    amountCaption: isAuction ? 'current bid' : 'price',
    description: brand.description || 'Venture listing on CoBrother marketplace.',
    image: brand.ventureImageUrl || null,
    initial: (brand.brandName || '?').slice(0, 1).toUpperCase(),
  };
}

export default function HomeUnifiedListingCard({
  type,
  listing,
  likeState,
  onLike,
  onView,
}) {
  const { formatPrice } = useCurrency();
  const meta = useMemo(() => pickCardMeta(type, listing), [type, listing]);
  const showPrice = isListingVerified(type, listing);

  return (
    <article className="listing-card-glow venture-listing-card card-glow-hover group relative bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-300 h-[355px] max-h-[355px]">
      <div className={LISTING_CARD_HEADER_CLASS}>
        <div className="relative z-10 flex items-end justify-between w-full">
          <div className="flex items-center gap-2">
            {meta.image ? (
              <img
                src={meta.image}
                alt={meta.title}
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl font-extrabold text-gray-900 ring-2 ring-gray-100 shadow-sm bg-gray-100">
                {meta.initial}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[9px] font-bold rounded uppercase tracking-wide">
                {meta.tagPrimary}
              </span>
              <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm ${
                meta.tagSecondary === 'VERIFIED'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {meta.tagSecondary}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-3 pt-3 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1 mb-1 flex-shrink-0">
          <h3 className="font-display text-sm font-extrabold text-gray-900 leading-snug break-words line-clamp-1">
            {meta.title}
          </h3>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase tracking-wide">
              {meta.subtitle}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-2 min-h-[28px] flex-shrink-0">
          {meta.description}
        </p>

        {showPrice ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 md:px-3 py-1.5 md:py-2 mb-2 flex-shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
                {formatPrice(meta.amount)}
              </span>
              <span className="text-[9px] md:text-[10px] text-gray-500 font-semibold">
                {meta.amountCaption}
              </span>
            </div>
          </div>
        ) : null}

        <ListingCardStatsFooter
          viewCount={listing.views || 0}
          likeState={likeState}
          onLike={onLike}
          onView={onView}
          className="border-t border-gray-100"
        />
      </div>
    </article>
  );
}
