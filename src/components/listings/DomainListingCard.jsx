import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  fullDomain,
  logoText,
  children,
}) {
  return (
    <div className="domain-listing-card__cover">
      <div className="domain-listing-card__cover-fallback" aria-hidden>
        <span className="domain-listing-card__cover-fallback-domain">
          {logoText || ''}
        </span>
      </div>
      {children}
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
  onPutForAuction,
  likeState,
  onLike,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const isAuction = domain.saleType === 'AUCTION';
  const isHighValue = isPremiumDomain(domain);
  const auction = domain.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const auctionStartBid = Number(auction?.minBidPrice ?? 0);
  const auctionCurrentBid = Number(auction?.currentHighestBid ?? 0);
  const display = resolveDomainDisplay(domain);

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const needsVerification = false;
  const purchaseBlocked = needsVerification && !isOwner;

  const basePrice = isAuction
    ? (auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid)
    : domain.askingPrice;
  const priceAmount = basePrice;

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    const handleClose = () => setShareOpen(false);
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleClose, { passive: true });
    window.addEventListener('resize', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleClose);
      window.removeEventListener('resize', handleClose);
    };
  }, []);

  const toggleShare = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Domain: ${display.fullDomain}`,
          text: `Check out this premium Domain listed on CoBrother!`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        } else {
          return;
        }
      }
    }

    if (!shareOpen && shareRef.current) {
      const rect = shareRef.current.getBoundingClientRect();
      let left = rect.right + window.scrollX - 200;
      if (left < 10) left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY;
      if (rect.bottom + 270 > window.innerHeight) {
        top = rect.top + window.scrollY - 270;
      }
      setCoords({ top, left });
    }
    setShareOpen(!shareOpen);
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/domains/${domain.id}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/domains/${domain.id}`;
  const shareSubject = `Check out this premium Domain on CoBrother!`;
  const shareBody = `Hi,\n\nI found this premium domain on CoBrother and thought you might be interested.\n\n🌐 Domain: ${display.fullDomain}\nCheck out this premium Domain listed on CoBrother!\n\nView Listing:\n${shareUrl}\n\nBest regards,\nCoBrother Team`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareSubject + '\n\n' + shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent('Check out this premium Domain listed on CoBrother!\n\n' + shareUrl)}`;
  const gmailShare = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
  const emailShare = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const stop = (e) => e.stopPropagation();

  const interactive = Boolean(onView);

  const handleViewDetails = onView
    ? (e) => {
      stop(e);
      onView();
    }
    : undefined;

  const handleCardClick = (e) => {
    if (!onView) return;
    if (e?.target && e.target.closest && e.target.closest('button, a, input, textarea, select, label, [role="link"]')) return;
    onView();
  };

  const handleCardKeyDown = (e) => {
    if (!onView) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onView(); }
  };

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
          <div className="flex items-center shrink-0 gap-1">
            {!isAuction && onPutForAuction && (
              <button
                type="button"
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-indigo-600 hover:bg-indigo-100 transition-colors"
                onClick={(e) => {
                  stop(e);
                  onPutForAuction();
                }}
                title="Put for Auction"
              >
                <Gavel size={12} />
              </button>
            )}
            {isAuction && (
              <span
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-indigo-400 cursor-default"
                title="In Auction"
              >
                <Gavel size={12} />
              </span>
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
      onClick={interactive ? handleCardClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleCardKeyDown : undefined}
    >
      {domain.takenDown && (
        <span className="absolute top-3 right-3 z-20 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          {t('listingCardTakenDown')}
        </span>
      )}

      <DomainListingCover
        fullDomain={display.fullDomain}
        logoText={domain.logo_text ?? domain.logoText}
      >
        <div className="domain-listing-card__share-container" ref={shareRef}>
          <button
            type="button"
            className="domain-listing-card__share-btn"
            onClick={toggleShare}
            title={t('listingCardShare')}
          >
            <Share2 size={18} strokeWidth={2} />
          </button>
          {shareOpen && createPortal(
            <div
              className="fixed z-[9999] w-[200px] bg-white border border-slate-100 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] overflow-hidden text-gray-900"
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
              onClick={stop}
            >
              <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Share via</span>
              </div>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(linkedinShare)}
              >
                {t('listingCardLinkedIn')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(facebookShare)}
              >
                {t('listingCardFacebook')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(twitterShare)}
              >
                Twitter / X
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(whatsappShare)}
              >
                {t('listingCardWhatsApp')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(gmailShare)}
              >
                Gmail
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(emailShare)}
              >
                Email
              </button>
            </div>,
            document.body
          )}
        </div>
      </DomainListingCover>

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={display.fullDomain}>
            <OverflowMarqueeText text={display.fullDomain} />
          </p>
          {domain.verified ? (
            <img
              src={verifiedIcon}
              alt="Verified"
              className="domain-listing-card__verified-badge"
            />
          ) : null}
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
