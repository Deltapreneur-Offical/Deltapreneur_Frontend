import { useState } from 'react';
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
  onDelete,
  likeState,
  onLike,
  onAuction,
  auctionStatus,
}) {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);
  const owner = isOwner ?? item.listedBy?.id === user?.id;
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
        <ListingCardBadge variant="pending">Pending</ListingCardBadge>
      )}
      {owner && <ListingCardBadge variant="owner">✦ Owner</ListingCardBadge>}
      {item.official && (
        <ListingCardBadge variant="glass">✦ Official</ListingCardBadge>
      )}
    </>
  );

  const body = (
    <>
      <div className="flex flex-col gap-1 mb-1 flex-shrink-0">
        <h3 className="font-display text-sm font-extrabold text-gray-900 leading-snug line-clamp-1">
          {item.name || 'Unnamed technology'}
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
          ? 'Awaiting admin verification.'
          : (item.description || 'Technology listing on CoBrother marketplace.')}
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

  const actionButtons = (
    <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()} role="presentation">
      {user?.role === 'ADMIN' ? (
        <>
          <button
            type="button"
            className="flex-1 min-w-[4.5rem] py-1.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded hover:bg-red-100"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          >
            Remove
          </button>
          {isDirectPurchase(item, auctionStatus) && (
            <button
              type="button"
              className={`flex-1 min-w-[4.5rem] py-1.5 bg-gradient-to-r ${accentGrad} text-white text-[10px] font-bold rounded hover:opacity-90`}
              onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            >
              Buy
            </button>
          )}
        </>
      ) : owner ? (
        <>
          {canRequestTechnologyAuction(item, auctionStatus) && onAuction && (
            <button
              type="button"
              className="flex-1 min-w-[4.5rem] py-1.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200"
              onClick={() => onAuction()}
            >
              Auction
            </button>
          )}
          {isTechnologyAuctionPending(item, auctionStatus) && (
            <span className="text-[10px] text-amber-700 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded font-semibold">
              Pending
            </span>
          )}
          {(auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED')
            && technologyAuctionId(item, auctionStatus) && (
            <button
              type="button"
              className="flex-1 min-w-[4.5rem] py-1.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
              }}
            >
              {isTechnologyAuctionLive(item, auctionStatus) ? 'Live' : 'View'}
            </button>
          )}
          <button
            type="button"
            className="flex-1 min-w-[4.5rem] py-1.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded hover:bg-red-100"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          >
            Remove
          </button>
        </>
      ) : isTechnologyAuctionLive(item, auctionStatus) ? (
        isAuctionBlockedByVerification(item) ? (
          <span className="flex-1 text-center text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded font-semibold">
            Verification pending
          </span>
        ) : (
          <button
            type="button"
            className={`flex-1 py-1.5 bg-gradient-to-r ${accentGrad} text-white text-[10px] font-bold rounded hover:opacity-90`}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
            }}
          >
            Place Bid
          </button>
        )
      ) : isDirectPurchase(item, auctionStatus) ? (
        <button
          type="button"
          className={`flex-1 py-1.5 bg-gradient-to-r ${accentGrad} text-white text-[10px] font-bold rounded hover:opacity-90`}
          onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
        >
          Buy Now
        </button>
      ) : isPurchaseBlockedByVerification(item) ? (
        <span className="flex-1 text-center text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded font-semibold">
          Verification pending
        </span>
      ) : (
        <span className="flex-1 text-center text-[10px] text-gray-400 italic py-1.5">Sold</span>
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
