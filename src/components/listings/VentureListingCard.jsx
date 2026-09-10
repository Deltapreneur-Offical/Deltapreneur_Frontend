import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { Share2, Trash2, Rocket, Handshake, Briefcase, PieChart, Gavel } from 'lucide-react';

import { EditIcon } from '../common/EditActionLabel';

import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { APP_BASE_URL } from '../../config/urls';

import ListingCardStatsFooter from './ListingCardStatsFooter';

import verifiedIcon from '../../assets/Verified_Icon.png';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import PriceSectionIcon from '../common/PriceSectionIcon';

import {

  isCoVentureListing,


  isVentureGstinVerified,

  resolveVentureApprovalStatus,

  resolveSellerAskSummary,

  resolveCoVentureInvestmentSeeking,

  formatCoVentureInvestmentDisplay,

  formatVentureAskingPrice,

  resolveVentureInterestCount,

} from '../../utils/ventureListingHelpers';

import '../../styles/domain-listing-cards.css';



const PRIMARY_BTN =
  'domain-listing-card__cta-btn venture-listing-card__pitch-cta w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200';

function VentureCardArrowCta({ label, onClick, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`${PRIMARY_BTN} inline-flex items-center justify-center${disabled ? ' venture-listing-card__pitch-cta--disabled' : ''}${className ? ` ${className}` : ''}`}
      aria-label={label}
      onClick={onClick}
    >
      {label}
    </button>
  );
}



function resolveVentureStatusDotClass(venture) {

  if (venture?.status === false) return 'listing-availability-badge__dot--muted';

  return 'listing-availability-badge__dot--available';

}

function formatInterestCountLabel(count, isCoVenture) {
  const safeCount = Number(count) || 0;
  const noun = isCoVenture
    ? (safeCount === 1 ? 'Applicant' : 'Applicants')
    : (safeCount === 1 ? 'Offer' : 'Offers');
  return `${safeCount} ${noun}`;
}



export default function VentureListingCard({

  venture,

  isOwner,

  hasApplied = false,

  hasActiveDeal = false,

  showVerifyButton = true,

  browseMode = false,

  compact = false,

  onView,

  onApply,

  onVerify,

  onEdit,

  onDelete,

  likeState,
  onLike,

}) {

  const { t } = useTranslation();

  const { formatPrice } = useCurrency();

  const navigate = useNavigate();
  const { user } = useAuth();

  const [shareOpen, setShareOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const shareRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const b = venture.brandDetails || {};

  const brandName = b.brandName || t('listingCardUnnamedVenture', 'Unnamed venture');

  const isCoVenture = isCoVentureListing(venture);


  const approvalStatus = resolveVentureApprovalStatus(venture);

  const isListingApproved = approvalStatus === 'approved';

  const isGstinVerified = isVentureGstinVerified(venture);

  const canInteract = !isOwner && isListingApproved && !hasApplied && !hasActiveDeal;

  const ctaLabel = isCoVenture

    ? t('listingCardApply', 'Apply')

    : t('listingCardOffer', 'Offer');

  const sellerAsk = resolveSellerAskSummary(venture);

  const ventureImage = b.ventureImageUrl && !imgFailed ? b.ventureImageUrl : null;

  const coVentureInvestment = isCoVenture ? resolveCoVentureInvestmentSeeking(venture) : null;

  const interestCount = resolveVentureInterestCount(venture);

  const roleOffer = isCoVenture
    ? (venture.roles?.[0]?.title || venture.roles?.[0]?.roleOffer || venture.roles?.[0]?.role_offer)
    : null;



  const priceAmount = isCoVenture && coVentureInvestment != null
    ? coVentureInvestment
    : Number(sellerAsk.price ?? 0);

  const priceDisplay = isCoVenture && coVentureInvestment != null
    ? formatCoVentureInvestmentDisplay(coVentureInvestment, formatPrice)
    : (Number(priceAmount) > 0 ? formatVentureAskingPrice(priceAmount, formatPrice) : '');

  const showPriceText = Boolean(priceDisplay);

  const isAuction = venture?.saleType === 'AUCTION'
    || venture?.sale_type === 'AUCTION'
    || Boolean(venture?.onAuction)
    || Boolean(venture?.on_auction)
    || Boolean(venture?.isAuction)
    || Boolean(venture?.is_auction)
    || Boolean(venture?.auction)
    || Boolean(venture?.auctionId)
    || Boolean(venture?.auction_id)
    || venture?.auctionStatus === 'ACTIVE'
    || venture?.auction_status === 'ACTIVE'
    || venture?.status === 'AUCTION'
    || venture?.listingStatus === 'AUCTION'
    || venture?.listing_status === 'AUCTION'
    || venture?.listingApprovalStatus === 'AUCTION'
    || venture?.listing_approval_status === 'AUCTION'
    || venture?.dealType === 'AUCTION'
    || venture?.deal_type === 'AUCTION'
    || venture?.dealType === 'BID'
    || venture?.deal_type === 'BID'
    || (!showPriceText && (isCoVenture || sellerAsk.price == null || Number(sellerAsk.price) === 0));



  useEffect(() => {

    setImgFailed(false);

  }, [b.ventureImageUrl, venture.id]);



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
    stop(e);

    const typeLabel = isCoVenture ? 'Co-Venture' : 'Venture';

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${typeLabel}: ${brandName}`,
          text: `Check out this ${typeLabel} listed on Deltapreneur!\n\n${shareUrl}`,
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
      ? `${window.location.origin}/ventures/${venture.id}${user?.id ? `?ref=${user.id}` : ''}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/ventures/${venture.id}${user?.id ? `?ref=${user.id}` : ''}`;

  const typeLabel = isCoVenture ? 'Co-Venture' : 'Venture';
  const desc = b.description || b.tagline || 'No description provided.';
  const shareSubject = `Exciting ${typeLabel} Opportunity on Deltapreneur: ${brandName}`;
  const shareBody = `Dear colleague / partner,\n\nI would like to share an exciting business opportunity currently listed on Deltapreneur.\n\n🌐 Venture: ${brandName} (${typeLabel})\n📝 Description: ${desc}\n🔗 View Listing:\n${shareUrl}\n\nDeltapreneur is a professional marketplace and community for business partnerships, co-venturing, and acquisitions.\n\nBest regards,\n[Shared via Deltapreneur]`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;

  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  const twitterShare = `https://x.com/intent/tweet?text=${encodeURIComponent(shareSubject + '\n\n' + shareUrl)}`;

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent('Check out this exciting ' + typeLabel + ' opportunity on Deltapreneur!\n\n' + shareUrl)}`;

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

    if (browseMode) return null;



    if (isOwner) {

      return (

        <div className="flex w-full items-center gap-2" onClick={stop} onMouseDown={stop} role="presentation">

          <div className="flex min-w-0 flex-1 gap-2">

            {showVerifyButton && !isGstinVerified && (

              <button

                type="button"

                className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"

                onClick={(e) => {

                  stop(e);

                  onVerify?.();

                }}

              >

                {t('listingCardVerifyGstin', 'Verify GSTIN')}

              </button>

            )}

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

        </div>

      );

    }



    if (canInteract) {
      return (
        <VentureCardArrowCta
          label={ctaLabel}
          onClick={(e) => {
            stop(e);
            onApply?.();
          }}
        />
      );
    }

    if (hasActiveDeal) {
      return (
        <VentureCardArrowCta
          label={t('listingCardContinue', 'Continue')}
          onClick={(e) => {
            stop(e);
            onApply?.();
          }}
        />
      );
    }

    if (hasApplied) {
      return (
        <button
          type="button"
          disabled
          className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}
          title={isCoVenture ? t('listingCardAlreadyApplied', 'You already applied') : t('listingCardAlreadyPitched', 'You already submitted')}
        >
          {isCoVenture ? t('listingCardApplied', 'Applied') : t('listingCardPitched', 'Submitted')}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled
        className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}
        title={!isListingApproved ? t('listingCardPendingApproval', 'Listing pending admin approval') : undefined}
      >
        {!isListingApproved ? t('listingCardPendingApproval', 'Pending Approval') : t('listingCardUnavailable', 'Unavailable')}
      </button>
    );
  };



  const cardLayoutClass = browseMode
    ? 'h-auto min-h-0'
    : 'h-full min-h-0';



  const showPriceBox = isAuction || showPriceText || handleViewDetails;
  const isHomePreview = compact && browseMode;
return (

    <article

      className={`domain-listing-card venture-listing-card card-glow-hover relative flex ${cardLayoutClass} w-full flex-col overflow-hidden rounded-3xl bg-white ${isCoVenture

          ? 'venture-listing-card--coventure'

          : 'venture-listing-card--venture'

        } ${compact ? 'venture-listing-card--compact' : ''}${compact && browseMode ? ' venture-listing-card--home-preview' : ''} ${browseMode ? 'domain-listing-card--browse' : ''} ${interactive ? 'cursor-pointer' : ''}`}


      onClick={interactive ? handleCardClick : undefined}


      role={interactive ? 'button' : undefined}


      tabIndex={interactive ? 0 : undefined}


      onKeyDown={interactive ? handleCardKeyDown : undefined}


    >

      <div className="domain-listing-card__cover">

        {ventureImage ? (

          <img

            src={ventureImage}

            alt={brandName}

            className="domain-listing-card__cover-img"

            loading="lazy"

            decoding="async"

            onError={() => setImgFailed(true)}

          />

        ) : (

          <div
            className={`venture-listing-card__cover-fallback relative flex flex-col items-center justify-center w-full h-full text-center overflow-hidden ${compact ? 'p-2' : 'p-4'
              } bg-gradient-to-b from-[#38BDF8] to-[#0284C7]`}
            aria-hidden
          >
            {/* Subtle background icon watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none transform scale-150">
              {isCoVenture ? (
                <Handshake size={compact ? 70 : 100} strokeWidth={1.5} className="text-white" />
              ) : (
                <Rocket size={compact ? 70 : 100} strokeWidth={1.5} className="text-white" />
              )}
            </div>

            <div className="venture-listing-card__cover-content">
              <div className="listing-card-cover-logo-slot" aria-hidden />
              <span
                className="domain-listing-card__cover-fallback-domain venture-listing-card__cover-title-marquee"
                style={{
                  whiteSpace: 'nowrap',
                  display: 'block',
                  width: '100%',
                  overflow: 'hidden',
                }}
              >
                <OverflowMarqueeText text={brandName || ''} />
              </span>
            </div>
          </div>
        )}

        <div className="domain-listing-card__share-container" ref={shareRef}>
          <button
            type="button"
            className="domain-listing-card__share-btn flex items-center justify-center"
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
                WhatsApp
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

      <div className={`domain-listing-card__body flex flex-col flex-1 ${compact && browseMode
          ? 'gap-2.5 p-3.5'
          : compact
            ? 'justify-between gap-2.5 p-3.5'
            : 'justify-between gap-2.5 p-4'
        }`}>

        <div className="flex flex-col gap-2.5">

          {/* Industry & Deal Type Badges */}

          <div className="venture-listing-card__badges flex flex-wrap items-center gap-2 min-h-[1.5rem]">

            {b.industry && (

              <span className="inline-flex items-center h-6 px-2.5 text-[10px] font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wide">

                {b.industry}

              </span>

            )}

            {sellerAsk.dealTypeLabel && (

              <span className="inline-flex items-center h-6 px-2.5 text-[10px] font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wide">

                {sellerAsk.dealTypeLabel}

              </span>

            )}

          </div>

          {/* Brand Name & Status Dot */}

          <div className="venture-listing-card__title-row flex items-center justify-between gap-2">

            <h3
              className={`venture-listing-card__title flex-1 min-w-0 whitespace-normal break-words text-slate-900 font-bold leading-snug ${compact ? 'venture-listing-card__title--compact text-sm' : 'text-base'
                }`}
              title={brandName}
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                textOverflow: 'clip',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >

              <OverflowMarqueeText text={brandName} />

            </h3>

            {isGstinVerified ? (
              <img
                src={verifiedIcon}
                alt="Verified"
                className="domain-listing-card__verified-badge shrink-0"
              />
            ) : null}

          </div>

          {/* Description - only show if not compact */}

          {!compact && b.description && (

            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed m-0 font-medium">

              {b.description}

            </p>

          )}

          {/* Key Metrics / Details Grid - Standout Equity Pill Badge */}
          <div className="venture-listing-card__metrics flex flex-wrap items-center justify-start gap-2 mt-1 min-w-0 w-full">
            {sellerAsk.equityLabel ? (
              <div className="venture-listing-card__equity-badge">
                <PieChart size={15} className="venture-listing-card__equity-badge-icon shrink-0" aria-hidden />
                <div className="venture-listing-card__equity-badge-copy min-w-0">
                  <span className="venture-listing-card__equity-badge-value">
                    {sellerAsk.equityLabel.includes('%') ? sellerAsk.equityLabel : `${sellerAsk.equityLabel}%`}
                  </span>
                  <span className="venture-listing-card__equity-badge-label">
                    EQUITY
                  </span>
                </div>
              </div>
            ) : (
              <span className="shrink-0" aria-hidden>
                {'\u00A0'}
              </span>
            )}

            <div className="flex flex-wrap items-center gap-1 shrink-0">
              {isCoVenture && roleOffer && !compact ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.75 bg-slate-50 border border-slate-200 rounded-full text-slate-600 font-medium text-[10px] shrink-0">
                  <Briefcase size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate max-w-[110px]" title={roleOffer}>{roleOffer}</span>
                </div>
              ) : null}

              <div className="inline-flex items-center px-2 py-0.75 bg-slate-50 border border-slate-200 rounded-full text-slate-500 font-medium text-[10px] shrink-0">
                <span className="text-slate-600 font-semibold">{formatInterestCountLabel(interestCount, isCoVenture)}</span>
              </div>
            </div>
          </div>

        </div>

        <div className={`venture-listing-card__footer flex flex-col ${compact ? 'gap-1.5 mt-1.5' : 'gap-2 mt-1.5'}`}>

          {/* Price Box */}

          {showPriceBox && (
            <div className="venture-listing-card__price-block">
              {!isAuction && showPriceText ? (
                <span className="venture-listing-card__price-label uppercase leading-none">
                  {isHomePreview
                    ? (isCoVenture ? t('listingCardInvestment', 'Investment') : t('listingCardAskingPrice', 'Asking Price'))
                    : (sellerAsk.dealTypeLabel || (isCoVenture ? 'Investment' : 'Asking Price'))}
                </span>
              ) : null}

            <div

              className={`domain-listing-card__price-box ${isAuction ? 'domain-listing-card__price-box--auction ' : ''}${isCoVenture
                  ? 'domain-listing-card__price-box--coventure'
                  : 'domain-listing-card__price-box--venture'
                } ${compact ? 'domain-listing-card__price-box--compact' : ''}`}

            >

              {isAuction ? (
                <div className="domain-listing-card__price-text domain-listing-card__price-text--auction min-w-0 flex items-center gap-1.5">
                  <Gavel size={compact ? 12 : 14} className="shrink-0 text-indigo-600" />
                  <span className="domain-listing-card__price-value truncate font-semibold text-indigo-600">
                    {t('listingCardOnLiveAuction', 'On Live Auction')}
                  </span>
                </div>
              ) : showPriceText ? (

                <div className="domain-listing-card__price-text min-w-0">
                  <span className={`domain-listing-card__price-value currency-display truncate ${compact ? 'venture-listing-card__price-value--compact' : ''
                    }`}>

                    {priceDisplay}

                  </span>

                </div>

              ) : null}



              {handleViewDetails ? (

                <button

                  type="button"

                  className="domain-listing-card__price-cta tech-service-card__price-arrow"

                  aria-label={t('listingCardViewDetails', 'View details')}

                  onClick={handleViewDetails}

                >
                  <PriceSectionIcon className="domain-listing-card__price-cta-icon" />

                </button>

              ) : null}

            </div>
            </div>
          )}



          {/* Stats Footer */}

          <ListingCardStatsFooter

            viewCount={venture.views || 0}

            likeState={likeState}

            onLike={onLike}

            likesFirst

            className="domain-listing-card__stats domain-listing-card__stats--split"

          />



          {/* Action Button */}

          {renderPrimaryAction() ? (

            <div className="domain-listing-card__actions">{renderPrimaryAction()}</div>

          ) : null}

        </div>

      </div>

    </article>

  );

}

