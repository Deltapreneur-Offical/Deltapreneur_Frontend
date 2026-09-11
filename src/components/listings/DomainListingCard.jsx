import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Gavel, Trash2, Share2, MoreVertical } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { listingBuyerPayable } from '../../utils/marketplaceListingPrice';
import { listingAuctionPhase } from '../../utils/listingAuctionPhase';
import ListingOwnerActionPair, {
  OWNER_ACTION_BTN_AUCTION,
  OWNER_ACTION_BTN_AUCTION_SOFT,
  OWNER_ACTION_BTN_EDIT,
  OWNER_ACTION_BTN_MUTED,
} from './ListingOwnerActionPair';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import AddToCartButton from '../cart/AddToCartButton';
import verifiedIcon from '../../assets/Verified_Icon.png';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import PriceSectionIcon from '../common/PriceSectionIcon';
import RegistryStandardBadge from '../domain/RegistryStandardBadge';
import '../../styles/domain-listing-cards.css';

const PRIMARY_BTN =
  'domain-listing-card__cta-btn w-full rounded-full px-4 py-2.5 text-[0.8125rem] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';

function resolveStatusDotClass(status) {
  const key = (status || 'AVAILABLE').toUpperCase();
  if (key === 'AVAILABLE') return 'listing-availability-badge__dot--available';
  if (key === 'SOLD') return 'listing-availability-badge__dot--sold';
  return 'listing-availability-badge__dot--muted';
}

function DomainListingCover({
  fullDomain,
  logoText,
  children,
}) {
  return (
    <div className="domain-listing-card__cover">
      <div className="domain-listing-card__cover-fallback" aria-hidden>
        <span
          className="domain-listing-card__cover-fallback-domain"
          style={{
            whiteSpace: 'nowrap',
            display: 'block',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <OverflowMarqueeText text={logoText || ''} />
        </span>
      </div>
      {children}
    </div>
  );
}

function DomainListingPriceBox({ amount, isAuction, onViewDetails, viewLabel, auctionLabel }) {
  return (
    <div className={`domain-listing-card__price-box${isAuction ? ' domain-listing-card__price-box--auction' : ''}`}>
      {isAuction ? (
        <div className="domain-listing-card__price-text min-w-0 flex items-center gap-1.5">
          <Gavel size={14} className="shrink-0 text-indigo-600" />
          <span className="domain-listing-card__price-value truncate font-semibold text-indigo-600">
            {auctionLabel}
          </span>
        </div>
      ) : amount ? (
        <div className="domain-listing-card__price-text min-w-0">
          <span className="domain-listing-card__price-value truncate">
            {amount}
          </span>
        </div>
      ) : null}
      {onViewDetails ? (
        <button
          type="button"
          className="domain-listing-card__price-cta"
          aria-label={viewLabel}
          onClick={onViewDetails}
        >
          <PriceSectionIcon className="domain-listing-card__price-cta-icon" />
        </button>
      ) : null}
    </div>
  );
}

export default function DomainListingCard({
  domain,
  isOwner,
  browseMode = false,
  marketplace = false,
  onView,
  onEdit,
  onEnquire,
  onViewAuction,
  onDelete,
  onPutForAuction,
  likeState,
  onLike,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const ownerMenuRef = useRef(null);
  const ownerMenuPortalRef = useRef(null);
  const [ownerMenuCoords, setOwnerMenuCoords] = useState({ top: 0, left: 0 });

  const auctionPhase = listingAuctionPhase(domain);
  const isLiveAuction = auctionPhase === 'live';
  const isWinnerPhase = auctionPhase === 'winner';
  const isAuction = isLiveAuction || isWinnerPhase;
  const auction = domain.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const auctionStartBid = Number(auction?.minBidPrice ?? 0);
  const auctionCurrentBid = Number(auction?.currentHighestBid ?? 0);
  const display = resolveDomainDisplay(domain);

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const needsVerification = false;
  const purchaseBlocked = needsVerification && !isOwner;

  const basePrice = isLiveAuction || isWinnerPhase
    ? (auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid) || listingBuyerPayable(domain)
    : listingBuyerPayable(domain);
  const priceAmount = basePrice;

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
      const outsideOwnerTrigger = ownerMenuRef.current && !ownerMenuRef.current.contains(e.target);
      const outsideOwnerMenu = !ownerMenuPortalRef.current?.contains(e.target);
      if (outsideOwnerTrigger && outsideOwnerMenu) setOwnerMenuOpen(false);
    };
    const handleClose = () => {
      setShareOpen(false);
      setOwnerMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleClose, { passive: true });
    window.addEventListener('resize', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleClose);
      window.removeEventListener('resize', handleClose);
    };
  }, []);

  const toggleShare = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Domain: ${display.fullDomain}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        } else {
          return;
        }
      }
    }

    if (!shareOpen && shareRef.current) {
      const rect = shareRef.current.getBoundingClientRect();
      let left = rect.right + window.scrollX - 200;
      if (left < 10) left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY;
      if (rect.bottom + 270 > window.innerHeight) {
        top = rect.top + window.scrollY - 270;
      }
      setCoords({ top, left });
    }
    setShareOpen(!shareOpen);
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/domains/${domain.id}${user?.id ? `?ref=${user.id}` : ''}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/domains/${domain.id}${user?.id ? `?ref=${user.id}` : ''}`;
  const domainName = display.fullDomain;
  const shareSubject = `Delta Domains Listing Available on Deltapreneur: ${domainName}`;
  const shareText = `🚀 Check out ${domainName} on Deltapreneur!\n\n✦ Delta Domains\n✅ Available\n💰 ${formatPrice(priceAmount)}\n\nA Delta Domains listing available on Deltapreneur.`;
  const shareBody = `${shareText}\n\n🔗 ${shareUrl}`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShare = `https://x.com/intent/tweet?text=${encodeURIComponent(shareBody)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareBody)}`;
  const gmailShare = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
  const emailShare = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const stop = (e) => e.stopPropagation();

  const toggleOwnerMenu = (e) => {
    stop(e);
    if (!ownerMenuOpen && ownerMenuRef.current) {
      const rect = ownerMenuRef.current.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 104;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
      const top = rect.bottom + menuHeight + 8 > window.innerHeight
        ? rect.top - menuHeight - 6
        : rect.bottom + 6;
      setOwnerMenuCoords({ top, left });
    }
    setOwnerMenuOpen((open) => !open);
  };

  const interactive = Boolean(onView);

  const handleViewDetails = onView
    ? (e) => {
      stop(e);
      onView();
    }
    : undefined;

  const handleCardClick = (e) => {
    if (!onView) return;
    if (e?.target && e.target.closest && e.target.closest('button, a, input, textarea, select, label, [role="link"]')) return;
    onView();
  };

  const handleCardKeyDown = (e) => {
    if (!onView) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); onView(); }
  };

  const renderPrimaryAction = () => {
    if (browseMode) {
      return null;
    }

    if (isOwner) {
      return (
        <div className="flex w-full min-w-0 items-center gap-2" onClick={stop} onMouseDown={stop} role="presentation">
          <div className="relative shrink-0" ref={ownerMenuRef}>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-0 text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              onClick={toggleOwnerMenu}
              aria-label={t('listingActions', { defaultValue: 'Listing actions' })}
              aria-haspopup="menu"
              aria-expanded={ownerMenuOpen}
              title={t('listingActions', { defaultValue: 'Listing actions' })}
            >
              <MoreVertical size={16} strokeWidth={2} />
            </button>
            {ownerMenuOpen && createPortal(
              <div
                ref={ownerMenuPortalRef}
                role="menu"
                className="fixed z-[9999] w-44 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
                style={{ top: ownerMenuCoords.top, left: ownerMenuCoords.left }}
                onClick={stop}
                onMouseDown={stop}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[0.8125rem] font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
                  onClick={(e) => {
                    stop(e);
                    setOwnerMenuOpen(false);
                    onEdit?.();
                  }}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-white group-hover:text-slate-800">
                    <EditIcon size={14} />
                  </span>
                  {t('edit')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[0.8125rem] font-semibold text-rose-600 transition-colors hover:bg-rose-50 active:bg-rose-100"
                  onClick={(e) => {
                    stop(e);
                    setOwnerMenuOpen(false);
                    onDelete?.();
                  }}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors group-hover:bg-white">
                    <Trash2 size={14} />
                  </span>
                  {t('remove')}
                </button>
              </div>,
              document.body
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center">
            {!isAuction && onPutForAuction && (
              <button
                type="button"
                className={`${PRIMARY_BTN} min-w-0 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:bg-blue-800 inline-flex items-center justify-center gap-1.5`}
                onClick={(e) => {
                  stop(e);
                  onPutForAuction();
                }}
                title={t('putAuction', { defaultValue: 'Put Auction' })}
              >
                <Gavel size={13} className="shrink-0" />
                <span>{t('putAuction', { defaultValue: 'Put Auction' })}</span>
              </button>
            )}
            {isAuction && (
              <span
                className={`${PRIMARY_BTN} min-w-0 cursor-default border border-indigo-200 bg-indigo-50 text-indigo-500 inline-flex items-center justify-center gap-1.5`}
                title={t('inAuction', { defaultValue: 'In Auction' })}
              >
                <Gavel size={13} className="shrink-0" />
                <span className="truncate">{t('inAuction', { defaultValue: 'In Auction' })}</span>
              </span>
            )}
          </div>
        </div>
      );
    }

    if (isAuction) {
      if (purchaseBlocked) {
        return (
          <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
            {t('listingCardVerificationPending')}
          </button>
        );
      }
      return (
        <button
          type="button"
          className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5`}
          onClick={(e) => {
            stop(e);
            onViewAuction?.();
          }}
        >
          <Gavel size={13} />
          {auctionLive ? t('listingCardJoinAuction') : t('listingCardViewAuction')}
        </button>
      );
    }

    if (statusKey === 'UNDER_REVIEW') {
      return (
        <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-amber-50 text-amber-800 border border-amber-200`}>
          {t('listingCardAcquisitionInProgress', 'Acquisition in Progress')}
        </button>
      );
    }

    if (statusKey === 'AVAILABLE') {
      if (purchaseBlocked) {
        return (
          <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
            {t('listingCardVerificationPending')}
          </button>
        );
      }
      // Always use cart checkout — no direct Buy Now (avoids Razorpay amount limits on modal pay).
      return (
        <AddToCartButton
          productType="DOMAIN_LISTING"
          productId={domain.id}
          size="md"
          tone="blue"
          className={`${PRIMARY_BTN} !w-full !rounded-full`}
          label={t('listingCardAddToCart', 'Add to Cart')}
        />
      );
    }

    return (
      <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
        {statusKey === 'SOLD' ? t('listingCardSold') : t('listingCardUnavailable')}
      </button>
    );
  };

  const cardLayoutClass = browseMode
    ? 'h-auto home-preview-browse-card'
    : 'h-full min-h-0';

  const cardGlowClass = isAuction ? 'domain-auction-card-clean' : 'card-glow-hover';

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETPLACE VARIANT: Render flat card layout matching Premium DomainCard
  // Blue theme (sky) instead of amber — same structure as DomainCard
  // ═══════════════════════════════════════════════════════════════════════════
    if (marketplace) {
    const priceText = priceAmount > 0 ? formatPrice(priceAmount) : null;
    const canBuy = statusKey === 'AVAILABLE' && !purchaseBlocked && priceAmount > 0 && !isOwner;

    return (
      <div
        className="domain-search-card domain-search-card--listing relative flex h-full min-w-0 w-full flex-col overflow-hidden border rounded-2xl p-4 sm:p-5 hover:-translate-y-0.5 transition-all duration-200 border-sky-200 ring-1 ring-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-white shadow-[0_0_0_1px_rgba(125,211,252,0.2),0_8px_24px_rgba(2,132,199,0.08),0_0_20px_rgba(56,189,248,0.12)] hover:shadow-[0_0_0_1px_rgba(125,211,252,0.3),0_10px_28px_rgba(2,132,199,0.12),0_0_28px_rgba(56,189,248,0.18)]"
        onClick={interactive ? handleCardClick : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? handleCardKeyDown : undefined}
      >
        {/* Share corner icon — matching Premium card style */}
        <div ref={shareRef} className="absolute top-2.5 right-2.5 z-10">
          <button
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/80 border border-white/60 shadow-sm hover:bg-white hover:shadow-md hover:scale-105 transition-all duration-150 cursor-pointer text-slate-500 hover:text-slate-700"
            onClick={toggleShare}
            title={t('listingCardShare', 'Share')}
          >
            <Share2 size={17} strokeWidth={2} />
          </button>
          {shareOpen && createPortal(
            <div
              className="fixed z-[9999] w-[200px] bg-white border border-slate-100 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] overflow-hidden text-gray-900"
              style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
              onClick={stop}
            >
              <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('shareVia', { defaultValue: 'Share via' })}</span>
              </div>
              {[
                ['LinkedIn', linkedinShare],
                ['Facebook', facebookShare],
                ['Twitter / X', twitterShare],
                ['WhatsApp', whatsappShare],
                ['Gmail', gmailShare],
                ['Email', emailShare],
              ].map(([label, url]) => (
                <button key={label} type="button" className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors" onClick={() => handleShare(url)}>{label}</button>
              ))}
            </div>,
            document.body
          )}
        </div>

        {/* Content: badges + domain + price — matches DomainCard structure */}
        <div className="pr-9 min-w-0 flex-1 space-y-1.5">
          {/* Badges row — extra pb matches Premium card's renewal text spacing */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1.5 min-w-0">
            <span
              className={`inline-flex w-fit max-w-full shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                statusKey === 'AVAILABLE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : statusKey === 'SOLD'
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {statusKey === 'AVAILABLE'
                ? `\u2713 ${t('listingCardAvailable', { defaultValue: 'Available' })}`
                : statusKey === 'SOLD'
                  ? t('listingCardSold', { defaultValue: 'Sold' })
                  : t('listingCardUnavailable', { defaultValue: 'Unavailable' })}
            </span>
            <RegistryStandardBadge />
          </div>

          <p
            className="domain-search-card__name m-0 min-w-0 max-w-full font-bold leading-snug text-slate-700"
            title={display.fullDomain}
          >
            <span translate="no">{display.name}</span>
            {display.ext?.full ? (
              <span translate="no" className="text-sky-700">{display.ext.full.startsWith('.') ? display.ext.full : `.${display.ext.full}`}</span>
            ) : null}
          </p>

          {/* Standard Domain label */}
          <p className="text-[11px] font-semibold text-sky-800/80">{t('domainCardStandardDomain', { defaultValue: 'DOMAIN' })}</p>

          {priceText ? (
            <>
              <p
                className="domain-search-card__price text-base font-extrabold text-gray-950 pt-0.5 min-w-0 max-w-full"
                title={priceText}
              >
                <span className="domain-search-card__price-value">{priceText}</span>
              </p>
              <p className="text-[11px] font-medium text-gray-400 leading-snug pt-0.5">
                {t('inclusiveTaxes', { defaultValue: 'Inclusive of applicable taxes' })}
              </p>
            </>
          ) : (
            <p className="text-xs font-semibold text-gray-400">{t('domainCardPriceUnavailable', { defaultValue: 'Price unavailable' })}</p>
          )}
        </div>

        {/* Bottom: pencil | Put Auction (auction label gets remaining width) */}
        <div className="mt-auto pt-3">
          {isOwner ? (
            <div className="flex w-full min-w-0 items-center gap-2">
            <ListingOwnerActionPair
              className="min-w-0 flex-1"
              left={
                onEdit ? (
                  <button
                    type="button"
                    className={OWNER_ACTION_BTN_EDIT}
                    onClick={(e) => { stop(e); onEdit(); }}
                    aria-label={t('edit')}
                    title={t('edit')}
                  >
                    <EditIcon size={15} />
                  </button>
                ) : (
                  <span className={OWNER_ACTION_BTN_MUTED}>
                    {t('listingCardYourListing', { defaultValue: 'Your listing' })}
                  </span>
                )
              }
              right={
                isWinnerPhase ? (
                  <button
                    type="button"
                    className={OWNER_ACTION_BTN_AUCTION_SOFT}
                    onClick={(e) => { stop(e); onViewAuction?.(); }}
                    title={t('auctionDetailEndedTitle', { defaultValue: 'View winner' })}
                  >
                    <Gavel size={14} className="shrink-0" />
                    <span>{t('auctionDetailEndedTitle', { defaultValue: 'View winner' })}</span>
                  </button>
                ) : isLiveAuction ? (
                  <button
                    type="button"
                    className={OWNER_ACTION_BTN_AUCTION_SOFT}
                    onClick={(e) => { stop(e); onViewAuction?.(); }}
                    title={auctionLive
                      ? t('listingCardOnLiveAuction', { defaultValue: 'On Live Auction' })
                      : t('inAuction', { defaultValue: 'In Auction' })}
                  >
                    <Gavel size={14} className="shrink-0" />
                    <span>
                      {auctionLive
                        ? t('listingCardOnLiveAuction', { defaultValue: 'On Live Auction' })
                        : t('inAuction', { defaultValue: 'In Auction' })}
                    </span>
                  </button>
                ) : onPutForAuction ? (
                  <button
                    type="button"
                    className={OWNER_ACTION_BTN_AUCTION}
                    onClick={(e) => { stop(e); onPutForAuction(); }}
                    title={t('putAuction', { defaultValue: 'Put Auction' })}
                  >
                    <Gavel size={14} className="shrink-0" />
                    <span>{t('putAuction', { defaultValue: 'Put Auction' })}</span>
                  </button>
                ) : (
                  <span className={OWNER_ACTION_BTN_MUTED}>
                    {t('listingCardYourListing', { defaultValue: 'Your listing' })}
                  </span>
                )
              }
            />
            {onDelete && !browseMode ? (
              <button
                type="button"
                className="domain-search-card__delete-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors"
                onClick={(e) => { stop(e); onDelete(); }}
                aria-label={t('delete', { defaultValue: 'Delete' })}
                title={t('delete', { defaultValue: 'Delete' })}
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            ) : null}
            </div>
          ) : isAuction && auctionLive ? (
            <button
              type="button"
              className={`${OWNER_ACTION_BTN_AUCTION} !w-fit min-w-[8.5rem] px-4`}
              onClick={(e) => { stop(e); onViewAuction?.(); }}
            >
              <Gavel size={13} className="shrink-0" /> {t('listingCardOnLiveAuction', { defaultValue: 'On Live Auction' })} →
            </button>
          ) : canBuy ? (
            <AddToCartButton
              productType="DOMAIN_LISTING"
              productId={domain.id}
              tone="dark"
              size="sm"
              wrapperClassName="w-fit max-w-full"
              className="!flex-none !min-w-0 !w-auto !justify-center !rounded-lg !px-4 !py-2.5 !text-sm !font-bold !whitespace-nowrap"
              label={t('listingCardAddToCart', 'Add to Cart')}
            />
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex w-fit min-w-[8.5rem] px-4 py-2.5 rounded-lg font-bold text-sm bg-gray-100 text-gray-400 cursor-not-allowed whitespace-nowrap"
            >
              {statusKey === 'SOLD' ? t('listingCardSold') : statusKey === 'AVAILABLE' ? t('listingCardVerificationPending') : t('listingCardUnavailable')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT: Original listing card layout (cover + body) — unchanged
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <article
      className={`domain-listing-card ${cardGlowClass} relative flex ${cardLayoutClass} w-full flex-col overflow-hidden rounded-3xl bg-white${browseMode ? ' domain-listing-card--browse' : ''}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? handleCardClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleCardKeyDown : undefined}
    >
      {domain.takenDown && (
        <span className="domain-listing-card__taken-down-badge">
          {t('listingCardTakenDown')}
        </span>
      )}
      {statusKey === 'UNDER_REVIEW' && (
        <span className="domain-listing-card__acquisition-badge">
          {t('listingCardPremiumAcquisitionInProgress', 'Premium Acquisition in Progress')}
        </span>
      )}

      <DomainListingCover
        fullDomain={display.fullDomain}
        logoText={domain.logo_text ?? domain.logoText}
      />

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p
            className="domain-listing-card__domain"
            title={display.fullDomain}
            style={{
              whiteSpace: 'nowrap',
              wordBreak: 'normal',
              overflowWrap: 'normal',
              display: 'block',
            }}
          >
            <span translate="no">{display.name}</span>
            {display.ext?.full ? (
              <span translate="no" className="domain-listing-card__tld">{display.ext.full}</span>
            ) : null}
          </p>
          {domain.verified ? (
            <img
              src={verifiedIcon}
              alt={t('verified', { defaultValue: 'Verified' })}
              className="domain-listing-card__verified-badge"
            />
          ) : null}
        </div>

        {(isAuction || Number(listingBuyerPayable(domain)) > 0 || handleViewDetails) && (
          <div className="min-w-0">
            <DomainListingPriceBox
              amount={!isAuction && Number(listingBuyerPayable(domain)) > 0 ? formatPrice(listingBuyerPayable(domain)) : null}
              isAuction={isAuction}
              onViewDetails={handleViewDetails}
              viewLabel={t('listingCardViewDetails', 'View details')}
              auctionLabel={t('listingCardOnLiveAuction', 'On Live Auction')}
            />
            {!isAuction && Number(listingBuyerPayable(domain)) > 0 ? (
              <p className="mt-1 text-[11px] font-medium text-gray-400 leading-snug">
                {t('inclusiveTaxes', { defaultValue: 'Inclusive of applicable taxes' })}
              </p>
            ) : null}
          </div>
        )}

        <ListingCardStatsFooter
          viewCount={Number(domain.views ?? domain.view_count ?? domain.viewCount ?? 0)}
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
