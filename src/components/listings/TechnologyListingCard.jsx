import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import LikeButton from '../common/LikeButton';
import ListingBrowseFooter from './ListingBrowseFooter';
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
  const owner = Boolean(user?.id) && (isOwner === true || isTechnologyListingOwner(item, user));
  const isAuction = item.purchaseType === 'AUCTION';
  const showVerificationNotice =
    REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !item.verified;

  const accentGrad = isAuction
    ? 'from-purple-600 via-fuchsia-500 to-pink-500'
    : 'from-indigo-600 via-blue-500 to-cyan-400';

  const headerBadges = (
    <>
      <ListingCardBadge variant={isAuction ? 'auction' : 'glass'}>
        {isAuction ? '🔨 Auction' : '💻 Regular'}
      </ListingCardBadge>
      {item.verified ? (
        <ListingCardBadge variant="verified">✓ Verified</ListingCardBadge>
      ) : (
        <ListingCardBadge variant="pending">{t('listingCardVerificationPending')}</ListingCardBadge>
      )}
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

  const btnPill = 'flex-1 min-w-0 px-3 py-2 text-xs rounded-full transition-colors';
  const btnEdit = `${btnPill} bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50`;
  const btnRemove = `${btnPill} bg-red-50 border border-red-300 text-red-600 font-bold hover:bg-red-100`;
  const btnBuy = `${btnPill} bg-violet-600 text-white font-bold border-0 hover:bg-violet-700`;
  const btnAuction = `${btnPill} bg-amber-50 text-amber-800 border border-amber-200 font-semibold hover:bg-amber-100`;
  const btnLive = `${btnPill} bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100`;

  const actionButtons = (
    <div className="flex gap-2 flex-wrap items-stretch" onClick={(e) => e.stopPropagation()} role="presentation">
      {owner ? (
        <>
          {onEdit && (
            <button
              type="button"
              className={btnEdit}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              {t('edit')}
            </button>
          )}
          <button
            type="button"
            className={btnRemove}
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          >
            {t('remove')}
          </button>
          {canRequestTechnologyAuction(item, auctionStatus) && onAuction && (
            <button type="button" className={btnAuction} onClick={() => onAuction()}>
              {t('listingCardPutToAuction')}
            </button>
          )}
          {isTechnologyAuctionPending(item, auctionStatus) && (
            <span className={`${btnPill} text-center text-amber-700 bg-amber-50 border border-amber-200 font-semibold`}>
              {t('listingCardAuctionPending')}
            </span>
          )}
          {(auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED')
            && technologyAuctionId(item, auctionStatus) && (
            <button
              type="button"
              className={btnLive}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
              }}
            >
              {isTechnologyAuctionLive(item, auctionStatus) ? t('listingCardViewLiveAuction') : t('listingCardViewAuction')}
            </button>
          )}
        </>
      ) : user?.role === 'ADMIN' ? (
        <>
          <button
            type="button"
            className={btnRemove}
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          >
            {t('remove')}
          </button>
          {isDirectPurchase(item, auctionStatus) && (
            <button
              type="button"
              className={btnBuy}
              onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            >
              {t('listingCardBuyNowArrow')}
            </button>
          )}
        </>
      ) : isTechnologyAuctionLive(item, auctionStatus) ? (
        isAuctionBlockedByVerification(item) ? (
          <span className={`${btnPill} text-center text-amber-800 bg-amber-50 border border-amber-200 font-semibold`}>
            {t('listingCardVerificationPending')}
          </span>
        ) : (
          <button
            type="button"
            className={btnBuy}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
            }}
          >
            {t('listingCardPlaceBid')}
          </button>
        )
      ) : isDirectPurchase(item, auctionStatus) ? (
        <button
          type="button"
          className={btnBuy}
          onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
        >
          {t('listingCardBuyNowArrow')}
        </button>
      ) : isPurchaseBlockedByVerification(item) ? (
        <span className={`${btnPill} text-center text-amber-800 bg-amber-50 border border-amber-200 font-semibold`}>
          {t('listingCardVerificationPending')}
        </span>
      ) : (
        <span className={`${btnPill} text-center text-gray-400 italic`}>{t('listingCardSold')}</span>
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
          <div onClick={(e) => e.stopPropagation()} role="presentation">
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
