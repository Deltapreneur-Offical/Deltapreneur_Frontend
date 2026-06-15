import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCountdown } from '../../utils/auctionDate';
import {
  resolveHomeAuctionCategoryMeta,
  resolveHomeAuctionImage,
  resolveHomeAuctionTitle,
  resolveHomeAuctionVerified,
} from '../../utils/homepageAuctions';
import verifiedIcon from '../../assets/Verified_Icon.png';
import auctionSymbol from '../../assets/Auction.png';

function useCountdown(endTime) {
  const [timeLeft, setTimeLeft] = useState('—');

  useEffect(() => {
    const tick = () => {
      const { timeLeft: next } = formatCountdown(endTime);
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
  const image = resolveHomeAuctionImage(auction);
  const verified = resolveHomeAuctionVerified(auction);
  const startingBid = Number(auction?.minBidPrice) || 0;
  const currentBid = Number(auction?.currentHighestBid) || 0;
  const totalBids = Number(auction?.totalBids) || 0;
  const currentBidDisplay = currentBid > 0 ? formatPrice(currentBid) : '0';
  const timeLeft = useCountdown(auction?.endTime);
  const categoryMeta = resolveHomeAuctionCategoryMeta(auction);
  const coverImage = image && !imgFailed ? image : null;

  const handleView = (e) => {
    e?.stopPropagation?.();
    onView?.();
  };

  return (
    <article className="domain-listing-card domain-listing-card--browse home-preview-browse-card home-auction-preview-card relative flex h-auto w-full flex-col overflow-hidden rounded-3xl bg-white">
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
          <div className="domain-listing-card__cover-fallback" aria-hidden>
            <span className="domain-listing-card__cover-fallback-domain">{title}</span>
          </div>
        )}
        <span
          className={`home-auction-preview-card__category-badge ${categoryMeta.badgeClass}`}
        >
          {t(categoryMeta.labelKey)}
        </span>
      </div>

      <div className="domain-listing-card__body">
        <div className="domain-listing-card__domain-row">
          <p className="domain-listing-card__domain" title={title}>
            {title}
          </p>
          <span
            className="domain-listing-card__status-dot listing-availability-badge__dot listing-availability-badge__dot--available"
            title={t(categoryMeta.labelKey)}
            aria-hidden
          />
        </div>

        <div className="domain-listing-card__price-box domain-listing-card__price-box--auction home-auction-preview-card__price-box">
          <div className="home-auction-preview-card__bid-grid">
            <div className="home-auction-preview-card__bid-box">
              <div className="home-auction-preview-card__bid-label">
                {t('auctionsPageStartingBid')}
              </div>
              <div className="home-auction-preview-card__bid-value home-auction-preview-card__bid-value--starting">
                {formatPrice(startingBid)}
              </div>
            </div>
            <div className="home-auction-preview-card__bid-box">
              <div className="home-auction-preview-card__bid-label">
                {t('auctionsPageCurrentBids')}
              </div>
              <div className="home-auction-preview-card__bid-value">
                {currentBidDisplay}
              </div>
            </div>
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

        <div className="home-auction-preview-card__footer">
          <div className="home-auction-preview-card__footer-col home-auction-preview-card__footer-col--left">
            <span className="home-auction-preview-card__footer-label">{t('auctionsPageTotalBids')}</span>
            <span className="home-auction-preview-card__footer-value">{totalBids}</span>
          </div>
          <div className="home-auction-preview-card__footer-symbol" aria-hidden>
            <img src={auctionSymbol} alt="" className="home-auction-preview-card__footer-symbol-img" />
          </div>
          <div className="home-auction-preview-card__footer-col home-auction-preview-card__footer-col--right">
            <span className="home-auction-preview-card__footer-label">{t('auctionsPageEndsIn')}</span>
            <span className="home-auction-preview-card__footer-time">{timeLeft}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
