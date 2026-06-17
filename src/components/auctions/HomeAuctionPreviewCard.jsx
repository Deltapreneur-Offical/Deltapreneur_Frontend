import { useState, useEffect } from 'react';
import { ArrowRight, Clock, Gavel, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCompactCountdown } from '../../utils/auctionDate';
import {
  resolveHomeAuctionCategoryMeta,
  resolveHomeAuctionDetails,
  resolveHomeAuctionImage,
  resolveHomeAuctionTitle,
  resolveHomeAuctionVerified,
} from '../../utils/homepageAuctions';
import verifiedIcon from '../../assets/Verified_Icon.png';

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

export default function HomeAuctionPreviewCard({ auction, onView }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [imgFailed, setImgFailed] = useState(false);
  const title = resolveHomeAuctionTitle(auction);
  const { subtitle, detail } = resolveHomeAuctionDetails(auction);
  const image = resolveHomeAuctionImage(auction);
  const verified = resolveHomeAuctionVerified(auction);
  const startingBid = Number(auction?.minBidPrice) || 0;
  const currentBid = Number(auction?.currentHighestBid) || 0;
  const totalBids = Number(auction?.totalBids) || 0;
  const hasCurrentBid = currentBid > 0;
  const bidLabel = hasCurrentBid
    ? t('homeAuctionCurrentBid', { defaultValue: 'Current bid' })
    : t('auctionsPageStartingBid', { defaultValue: 'Starting bid' });
  const bidDisplay = hasCurrentBid ? formatPrice(currentBid) : formatPrice(startingBid);
  const timeLeft = useCountdown(auction?.endTime);
  const categoryMeta = resolveHomeAuctionCategoryMeta(auction);
  const coverImage = image && !imgFailed ? image : null;
  const detailText = String(detail || '').trim();

  const handleView = (e) => {
    e?.stopPropagation?.();
    onView?.();
  };

  return (
    <article className="domain-listing-card domain-listing-card--browse home-preview-browse-card home-auction-preview-card relative flex w-full flex-col overflow-hidden rounded-3xl bg-white">
      {verified ? (
        <img
          src={verifiedIcon}
          alt=""
          className="domain-listing-card__verified-icon home-auction-preview-card__verified-icon"
          aria-hidden
        />
      ) : null}
      <div className="domain-listing-card__cover">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="domain-listing-card__cover-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="domain-listing-card__cover-fallback home-auction-preview-card__cover-fallback" aria-hidden />
        )}
        <span
          className={`home-auction-preview-card__category-badge ${categoryMeta.badgeClass}`}
        >
          {t(categoryMeta.labelKey)}
        </span>
      </div>

      <div className="domain-listing-card__body home-auction-preview-card__body">
        <div className="home-auction-preview-card__head">
          <div className="home-auction-preview-card__title-row min-w-0">
            <h3 className="home-auction-preview-card__title" title={title}>
              {title}
            </h3>
            <p className="home-auction-preview-card__subtitle" title={subtitle}>
              {subtitle || t(categoryMeta.labelKey)}
            </p>
            <p className="home-auction-preview-card__detail" title={detailText}>
              {detailText || '\u00A0'}
            </p>
          </div>
          <span
            className="domain-listing-card__status-dot listing-availability-badge__dot listing-availability-badge__dot--available"
            title={t('auctionsPageStatusLive', { defaultValue: 'Live' })}
            aria-hidden
          />
        </div>

        <div className="home-auction-preview-card__metrics">
          <div className="home-auction-preview-card__metric">
            <div className="home-auction-preview-card__metric-head">
              <Tag size={12} className="home-auction-preview-card__metric-icon" aria-hidden />
              <span className="home-auction-preview-card__metric-label">
                {t('auctionsPageStartingBid', { defaultValue: 'Starting bid' })}
              </span>
            </div>
            <span
              className="home-auction-preview-card__metric-value currency-display"
              title={formatPrice(startingBid)}
            >
              {formatPrice(startingBid)}
            </span>
          </div>
          <div className="home-auction-preview-card__metric">
            <div className="home-auction-preview-card__metric-head">
              <Gavel size={12} className="home-auction-preview-card__metric-icon" aria-hidden />
              <span className="home-auction-preview-card__metric-label">
                {t('auctionsPageTotalBids')}
              </span>
            </div>
            <span className="home-auction-preview-card__metric-value">{totalBids}</span>
          </div>
          <div className="home-auction-preview-card__metric">
            <div className="home-auction-preview-card__metric-head">
              <Clock size={12} className="home-auction-preview-card__metric-icon" aria-hidden />
              <span className="home-auction-preview-card__metric-label">
                {t('auctionsPageEndsIn')}
              </span>
            </div>
            <span className="home-auction-preview-card__metric-value home-auction-preview-card__metric-value--time">
              {timeLeft}
            </span>
          </div>
        </div>

        <div className="domain-listing-card__price-box domain-listing-card__price-box--auction home-auction-preview-card__price-box">
          <div className="home-auction-preview-card__bid-box home-auction-preview-card__bid-box--current">
            <span className="home-auction-preview-card__bid-label">{bidLabel}</span>
            <span className="home-auction-preview-card__bid-value currency-display">{bidDisplay}</span>
          </div>
          <button
            type="button"
            className="domain-listing-card__price-cta"
            aria-label={t('listingCardViewDetails', 'View details')}
            onClick={handleView}
          >
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
