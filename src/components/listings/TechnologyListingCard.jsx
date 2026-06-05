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

const STATUS_COLORS = {
  AVAILABLE: { color: 'var(--cobrother-brand-green)', bg: 'rgba(var(--cobrother-brand-green-rgb),0.1)', border: 'rgba(var(--cobrother-brand-green-rgb),0.3)' },
  PENDING: { color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', border: 'rgba(200,169,110,0.3)' },
  SOLD: { color: '#c86e6e', bg: 'rgba(200,110,110,0.1)', border: 'rgba(200,110,110,0.3)' },
};

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

function VerificationChip({ owner, verified }) {
  if (!REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE || verified) return null;
  return (
    <span className="inline-flex items-center max-w-full px-2 py-0.5 rounded-md text-[0.68rem] font-semibold leading-tight text-amber-800 bg-amber-50 border border-amber-200 whitespace-normal">
      {owner ? 'Pending admin review' : 'Verification pending'}
    </span>
  );
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
  const s = STATUS_COLORS[item.softwareStatus] || STATUS_COLORS.AVAILABLE;
  const owner = isOwner ?? item.listedBy?.id === user?.id;
  const showVerificationNotice =
    REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !item.verified;

  return (
    <div
      className={`listing-card-glow technology-listing-card card-glow-hover group relative bg-white rounded-2xl flex flex-col shadow-sm transition-all duration-300 p-5 gap-2 h-full${
        browseMode ? '' : ' cursor-pointer'
      }`}
      onClick={browseMode ? undefined : onView}
    >
      <div className="flex flex-col gap-2 mb-1">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-[42px] h-[42px] bg-indigo-50 border border-indigo-200 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
            {item.imageUrl && !imgFailed ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              '⧁'
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wider truncate">
              {item.category?.replace(/_/g, ' ') || 'Technology'}
            </div>
            {item.pricingDemand && (
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {String(item.pricingDemand).replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>

        {(owner || item.official || item.verified || showVerificationNotice) && (
          <div className="flex flex-wrap items-center gap-1.5 w-full">
            {owner && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-semibold text-[var(--cobrother-brand-green)] bg-[var(--cobrother-brand-green-soft)] border border-[rgba(var(--cobrother-brand-green-rgb),0.3)] whitespace-nowrap">
                ✓ Owner
              </span>
            )}
            {item.official && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-bold text-amber-700 bg-amber-50 border border-amber-200 whitespace-nowrap">
                ✦ Official
              </span>
            )}
            {item.verified && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-semibold text-[var(--cobrother-brand-green)] bg-[var(--cobrother-brand-green-soft)] border border-[rgba(var(--cobrother-brand-green-rgb),0.3)] whitespace-nowrap">
                ✓ Verified
              </span>
            )}
            {!owner && showVerificationNotice && (
              <VerificationChip owner={false} verified={item.verified} />
            )}
          </div>
        )}

        {owner && showVerificationNotice && (
          <p className="w-full rounded-lg bg-amber-50/80 border border-amber-200 px-2.5 py-2 text-[0.72rem] leading-snug text-amber-900 m-0">
            Awaiting admin verification.
          </p>
        )}
      </div>

      <h3 className="font-display text-[1.15rem] font-semibold text-gray-900 leading-tight mt-0">{item.name}</h3>

      <p className="text-[0.82rem] text-gray-500 my-1 leading-relaxed line-clamp-2">
        {item.description}
      </p>

      {item.techStack && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {item.techStack.split(',').slice(0, 3).map((tech) => (
            <span key={tech} className="text-[0.7rem] px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
              {tech.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[0.75rem] font-semibold"
          style={{
            color: s.color,
            background: s.bg,
            border: `1px solid ${s.border}`,
          }}
        >
          {item.softwareStatus}
        </span>
        {!owner && showVerificationNotice && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-medium text-amber-800 bg-amber-50 border border-amber-200">
            Not available to buy yet
          </span>
        )}
      </div>

      <div className="font-display text-[1.1rem] font-bold text-indigo-600 mt-1">{formatPrice(item.price)}</div>

      {browseMode ? (
        <ListingBrowseFooter onViewDetails={onView} className="mt-2">
          <div className="flex items-center gap-4 text-gray-500 text-sm">
            <div className="flex items-center gap-1">
              <Eye size={14} className="mt-[1px]" />
              <span>{item.views || 0}</span>
            </div>
            {onLike && (
              <div onClick={(e) => e.stopPropagation()} role="presentation">
                <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} />
              </div>
            )}
          </div>
        </ListingBrowseFooter>
      ) : (
      <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
        <div className="flex items-center gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <Eye size={14} className="mt-[1px]" />
            <span>{item.views || 0}</span>
          </div>
          {onLike && (
            <div onClick={(e) => e.stopPropagation()} role="presentation">
              <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} />
            </div>
          )}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()} role="presentation">
          {user?.role === 'ADMIN' ? (
            <>
              <button
                type="button"
                className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 font-semibold text-xs rounded-lg cursor-pointer transition-colors hover:bg-red-100"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              >
                Remove
              </button>
              {isDirectPurchase(item, auctionStatus) && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg cursor-pointer hover:bg-indigo-700"
                  onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
                >
                  Buy Now →
                </button>
              )}
            </>
          ) : owner ? (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {canRequestTechnologyAuction(item, auctionStatus) && onAuction && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
                  style={{ background: 'rgba(200,169,110,0.12)', color: '#c8a96e', border: '1px solid rgba(200,169,110,0.35)' }}
                  onClick={() => onAuction()}
                >
                  🔨 {String(item.auctionApprovalStatus || auctionStatus?.approvalStatus || '').toUpperCase() === 'REJECTED' ? 'Re-submit Auction' : 'Put to Auction'}
                </button>
              )}
              {isTechnologyAuctionPending(item, auctionStatus) && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#c8a96e',
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(200,169,110,0.1)',
                    border: '1px solid rgba(200,169,110,0.3)',
                    borderRadius: 6,
                  }}
                >
                  ⏳ Auction Pending
                </span>
              )}
              {(auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED')
                && technologyAuctionId(item, auctionStatus) && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
                  style={{ background: 'rgba(var(--cobrother-brand-green-rgb),0.12)', color: 'var(--cobrother-brand-green)', border: '1px solid rgba(var(--cobrother-brand-green-rgb),0.35)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
                  }}
                >
                  {isTechnologyAuctionLive(item, auctionStatus) ? '🟢 View Auction' : 'View Auction'}
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 font-semibold text-xs rounded-lg cursor-pointer transition-colors hover:bg-red-100"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              >
                Remove
              </button>
            </div>
          ) : isTechnologyAuctionLive(item, auctionStatus) ? (
            isAuctionBlockedByVerification(item) ? (
              <span className="inline-flex items-center text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md whitespace-nowrap">
                Verification pending
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
                style={{ background: 'rgba(var(--cobrother-brand-green-rgb),0.12)', color: 'var(--cobrother-brand-green)', border: '1px solid rgba(var(--cobrother-brand-green-rgb),0.35)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
                }}
              >
                Place Bid →
              </button>
            )
          ) : isDirectPurchase(item, auctionStatus) ? (
            <button
              type="button"
              className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg cursor-pointer hover:bg-indigo-700"
              onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            >
              Buy Now →
            </button>
          ) : isPurchaseBlockedByVerification(item) ? (
            <span className="inline-flex items-center text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md whitespace-nowrap">
              Verification pending
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">Sold</span>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
