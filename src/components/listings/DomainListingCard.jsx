import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Gavel, Trash2, Share2, MoreVertical } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import AddToCartButton from '../cart/AddToCartButton';
import verifiedIcon from '../../assets/Verified_Icon.png';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
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
            {auctionLabel || 'On Live Auction'}
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
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export default function DomainListingCard({
  domain,
  isOwner,
  browseMode = false,
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

  const isAuction = domain.saleType === 'AUCTION' || Boolean(domain.onAuction) || Boolean(domain.isAuction);
  const auction = domain.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const auctionStartBid = Number(auction?.minBidPrice ?? 0);
  const auctionCurrentBid = Number(auction?.currentHighestBid ?? 0);
  const display = resolveDomainDisplay(domain);

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const needsVerification = false;
  const purchaseBlocked = needsVerification && !isOwner;

  const basePrice = isAuction
    ? (auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid)
    : domain.askingPrice;
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
          text: `Check out this premium Domain listed on CoBrother!`,
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
  const shareSubject = `Premium Domain Listing Available on CoBrother: ${domainName}`;
  const shareBody = `Dear colleague / partner,\n\nI would like to share a premium domain listing currently available on CoBrother.\n\n🌐 Domain: ${domainName}\n📝 Description: A premium domain name listed for sale on CoBrother, offering a prime branding opportunity.\n🔗 View Listing:\n${shareUrl}\n\nThis platform facilitates secure transactions and connections for digital assets, technologies, and ventures.\n\nBest regards,\n[Shared via CoBrother]`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShare = `https://x.com/intent/tweet?text=${encodeURIComponent(shareSubject + '\n\n' + shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent('Check out this premium Domain listed on CoBrother!\n\n' + shareUrl)}`;
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
              aria-label="Listing actions"
              aria-haspopup="menu"
              aria-expanded={ownerMenuOpen}
              title="Listing actions"
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
                title="Start Auction"
              >
                <Gavel size={13} className="shrink-0" />
                <span className="truncate">Start Auction</span>
              </button>
            )}
            {isAuction && (
              <span
                className={`${PRIMARY_BTN} min-w-0 cursor-default border border-indigo-200 bg-indigo-50 text-indigo-500 inline-flex items-center justify-center gap-1.5`}
                title="In Auction"
              >
                <Gavel size={13} className="shrink-0" />
                <span className="truncate">In Auction</span>
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
      >
        <div className="domain-listing-card__share-container" ref={shareRef}>
          <button
            type="button"
            className="domain-listing-card__share-btn"
            onClick={toggleShare}
            title={t('listingCardShare')}
          >
            <Share2 size={18} strokeWidth={2} />
          </button>
          {shareOpen && createPortal(
            <div
              className="fixed z-[9999] w-[200px] bg-white border border-slate-100 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] overflow-hidden text-gray-900"
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
              onClick={stop}
            >
              <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Share via</span>
              </div>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(linkedinShare)}
              >
                {t('listingCardLinkedIn')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(facebookShare)}
              >
                {t('listingCardFacebook')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(twitterShare)}
              >
                Twitter / X
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(whatsappShare)}
              >
                {t('listingCardWhatsApp')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(gmailShare)}
              >
                Gmail
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => handleShare(emailShare)}
              >
                Email
              </button>
            </div>,
            document.body
          )}
        </div>
      </DomainListingCover>

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
            <OverflowMarqueeText text={display.fullDomain} />
          </p>
          {domain.verified ? (
            <img
              src={verifiedIcon}
              alt="Verified"
              className="domain-listing-card__verified-badge"
            />
          ) : null}
        </div>

        {(isAuction || Number(domain.askingPrice) > 0 || handleViewDetails) && (
          <DomainListingPriceBox
            amount={!isAuction && Number(domain.askingPrice) > 0 ? formatPrice(domain.askingPrice) : null}
            isAuction={isAuction}
            onViewDetails={handleViewDetails}
            viewLabel={t('listingCardViewDetails', 'View details')}
            auctionLabel={t('listingCardOnLiveAuction', 'On Live Auction')}
          />
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
