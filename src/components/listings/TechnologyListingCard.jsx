import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { APP_BASE_URL } from '../../config/urls';
import LikeButton from '../common/LikeButton';
import ListingBrowseFooter from './ListingBrowseFooter';
import VerificationStatusBadge from './VerificationStatusBadge';
import { REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE } from '../../config/featureFlags';
import {
  canRequestTechnologyAuction,
  isTechnologyAuctionLive,
  isTechnologyAuctionPending,
  isTechnologyListingOwner,
  technologyAuctionId,
} from '../../utils/technologyAuctionUi';
import MarketplaceListingCardFrame, {
  ListingCardBadge,
  ListingPriceBox,
} from './MarketplaceListingCardFrame';

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

  const headerBadges = (
    <>
      <ListingCardBadge variant={isAuction ? 'auction' : 'glass'}>
        {isAuction ? '🔨 Auction' : '💻 Regular'}
      </ListingCardBadge>
      <VerificationStatusBadge item={item} type="technology" />
      {owner && <ListingCardBadge variant="owner">✦ {t('listingCardOwner')}</ListingCardBadge>}
      {item.official && (
        <ListingCardBadge variant="glass">✦ Official</ListingCardBadge>
      )}
    </>
  );

  const body = (
    <>
      <div className="flex flex-col gap-1 mb-1 flex-shrink-0">
        <h3 className="font-display text-sm font-extrabold text-gray-900 leading-snug line-clamp-1">
          {item.name || t('listingCardTechnology')}
        </h3>
        <div className="flex items-center gap-1 flex-wrap max-h-[22px] overflow-hidden">
          <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
            {(item.category || 'Technology').replace(/_/g, ' ')}
          </span>
          <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
            {item.softwareStatus || 'AVAILABLE'}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-2 min-h-[30px] flex-shrink-0">
        {owner && showVerificationNotice
          ? t('listingCardAwaitingVerification')
          : (item.description || t('listingCardTechnology'))}
      </p>
      <ListingPriceBox
        variant={isAuction ? 'auction' : 'deal'}
        amount={formatPrice(item.price || 0)}
        caption={isAuction ? 'listing value' : 'deal value'}
      />
    </>
  );

  const statsRow = (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium py-1.5 border-t border-gray-100">
      <span className="flex items-center gap-0.5">
        <Eye size={11} /> {item.views || 0}
      </span>
      {onLike && <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} />}
    </div>
  );

  const btnBase = 'flex-1 min-w-0 py-1.5 text-[10px] font-bold rounded transition-colors inline-flex items-center justify-center gap-1';
  const btnEdit = `${btnBase} bg-white border border-gray-300 text-gray-800 hover:bg-gray-50`;
  const btnRemove = `${btnBase} bg-red-50 border border-red-200 text-red-600 hover:bg-red-100`;
  const btnBuy = `${btnBase} bg-violet-600 text-white border-0 hover:bg-violet-700`;
  const btnAuction = `${btnBase} bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100`;
  const btnLive = `${btnBase} bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100`;

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
            <span className={`${btnBase} text-center text-amber-700 bg-amber-50 border border-amber-200`}>
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
            <span className={`${btnBase} text-center text-amber-800 bg-amber-50 border border-amber-200`}>
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
        <span className={`${btnBase} text-center text-amber-800 bg-amber-50 border border-amber-200`}>
          {t('listingCardVerificationPending')}
        </span>
      ) : (
        <>
          <span className={`${btnBase} text-center text-gray-400 italic font-medium`}>{t('listingCardSold')}</span>
          {shareButton}
        </>
      )}
    </div>
  );

  if (browseMode) {
    return (
      <MarketplaceListingCardFrame
        cardClassName="technology-listing-card"
        gradient={accentGrad}
        image={item.imageUrl && !imgFailed ? item.imageUrl : null}
        imageAlt={item.name}
        initial={(item.name || '?').slice(0, 1).toUpperCase()}
        headerBadges={headerBadges}
        browseMode
        onClick={onView}
        footer={(
          <ListingBrowseFooter className="border-t-0 pt-0" onViewDetails={onView}>
            {statsRow}
          </ListingBrowseFooter>
        )}
      >
        {body}
      </MarketplaceListingCardFrame>
    );
  }

  return (
    <MarketplaceListingCardFrame
      cardClassName="technology-listing-card"
      gradient={accentGrad}
      image={item.imageUrl && !imgFailed ? item.imageUrl : null}
      imageAlt={item.name}
      initial={(item.name || '?').slice(0, 1).toUpperCase()}
      headerBadges={headerBadges}
      onClick={onView}
      footer={(
        <>
          <div onClick={stop} role="presentation">
            {statsRow}
          </div>
          {actionButtons}
        </>
      )}
    >
      {item.imageUrl && !imgFailed ? (
        <img src={item.imageUrl} alt="" className="hidden" onError={() => setImgFailed(true)} />
      ) : null}
      {body}
    </MarketplaceListingCardFrame>
  );
}
