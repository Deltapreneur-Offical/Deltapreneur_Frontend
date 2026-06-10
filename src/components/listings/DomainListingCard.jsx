import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel, ShoppingCart, MessageSquare, Trash2, Share2 } from 'lucide-react';
import { EditIcon } from '../common/EditActionLabel';
import { useCurrency } from '../../context/CurrencyContext';
import { isPremiumDomain } from '../../utils/domainPricing';
import { resolveDomainDisplay } from '../../utils/domainDisplay';
import { isAdminCreatedListing } from '../../utils/homepageListings';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import { ListingCardBadge } from './MarketplaceListingCardFrame';

const CARD_CLASS =
  'domain-listing-card card-glow-hover relative flex aspect-square h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(59,130,246,0.14)] sm:p-4';

const PRIMARY_BTN =
  'w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200';

function ListingStatus({ status }) {
  const key = (status || 'AVAILABLE').toUpperCase();
  const isAvailable = key === 'AVAILABLE';
  const config = isAvailable
    ? {
        dot: 'bg-[var(--cobrother-brand-green)]',
        text: 'Available',
        tone: 'text-[var(--cobrother-brand-green)]',
      }
    : key === 'SOLD'
      ? { dot: 'bg-rose-500', text: 'Taken', tone: 'text-rose-600' }
      : {
          dot: 'bg-slate-300',
          text: key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
          tone: 'text-slate-500',
        };

  return (
    <span
      className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`}
      role="img"
      aria-label={config.text}
      title={config.text}
    />
  );
}

function resolveDomainInitial(name) {
  const cleaned = (name || '').replace(/[^a-zA-Z0-9]/g, '');
  return (cleaned.slice(0, 1) || '?').toUpperCase();
}

function DomainListingIdentity({ logo, logoAlt, initial, children }) {
  return (
    <div className="relative mb-3 flex min-h-[3.5rem] items-end gap-3">
      {logo ? (
        <>
          <img
            src={logo}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-full rounded-xl object-cover opacity-[0.06]"
          />
          <img
            src={logo}
            alt={logoAlt}
            className="relative z-10 h-14 w-14 flex-shrink-0 rounded-xl object-cover shadow-sm ring-2 ring-gray-100"
          />
        </>
      ) : (
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 font-display text-2xl font-extrabold text-gray-900 shadow-sm ring-2 ring-gray-100">
          {initial}
        </div>
      )}
      <div className="relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-1.5 pb-0.5">
        {children}
      </div>
    </div>
  );
}

function DomainListingPriceBox({ amount, caption }) {
  return (
    <div className="mb-2 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
          {amount}
        </span>
        <span className="whitespace-nowrap text-[10px] font-semibold text-gray-500 sm:text-[11px]">
          {caption}
        </span>
      </div>
    </div>
  );
}

export default function DomainListingCard({
  domain,
  isOwner,
  browseMode = false,
  onView,
  onEdit,
  onBuy,
  onEnquire,
  onViewAuction,
  onDelete,
  likeState,
  onLike,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [imgFailed, setImgFailed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const isAuction = domain.saleType === 'AUCTION';
  const isHighValue = isPremiumDomain(domain);
  const isAdminListed = isAdminCreatedListing(domain, 'domain');
  const auction = domain.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const auctionStartBid = Number(auction?.minBidPrice ?? 0);
  const auctionCurrentBid = Number(auction?.currentHighestBid ?? 0);
  const display = resolveDomainDisplay(domain);
  const domainInitial = resolveDomainInitial(display.name);
  const domainLogo = domain.logo && !imgFailed ? domain.logo : null;

  const statusKey = (domain.domainStatus || 'AVAILABLE').toUpperCase();
  const needsVerification = !domain.verified;
  const purchaseBlocked = needsVerification && !isOwner;

  const description =
    domain.description?.trim()
    || (!domain.verified ? `ΓÅ│ ${t('listingCardVerificationPending')}` : '');

  const priceAmount = isAuction
    ? (auctionCurrentBid > 0 ? auctionCurrentBid : auctionStartBid)
    : domain.askingPrice;

  const priceCaption = isAuction
    ? (auctionLive ? t('listingCardCurrentBid') : t('listingCardStartingBid'))
    : t('listingCardPrice');

  useEffect(() => {
    setImgFailed(false);
  }, [domain.logo, domain.id]);

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/domains?id=${domain.id}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/domains?id=${domain.id}`;
  const shareText = t('listingCardShareDomain', { domain: display.fullDomain });
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const stop = (e) => e.stopPropagation();

  const interactive = !browseMode && onView;

  const renderPrimaryAction = () => {
    if (browseMode) {
      return null;
    }

    if (isOwner) {
      return (
        <div className="flex gap-2" onClick={stop} onMouseDown={stop} role="presentation">
          <button
            type="button"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center gap-1"
            onClick={(e) => {
              stop(e);
              onEdit?.();
            }}
          >
            <EditIcon size={14} /> {t('edit')}
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 inline-flex items-center justify-center gap-1"
            onClick={(e) => {
              stop(e);
              onDelete?.();
            }}
          >
            <Trash2 size={12} /> {t('remove')}
          </button>
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-600 hover:bg-slate-100"
              onClick={(e) => {
                stop(e);
                setShareOpen(!shareOpen);
              }}
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
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  onClick={() => handleShare(whatsappShare)}
                >
                  {t('listingCardWhatsApp')}
                </button>
              </div>
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
          <Gavel size={14} />
          {auctionLive ? t('listingCardJoinAuction') : t('listingCardViewAuction')}
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
      if (isHighValue) {
        return (
          <button
            type="button"
            className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5`}
            onClick={(e) => {
              stop(e);
              onEnquire?.();
            }}
          >
            <MessageSquare size={14} />
            {t('listingCardEnquire')}
          </button>
        );
      }
      return (
        <button
          type="button"
          className={`${PRIMARY_BTN} bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center gap-1.5`}
          onClick={(e) => {
            stop(e);
            onBuy?.();
          }}
        >
          <ShoppingCart size={14} />
          {t('listingCardBuyNowArrow', 'Buy Now ΓåÆ')}
        </button>
      );
    }

    return (
      <button type="button" disabled className={`${PRIMARY_BTN} cursor-not-allowed bg-slate-100 text-slate-400`}>
        {statusKey === 'SOLD' ? t('listingCardSold') : t('listingCardUnavailable')}
      </button>
    );
  };

  return (
    <article
      className={`${CARD_CLASS}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? onView : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') onView?.(); } : undefined}
    >
      {domain.takenDown && (
        <span className="absolute top-3 right-3 z-20 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          {t('listingCardTakenDown')}
        </span>
      )}

      {domain.logo && !imgFailed ? (
        <img src={domain.logo} alt="" className="hidden" onError={() => setImgFailed(true)} />
      ) : null}

      <DomainListingIdentity
        logo={domainLogo}
        logoAlt={display.fullDomain}
        initial={domainInitial}
      >
        <ListingCardBadge variant={isAuction ? 'auction' : isAdminListed ? 'admin' : 'glass'}>
          {isAuction ? 'Auction' : isAdminListed ? 'Admin' : 'Direct'}
        </ListingCardBadge>
        {domain.verified ? (
          <ListingCardBadge variant="verified">Verified</ListingCardBadge>
        ) : (
          <ListingCardBadge variant="pending">Pending</ListingCardBadge>
        )}
        {isOwner && (
          <ListingCardBadge variant="owner">Owner</ListingCardBadge>
        )}
      </DomainListingIdentity>

      <h2 className="mb-1 truncate text-lg font-extrabold text-slate-950 sm:text-xl" title={display.fullDomain}>
        {display.name}
      </h2>

      {description ? (
        <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{description}</p>
      ) : null}

      <div className="mb-0 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-semibold text-slate-700">{display.fullDomain}</span>
          <ListingStatus status={statusKey} />
        </div>
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      {Number(priceAmount) > 0 && (
        <DomainListingPriceBox
          amount={formatPrice(priceAmount)}
          caption={priceCaption}
        />
      )}

      <ListingCardStatsFooter
        viewCount={Number(domain.views ?? domain.view_count ?? domain.viewCount ?? 0)}
        likeState={likeState}
        onLike={onLike}
        onView={onView}
        className={browseMode ? '' : 'mb-2'}
      />

      {renderPrimaryAction() ? (
        <div className="mt-auto">{renderPrimaryAction()}</div>
      ) : null}
    </article>
  );
}
