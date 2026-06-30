import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Gavel, ShoppingCart, MessageSquare, Trash2, Share2 } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { isPremiumDomain } from '../../utils/domainPricing';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import verifiedIcon from '../../assets/Verified_Icon.png';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import '../../styles/domain-listing-cards.css';

const PRIMARY_BTN =
  'domain-listing-card__cta-btn w-full rounded-full px-4 py-2.5 text-[0.8125rem] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';

function resolveStatusDotClass(status) {
  const key = (status || 'AVAILABLE').toUpperCase();
  if (key === 'AVAILABLE') return 'listing-availability-badge__dot--available';
  if (key === 'SOLD') return 'listing-availability-badge__dot--sold';
  return 'listing-availability-badge__dot--muted';
}

function DomainListingCover({
  logo,
  logoAlt,
  fullDomain,
  verified,
  onCoverError,
}) {
  return (
    <div className="domain-listing-card__cover">
      {logo ? (
        <img
          src={logo}
          alt={logoAlt}
          className="domain-listing-card__cover-img"
          loading="lazy"
          decoding="async"
          onError={onCoverError}
        />
      ) : (
        <div className="domain-listing-card__cover-fallback" aria-hidden>
          <span className="domain-listing-card__cover-fallback-domain">{fullDomain}</span>
        </div>
      )}
      {verified ? (
        <img
          src={verifiedIcon}
          alt=""
          className="domain-listing-card__verified-icon"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function DomainListingPriceBox({ amount, isAuction, onViewDetails, viewLabel }) {
  return (
    <div className={`domain-listing-card__price-box${isAuction ? ' domain-listing-card__price-box--auction' : ''}`}>
      {amount ? (
        <div className="domain-listing-card__price-text min-w-0">
          <span className="domain-listing-card__price-value truncate">
            {amount}
          </span>
        </div>
      ) : null}
      {onViewDetails ? (
        <button
          type="button"
          className="domain-listing-card__price-cta"
          aria-label={viewLabel}
          onClick={onViewDetails}
        >
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
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
  const auction = domain.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const auctionStartBid = Number(auction?.minBidPrice ?? 0);
  const auctionCurrentBid = Number(auction?.currentHighestBid ?? 0);
  const display = resolveDomainDisplay(domain);
  const domainLogo = domain.logo && !imgFailed ? domain.logo : null;

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const needsVerification = false;
  const purchaseBlocked = needsVerification && !isOwner;

  const basePrice = isAuction
    ? (auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid)
    : domain.askingPrice;
  const priceAmount = basePrice;

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

  const handleViewDetails = onView
    ? (e) => {
      stop(e);
      onView();
    }
    : undefined;

  const renderPrimaryAction = () => {
    if (browseMode) {
      return null;
    }

    if (isOwner) {
      return (
        <div className="flex w-full items-center gap-2" onClick={stop} onMouseDown={stop} role="presentation">
          <div className="flex min-w-0 flex-1 gap-2">
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
          </div>
          <div className="relative shrink-0" ref={shareRef}>
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
          {t('listingCardBuyNowArrow', 'Buy Now →')}
        </button>
      );
    }

    return (
      <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
        {statusKey === 'SOLD' ? t('listingCardSold') : t('listingCardUnavailable')}
      </button>
    );
  };

  const cardLayoutClass = browseMode
    ? 'h-auto home-preview-browse-card'
    : 'h-full min-h-0';

  return (
    <article
      className={`domain-listing-card card-glow-hover relative flex ${cardLayoutClass} w-full flex-col overflow-hidden rounded-3xl bg-white${browseMode ? ' domain-listing-card--browse' : ''}${interactive ? ' cursor-pointer' : ''}`}
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

      <DomainListingCover
        logo={domainLogo}
        logoAlt={display.fullDomain}
        fullDomain={display.fullDomain}
        verified={domain.verified}
        onCoverError={() => setImgFailed(true)}
      />

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={display.fullDomain}>
            <OverflowMarqueeText text={display.fullDomain} />
          </p>
          <span
            className={`domain-listing-card__status-dot listing-availability-badge__dot ${resolveStatusDotClass(statusKey)}`}
            title={statusKey}
            aria-hidden
          />
        </div>

        {(Number(priceAmount) > 0 || handleViewDetails) && (
          <DomainListingPriceBox
            amount={Number(priceAmount) > 0 ? formatPrice(priceAmount) : null}
            isAuction={isAuction}
            onViewDetails={handleViewDetails}
            viewLabel={t('listingCardViewDetails', 'View details')}
          />
        )}

        <ListingCardStatsFooter
          viewCount={Number(domain.views ?? domain.view_count ?? domain.viewCount ?? 0)}
          likeState={likeState}
          onLike={onLike}
          likesFirst
          className="domain-listing-card__stats domain-listing-card__stats--split"
        />

        {renderPrimaryAction() ? (
          <div className="domain-listing-card__actions">{renderPrimaryAction()}</div>
        ) : null}
      </div>
    </article>
  );
}
