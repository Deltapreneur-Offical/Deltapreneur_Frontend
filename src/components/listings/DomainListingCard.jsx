import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel, ShoppingCart, MessageSquare, Trash2, Share2 } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { isPremiumDomain } from '../../utils/domainPricing';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { isAdminCreatedListing } from '../../utils/homepageListings';
import { APP_BASE_URL } from '../../config/urls';
import ListingAvailabilityBadge from './ListingAvailabilityBadge';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import { ListingCardBadge } from './MarketplaceListingCardFrame';

const CARD_CLASS =
  'domain-listing-card card-glow-hover relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-3xl bg-white';

const PRIMARY_BTN =
  'domain-listing-card__cta-btn w-full rounded-full px-4 py-2.5 text-[0.8125rem] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';

function resolveDomainInitial(name) {
  const cleaned = (name || '').replace(/[^a-zA-Z0-9]/g, '');
  return (cleaned.slice(0, 1) || '?').toUpperCase();
}

function DomainListingHeader({ logo, logoAlt, initial, name, fullDomain, statusBadges, status }) {
  return (
    <header className="domain-listing-card__header">
      <div className="domain-listing-card__header-top">
        {logo ? (
          <img
            src={logo}
            alt={logoAlt}
            className="domain-listing-card__avatar object-cover"
          />
        ) : (
          <div className="domain-listing-card__avatar domain-listing-card__avatar--fallback">
            {initial}
          </div>
        )}
        {statusBadges ? (
          <div className="domain-listing-card__header-badges">
            {statusBadges}
          </div>
        ) : null}
      </div>
      <div className="domain-listing-card__header-info">
        <h2 className="domain-listing-card__name" title={name}>
          <span className="domain-listing-card__name-text">{name}</span>
        </h2>
        <p className="domain-listing-card__domain" title={fullDomain}>
          {fullDomain}
        </p>
        <ListingAvailabilityBadge status={status} className="domain-listing-card__availability" />
      </div>
    </header>
  );
}

function DomainListingPriceBox({ amount, caption }) {
  return (
    <div className="domain-listing-card__price-box">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="domain-listing-card__price-value truncate">
          {amount}
        </span>
        <span className="domain-listing-card__price-caption whitespace-nowrap">
          {caption}
        </span>
      </div>
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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [imgFailed, setImgFailed] = useState(false);
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
  const domainInitial = resolveDomainInitial(display.name);
  const domainLogo = domain.logo && !imgFailed ? domain.logo : null;

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const needsVerification = !domain.verified;
  const purchaseBlocked = needsVerification && !isOwner;

  const description =
    domain.description?.trim()
    || (!domain.verified ? `ΓÅ│ ${t('listingCardVerificationPending')}` : '');

  const priceAmount = isAuction
    ? (auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid)
    : domain.askingPrice;

  const priceCaption = isAuction
    ? (auctionLive ? t('listingCardCurrentBid') : t('listingCardStartingBid'))
    : t('listingCardPrice');

  useEffect(() => {
    setImgFailed(false);
  }, [domain.logo, domain.id]);

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
  const shareText = t('listingCardShareDomain', { domain: display.fullDomain });
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const stop = (e) => e.stopPropagation();

  const interactive = !browseMode && onView;

  const renderPrimaryAction = () => {
    if (browseMode) {
      return null;
    }

    if (isOwner) {
      return (
        <div className="flex gap-2" onClick={stop} onMouseDown={stop} role="presentation">
          <button
            type="button"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center gap-1"
            onClick={(e) => {
              stop(e);
              onEdit?.();
            }}
          >
            <EditIcon size={14} /> {t('edit')}
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 inline-flex items-center justify-center gap-1"
            onClick={(e) => {
              stop(e);
              onDelete?.();
            }}
          >
            <Trash2 size={12} /> {t('remove')}
          </button>
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-600 hover:bg-slate-100"
              onClick={(e) => {
                stop(e);
                setShareOpen(!shareOpen);
              }}
              title={t('listingCardShare')}
            >
              <Share2 size={12} />
            </button>
            {shareOpen && (
              <div
                className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[150px] text-gray-900"
                onClick={stop}
              >
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-[10px] font-semibold text-gray-600">Share via</span>
                </div>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  onClick={() => handleShare(linkedinShare)}
                >
                  {t('listingCardLinkedIn')}
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  onClick={() => handleShare(facebookShare)}
                >
                  {t('listingCardFacebook')}
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  onClick={() => handleShare(whatsappShare)}
                >
                  {t('listingCardWhatsApp')}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isAuction) {
      if (purchaseBlocked) {
        return (
          <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
            {t('listingCardVerificationPending')}
          </button>
        );
      }
      return (
        <button
          type="button"
          className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5`}
          onClick={(e) => {
            stop(e);
            onViewAuction?.();
          }}
        >
          <Gavel size={13} />
          {auctionLive ? t('listingCardJoinAuction') : t('listingCardViewAuction')}
        </button>
      );
    }

    if (statusKey === 'AVAILABLE') {
      if (purchaseBlocked) {
        return (
          <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
            {t('listingCardVerificationPending')}
          </button>
        );
      }
      if (isHighValue) {
        return (
          <button
            type="button"
            className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5`}
            onClick={(e) => {
              stop(e);
              onEnquire?.();
            }}
          >
            <MessageSquare size={13} />
            {t('listingCardEnquire')}
          </button>
        );
      }
      return (
        <button
          type="button"
          className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5`}
          onClick={(e) => {
            stop(e);
            onBuy?.();
          }}
        >
          <ShoppingCart size={13} />
          {t('listingCardBuyNowArrow', 'Buy Now ΓåÆ')}
        </button>
      );
    }

    return (
      <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
        {statusKey === 'SOLD' ? t('listingCardSold') : t('listingCardUnavailable')}
      </button>
    );
  };

  return (
    <article
      className={`${CARD_CLASS}${browseMode ? ' domain-listing-card--browse' : ''}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? onView : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') onView?.(); } : undefined}
    >
      {domain.takenDown && (
        <span className="absolute top-3 right-3 z-20 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          {t('listingCardTakenDown')}
        </span>
      )}

      {domain.logo && !imgFailed ? (
        <img src={domain.logo} alt="" className="hidden" onError={() => setImgFailed(true)} />
      ) : null}

      <DomainListingHeader
        logo={domainLogo}
        logoAlt={display.fullDomain}
        initial={domainInitial}
        name={display.name}
        fullDomain={display.fullDomain}
        status={statusKey}
        statusBadges={(
          <>
            <ListingCardBadge variant={isAuction ? 'auction' : isAdminListed ? 'admin' : 'glass'}>
              {isAuction ? 'Auction' : isAdminListed ? 'Admin' : 'Direct'}
            </ListingCardBadge>
            {domain.verified ? (
              <ListingCardBadge variant="verified">Verified</ListingCardBadge>
            ) : (
              <ListingCardBadge variant="pending">Pending</ListingCardBadge>
            )}
            {isOwner && (
              <ListingCardBadge variant="owner">Owner</ListingCardBadge>
            )}
          </>
        )}
      />

      <div className="domain-listing-card__content">
        {description ? (
          <p className="domain-listing-card__description">{description}</p>
        ) : null}

        {Number(priceAmount) > 0 && (
          <DomainListingPriceBox
            amount={formatPrice(priceAmount)}
            caption={priceCaption}
          />
        )}
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      <ListingCardStatsFooter
        viewCount={Number(domain.views ?? domain.view_count ?? domain.viewCount ?? 0)}
        likeState={likeState}
        onLike={onLike}
        onView={browseMode ? onView : undefined}
        className={browseMode ? '' : 'mb-2'}
      />

      {renderPrimaryAction() ? (
        <div className="mt-auto">{renderPrimaryAction()}</div>
      ) : null}
    </article>
  );
}
