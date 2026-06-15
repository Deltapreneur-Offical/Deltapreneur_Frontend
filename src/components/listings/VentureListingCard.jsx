import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Gavel, Share2, Trash2 } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import verifiedIcon from '../../assets/Verified_Icon.png';
import {
  isCoVentureListing,
  isFullAcquisitionListing,
  isVentureGstinVerified,
  resolveVentureApprovalStatus,
  resolveSellerAskSummary,
  formatVentureAskingPrice,
} from '../../utils/ventureListingHelpers';
import '../../styles/domain-listing-cards.css';

const PRIMARY_BTN =
  'domain-listing-card__cta-btn w-full rounded-full px-4 py-2.5 text-[0.8125rem] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';

function resolveVentureStatusDotClass(venture) {
  if (venture?.status === false) return 'listing-availability-badge__dot--muted';
  return 'listing-availability-badge__dot--available';
}

export default function VentureListingCard({
  venture,
  isOwner,
  hasApplied = false,
  hasActiveDeal = false,
  showVerifyButton = true,
  browseMode = false,
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
  const [shareOpen, setShareOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const shareRef = useRef(null);

  const b = venture.brandDetails || {};
  const brandName = b.brandName || t('listingCardUnnamedVenture', 'Unnamed venture');
  const isAuction = venture.saleType === 'AUCTION';
  const auction = venture.auction;
  const isCoVenture = isCoVentureListing(venture);
  const isFullAcquisition = isFullAcquisitionListing(venture);
  const approvalStatus = resolveVentureApprovalStatus(venture);
  const isListingApproved = approvalStatus === 'approved';
  const isGstinVerified = isVentureGstinVerified(venture);
  const canInteract = !isOwner && isListingApproved && !isAuction && !hasApplied && !hasActiveDeal;
  const ctaLabel = isCoVenture
    ? t('listingCardApply', 'Apply')
    : (isFullAcquisition ? t('listingCardOffer', 'Offer') : t('listingCardPitch', 'Pitch'));
  const sellerAsk = resolveSellerAskSummary(venture);
  const ventureImage = b.ventureImageUrl && !imgFailed ? b.ventureImageUrl : null;

  const priceAmount = isAuction
    ? Number(auction?.currentHighestBid || auction?.minBidPrice || 0)
    : Number(sellerAsk.price || b.dealValue || 0);

  useEffect(() => {
    setImgFailed(false);
  }, [b.ventureImageUrl, venture.id]);

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/ventures/${venture.id}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/ventures/${venture.id}`;
  const shareText = t('listingCardShareVenture', {
    name: brandName,
    defaultValue: `Check out this venture: ${brandName} - Listed on CoBrother!`,
  });
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

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

  const shareButton = (
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
            className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-green-50 hover:text-green-700 transition-colors"
            onClick={() => handleShare(whatsappShare)}
          >
            {t('listingCardWhatsApp')}
          </button>
        </div>
      )}
    </div>
  );

  const renderPrimaryAction = () => {
    if (browseMode) return null;

    if (isOwner) {
      return (
        <div className="flex w-full items-center gap-2" onClick={stop} onMouseDown={stop} role="presentation">
          <div className="flex min-w-0 flex-1 gap-2">
            {showVerifyButton && !isGstinVerified && (!isAuction || auction?.status === 'DRAFT') && (
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
          {shareButton}
        </div>
      );
    }

    if (isAuction && auction?.id && auction.status !== 'DRAFT') {
      return (
        <button
          type="button"
          className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5`}
          onClick={(e) => {
            stop(e);
            navigate(`/venture-auction/${auction.id}`);
          }}
        >
          <Gavel size={13} />
          {t('listingCardPlaceBid', 'Place Bid')}
        </button>
      );
    }

    if (!isAuction) {
      if (canInteract) {
        return (
          <button
            type="button"
            className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700`}
            onClick={(e) => {
              stop(e);
              onApply?.();
            }}
          >
            {`${ctaLabel} →`}
          </button>
        );
      }
      if (hasActiveDeal) {
        return (
          <button
            type="button"
            className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700`}
            onClick={(e) => {
              stop(e);
              onApply?.();
            }}
          >
            {t('listingCardContinue', 'Continue →')}
          </button>
        );
      }
      if (hasApplied) {
        return (
          <button
            type="button"
            disabled
            className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}
            title={isCoVenture ? t('listingCardAlreadyApplied', 'You already applied') : t('listingCardAlreadyPitched', 'You already pitched')}
          >
            {isCoVenture ? t('listingCardApplied', 'Applied') : t('listingCardPitched', 'Pitched')}
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
    }

    return (
      <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
        {t('listingCardUnavailable', 'Unavailable')}
      </button>
    );
  };

  const cardLayoutClass = browseMode
    ? 'h-auto home-preview-browse-card'
    : 'h-full min-h-0';

  const showPriceBox = Number(priceAmount) > 0 || handleViewDetails;

  return (
    <article
      className={`domain-listing-card venture-listing-card card-glow-hover relative flex ${cardLayoutClass} w-full flex-col overflow-hidden rounded-3xl bg-white${browseMode ? ' domain-listing-card--browse' : ''}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? onView : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') onView?.(); } : undefined}
    >
      <div className="domain-listing-card__cover">
        {ventureImage ? (
          <img
            src={ventureImage}
            alt={brandName}
            className="domain-listing-card__cover-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="domain-listing-card__cover-fallback" aria-hidden>
            <span className="domain-listing-card__cover-fallback-domain">{brandName}</span>
          </div>
        )}
        {isGstinVerified ? (
          <img
            src={verifiedIcon}
            alt=""
            className="domain-listing-card__verified-icon"
            title={t('listingCardGstVerified', 'GST verified')}
            aria-hidden
          />
        ) : null}
      </div>

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={brandName}>
            {brandName}
          </p>
          <span
            className={`domain-listing-card__status-dot listing-availability-badge__dot ${resolveVentureStatusDotClass(venture)}`}
            title={venture.status === false ? 'INACTIVE' : 'AVAILABLE'}
            aria-hidden
          />
        </div>

        {showPriceBox && (
          <div className={`domain-listing-card__price-box${isAuction ? ' domain-listing-card__price-box--auction' : ''}`}>
            {Number(priceAmount) > 0 ? (
              <div className="domain-listing-card__price-text min-w-0">
                <span className="domain-listing-card__price-value truncate">
                  {formatVentureAskingPrice(priceAmount, formatPrice)}
                </span>
              </div>
            ) : null}
            {handleViewDetails ? (
              <button
                type="button"
                className="domain-listing-card__price-cta"
                aria-label={t('listingCardViewDetails', 'View details')}
                onClick={handleViewDetails}
              >
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </div>
        )}

        <ListingCardStatsFooter
          viewCount={venture.views || 0}
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
