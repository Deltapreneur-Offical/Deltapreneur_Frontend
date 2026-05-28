import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import LikeButton from '../common/LikeButton';
import ListingBrowseFooter from './ListingBrowseFooter';

const STATUS_COLORS = {
  AVAILABLE: { color: '#6ec896', bg: 'rgba(110,200,150,0.1)', border: 'rgba(110,200,150,0.3)' },
  PENDING: { color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', border: 'rgba(200,169,110,0.3)' },
  SOLD: { color: '#c86e6e', bg: 'rgba(200,110,110,0.1)', border: 'rgba(200,110,110,0.3)' },
};

function isDirectPurchase(item) {
  return (
    item.softwareStatus === 'AVAILABLE'
    && item.purchaseType !== 'AUCTION'
    && item.auctionApprovalStatus !== 'PENDING_APPROVAL'
  );
}

function isLiveAuction(item) {
  return item.purchaseType === 'AUCTION' && item.auctionApprovalStatus === 'APPROVED' && item.auctionId;
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
  const s = STATUS_COLORS[item.softwareStatus] || STATUS_COLORS.AVAILABLE;
  const owner = isOwner ?? item.listedBy?.id === user?.id;

  return (
    <div
      className={`listing-card-glow technology-listing-card card-glow-hover group relative bg-white rounded-2xl flex flex-col shadow-sm transition-all duration-300 p-5 gap-2 h-full${
        browseMode ? '' : ' cursor-pointer'
      }`}
      onClick={browseMode ? undefined : onView}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="w-[42px] h-[42px] bg-indigo-50 border border-indigo-200 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            '⧁'
          )}
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wider">
            {item.category?.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
            {item.pricingDemand}
          </span>
        </div>
        {owner && (
          <div className="ml-auto px-2 py-0.5 bg-green-100 border border-green-300 rounded text-[0.7rem] font-semibold text-green-700 flex-shrink-0">
            ✓ Owner
          </div>
        )}
        {item.official && (
          <div className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[0.68rem] font-bold text-amber-600 flex-shrink-0">
            ✦ Official
          </div>
        )}
      </div>

      <h3 className="font-display text-[1.15rem] font-semibold text-gray-900 leading-tight mt-1">{item.name}</h3>

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

      <div className="mb-1">
        <span
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: s.color,
            background: s.bg,
            border: `1px solid ${s.border}`,
          }}
        >
          {item.softwareStatus}
        </span>
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
              {isDirectPurchase(item) && (
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
              {!auctionStatus && item.softwareStatus === 'AVAILABLE' && onAuction && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
                  style={{ background: 'rgba(200,169,110,0.12)', color: '#c8a96e', border: '1px solid rgba(200,169,110,0.35)' }}
                  onClick={() => onAuction()}
                >
                  🔨 Auction
                </button>
              )}
              {(auctionStatus?.approvalStatus === 'PENDING_APPROVAL'
                || item.auctionApprovalStatus === 'PENDING_APPROVAL'
                || item.softwareStatus === 'PENDING') && (
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
              {(auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED') && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
                  style={{ background: 'rgba(110,200,150,0.12)', color: '#6ec896', border: '1px solid rgba(110,200,150,0.35)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/cocreation/auction/${item.auctionId || auctionStatus?.id}`);
                  }}
                >
                  🟢 View Auction
                </button>
              )}
              {auctionStatus?.approvalStatus === 'REJECTED' && onAuction && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
                  style={{ background: 'rgba(200,110,110,0.1)', color: '#c86e6e', border: '1px solid rgba(200,110,110,0.3)' }}
                  onClick={() => onAuction()}
                >
                  ↻ Re-submit Auction
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
          ) : isLiveAuction(item) ? (
            <button
              type="button"
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
              style={{ background: 'rgba(110,200,150,0.12)', color: '#6ec896', border: '1px solid rgba(110,200,150,0.35)' }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/cocreation/auction/${item.auctionId}`);
              }}
            >
              Place Bid →
            </button>
          ) : isDirectPurchase(item) ? (
            <button
              type="button"
              className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg cursor-pointer hover:bg-indigo-700"
              onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            >
              Buy Now →
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">Sold</span>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
