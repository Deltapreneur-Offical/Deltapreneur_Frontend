import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Clock, Gavel, Sparkles, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCompactCountdown } from '../../utils/auctionDate';
import { resolveAuctionListerName } from '../../utils/auctionLister';
import {
  resolveHomeAuctionBadges,
  resolveHomeAuctionCurrentBidDisplay,
  resolveHomeAuctionDescription,
  resolveHomeAuctionImage,
  resolveHomeAuctionTitle,
  resolveAuctionMinBidPrice,
  resolveAuctionTotalBids,
} from '../../utils/homepageAuctions';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import CreatorPreviewModal from './CreatorPreviewModal';
import { useIsCarouselClone } from '../home/HomeAutoScrollRow';

function AuctionCountdownDisplay({ value }) {
  const text = String(value || '').trim();
  if (!text || text === '—' || text === 'Ended') {
    return (
      <span className="home-auction-preview-card__countdown home-auction-preview-card__countdown--static">
        {text || '—'}
      </span>
    );
  }

  const parts = text.split(/\s+/).filter(Boolean);
  return (
    <span className="home-auction-preview-card__countdown">
      {parts.map((part, index) => {
        const match = part.match(/^(\d+)([dhms])$/i);
        if (!match) {
          return (
            <span key={`${part}-${index}`} className="home-auction-preview-card__countdown--static">
              {part}
            </span>
          );
        }
        return (
          <span key={`${part}-${index}`} className="home-auction-preview-card__countdown-segment">
            <span className="home-auction-preview-card__countdown-num">{match[1]}</span>
            <span className="home-auction-preview-card__countdown-unit">{match[2].toLowerCase()}</span>
          </span>
        );
      })}
    </span>
  );
}

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => formatCompactCountdown(target).timeLeft);

  useEffect(() => {
    const tick = () => {
      const { timeLeft: next } = formatCompactCountdown(target);
      setTimeLeft(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}

const CATEGORY_CLASS = {
  domain: 'home-auction-preview-card--category-domain',
  technology: 'home-auction-preview-card--category-technology',
  community: 'home-auction-preview-card--category-community',
};

const BADGE_TONE_CLASS = {
  domain: {
    primary: 'bg-sky-50 text-sky-700 border border-sky-200',
    secondary: 'bg-[#F8E9D2] text-[#8A5A1F] border border-[#E7C58B]',
  },
  technology: {
    primary: 'bg-sky-50 text-sky-700 border border-sky-200',
    secondary: 'bg-[#F8E9D2] text-[#8A5A1F] border border-[#E7C58B]',
  },
  community: {
    primary: 'bg-sky-50 text-sky-700 border border-sky-200',
    secondary: 'bg-[#F8E9D2] text-[#8A5A1F] border border-[#E7C58B]',
  },
};

export default function HomeAuctionPreviewCard({ auction, onView }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isCarouselClone = useIsCarouselClone();
  const title = resolveHomeAuctionTitle(auction);
  const image = resolveHomeAuctionImage(auction);
  const startingBid = resolveAuctionMinBidPrice(auction);
  const totalBids = resolveAuctionTotalBids(auction);
  const startingBidLabel = t('auctionsPageStartingBid', { defaultValue: 'Starting Bid' });
  const currentBidLabel = t('homeAuctionCurrentBid', { defaultValue: 'Current Bid' });
  const bidDisplay = resolveHomeAuctionCurrentBidDisplay(auction, formatPrice, t);
  const startingBidDisplay = formatPrice(startingBid);
  const timeLeft = useCountdown(auction?.endTime || auction);
  const category = auction?.category || 'domain';
  const categoryClass = CATEGORY_CLASS[category] || CATEGORY_CLASS.domain;
  const coverImage = image && !imgFailed ? image : null;
  const badges = resolveHomeAuctionBadges(auction, t);
  const categoryBadges = badges.filter((badge) => badge.tone !== 'primary');
  const listerName = resolveAuctionListerName(auction);
  const isFeatured = Boolean(auction?.isFeatured || auction?.featured);
  const descriptionFromData = resolveHomeAuctionDescription(auction);
  const badgeToneClass = BADGE_TONE_CLASS[category] || BADGE_TONE_CLASS.domain;
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setImgFailed(false);
  }, [image, auction?.id]);

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

  const stop = (e) => e.stopPropagation();

  const toggleShare = async (e) => {
    stop(e);

    let relativePath = `/auctions?id=${auction?.id}`;
    let shareCaption = "Check out this Auction Listing on Deltapreneur!";

    if (category === 'domain') {
      relativePath = `/domains/auction/${auction?.id}`;
      shareCaption = "Check out this Domain Auction on Deltapreneur!";
    } else if (category === 'community') {
      relativePath = `/community/auction/${auction?.id}`;
      shareCaption = "Check out this Community Auction on Deltapreneur!";
    } else if (category === 'technology' || category === 'software') {
      relativePath = `/technology/auction/${auction?.id}`;
      shareCaption = "Check out this Technology Auction on Deltapreneur!";
    }

    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${relativePath}${user?.id ? `?ref=${user.id}` : ''}`
        : `${APP_BASE_URL.replace(/\/$/, '')}${relativePath}${user?.id ? `?ref=${user.id}` : ''}`;

    const auctionTitle = title || 'Auction';
    const shareSubject = `Active Auction Listing on Deltapreneur: ${auctionTitle}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareSubject,
          text: `${shareCaption}\n\n${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
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

  const relativePath = category === 'domain'
    ? `/domains/auction/${auction?.id}`
    : category === 'community'
      ? `/community/auction/${auction?.id}`
      : `/technology/auction/${auction?.id}`;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${relativePath}${user?.id ? `?ref=${user.id}` : ''}`
      : `${APP_BASE_URL.replace(/\/$/, '')}${relativePath}${user?.id ? `?ref=${user.id}` : ''}`;

  const auctionTitle = title || 'Auction';
  const shareSubject = `Active Auction Listing on Deltapreneur: ${auctionTitle}`;
  const shareCaption = "Check out this Auction Listing on Deltapreneur!";
  const shareBody = `Dear colleague / partner,\n\nI would like to share an active auction listing currently open on Deltapreneur.\n\n🌐 Auction: ${auctionTitle}\n📝 Description: ${shareCaption}\n🔗 View Listing:\n${shareUrl}\n\nDeltapreneur is a premium marketplace offering secure acquisitions and partnerships through active bidding and auctions.\n\nBest regards,\n[Shared via Deltapreneur]`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShare = `https://x.com/intent/tweet?text=${encodeURIComponent(shareSubject + '\n\n' + shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareCaption + '\n\n' + shareUrl)}`;
  const gmailShare = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
  const emailShare = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const handleView = (e) => {
    if (e && e.target && e.target.closest && e.target.closest('button, a, input, textarea, select, label, [role="link"]')) return;
    onView?.();
  };

  const handleArrowClick = (e) => {
    e.stopPropagation();
    onView?.();
  };

  return (
    <article
      ref={cardRef}
      className={`domain-listing-card domain-listing-card--browse home-preview-browse-card home-auction-preview-card home-auction-preview-card--home-preview ${categoryClass} relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl bg-white border border-[#BAE6FD] hover:border-[#38BDF8] shadow-[0_8px_24px_rgba(56,189,248,0.15)] hover:shadow-[0_12px_28px_rgba(56,189,248,0.22)] transition-all duration-200`}
      onClick={handleView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          handleView();
        }
      }}
    >
      <div className="domain-listing-card__cover home-auction-preview-card__cover">
        {coverImage && !isCarouselClone ? (
          <img
            src={coverImage}
            alt={title}
            className="domain-listing-card__cover-img"
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="home-auction-preview-card__cover-fallback relative flex flex-col items-center justify-center w-full h-full text-center overflow-hidden p-2 bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#0369A1] opacity-95"
            aria-hidden
          >
            <div className="home-auction-preview-card__cover-content">
              <div className="listing-card-cover-logo-slot" aria-hidden />
              <span
                className="domain-listing-card__cover-fallback-domain home-auction-preview-card__cover-title-marquee"
                style={{
                  whiteSpace: 'nowrap',
                  display: 'block',
                  width: '100%',
                  overflow: 'hidden',
                }}
              >
                <OverflowMarqueeText text={title || ''} />
              </span>
            </div>
          </div>
        )}
        <div className="home-auction-preview-card__top-left-badges">
          {isFeatured ? (
            <span className="home-auction-preview-card__featured-badge">
              <Sparkles size={11} aria-hidden />
              {t('homeAuctionFeatured', { defaultValue: 'Featured' })}
            </span>
          ) : null}
        </div>
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
      </div>

      <CreatorPreviewModal
        profile={auction?.community}
        auction={auction}
        open={showPreview}
        onClose={() => {
          setShowPreview(false);
          cardRef.current?.focus?.();
        }}
        onPlaceBid={handleView}
      />

      <div className="domain-listing-card__body home-auction-preview-card__body flex flex-col flex-1 gap-1.5 p-3">
        <div className="home-auction-preview-card__content flex flex-col flex-1 gap-1.5">
          <div className="home-auction-preview-card__ends-in-row">
            <span className="home-auction-preview-card__ends-in-compact">
              <Clock size={10} className="home-auction-preview-card__ends-in-icon shrink-0" aria-hidden />
              <span className="home-auction-preview-card__ends-in-label">
                {t('auctionsPageEndsIn', { defaultValue: 'Ends In' })}:
              </span>
              <AuctionCountdownDisplay value={timeLeft} />
            </span>
          </div>

          <div className="home-auction-preview-card__title-row">
            <div className="home-auction-preview-card__title-line">
              <h3
                className="home-auction-preview-card__title venture-listing-card__title--compact line-clamp-2 leading-tight font-extrabold text-slate-900 tracking-tight"
                title={title}
                style={{
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {title}
              </h3>
            </div>
          </div>

          {listerName ? (
            <p className="home-auction-preview-card__creator" title={listerName}>
              {t('auctionDetailListedBy', { defaultValue: 'Listed by' })}{' '}
              <span className="home-auction-preview-card__creator-name inline-block max-w-[65%] align-bottom font-semibold text-slate-900">
                <OverflowMarqueeText text={listerName} />
              </span>
            </p>
          ) : null}

          {categoryBadges.length > 0 ? (
            <div className="venture-listing-card__badges home-auction-preview-card__badges flex flex-wrap gap-1">
              {categoryBadges.map((badge) => (
                <span
                  key={badge.label}
                  className={`venture-listing-card__badge venture-listing-card__badge--compact ${badgeToneClass[badge.tone] || badgeToneClass.primary
                    }`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}

          {descriptionFromData ? (
            <p
              className="home-auction-preview-card__detail text-slate-500"
              title={descriptionFromData}
            >
              {descriptionFromData}
            </p>
          ) : null}

          {/* Starting Bid — primary highlighted value */}
          <div className="home-auction-preview-card__current-bid">
            <span className="home-auction-preview-card__current-bid-label">
              {startingBidLabel}
            </span>
            <span
              className="home-auction-preview-card__current-bid-value currency-display"
              title={startingBidDisplay}
            >
              {startingBidDisplay}
            </span>
          </div>

          {/* Current Bid + action arrow */}
          <div className="home-auction-preview-card__metrics-row">
            <div className="home-auction-preview-card__live-bid min-w-0 flex-1">
              <Gavel
                size={14}
                strokeWidth={2.25}
                className="home-auction-preview-card__live-bid-icon shrink-0"
                aria-hidden
              />
              <div className="home-auction-preview-card__live-bid-copy min-w-0">
                <span className="home-auction-preview-card__live-bid-label">
                  {currentBidLabel}
                </span>
                <span
                  className={`home-auction-preview-card__live-bid-value currency-display${totalBids <= 0 ? ' home-auction-preview-card__live-bid-value--nil' : ''}`}
                >
                  {bidDisplay}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="domain-listing-card__price-cta home-auction-preview-card__nav-cta flex items-center justify-center self-center transition-all w-8 h-8 shrink-0 aspect-square rounded-full bg-black text-white hover:bg-neutral-900 shadow-sm"
              aria-label={t('listingCardViewDetails', { defaultValue: 'View details' })}
              onClick={handleArrowClick}
            >
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        {/* Footer: Total Bids */}
        <div className="home-auction-preview-card__stats-footer">
          <div
            className="home-auction-preview-card__total-bids"
            title={t('homeAuctionTotalBids', { defaultValue: 'Total bids' })}
          >
            <Gavel size={15} className="home-auction-preview-card__total-bids-icon shrink-0" aria-hidden />
            <span className="home-auction-preview-card__total-bids-count">{totalBids}</span>
            <span className="home-auction-preview-card__total-bids-label">
              {totalBids === 1
                ? t('homeAuctionBidSingular', { defaultValue: 'Bid' })
                : t('homeAuctionBidPlural', { defaultValue: 'Bids' })}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
