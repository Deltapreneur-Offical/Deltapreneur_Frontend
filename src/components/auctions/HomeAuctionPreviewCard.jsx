import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Clock, Gavel, Sparkles, Star, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCompactCountdown } from '../../utils/auctionDate';
import { resolveAuctionListerName } from '../../utils/auctionLister';
import {
  resolveHomeAuctionBadges,
  resolveHomeAuctionCategoryMeta,
  resolveHomeAuctionDescription,
  resolveHomeAuctionImage,
  resolveHomeAuctionTitle,
  resolveHomeAuctionVerified,
} from '../../utils/homepageAuctions';
import verifiedIcon from '../../assets/Verified_Icon.png';
import OverflowMarqueeText from '../common/OverflowMarqueeText';
import CreatorPreviewModal from './CreatorPreviewModal';

function useCountdown(endTime) {
  const [timeLeft, setTimeLeft] = useState('—');

  useEffect(() => {
    const tick = () => {
      const { timeLeft: next } = formatCompactCountdown(endTime);
      setTimeLeft(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return timeLeft;
}

function formatCompactBid(amount, formatPrice) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return formatPrice(0);

  const sample = formatPrice(value);
  const symbol = sample.replace(/[\d,.\s]/g, '').trim() || '₹';

  if (value >= 10000000) {
    const cr = value / 10000000;
    const compact = cr % 1 === 0 ? String(cr) : cr.toFixed(1).replace(/\.0$/, '');
    return `${symbol}${compact}Cr`;
  }
  if (value >= 100000) {
    const lakhs = value / 100000;
    const compact = lakhs % 1 === 0 ? String(lakhs) : lakhs.toFixed(1).replace(/\.0$/, '');
    return `${symbol}${compact}L`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    const compact = thousands % 1 === 0 ? String(thousands) : thousands.toFixed(1).replace(/\.0$/, '');
    return `${symbol}${compact}K`;
  }

  return formatPrice(value);
}

const CATEGORY_CLASS = {
  domain: 'home-auction-preview-card--category-domain',
  technology: 'home-auction-preview-card--category-technology',
  community: 'home-auction-preview-card--category-community',
};

const COVER_GRADIENT = {
  domain: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600',
  technology: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800',
  community: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700',
};

const PRICE_BOX_GRADIENT = {
  domain: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  technology: 'linear-gradient(90deg, #a78bfa 0%, #818cf8 50%, #4f46e5 100%)',
  community: 'linear-gradient(90deg, #34d399 0%, #10b981 50%, #059669 100%)',
};

const BADGE_TONE_CLASS = {
  domain: {
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    secondary: 'bg-purple-50 text-purple-700 border border-purple-100',
  },
  technology: {
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    secondary: 'bg-purple-50 text-purple-700 border border-purple-100',
  },
  community: {
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    secondary: 'bg-purple-50 text-purple-700 border border-purple-100',
  },
};

export default function HomeAuctionPreviewCard({ auction, onView }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [imgFailed, setImgFailed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const title = resolveHomeAuctionTitle(auction);
  const image = resolveHomeAuctionImage(auction);
  const verified = resolveHomeAuctionVerified(auction);
  const startingBid = Number(auction?.minBidPrice) || 0;
  const currentBid = Number(auction?.currentHighestBid) || 0;
  const totalBids = Number(auction?.totalBids) || 0;
  const hasCurrentBid = currentBid > 0;
  const bidLabel = t('homeAuctionCurrentBid', { defaultValue: 'Current Bid' });
  const bidDisplay = totalBids > 0
    ? formatPrice(hasCurrentBid ? currentBid : startingBid)
    : t('homeAuctionNoBidYet', { defaultValue: 'NIL' });
  const compactStartingBid = formatCompactBid(startingBid, formatPrice);
  const timeLeft = useCountdown(auction?.endTime);
  const categoryMeta = resolveHomeAuctionCategoryMeta(auction);
  const category = auction?.category || 'domain';
  const categoryClass = CATEGORY_CLASS[category] || CATEGORY_CLASS.domain;
  const coverImage = image && !imgFailed ? image : null;
  const badges = resolveHomeAuctionBadges(auction);
  const listerName = resolveAuctionListerName(auction);
  const descriptionFromData = resolveHomeAuctionDescription(auction);
  const badgeToneClass = BADGE_TONE_CLASS[category] || BADGE_TONE_CLASS.domain;
  const isFeatured = Boolean(auction?.featured);
  const categoryLabel = t(categoryMeta.labelKey);
  const cardRef = useRef(null);

  const handleView = (e) => {
    if (e && e.target && e.target.closest && e.target.closest('button, a, input, textarea, select, label, [role="button"], [role="link"]')) return;
    onView?.();
  };

  return (
    <article
      ref={cardRef}
      className={`domain-listing-card domain-listing-card--browse home-preview-browse-card home-auction-preview-card home-auction-preview-card--home-preview ${categoryClass} relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl bg-white`}
      onClick={handleView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          handleView();
        }
      }}
    >
      <div className="domain-listing-card__cover">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="domain-listing-card__cover-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className={`relative flex flex-col items-center justify-center w-full h-full text-center overflow-hidden p-2 ${COVER_GRADIENT[category] || COVER_GRADIENT.domain}`}
            aria-hidden
          >
            <span className="relative z-10 venture-listing-card__cover-title venture-listing-card__cover-title--compact max-w-full px-2 whitespace-normal break-words leading-tight text-center">
              {title}
            </span>
            <span className="relative z-10 mt-1 venture-listing-card__cover-badge venture-listing-card__cover-badge--compact uppercase">
              {categoryLabel}
            </span>
          </div>
        )}
        {coverImage ? (
          <span className={`home-auction-preview-card__category-badge ${categoryMeta.badgeClass}`}>
            {categoryLabel}
          </span>
        ) : null}
        {isFeatured ? (
          <span className="home-auction-preview-card__featured-badge">
            <Sparkles size={11} aria-hidden />
            {t('homeAuctionFeatured', { defaultValue: 'Featured' })}
          </span>
        ) : null}
        {verified ? (
          <img
            src={verifiedIcon}
            alt=""
            className="domain-listing-card__verified-icon"
            aria-hidden
          />
        ) : null}
      </div>

      <CreatorPreviewModal
        profile={auction?.community}
        auction={auction}
        open={showPreview}
        onClose={() => {
          setShowPreview(false);
          cardRef.current?.focus?.();
        }}
        onPlaceBid={handleView}
      />

      <div className="domain-listing-card__body home-auction-preview-card__body flex flex-col flex-1 gap-2.5 p-3">
        <div className="home-auction-preview-card__content flex flex-col flex-1 gap-2.5">
          <div className="home-auction-preview-card__title-row">
            <div className="home-auction-preview-card__title-line">
              <h3
                className="home-auction-preview-card__title venture-listing-card__title--compact line-clamp-2 min-h-[2.125rem] leading-tight"
                title={title}
                style={{
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {title}
              </h3>
              <span
                className="home-auction-preview-card__live shrink-0"
                title={t('auctionsPageStatusLive', { defaultValue: 'Live' })}
                aria-label={t('auctionsPageStatusLive', { defaultValue: 'Live' })}
              >
                <span>{t('auctionsPageStatusLive', { defaultValue: 'Live' })}</span>
              </span>
            </div>
          </div>

          <p className="home-auction-preview-card__creator" title={listerName || ''}>
            {listerName ? (
              <>
                {t('auctionDetailListedBy', { defaultValue: 'Listed by' })}{' '}
                <span className="home-auction-preview-card__creator-name inline-block max-w-[65%] align-bottom">
                  <OverflowMarqueeText text={listerName} />
                </span>
              </>
            ) : (
              <span className="invisible" aria-hidden="true">&nbsp;</span>
            )}
          </p>

          <div
            className={`venture-listing-card__badges home-auction-preview-card__badges flex flex-wrap gap-1${badges.length === 0 ? ' home-auction-preview-card__badges--placeholder' : ''
              }`}
            aria-hidden={badges.length === 0 ? true : undefined}
          >
            {badges.map((badge) => (
              <span
                key={badge.label}
                className={`venture-listing-card__badge venture-listing-card__badge--compact ${badgeToneClass[badge.tone] || badgeToneClass.primary
                  }`}
              >
                {badge.label}
              </span>
            ))}
          </div>

          <p
            className="home-auction-preview-card__detail"
            title={descriptionFromData || ''}
          >
            {descriptionFromData || <span className="invisible" aria-hidden="true">&nbsp;</span>}
          </p>

          <div className="home-auction-preview-card__metrics">
            <div className="home-auction-preview-card__metric home-auction-preview-card__metric--bid">
              <span className="home-auction-preview-card__metric-icon-wrap" aria-hidden>
                <Tag size={10} className="home-auction-preview-card__metric-icon" />
              </span>
              <span className="home-auction-preview-card__metric-label">
                {t('auctionsPageStartingBid', { defaultValue: 'Starting Bid' })}
              </span>
              <span
                className="home-auction-preview-card__metric-value currency-display"
                title={formatPrice(startingBid)}
              >
                {compactStartingBid}
              </span>
            </div>
            <div className="home-auction-preview-card__metric home-auction-preview-card__metric--bids">
              <span className="home-auction-preview-card__metric-icon-wrap" aria-hidden>
                <Gavel size={10} className="home-auction-preview-card__metric-icon" />
              </span>
              <span className="home-auction-preview-card__metric-label">
                {t('auctionsPageTotalBids', { defaultValue: 'Total Bids' })}
              </span>
              <span className="home-auction-preview-card__metric-value">{totalBids}</span>
            </div>
            <div className="home-auction-preview-card__metric home-auction-preview-card__metric--time">
              <span className="home-auction-preview-card__metric-icon-wrap" aria-hidden>
                <Clock size={10} className="home-auction-preview-card__metric-icon" />
              </span>
              <span className="home-auction-preview-card__metric-label">
                {t('auctionsPageEndsIn', { defaultValue: 'Ends In' })}
              </span>
              <span className="home-auction-preview-card__metric-value home-auction-preview-card__metric-value--time">
                {timeLeft}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-grow min-h-0" aria-hidden="true" />

        <div className="home-auction-preview-card__footer flex flex-col gap-2 mt-auto">
          <div
            className="domain-listing-card__price-box domain-listing-card__price-box--auction domain-listing-card__price-box--compact"
            style={{
              borderRadius: '0.75rem',
              background: `linear-gradient(#ffffff, #ffffff) padding-box, ${PRICE_BOX_GRADIENT[category] || PRICE_BOX_GRADIENT.domain} border-box`,
            }}
          >
            <div className="domain-listing-card__price-text min-w-0 flex flex-col">
              <span className="venture-listing-card__price-label leading-none">
                {bidLabel}
              </span>
              <span className="domain-listing-card__price-value venture-listing-card__price-value--compact currency-display truncate">
                {bidDisplay}
              </span>
            </div>
            <button
              type="button"
              className="domain-listing-card__price-cta flex items-center justify-center transition-all w-6 h-6 shrink-0 aspect-square rounded-full"
              aria-label={t('listingCardViewDetails', { defaultValue: 'View details' })}
              onClick={handleView}
            >
              <ArrowRight size={12} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
