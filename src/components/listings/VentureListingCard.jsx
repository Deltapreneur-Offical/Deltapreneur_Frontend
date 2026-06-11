import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { APP_BASE_URL } from '../../config/urls';
import { VENTURE_EQUITY_TYPE_LABELS } from '../../constants/ventureLabels';
import EditActionLabel from '../common/EditActionLabel';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import { LISTING_CARD_HEADER_CLASS } from './MarketplaceListingCardFrame';

export default function VentureListingCard({
  venture,
  isOwner,
  hasApplied = false,
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
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const shareRef = useRef(null);
  const optionsRef = useRef(null);
  const b = venture.brandDetails || {};
  const shortDesc = `${b.description?.slice(0, 130) || ''}${b.description?.length > 130 ? '…' : ''}`;
  const isAuction = venture.saleType === 'AUCTION';
  const auction = venture.auction;
  const isGstinVerified = Boolean(venture.verified || venture.gstinVerified);
  const canApply = !isOwner && isGstinVerified && !isAuction && !hasApplied;

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
      if (optionsRef.current && !optionsRef.current.contains(e.target)) setOptionsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/ventures?id=${venture.id}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/ventures?id=${venture.id}`;
  const shareText = `Check out this venture: ${b.brandName} - Listed on CoBrother!`;
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const cardClass = `listing-card-glow venture-listing-card card-glow-hover group relative bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-300 h-[355px] max-h-[355px]${
    compact ? ' listing-card--compact' : ''
  }${browseMode ? '' : ' cursor-pointer'}`;

  return (
    <div
      className={cardClass}
      onClick={browseMode ? undefined : onView}
      role={browseMode ? undefined : 'button'}
      tabIndex={browseMode ? undefined : 0}
      onKeyDown={browseMode ? undefined : (e) => { if (e.key === 'Enter') onView?.(); }}
    >
      <div className={LISTING_CARD_HEADER_CLASS}>
        {b.ventureImageUrl ? (
          <img
            src={b.ventureImageUrl}
            alt={b.brandName}
            className="absolute top-0 right-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-300"
          />
        ) : null}
        <div className="relative z-10 flex items-end justify-between w-full">
          <div className="flex items-center gap-2">
            {b.ventureImageUrl ? (
              <img
                src={b.ventureImageUrl}
                alt={b.brandName}
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl font-extrabold text-gray-900 ring-2 ring-gray-100 shadow-sm bg-gray-100">
                {b.brandName?.[0] || '?'}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide ${isAuction ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {isAuction ? '🔨 Auction' : '🤝 Regular'}
              </span>
              {isOwner && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm">
                  ✦ Owner
                </span>
              )}
              {isAuction && isGstinVerified && (
                <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm">
                  ✓ GSTIN
                </span>
              )}
              {!isAuction && isGstinVerified && (
                <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[9px] font-extrabold rounded uppercase tracking-wide shadow-sm">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-4 pt-3 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1 mb-1 min-h-0">
          <h3 className="font-display text-sm font-extrabold text-gray-900 leading-snug break-words line-clamp-1">
            {b.brandName}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
            {b.industry && (
              <span className="px-1.5 py-[2px] bg-gray-100 text-gray-500 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
                {b.industry.replace(/_/g, ' ')}
              </span>
            )}
            {b.ventureType && (
              <span className="px-1.5 py-[2px] bg-gray-100 text-gray-600 text-[9px] font-bold rounded uppercase tracking-wide whitespace-nowrap">
                {VENTURE_EQUITY_TYPE_LABELS[b.ventureType] || b.ventureType}
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
          {shortDesc || <span className="italic text-gray-300">No description yet</span>}
        </p>

        {isAuction && auction ? (
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
                {formatPrice(auction.currentHighestBid > 0 ? auction.currentHighestBid : (auction.minBidPrice || 0))}
              </span>
              <span className="text-[9px] md:text-[10px] text-gray-500 font-semibold">
                {auction.currentHighestBid > 0 ? 'highest' : 'min bid'}
              </span>
            </div>
            <span className="text-[9px] md:text-[10px] text-gray-500">
              {auction.totalBids} bid{auction.totalBids !== 1 ? 's' : ''}
            </span>
          </div>
        ) : b.dealValue ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
                {formatPrice(b.dealValue)}
              </span>
              <span className="text-[9px] md:text-[10px] text-gray-500 font-semibold">price</span>
            </div>
          </div>
        ) : null}

        <ListingCardStatsFooter
          viewCount={venture.views || 0}
          likeState={likeState}
          onLike={onLike}
          onView={onView}
          className="mt-2 border-t border-gray-100"
        />

        {!browseMode && (
        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={b.website || '#'}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-1.5 bg-gray-100 text-gray-800 text-[10px] font-bold rounded transition-all hover:bg-gray-200 hover:text-black flex items-center justify-center gap-1"
            onClick={(e) => !b.website && e.preventDefault()}
          >
            Website ↗
          </a>
          {isOwner ? (
            <>
              {showVerifyButton && !isGstinVerified && (!isAuction || auction?.status === 'DRAFT') && (
                <button
                  type="button"
                  className="flex-1 py-1.5 bg-gray-100 text-gray-800 border border-gray-200 text-[10px] font-bold rounded transition-all hover:bg-gray-200"
                  onClick={(e) => { e.stopPropagation(); onVerify?.(); }}
                >
                  {isAuction ? '🔍 Verify GSTIN' : '🔍 Verify Business GSTIN'}
                </button>
              )}
              <div className="relative flex-1" ref={optionsRef}>
                <button
                  type="button"
                  className="w-full py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded transition-all hover:bg-gray-800 flex items-center justify-center gap-1"
                  onClick={(e) => { e.stopPropagation(); setOptionsOpen(!optionsOpen); }}
                >
                  Options ▼
                </button>
                {optionsOpen && (
                  <div className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[100px]">
                    <button type="button" className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 text-left" onClick={(e) => { e.stopPropagation(); setOptionsOpen(false); onView?.(); }}>View</button>
                    <button type="button" className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 text-left inline-flex items-center" onClick={(e) => { e.stopPropagation(); setOptionsOpen(false); onEdit?.(); }}>
                      <EditActionLabel iconSize={14}>Edit</EditActionLabel>
                    </button>
                    <button type="button" className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left" onClick={(e) => { e.stopPropagation(); setOptionsOpen(false); onDelete?.(); }}>Delete</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {isAuction && auction?.id && auction.status !== 'DRAFT' ? (
                <button
                  type="button"
                  className="flex-1 py-1.5 bg-gray-950 text-white text-[10px] font-bold rounded transition-all hover:bg-black"
                  onClick={() => navigate(`/venture-auction/${auction.id}`)}
                >
                  🔨 Bid
                </button>
              ) : !isAuction ? (
                canApply ? (
                  <button
                    type="button"
                    className="flex-1 py-1.5 bg-gray-950 text-white text-[10px] font-bold rounded transition-all hover:bg-black"
                    onClick={() => onApply?.()}
                  >
                    Apply
                  </button>
                ) : hasApplied ? (
                  <button
                    type="button"
                    className="flex-1 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-bold rounded cursor-not-allowed"
                    title="You already applied"
                    disabled
                  >
                    Applied
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex-1 py-1.5 bg-gray-100 text-gray-400 text-[10px] font-bold rounded cursor-not-allowed"
                    title="GST verification required"
                    disabled
                  >
                    GST Pending
                  </button>
                )
              ) : (
                <button type="button" className="flex-1 py-1.5 bg-gray-100 text-gray-400 text-[10px] font-bold rounded cursor-not-allowed">View</button>
              )}
            </>
          )}
          <div className="relative shrink-0" ref={shareRef}>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-gray-500 hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); setShareOpen(!shareOpen); }}
              title="Share"
            >
              <Share2 size={12} />
            </button>
            {shareOpen && (
              <div className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[150px]">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-[10px] font-semibold text-gray-500">Share via</span>
                </div>
                <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleShare(linkedinShare); }}>
                  LinkedIn
                </button>
                <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleShare(facebookShare); }}>
                  Facebook
                </button>
                <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleShare(whatsappShare); }}>
                  WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
