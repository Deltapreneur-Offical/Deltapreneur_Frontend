import { useState, useEffect, useRef } from 'react';
import { Gavel, ShoppingCart, MessageSquare, Trash2, Share2, Eye } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { isPremiumDomain } from '../../utils/domainPricing';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { isAdminCreatedListing } from '../../utils/homepageListings';
import { APP_BASE_URL } from '../../config/urls';
import LikeButton from '../common/LikeButton';
import ListingBrowseFooter from './ListingBrowseFooter';
import '../../styles/domain-listing-cards.css';

function DomainCardChips({
  isOwner,
  isAuction,
  statusKey,
  pricingLabel,
  isHighValue,
  isAdminListed,
  needsVerification,
  verified,
}) {
  return (
    <div className="domain-listing-card__chips">
      {isOwner && (
        <span className="domain-listing-card__chip domain-listing-card__chip--owner">Owner</span>
      )}
      {!isAuction && (
        <span
          className={`domain-listing-card__chip domain-listing-card__chip--${
            statusKey === 'AVAILABLE' ? 'available' : statusKey === 'SOLD' ? 'sold' : 'pending'
          }`}
        >
          {statusKey}
        </span>
      )}
      <span className="domain-listing-card__chip domain-listing-card__chip--muted">{pricingLabel}</span>
      {isHighValue && statusKey === 'AVAILABLE' && (
        <span className="domain-listing-card__chip domain-listing-card__chip--premium">Premium</span>
      )}
      {isAdminListed && (
        <span className="domain-listing-card__chip domain-listing-card__chip--premium">Admin Listed</span>
      )}
      {isAuction && (
        <span className="domain-listing-card__chip domain-listing-card__chip--muted">Auction</span>
      )}
      {verified ? (
        <span className="domain-listing-card__chip domain-listing-card__chip--verified">Verified</span>
      ) : needsVerification ? (
        <span className="domain-listing-card__chip domain-listing-card__chip--pending">
          Verification pending
        </span>
      ) : null}
    </div>
  );
}

function DomainPriceBox({
  isAuction,
  auctionLive,
  formatPrice,
  auctionCurrentBid,
  auctionStartBid,
  askingPrice,
}) {
  const priceValue = isAuction
    ? formatPrice(auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid || askingPrice || 0)
    : formatPrice(askingPrice ?? 0);

  return (
    <div className={`domain-listing-card__price-box${isAuction ? ' domain-listing-card__price-box--auction' : ''}`}>
      <div className="domain-listing-card__price-label">
        {isAuction ? (auctionLive ? 'Current bid' : 'Starting bid') : 'Asking price'}
      </div>
      <div className="domain-listing-card__price-value">{priceValue}</div>
    </div>
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
  const isHighValue = isPremiumDomain(domain);
  const isAdminListed = isAdminCreatedListing(domain, 'domain');
  const auction = domain.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const auctionStartBid = Number(auction?.minBidPrice ?? 0);
  const auctionCurrentBid = Number(auction?.currentHighestBid ?? 0);
  const display = resolveDomainDisplay(domain);
  const domainInitials = (display.name || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase() || '?';

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const pricingLabel = domain.pricingDemand === 'NEGOTIABLE' ? 'Negotiable' : 'Fixed';
  const needsVerification = !domain.verified;
  const purchaseBlocked = needsVerification && !isOwner;

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

  const cardHeader = (
    <div className="domain-listing-card__header">
      <div className="domain-listing-card__identity">
        <div className="domain-listing-card__avatar">
          {domain.logo ? <img src={domain.logo} alt="" /> : domainInitials}
        </div>
        <div className="domain-listing-card__title-block">
          <h3 className="domain-listing-card__name" title={display.fullDomain}>
            <span className="domain-listing-card__name-text">{display.name}</span>
            {display.ext ? (
              <span className={`domain-listing-card__ext-badge domain-listing-card__ext-badge--${display.ext.cssKey}`}>
                {display.ext.label}
              </span>
            ) : null}
          </h3>
        </div>
      </div>
      <DomainCardChips
        isOwner={isOwner}
        isAuction={isAuction}
        statusKey={statusKey}
        pricingLabel={pricingLabel}
        isHighValue={isHighValue}
        isAdminListed={isAdminListed}
        needsVerification={needsVerification}
        verified={domain.verified}
      />
    </div>
  );

  const cardBody = (
    <div className="domain-listing-card__body">
      <DomainPriceBox
        isAuction={isAuction}
        auctionLive={auctionLive}
        formatPrice={formatPrice}
        auctionCurrentBid={auctionCurrentBid}
        auctionStartBid={auctionStartBid}
        askingPrice={domain.askingPrice}
      />
    </div>
  );

  if (browseMode) {
    return (
      <article className="domain-listing-card domain-listing-card--browse listing-card-glow card-glow-hover">
        {domain.takenDown && <span className="domain-listing-card__taken-down">Taken down</span>}
        {cardHeader}
        {cardBody}
        <ListingBrowseFooter
          className="domain-listing-card__footer domain-listing-card__footer--browse"
          onViewDetails={onView}
        >
          <div className="domain-listing-card__stats">
            <span className="domain-listing-card__stat">
              <Eye size={14} />
              {domain.views || 0}
            </span>
            {onLike && (
              <div onClick={stop} onMouseDown={stop} role="presentation">
                <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} />
              </div>
            )}
          </div>
        </ListingBrowseFooter>
      </article>
    );
  }

  return (
    <article className="domain-listing-card listing-card-glow card-glow-hover" onClick={onView}>
      {domain.takenDown && <span className="domain-listing-card__taken-down">Taken down</span>}
      {cardHeader}
      {cardBody}

      <div className="domain-listing-card__footer">
        <div className="domain-listing-card__stats" onClick={stop} onMouseDown={stop} role="presentation">
          <span className="domain-listing-card__stat">
            <Eye size={14} />
            {domain.views || 0}
          </span>
          {onLike && (
            <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} />
          )}
        </div>
        <div className="domain-listing-card__actions">
          {isOwner ? (
            <>
              <button type="button" className="domain-listing-card__btn domain-listing-card__btn--ghost" onClick={(e) => { stop(e); onEdit?.(); }}>
                <EditIcon size={16} /> Edit
              </button>
              <button type="button" className="domain-listing-card__btn domain-listing-card__btn--danger" onClick={(e) => { stop(e); onDelete?.(); }}>
                <Trash2 size={14} /> Remove
              </button>
              <div className="relative" ref={shareRef}>
                <button type="button" className="domain-listing-card__btn domain-listing-card__btn--icon" onClick={(e) => { stop(e); setShareOpen(!shareOpen); }} title="Share">
                  <Share2 size={14} />
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
              <span className="domain-listing-card__btn domain-listing-card__btn--disabled" aria-disabled="true">
                Not available yet
              </span>
            ) : (
              <button type="button" className="domain-listing-card__btn domain-listing-card__btn--primary" onClick={(e) => { stop(e); onViewAuction?.(); }}>
                <Gavel size={14} /> {auctionLive ? 'Join auction' : 'View auction'}
              </button>
            )
          ) : statusKey === 'AVAILABLE' ? (
            purchaseBlocked ? (
              <span className="domain-listing-card__btn domain-listing-card__btn--disabled" aria-disabled="true">
                Not available yet
              </span>
            ) : isHighValue ? (
              <button type="button" className="domain-listing-card__btn domain-listing-card__btn--primary" onClick={(e) => { stop(e); onEnquire?.(); }}>
                <MessageSquare size={14} /> Enquire
              </button>
            ) : (
              <button type="button" className="domain-listing-card__btn domain-listing-card__btn--primary" onClick={(e) => { stop(e); onBuy?.(); }}>
                <ShoppingCart size={14} /> Buy now
              </button>
            )
          ) : (
            <span className="domain-listing-card__status-muted">{statusKey === 'SOLD' ? 'Sold' : 'Unavailable'}</span>
          )}
        </div>
      </div>
    </article>
  );
}
