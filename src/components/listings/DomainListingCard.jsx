import { useState, useEffect, useRef } from 'react';
import { Gavel, ShoppingCart, Trash2, Share2 } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { isAdminCreatedListing } from '../../utils/homepageListings';
import { APP_BASE_URL } from '../../config/urls';
import LikeButton from '../common/LikeButton';
import ListingBrowseFooter from './ListingBrowseFooter';
import MarketplaceListingCardFrame, {
  ListingCardBadge,
  ListingPriceBox,
} from './MarketplaceListingCardFrame';

function DomainCardBody({
  display,
  domain,
  isAuction,
  auctionLive,
  showPriceBox,
  auctionCurrentBid,
  auctionStartBid,
  statusKey,
  pricingLabel,
  isAdminListed,
  needsVerification,
  formatPrice,
}) {
  return (
    <>
      <div className="flex flex-col gap-1 mb-1 flex-shrink-0">
        <h3 className="font-display text-sm font-extrabold text-gray-900 leading-snug line-clamp-1" title={display.fullDomain}>
          {display.fullDomain || 'Unnamed domain'}
        </h3>
        <div className="flex items-center gap-1 flex-wrap max-h-[22px] overflow-hidden">
          <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
            {statusKey}
          </span>
          <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
            {pricingLabel}
          </span>
          {isAdminListed && (
            <span className="px-1.5 py-[2px] bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
              Admin
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-2 min-h-[30px] flex-shrink-0">
        {domain.verified
          ? '✓ Verified domain listing on CoBrother marketplace.'
          : '⏳ Verification pending — listing on CoBrother marketplace.'}
      </p>
      {showPriceBox ? (
        <ListingPriceBox
          variant={isAuction ? 'auction' : 'deal'}
          amount={formatPrice(
            isAuction
              ? (auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid)
              : domain.askingPrice,
          )}
          caption={isAuction ? (auctionLive ? 'current bid' : 'starting bid') : 'asking price'}
        />
      ) : (
        <ListingPriceBox variant="auction" amount="Pending" caption="verification" />
      )}
    </>
  );
}

export default function DomainListingCard({
  domain,
  isOwner,
  browseMode = false,
  onView,
  onEdit,
  onBuy,
  onEnquire,
  onViewAuction,
  onDelete,
  likeState,
  onLike,
}) {
  const { formatPrice } = useCurrency();
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const isAuction = domain.saleType === 'AUCTION';
  const isAdminListed = isAdminCreatedListing(domain, 'domain');
  const auction = domain.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const auctionStartBid = Number(auction?.minBidPrice ?? 0);
  const auctionCurrentBid = Number(auction?.currentHighestBid ?? 0);
  const showPriceBox = !isAuction || Boolean(auction);
  const display = resolveDomainDisplay(domain);
  const domainInitials = (display.name || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase() || '?';

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const pricingLabel = domain.pricingDemand === 'NEGOTIABLE' ? 'Negotiable' : 'Fixed';
  const needsVerification = !domain.verified;
  const purchaseBlocked = needsVerification;

  const accentGrad = isAuction
    ? 'from-purple-600 via-fuchsia-500 to-pink-500'
    : 'from-indigo-600 via-blue-500 to-cyan-400';

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/domains?id=${domain.id}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/domains?id=${domain.id}`;
  const shareText = `Check out ${display.fullDomain} on CoBrother!`;
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const stop = (e) => e.stopPropagation();

  const headerBadges = (
    <>
      <ListingCardBadge variant={isAuction ? 'auction' : 'glass'}>
        {isAuction ? '🔨 Auction' : '◇ Direct'}
      </ListingCardBadge>
      {domain.verified ? (
        <ListingCardBadge variant="verified">✓ Verified</ListingCardBadge>
      ) : (
        <ListingCardBadge variant="pending">Pending</ListingCardBadge>
      )}
      {isOwner && <ListingCardBadge variant="owner">✦ Owner</ListingCardBadge>}
    </>
  );

  const body = (
    <DomainCardBody
      display={display}
      domain={domain}
      isAuction={isAuction}
      auctionLive={auctionLive}
      showPriceBox={showPriceBox}
      auctionCurrentBid={auctionCurrentBid}
      auctionStartBid={auctionStartBid}
      statusKey={statusKey}
      pricingLabel={pricingLabel}
      isAdminListed={isAdminListed}
      needsVerification={needsVerification}
      formatPrice={formatPrice}
    />
  );

  if (browseMode) {
    return (
      <MarketplaceListingCardFrame
        cardClassName="domain-listing-card marketplace-listing-card--venture-style"
        gradient={accentGrad}
        image={domain.logo}
        imageAlt={display.fullDomain}
        initial={domainInitials}
        headerBadges={headerBadges}
        browseMode
        onClick={onView}
        footer={(
          <ListingBrowseFooter className="border-t-0 pt-0" onViewDetails={onView}>
            <span>👁 {domain.views || 0}</span>
            {onLike && (
              <div onClick={stop} onMouseDown={stop} role="presentation">
                <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} />
              </div>
            )}
          </ListingBrowseFooter>
        )}
      >
        {body}
      </MarketplaceListingCardFrame>
    );
  }

  return (
    <MarketplaceListingCardFrame
      cardClassName="domain-listing-card marketplace-listing-card--venture-style"
      gradient={accentGrad}
      image={domain.logo}
      imageAlt={display.fullDomain}
      initial={domainInitials}
      headerBadges={headerBadges}
      onClick={onView}
      footer={(
        <>
          <div
            className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium py-1.5 border-t border-gray-100"
            onClick={stop}
            onMouseDown={stop}
            role="presentation"
          >
            <span>👁 {domain.views || 0}</span>
            {onLike && <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} />}
          </div>
          <div className="flex gap-2 mt-1" onClick={stop} role="presentation">
            {isOwner ? (
              <>
                <button
                  type="button"
                  className="flex-1 py-1.5 bg-gray-100 text-gray-800 text-[10px] font-bold rounded hover:bg-gray-200 inline-flex items-center justify-center gap-1"
                  onClick={(e) => { stop(e); onEdit?.(); }}
                >
                  <EditIcon size={14} /> Edit
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded hover:bg-red-100 inline-flex items-center justify-center gap-1"
                  onClick={(e) => { stop(e); onDelete?.(); }}
                >
                  <Trash2 size={12} /> Remove
                </button>
                <div className="relative" ref={shareRef}>
                  <button
                    type="button"
                    className="py-1.5 px-2 bg-gray-100 text-gray-600 text-[10px] font-bold rounded hover:bg-gray-200"
                    onClick={(e) => { stop(e); setShareOpen(!shareOpen); }}
                    title="Share"
                  >
                    <Share2 size={12} />
                  </button>
                  {shareOpen && (
                    <div className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[140px]" onClick={stop}>
                      <button type="button" className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50" onClick={() => handleShare(linkedinShare)}>LinkedIn</button>
                      <button type="button" className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50" onClick={() => handleShare(facebookShare)}>Facebook</button>
                      <button type="button" className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50" onClick={() => handleShare(whatsappShare)}>WhatsApp</button>
                    </div>
                  )}
                </div>
              </>
            ) : isAuction ? (
              purchaseBlocked ? (
                <span className="flex-1 text-center text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded font-semibold">
                  Verification pending
                </span>
              ) : (
                <button
                  type="button"
                  className={`flex-1 py-1.5 bg-gradient-to-r ${accentGrad} text-white text-[10px] font-bold rounded hover:opacity-90 inline-flex items-center justify-center gap-1`}
                  onClick={(e) => { stop(e); onViewAuction?.(); }}
                >
                  <Gavel size={12} /> {auctionLive ? 'Bid' : 'Auction'}
                </button>
              )
            ) : statusKey === 'AVAILABLE' ? (
              purchaseBlocked ? (
                <span className="flex-1 text-center text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded font-semibold">
                  Verification pending
                </span>
              ) : (
                <button
                  type="button"
                  className={`flex-1 py-1.5 bg-gradient-to-r ${accentGrad} text-white text-[10px] font-bold rounded hover:opacity-90 inline-flex items-center justify-center gap-1`}
                  onClick={(e) => { stop(e); onBuy?.(); }}
                >
                  <ShoppingCart size={12} /> Buy
                </button>
              )
            ) : (
              <span className="flex-1 text-center text-[10px] text-slate-400 font-medium py-1.5">
                {statusKey === 'SOLD' ? 'Sold' : 'Unavailable'}
              </span>
            )}
          </div>
        </>
      )}
    >
      {domain.takenDown && (
        <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-600 text-white">
          Taken down
        </span>
      )}
      {body}
    </MarketplaceListingCardFrame>
  );
}
