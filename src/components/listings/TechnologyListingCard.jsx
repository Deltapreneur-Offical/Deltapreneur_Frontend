import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, MoreVertical, Trash2, Gavel, ShoppingCart, Pencil, CircleUser } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { APP_BASE_URL } from '../../config/urls';
import ListingCardStatsFooter from './ListingCardStatsFooter';
import { REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE } from '../../config/featureFlags';
import {
  canRequestTechnologyAuction,
  isTechnologyAuctionLive,
  isTechnologyAuctionPending,
  isTechnologyListingOwner,
  technologyAuctionId,
} from '../../utils/technologyAuctionUi';
import verifiedIcon from '../../assets/Verified_Icon.png';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
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
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/technology?id=${item.id}`
      : `${APP_BASE_URL.replace(/\/$/, '')}/technology?id=${item.id}`;
  const shareText = t('listingCardShareTechnology', {
    name: item.name || t('listingCardTechnology'),
    defaultValue: `Check out this technology: ${item.name || 'Technology'} - Listed on CoBrother!`,
  });
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

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

  const shareButton = (
    <div className="relative shrink-0" ref={shareRef}>
      <button
        type="button"
        className={`domain-listing-card__btn domain-listing-card__btn--icon${shareOpen ? ' is-active' : ''}`}
        onClick={(e) => { stop(e); setMenuOpen(false); setShareOpen(!shareOpen); }}
        title={t('listingCardShare')}
        aria-label={t('listingCardShare')}
      >
        <Share2 size={14} strokeWidth={2.1} />
      </button>
      {shareOpen && (
        <div className="domain-listing-card__menu domain-listing-card__menu--trailing domain-listing-card__menu--share" onClick={stop}>
          <div className="domain-listing-card__menu-heading">
            {t('listingCardShareVia', { defaultValue: 'Share via' })}
          </div>
          <button type="button" className="domain-listing-card__menu-item" onClick={() => handleShare(linkedinShare)}>
            {t('listingCardLinkedIn')}
          </button>
          <button type="button" className="domain-listing-card__menu-item" onClick={() => handleShare(facebookShare)}>
            {t('listingCardFacebook')}
          </button>
          <button type="button" className="domain-listing-card__menu-item" onClick={() => handleShare(whatsappShare)}>
            {t('listingCardWhatsApp')}
          </button>
        </div>
      )}
    </div>
  );

  const buildOwnerMenuItems = () => {
    const items = [];
    if (onEdit) {
      items.push({
        key: 'edit',
        icon: Pencil,
        label: t('listingCardEditListing', { defaultValue: 'Edit listing' }),
        onClick: onEdit,
      });
    }
    if (canRequestTechnologyAuction(item, auctionStatus) && onAuction) {
      items.push({
        key: 'auction',
        icon: Gavel,
        label: t('listingCardPutToAuction'),
        onClick: onAuction,
      });
    }
    if ((auctionStatus?.approvalStatus === 'APPROVED' || item.auctionApprovalStatus === 'APPROVED')
      && technologyAuctionId(item, auctionStatus)) {
      items.push({
        key: 'view-auction',
        icon: Gavel,
        label: isTechnologyAuctionLive(item, auctionStatus)
          ? t('listingCardViewLiveAuction')
          : t('listingCardViewAuction'),
        onClick: () => navigate(`/technology/auction/${technologyAuctionId(item, auctionStatus)}`),
      });
    }
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

  const renderPrimaryAction = () => {
    if (owner) {
      if (isTechnologyAuctionLive(item, auctionStatus) && technologyAuctionId(item, auctionStatus)) {
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
      if (isTechnologyAuctionPending(item, auctionStatus)) {
        return (
          <span className={statusChip}>
            {t('listingCardAuctionPending')}
          </span>
        );
      }
      return renderOwnerListingChip();
    }

    if (['ADMIN', 'SUPER_ADMIN', 'AUCTION_MODERATOR'].includes(user?.role)) {
      if (isDirectPurchase(item, auctionStatus)) {
        return (
          <button type="button" className={primaryBtn} onClick={(e) => { stop(e); onView?.(); }}>
            <span>View Details</span>
            <ArrowRight size={13} aria-hidden />
          </button>
        );
      }
      return null;
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
      return (
        <button type="button" className={primaryBtn} onClick={(e) => { stop(e); onView?.(); }}>
          <span>View Details</span>
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

  const actionButtons = (
    <div className="domain-listing-card__actions-bar" onClick={stop} role="presentation">
      {menuItems.length > 0 ? (
        <div className="domain-listing-card__actions-leading">
          {optionsMenu(menuItems)}
        </div>
      ) : null}
      <div className={`domain-listing-card__actions-primary${primaryAction ? '' : ' domain-listing-card__actions-primary--empty'}`}>
        {primaryAction}
      </div>
      <div className="domain-listing-card__actions-trailing">
        {shareButton}
      </div>
    </div>
  );

  const techName = item.name || t('listingCardTechnology');
  const techCategory = (item.category || 'Technology').replace(/_/g, ' ');
  const techImage = item.imageUrl && !imgFailed ? item.imageUrl : null;
  const useCase = item.whatItDoes || item.what_it_does || item.description || '';
  const statusKey = (item.softwareStatus || 'AVAILABLE').toUpperCase();
  const priceAmount = Number(item.price || 0);
  const interactive = !browseMode && onView;

  const handleViewDetails = onView
    ? (e) => {
      stop(e);
      onView();
    }
    : undefined;

  const showPriceBox = browseMode
    ? (priceAmount > 0 || handleViewDetails)
    : true;

  return (
    <article
      className={`domain-listing-card technology-listing-card card-glow-hover relative flex w-full flex-col overflow-hidden rounded-3xl bg-white${browseMode ? ' domain-listing-card--browse technology-listing-card--browse home-preview-browse-card' : ''}${interactive ? ' cursor-pointer' : ''}`}
      onClick={interactive ? onView : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter') onView?.(); } : undefined}
    >
      <div className="domain-listing-card__cover">
        {techImage ? (
          <img
            src={techImage}
            alt={techName}
            className="domain-listing-card__cover-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="domain-listing-card__cover-fallback" aria-hidden>
            <span className="domain-listing-card__cover-fallback-domain">{techName}</span>
          </div>
        )}
        {item.verified ? (
          <img
            src={verifiedIcon}
            alt=""
            className="domain-listing-card__verified-icon"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={techName}>
            <OverflowMarqueeText text={techName} />
          </p>
          <span
            className={`domain-listing-card__status-dot listing-availability-badge__dot ${resolveSoftwareStatusDotClass(statusKey)}`}
            title={statusKey}
            aria-hidden
          />
        </div>

        <span className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-full tracking-wider inline-block w-fit mb-1 ${item.technologyType === 'HARDWARE' ? 'text-orange-700 bg-orange-50 border border-orange-200' : 'text-blue-700 bg-blue-50 border border-blue-200'}`}>
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
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
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
