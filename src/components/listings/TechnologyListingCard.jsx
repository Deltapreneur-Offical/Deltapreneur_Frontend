import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, MoreVertical, Trash2, Gavel, ShoppingCart, CircleUser } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import { REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE } from '../../config/featureFlags';
import {
  canRequestTechnologyAuction,
  isTechnologyAuctionAwaitingWinner,
  isTechnologyAuctionLive,
  isTechnologyAuctionPending,
  isTechnologyListingOwner,
  technologyAuctionId,
} from '../../utils/technologyAuctionUi';
import ListingOwnerActionPair, {
  OWNER_ACTION_BTN_AUCTION,
  OWNER_ACTION_BTN_AUCTION_SOFT,
  OWNER_ACTION_BTN_EDIT,
  OWNER_ACTION_BTN_MUTED,
} from './ListingOwnerActionPair';
import { EditIcon } from '../common/EditActionLabel';
import verifiedIcon from '../../assets/Verified_Icon.png';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import PriceSectionIcon from '../common/PriceSectionIcon';
import '../../styles/domain-listing-cards.css';

function resolveSoftwareStatusDotClass(status) {
  const key = (status || 'AVAILABLE').toUpperCase();
  if (key === 'AVAILABLE') return 'listing-availability-badge__dot--available';
  if (key === 'SOLD') return 'listing-availability-badge__dot--sold';
  return 'listing-availability-badge__dot--muted';
}

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
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const shareRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const owner = Boolean(user?.id) && (isOwner === true || isTechnologyListingOwner(item, user));
  const isAuction = item.purchaseType === 'AUCTION';
  const showVerificationNotice =
    REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !item.verified;

  useEffect(() => {
    setImgFailed(false);
  }, [item.imageUrl, item.id]);

  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const handleClose = () => {
      setShareOpen(false);
      setMenuOpen(false);
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
    stop(e);
    setMenuOpen(false);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Technology: ${item.name || 'Technology'}`,
          text: `Check out this Technology listed on Deltapreneur!\n\n${shareUrl}`,
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
      ? `${window.location.origin}/technology/${item.id}${user?.id ? `?ref=${user.id}` : ''}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/technology/${item.id}${user?.id ? `?ref=${user.id}` : ''}`;
  const shareTechName = item.name || 'Technology Listing';
  const shareTechDesc = item.description || 'A premium software/technology listing on Deltapreneur.';
  const shareSubject = `Premium Technology Listing Available on Deltapreneur: ${shareTechName}`;
  const shareBody = `Dear colleague / partner,\n\nI would like to share a premium technology listing currently available on Deltapreneur.\n\n🌐 Technology: ${shareTechName}\n📝 Description: ${shareTechDesc}\n🔗 View Listing:\n${shareUrl}\n\nDeltapreneur is a professional marketplace for digital assets, intellectual property, and software transactions.\n\nBest regards,\n[Shared via Deltapreneur]`;

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareSubject)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShare = `https://x.com/intent/tweet?text=${encodeURIComponent(shareSubject + '\n\n' + shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent('Check out this premium Technology listed on Deltapreneur!\n\n' + shareUrl)}`;
  const gmailShare = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
  const emailShare = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;

  const handleShare = (platform) => {
    window.open(platform, '_blank', 'width=600,height=400');
    setShareOpen(false);
  };

  const stop = (e) => e.stopPropagation();

  const closeMenus = () => {
    setShareOpen(false);
    setMenuOpen(false);
  };

  const runMenuAction = (action) => (e) => {
    stop(e);
    closeMenus();
    action?.();
  };

  const primaryBtn = 'domain-listing-card__btn domain-listing-card__btn--primary w-full';
  const statusChip = 'domain-listing-card__btn domain-listing-card__btn--disabled w-full';

  const renderOwnerListingChip = () => {
    const statusKey = (item.softwareStatus || 'AVAILABLE').toUpperCase();
    let tone = 'live';
    let statusLabel = t('listingCardYourListingLive', { defaultValue: 'Live on marketplace' });

    if (statusKey === 'SOLD') {
      tone = 'sold';
      statusLabel = t('listingCardSold');
    } else if (showVerificationNotice) {
      tone = 'pending';
      statusLabel = t('listingCardVerificationPending');
    } else if (isAuction) {
      tone = 'auction';
      statusLabel = t('listingCardAuction', { defaultValue: 'Auction' });
    }

    return (
      <span
        className={`domain-listing-card__btn domain-listing-card__btn--owner domain-listing-card__btn--owner-${tone} w-full`}
        aria-label={t('listingCardYourListingAria', {
          status: statusLabel,
          defaultValue: 'Your listing — {{status}}',
        })}
      >
        <CircleUser size={14} strokeWidth={2.1} aria-hidden />
        <span className="domain-listing-card__owner-chip-text">
          <span className="domain-listing-card__owner-chip-title">
            {t('listingCardYourListing', { defaultValue: 'Your listing' })}
          </span>
          <span className="domain-listing-card__owner-chip-meta">{statusLabel}</span>
        </span>
      </span>
    );
  };



  const buildOwnerMenuItems = () => {
    const items = [];
    if (onDelete) {
      items.push({
        key: 'remove',
        icon: Trash2,
        label: t('remove'),
        danger: true,
        onClick: onDelete,
      });
    }
    return items;
  };

  const buildAdminMenuItems = () => {
    if (!onDelete) return [];
    return [{
      key: 'remove',
      icon: Trash2,
      label: t('remove'),
      danger: true,
      onClick: onDelete,
    }];
  };

  const optionsMenu = (items) => {
    if (!items.length) return null;
    return (
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          className={`domain-listing-card__btn domain-listing-card__btn--icon${menuOpen ? ' is-active' : ''}`}
          onClick={(e) => { stop(e); setShareOpen(false); setMenuOpen(!menuOpen); }}
          aria-label={t('listingCardOptions', { defaultValue: 'Options' })}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreVertical size={15} strokeWidth={2.25} />
        </button>
        {menuOpen && (
          <div className="domain-listing-card__menu domain-listing-card__menu--leading" role="menu" onClick={stop}>
            {items.map(({ key, icon: Icon, label, danger, onClick }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                className={`domain-listing-card__menu-item${danger ? ' domain-listing-card__menu-item--danger' : ''}`}
                onClick={runMenuAction(onClick)}
              >
                <Icon size={14} strokeWidth={2.1} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOwnerActionPair = () => {
    const liveId = technologyAuctionId(item, auctionStatus);
    const editBtn = onEdit ? (
      <button
        type="button"
        className={OWNER_ACTION_BTN_EDIT}
        onClick={(e) => { stop(e); onEdit(); }}
      >
        <EditIcon size={14} />
        <span className="truncate">{t('edit')}</span>
      </button>
    ) : (
      <span className={OWNER_ACTION_BTN_MUTED}>
        {t('listingCardYourListing', { defaultValue: 'Your listing' })}
      </span>
    );

    let auctionBtn;
    if (isTechnologyAuctionLive(item, auctionStatus) && liveId) {
      auctionBtn = (
        <button
          type="button"
          className={OWNER_ACTION_BTN_AUCTION_SOFT}
          onClick={(e) => {
            stop(e);
            navigate(`/technology/auction/${liveId}`);
          }}
        >
          <Gavel size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{t('listingCardOnLiveAuction', { defaultValue: 'On Live Auction' })}</span>
        </button>
      );
    } else if (isTechnologyAuctionAwaitingWinner(item, auctionStatus) && liveId) {
      auctionBtn = (
        <button
          type="button"
          className={OWNER_ACTION_BTN_AUCTION_SOFT}
          onClick={(e) => {
            stop(e);
            navigate(`/technology/auction/${liveId}`);
          }}
        >
          <Gavel size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{t('auctionDetailEndedTitle', { defaultValue: 'View winner' })}</span>
        </button>
      );
    } else if (isTechnologyAuctionPending(item, auctionStatus)) {
      auctionBtn = (
        <span className={OWNER_ACTION_BTN_MUTED}>
          {t('listingCardAuctionPending')}
        </span>
      );
    } else if (canRequestTechnologyAuction(item, auctionStatus) && onAuction) {
      auctionBtn = (
        <button
          type="button"
          className={OWNER_ACTION_BTN_AUCTION}
          onClick={(e) => { stop(e); onAuction(); }}
        >
          <Gavel size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{t('listingCardPutToAuction')}</span>
        </button>
      );
    } else {
      auctionBtn = (
        <span className={OWNER_ACTION_BTN_MUTED}>
          {t('listingCardYourListing', { defaultValue: 'Your listing' })}
        </span>
      );
    }

    return <ListingOwnerActionPair left={editBtn} right={auctionBtn} className="flex-1" />;
  };

  const renderPrimaryAction = () => {
    if (owner) {
      return renderOwnerActionPair();
    }

    if (isTechnologyAuctionLive(item, auctionStatus)) {
      if (isAuctionBlockedByVerification(item)) {
        return (
          <span className={statusChip}>
            {t('listingCardVerificationPending')}
          </span>
        );
      }
      return (
        <button
          type="button"
          className={primaryBtn}
          onClick={(e) => {
            stop(e);
            navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`);
          }}
        >
          <Gavel size={13} aria-hidden />
          <span>🟢 On Live Auction</span>
        </button>
      );
    }

    if (isDirectPurchase(item, auctionStatus)) {
      if (onBuy) {
        return (
          <button
            type="button"
            className={primaryBtn}
            onClick={(e) => {
              stop(e);
              onBuy();
            }}
          >
            <ShoppingCart size={13} aria-hidden />
            <span>{t('listingCardBuyNowArrow', 'Buy Now →')}</span>
          </button>
        );
      }
      return (
        <button type="button" className={primaryBtn} onClick={(e) => { stop(e); onView?.(); }}>
          <span>{t('listingCardViewDetails', 'View Details')}</span>
          <ArrowRight size={13} aria-hidden />
        </button>
      );
    }

    if (isPurchaseBlockedByVerification(item)) {
      return (
        <span className={statusChip}>
          {t('listingCardVerificationPending')}
        </span>
      );
    }

    return (
      <span className={`${statusChip} italic font-medium`}>
        {t('listingCardSold')}
      </span>
    );
  };

  const primaryAction = renderPrimaryAction();
  const ownerMenuItems = owner ? buildOwnerMenuItems() : [];
  const adminMenuItems = !owner && ['ADMIN', 'SUPER_ADMIN', 'AUCTION_MODERATOR'].includes(user?.role) ? buildAdminMenuItems() : [];
  const menuItems = ownerMenuItems.length ? ownerMenuItems : adminMenuItems;

  const actionButtons = owner ? (
    <div className="flex w-full min-w-0 items-stretch gap-2" onClick={stop} role="presentation">
      {menuItems.length > 0 ? (
        <div className="shrink-0 self-center">
          {optionsMenu(menuItems)}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {primaryAction}
      </div>
    </div>
  ) : (
    <div className="domain-listing-card__actions-bar" onClick={stop} role="presentation">
      {menuItems.length > 0 ? (
        <div className="domain-listing-card__actions-leading">
          {optionsMenu(menuItems)}
        </div>
      ) : null}
      <div className={`domain-listing-card__actions-primary${primaryAction ? '' : ' domain-listing-card__actions-primary--empty'}`}>
        {primaryAction}
      </div>
    </div>
  );

  const techName = item.name || t('listingCardTechnology');
  const techCategory = (item.category || 'Technology').replace(/_/g, ' ');
  const techImage = item.imageUrl && !imgFailed ? item.imageUrl : null;
  const useCase = item.whatItDoes || item.what_it_does || item.description || '';
  const statusKey = (item.softwareStatus || 'AVAILABLE').toUpperCase();
  const priceAmount = Number(item.price || 0);
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

  const showPriceBox = browseMode
    ? (priceAmount > 0 || handleViewDetails)
    : true;

  return (
    <article
      className={`domain-listing-card technology-listing-card card-glow-hover relative flex w-full flex-col overflow-hidden rounded-3xl bg-white${browseMode ? ' domain-listing-card--browse technology-listing-card--browse home-preview-browse-card' : ''}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? handleCardClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleCardKeyDown : undefined}
    >
      <div className="domain-listing-card__cover">
        {techImage ? (
          <img
            src={techImage}
            alt={techName}
            className="domain-listing-card__cover-img"
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="domain-listing-card__cover-fallback technology-listing-card__cover-fallback" aria-hidden>
            <OverflowMarqueeText
              text={techName}
              className="domain-listing-card__cover-fallback-domain technology-listing-card__cover-title-marquee"
              loopStyle="pause"
              plainOverflow="clip"
              alignPlain="center"
              title={techName}
            />
          </div>
        )}

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

      </div>

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={techName}>
            <OverflowMarqueeText text={techName} />
          </p>
          {item.verified ? (
            <img
              src={verifiedIcon}
              alt="Verified"
              className="domain-listing-card__verified-badge"
            />
          ) : null}
        </div>

        <span className="venture-listing-card__badge venture-listing-card__badge--compact px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 inline-block w-fit mb-1">
          {item.technologyType === 'HARDWARE' ? 'HARDWARE' : 'SOFTWARE'}
        </span>

        {techCategory ? (
          <p className="technology-listing-card__industry" title={techCategory}>
            {techCategory}
          </p>
        ) : null}

        <p
          className="technology-listing-card__use-case"
          title={useCase || undefined}
        >
          {owner && showVerificationNotice
            ? t('listingCardAwaitingVerification')
            : (useCase || '\u00A0')}
        </p>

        {showPriceBox && (
          <div className={`domain-listing-card__price-box${isAuction ? ' domain-listing-card__price-box--auction' : ''}`}>
            <div className="domain-listing-card__price-text min-w-0">
              <span className="domain-listing-card__price-value truncate">
                {formatPrice(priceAmount)}
              </span>
            </div>
            {browseMode && handleViewDetails ? (
              <button
                type="button"
                className="domain-listing-card__price-cta"
                aria-label={t('listingCardViewDetails', 'View details')}
                onClick={handleViewDetails}
              >
                <PriceSectionIcon className="domain-listing-card__price-cta-icon" />
              </button>
            ) : null}
          </div>
        )}

        <ListingCardStatsFooter
          viewCount={item.views || 0}
          likeState={likeState}
          onLike={onLike}
          onView={browseMode ? undefined : onView}
          likesFirst
          className="domain-listing-card__stats domain-listing-card__stats--split technology-listing-card__stats"
        />

        {!browseMode && (
          <div className="domain-listing-card__actions">
            {actionButtons}
          </div>
        )}
      </div>
    </article>
  );
}
