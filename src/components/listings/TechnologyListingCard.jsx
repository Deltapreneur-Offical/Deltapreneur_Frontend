import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import { REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE } from '../../config/featureFlags';
import {
  canRequestTechnologyAuction,
  isTechnologyAuctionLive,
  isTechnologyAuctionPending,
  isTechnologyListingOwner,
  technologyAuctionId,
} from '../../utils/technologyAuctionUi';
import verifiedIcon from '../../assets/Verified_Icon.png';
import '../../styles/domain-listing-cards.css';

function resolveSoftwareStatusDotClass(status) {
  const key = (status || 'AVAILABLE').toUpperCase();
  if (key === 'AVAILABLE') return 'listing-availability-badge__dot--available';
  if (key === 'SOLD') return 'listing-availability-badge__dot--sold';
  return 'listing-availability-badge__dot--muted';
}

function isDirectPurchase(item, auctionStatus) {
  if (isTechnologyAuctionLive(item, auctionStatus)) return false;
  return (
    item.softwareStatus === 'AVAILABLE'
    && item.purchaseType !== 'AUCTION'
    && item.auctionApprovalStatus !== 'PENDING_APPROVAL'
    && (!REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE || item.verified)
  );
}

function isPurchaseBlockedByVerification(item) {
  return (
    REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE
    && !item.verified
    && item.softwareStatus === 'AVAILABLE'
    && item.purchaseType !== 'AUCTION'
  );
}

function isAuctionBlockedByVerification(item) {
  return REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !item.verified && item.purchaseType === 'AUCTION';
}

export default function TechnologyListingCard({
  item,
  isOwner,
  browseMode = false,
  onView,
  onBuy,
  onEdit,
  onDelete,
  likeState,
  onLike,
  onAuction,
  auctionStatus,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const owner = Boolean(user?.id) && (isOwner === true || isTechnologyListingOwner(item, user));
  const isAuction = item.purchaseType === 'AUCTION';
  const showVerificationNotice =
    REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !item.verified;

  useEffect(() => {
    setImgFailed(false);
  }, [item.imageUrl, item.id]);

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/technology?id=${item.id}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/technology?id=${item.id}`;
  const shareText = t('listingCardShareTechnology', {
    name: item.name || t('listingCardTechnology'),
    defaultValue: `Check out this technology: ${item.name || 'Technology'} - Listed on CoBrother!`,
  });
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const stop = (e) => e.stopPropagation();

  const btnPill = 'flex-1 min-w-0 px-3 py-2 text-xs rounded-full transition-colors inline-flex items-center justify-center gap-1';
  const btnEdit = `${btnPill} bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50`;
  const btnRemove = `${btnPill} bg-red-50 border border-red-300 text-red-600 font-bold hover:bg-red-100`;
  const btnBuy = `${btnPill} bg-gray-950 text-white font-bold border-0 hover:bg-black`;
  const btnAuction = `${btnPill} bg-gray-100 text-gray-800 border border-gray-200 font-semibold hover:bg-gray-200`;
  const btnLive = `${btnPill} bg-gray-100 text-gray-800 border border-gray-200 font-semibold hover:bg-gray-200`;

  const shareButton = (
    <div className="relative shrink-0" ref={shareRef}>
      <button
        type="button"
        className="py-1.5 px-2 bg-gray-100 text-gray-600 text-[10px] font-bold rounded hover:bg-gray-200"
        onClick={(e) => { stop(e); setShareOpen(!shareOpen); }}
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

  const actionButtons = (
    <div className="flex gap-2 flex-wrap items-stretch" onClick={stop} role="presentation">
      {owner ? (
        <>
          {onEdit && (
            <button type="button" className={btnEdit} onClick={(e) => { stop(e); onEdit(); }}>
              {t('edit')}
            </button>
          )}
          <button type="button" className={btnRemove} onClick={(e) => { stop(e); onDelete?.(); }}>
            {t('remove')}
          </button>
          {canRequestTechnologyAuction(item, auctionStatus) && onAuction && (
            <button type="button" className={btnAuction} onClick={() => onAuction()}>
              {t('listingCardPutToAuction')}
            </button>
          )}
          {isTechnologyAuctionPending(item, auctionStatus) && (
            <span className={`${btnPill} text-center text-gray-700 bg-gray-100 border border-gray-200 font-semibold`}>
              {t('listingCardAuctionPending')}
            </span>
          )}
          {(auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED')
            && technologyAuctionId(item, auctionStatus) && (
            <button
              type="button"
              className={btnLive}
              onClick={(e) => {
                stop(e);
                navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
              }}
            >
              {isTechnologyAuctionLive(item, auctionStatus) ? t('listingCardViewLiveAuction') : t('listingCardViewAuction')}
            </button>
          )}
          {shareButton}
        </>
      ) : user?.role === 'ADMIN' ? (
        <>
          <button type="button" className={btnRemove} onClick={(e) => { stop(e); onDelete?.(); }}>
            {t('remove')}
          </button>
          {isDirectPurchase(item, auctionStatus) && (
            <button type="button" className={btnBuy} onClick={(e) => { stop(e); onBuy?.(); }}>
              {t('listingCardBuyNowArrow')}
            </button>
          )}
          {shareButton}
        </>
      ) : isTechnologyAuctionLive(item, auctionStatus) ? (
        <>
          {isAuctionBlockedByVerification(item) ? (
            <span className={`${btnPill} text-center text-gray-700 bg-gray-100 border border-gray-200 font-semibold`}>
              {t('listingCardVerificationPending')}
            </span>
          ) : (
            <button
              type="button"
              className={btnBuy}
              onClick={(e) => {
                stop(e);
                navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
              }}
            >
              {t('listingCardPlaceBid')}
            </button>
          )}
          {shareButton}
        </>
      ) : isDirectPurchase(item, auctionStatus) ? (
        <>
          <button type="button" className={btnBuy} onClick={(e) => { stop(e); onBuy?.(); }}>
            {t('listingCardBuyNowArrow')}
          </button>
          {shareButton}
        </>
      ) : isPurchaseBlockedByVerification(item) ? (
        <span className={`${btnPill} text-center text-gray-700 bg-gray-100 border border-gray-200 font-semibold`}>
          {t('listingCardVerificationPending')}
        </span>
      ) : (
        <>
          <span className={`${btnPill} text-center text-gray-400 italic font-medium`}>{t('listingCardSold')}</span>
          {shareButton}
        </>
      )}
    </div>
  );

  const techName = item.name || t('listingCardTechnology');
  const techCategory = (item.category || 'Technology').replace(/_/g, ' ');
  const techImage = item.imageUrl && !imgFailed ? item.imageUrl : null;
  const useCase = item.whatItDoes || item.what_it_does || item.description || '';
  const statusKey = (item.softwareStatus || 'AVAILABLE').toUpperCase();
  const priceAmount = Number(item.price || 0);
  const interactive = !browseMode && onView;

  const handleViewDetails = onView
    ? (e) => {
      stop(e);
      onView();
    }
    : undefined;

  const showPriceBox = browseMode
    ? (priceAmount > 0 || handleViewDetails)
    : true;

  return (
    <article
      className={`domain-listing-card technology-listing-card card-glow-hover relative flex w-full flex-col overflow-hidden rounded-3xl bg-white${browseMode ? ' domain-listing-card--browse technology-listing-card--browse home-preview-browse-card' : ''}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? onView : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') onView?.(); } : undefined}
    >
      <div className="domain-listing-card__cover">
        {techImage ? (
          <img
            src={techImage}
            alt={techName}
            className="domain-listing-card__cover-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="domain-listing-card__cover-fallback" aria-hidden>
            <span className="domain-listing-card__cover-fallback-domain">{techName}</span>
          </div>
        )}
        {item.verified ? (
          <img
            src={verifiedIcon}
            alt=""
            className="domain-listing-card__verified-icon"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={techName}>
            {techName}
          </p>
          <span
            className={`domain-listing-card__status-dot listing-availability-badge__dot ${resolveSoftwareStatusDotClass(statusKey)}`}
            title={statusKey}
            aria-hidden
          />
        </div>

        {techCategory ? (
          <p className="technology-listing-card__industry" title={techCategory}>
            {techCategory}
          </p>
        ) : null}

        <p
          className="technology-listing-card__use-case"
          title={useCase || undefined}
        >
          {owner && showVerificationNotice
            ? t('listingCardAwaitingVerification')
            : (useCase || '\u00A0')}
        </p>

        {showPriceBox && (
          <div className={`domain-listing-card__price-box${isAuction ? ' domain-listing-card__price-box--auction' : ''}`}>
            <div className="domain-listing-card__price-text min-w-0">
              <span className="domain-listing-card__price-value truncate">
                {formatPrice(priceAmount)}
              </span>
            </div>
            {browseMode && handleViewDetails ? (
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
          viewCount={item.views || 0}
          likeState={likeState}
          onLike={onLike}
          onView={browseMode ? undefined : onView}
          likesFirst
          className="domain-listing-card__stats domain-listing-card__stats--split technology-listing-card__stats"
        />

        {!browseMode && (
          <div className="domain-listing-card__actions">
            {actionButtons}
          </div>
        )}
      </div>
    </article>
  );
}
