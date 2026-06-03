import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Package } from 'lucide-react';
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
  AVAILABLE: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  PENDING: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  SOLD: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
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

function ActionButton({ className = '', style, children, onClick }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold transition-colors ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </button>
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
  const techTags = item.techStack
    ? item.techStack.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3)
    : [];
  const pricingLabel = item.pricingDemand
    ? String(item.pricingDemand).replace(/_/g, ' ')
    : null;

  return (
    <div
      className={`listing-card-glow technology-listing-card card-glow-hover group relative bg-white border border-gray-100 rounded-2xl flex flex-col h-full min-h-[420px] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden${
        browseMode ? '' : ' cursor-pointer'
      }`}
      onClick={browseMode ? undefined : onView}
    >
      <div className="p-4 pb-3 flex flex-col flex-1 min-h-0">
        <div className="flex items-start gap-3 min-h-[52px]">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {item.imageUrl && !imgFailed ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <Package className="w-5 h-5 text-indigo-400" strokeWidth={1.75} />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-[0.7rem] font-semibold text-indigo-600 uppercase tracking-wide truncate">
              {item.category?.replace(/_/g, ' ') || 'Technology'}
            </div>
            <div className="text-xs text-gray-400 truncate mt-0.5 min-h-[16px]">
              {pricingLabel || 'Pricing not set'}
            </div>
          </div>
        </div>

        <div className="min-h-[28px] mt-3 flex flex-wrap items-center gap-1.5">
          {owner && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-semibold text-green-700 bg-green-50 border border-green-200 whitespace-nowrap">
              ✓ Owner
            </span>
          )}
          {item.official && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-bold text-amber-700 bg-amber-50 border border-amber-200 whitespace-nowrap">
              ✦ Official
            </span>
          )}
          {item.verified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
              ✓ Verified
            </span>
          )}
          {!owner && showVerificationNotice && (
            <VerificationChip owner={false} verified={item.verified} />
          )}
        </div>

        <div className="min-h-[40px] mt-2 flex items-start">
          {owner && showVerificationNotice ? (
            <p className="w-full rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 text-[0.72rem] leading-snug text-amber-900 m-0">
              Awaiting admin verification.
            </p>
          ) : (
            <span className="sr-only">No owner verification notice</span>
          )}
        </div>

        <h3 className="text-base font-semibold text-gray-900 leading-snug mt-2 line-clamp-1 min-h-[1.25rem]">
          {item.name || 'Untitled listing'}
        </h3>

        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {item.description?.trim() || 'No description provided yet.'}
        </p>

        <div className="min-h-[30px] mt-3 flex flex-wrap gap-1.5 items-start">
          {techTags.length > 0 ? (
            techTags.map((tech) => (
              <span
                key={tech}
                className="text-[0.68rem] px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 font-medium"
              >
                {tech}
              </span>
            ))
          ) : (
            <span className="text-[0.68rem] text-gray-300 font-medium">No tech stack listed</span>
          )}
        </div>

        <div className="min-h-[28px] mt-3 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[0.72rem] font-semibold uppercase tracking-wide"
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

        <div className="text-lg font-bold text-indigo-600 mt-3 tabular-nums">
          {formatPrice(item.price)}
        </div>
      </div>

      <div className="mt-auto border-t border-gray-100 bg-gray-50/40 px-4 py-3 min-h-[52px]">
        {browseMode ? (
          <ListingBrowseFooter onViewDetails={onView} className="mt-0">
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
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
            <div className="flex gap-2 flex-wrap justify-end" onClick={(e) => e.stopPropagation()} role="presentation">
              {user?.role === 'ADMIN' ? (
                <>
                  <ActionButton
                    className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  >
                    Remove
                  </ActionButton>
                  {isDirectPurchase(item, auctionStatus) && (
                    <ActionButton
                      className="bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700"
                      onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
                    >
                      Buy Now →
                    </ActionButton>
                  )}
                </>
              ) : owner ? (
                <div className="flex gap-2 flex-wrap justify-end">
                  {canRequestTechnologyAuction(item, auctionStatus) && onAuction && (
                    <ActionButton
                      style={{ background: 'rgba(200,169,110,0.12)', color: '#b45309', border: '1px solid rgba(200,169,110,0.35)' }}
                      onClick={() => onAuction()}
                    >
                      🔨 {String(item.auctionApprovalStatus || auctionStatus?.approvalStatus || '').toUpperCase() === 'REJECTED' ? 'Re-submit Auction' : 'Put to Auction'}
                    </ActionButton>
                  )}
                  {isTechnologyAuctionPending(item, auctionStatus) && (
                    <span
                      className="inline-flex items-center text-[0.72rem] text-amber-700 px-2 py-1 rounded-md border border-amber-200 bg-amber-50"
                    >
                      ⏳ Auction Pending
                    </span>
                  )}
                  {(auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED')
                    && technologyAuctionId(item, auctionStatus) && (
                    <ActionButton
                      style={{ background: 'rgba(110,200,150,0.12)', color: '#059669', border: '1px solid rgba(110,200,150,0.35)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
                      }}
                    >
                      {isTechnologyAuctionLive(item, auctionStatus) ? '🟢 View Auction' : 'View Auction'}
                    </ActionButton>
                  )}
                  <ActionButton
                    className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  >
                    Remove
                  </ActionButton>
                </div>
              ) : isTechnologyAuctionLive(item, auctionStatus) ? (
                !isAuctionBlockedByVerification(item) && (
                  <ActionButton
                    style={{ background: 'rgba(110,200,150,0.12)', color: '#059669', border: '1px solid rgba(110,200,150,0.35)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
                    }}
                  >
                    Place Bid →
                  </ActionButton>
                )
              ) : isDirectPurchase(item, auctionStatus) ? (
                <ActionButton
                  className="bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700"
                  onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
                >
                  Buy Now →
                </ActionButton>
              ) : isPurchaseBlockedByVerification(item) ? null : (
                <span className="text-xs text-gray-400 italic">Sold</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
