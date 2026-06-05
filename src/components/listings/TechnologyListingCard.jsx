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
  technologyAuctionId,
} from '../../utils/technologyAuctionUi';
import { TechnologyVerificationTrigger } from './TechnologyVerificationProgress';

const STATUS_COLORS = {
  AVAILABLE: { color: '#6ec896', bg: 'rgba(110,200,150,0.1)', border: 'rgba(110,200,150,0.3)' },
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
  const { t } = useTranslation();
  if (!REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE || verified) return null;
  return (
    <span className="inline-flex items-center max-w-full px-2 py-0.5 rounded-md text-[0.68rem] font-semibold leading-tight text-amber-800 bg-amber-50 border border-amber-200 whitespace-normal">
      {owner ? t('listingCardPendingAdminReview') : t('listingCardVerificationPending')}
    </span>
  );
}

export default function TechnologyListingCard({
  item,
  isOwner,
  browseMode = false,
  compact = false,
  onView,
  onBuy,
  onDelete,
  likeState,
  onLike,
  onAuction,
  auctionStatus,
  onOpenVerification,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);
  const s = STATUS_COLORS[item.softwareStatus] || STATUS_COLORS.AVAILABLE;
  const owner = isOwner ?? item.listedBy?.id === user?.id;
  const showVerificationNotice =
    REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !item.verified;
  const isHomePreview = browseMode || compact;
  const techTags = item.techStack?.split(',').map((t) => t.trim()).filter(Boolean) || [];

  return (
    <div
      className={`listing-card-glow technology-listing-card card-glow-hover group relative bg-white rounded-2xl flex flex-col shadow-sm transition-all duration-300 h-full${
        isHomePreview ? ' p-4' : ' p-5 gap-2'
      }${browseMode ? '' : ' cursor-pointer'}`}
      onClick={browseMode ? undefined : (e) => {
        if (e.target.closest('[data-tech-verify-zone]')) return;
        onView?.();
      }}
    >
      <div className={`flex flex-col flex-1 min-h-0 ${isHomePreview ? 'gap-0' : 'gap-2'}`}>
      <div className={`flex flex-col ${isHomePreview ? 'gap-1.5 mb-1' : 'gap-2 mb-1'}`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={`bg-indigo-50 border border-indigo-200 rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden ${
            isHomePreview ? 'w-10 h-10 text-lg' : 'w-[42px] h-[42px] text-xl'
          }`}>
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
            <div className={`font-semibold text-indigo-600 uppercase tracking-wider truncate ${
              isHomePreview ? 'text-[0.65rem]' : 'text-[0.72rem]'
            }`}>
              {item.category?.replace(/_/g, ' ') || t('listingCardTechnology')}
            </div>
            {item.pricingDemand && (
              <div className={`text-gray-500 truncate mt-0.5 ${isHomePreview ? 'text-[10px]' : 'text-xs'}`}>
                {String(item.pricingDemand).replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>

        {(owner || item.official || item.verified || (!browseMode && showVerificationNotice)) && (
          <div className="flex flex-wrap items-center gap-1.5 w-full">
            {owner && (
              <span className={`inline-flex items-center rounded-md font-semibold text-green-700 bg-green-50 border border-green-200 whitespace-nowrap ${
                isHomePreview ? 'px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide' : 'px-2 py-0.5 text-[0.68rem]'
              }`}>
                {t('listingCardOwner')}
              </span>
            )}
            {item.official && (
              <span className={`inline-flex items-center font-bold text-amber-700 bg-amber-50 border border-amber-200 whitespace-nowrap ${
                isHomePreview ? 'px-1.5 py-0.5 text-[9px] uppercase tracking-wide' : 'px-2 py-0.5 text-[0.68rem]'
              }`}>
                {t('listingCardOfficial')}
              </span>
            )}
            {item.verified && (
              <span className={`inline-flex items-center font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap ${
                isHomePreview ? 'px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide' : 'px-2 py-0.5 text-[0.68rem]'
              }`}>
                {t('auctionsPageVerified')}
              </span>
            )}
            {!owner && !browseMode && showVerificationNotice && (
              <VerificationChip owner={false} verified={item.verified} />
            )}
          </div>
        )}

      </div>

      <h3 className={`font-display text-gray-900 leading-snug break-words ${
        isHomePreview ? 'text-sm font-extrabold mb-1' : 'text-[1.15rem] font-semibold mt-0'
      }`}>
        {item.name}
      </h3>

      <p className={`text-gray-500 leading-relaxed line-clamp-2 ${
        isHomePreview ? 'text-[11px] mb-2 min-h-[2.35rem]' : 'text-[0.82rem] my-1'
      }`}>
        {item.description || '\u00A0'}
      </p>

      <div className={`flex flex-wrap gap-1.5 ${isHomePreview ? 'mb-2 min-h-[1.15rem]' : 'mb-1'}`}>
        {techTags.slice(0, isHomePreview ? 2 : 3).map((tech) => (
          <span
            key={tech}
            className={`rounded bg-indigo-50 text-indigo-600 border border-indigo-200 ${
              isHomePreview ? 'text-[9px] font-bold uppercase tracking-wide px-1.5 py-[2px]' : 'text-[0.7rem] px-2 py-0.5'
            }`}
          >
            {tech}
          </span>
        ))}
        {techTags.length > (isHomePreview ? 2 : 3) && (
          <span className={`rounded bg-gray-100 text-gray-400 ${isHomePreview ? 'text-[9px] px-1.5 py-[2px] font-bold' : 'text-[0.7rem] px-2 py-0.5'}`}>
            +{techTags.length - (isHomePreview ? 2 : 3)}
          </span>
        )}
      </div>

      <div className={`flex flex-wrap items-center gap-1.5 ${isHomePreview ? 'mb-2' : 'mb-1'}`}>
        <span
          className={`inline-flex items-center rounded-md font-semibold ${
            isHomePreview ? 'px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wide' : 'px-2.5 py-0.5 text-[0.75rem]'
          }`}
          style={{
            color: s.color,
            background: s.bg,
            border: `1px solid ${s.border}`,
          }}
        >
          {item.softwareStatus}
        </span>
        {!owner && !browseMode && showVerificationNotice && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.68rem] font-medium text-amber-800 bg-amber-50 border border-amber-200">
            {t('listingCardNotAvailableYet')}
          </span>
        )}
      </div>

      <div className={`rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 ${
        isHomePreview ? 'px-2 py-1.5 mb-2 min-h-[2.85rem] flex items-center' : 'px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3 mt-1'
      } ${!isHomePreview && !(item.price > 0) ? 'hidden' : ''}`}>
        {item.price > 0 ? (
          <div className="flex items-baseline gap-1">
            <span className={`font-extrabold text-emerald-700 tracking-tight ${
              isHomePreview ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>
              {formatPrice(item.price)}
            </span>
            <span className={`text-emerald-400 font-semibold ${isHomePreview ? 'text-[9px]' : 'text-[9px] md:text-[10px]'}`}>
              {t('listingCardPrice')}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-emerald-400/0 select-none" aria-hidden>—</span>
        )}
      </div>

      {owner && showVerificationNotice && !browseMode && (
        <div data-tech-verify-zone className="relative z-10 w-full flex flex-col gap-2 mt-auto mb-2">
          <p className="w-full rounded-lg bg-amber-50/80 border border-amber-200 px-2.5 py-2 text-[0.72rem] leading-snug text-amber-900 m-0">
            {t('listingCardAwaitingVerification')}
          </p>
          <TechnologyVerificationTrigger
            verified={false}
            onOpen={() => onOpenVerification?.()}
          />
        </div>
      )}
      </div>

      {browseMode ? (
        <ListingBrowseFooter onViewDetails={onView} className="mt-auto pt-2 border-t border-gray-100">
          <div className={`flex items-center text-gray-500 ${isHomePreview ? 'gap-3 text-[10px]' : 'gap-4 text-sm'}`}>
            <div className="flex items-center gap-1">
              <Eye size={isHomePreview ? 12 : 14} className="mt-[1px]" />
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
                {t('remove')}
              </button>
              {isDirectPurchase(item, auctionStatus) && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg cursor-pointer hover:bg-indigo-700"
                  onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
                >
                  {t('listingCardBuyNowArrow')}
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
                  🔨 {String(item.auctionApprovalStatus || auctionStatus?.approvalStatus || '').toUpperCase() === 'REJECTED' ? t('listingCardResubmitAuction') : t('listingCardPutToAuction')}
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
                  {t('listingCardAuctionPending')}
                </span>
              )}
              {(auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED')
                && technologyAuctionId(item, auctionStatus) && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
                  style={{ background: 'rgba(110,200,150,0.12)', color: '#6ec896', border: '1px solid rgba(110,200,150,0.35)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
                  }}
                >
                  {isTechnologyAuctionLive(item, auctionStatus) ? t('listingCardViewLiveAuction') : t('listingCardViewAuction')}
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 font-semibold text-xs rounded-lg cursor-pointer transition-colors hover:bg-red-100"
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              >
                {t('remove')}
              </button>
            </div>
          ) : isTechnologyAuctionLive(item, auctionStatus) ? (
            !isAuctionBlockedByVerification(item) && (
            <button
              type="button"
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg cursor-pointer font-semibold"
              style={{ background: 'rgba(110,200,150,0.12)', color: '#6ec896', border: '1px solid rgba(110,200,150,0.35)' }}
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
              className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg cursor-pointer hover:bg-indigo-700"
              onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            >
              {t('listingCardBuyNowArrow')}
            </button>
          ) : isPurchaseBlockedByVerification(item) ? null : (
            <span className="text-xs text-gray-400 italic">{t('listingCardSold')}</span>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
