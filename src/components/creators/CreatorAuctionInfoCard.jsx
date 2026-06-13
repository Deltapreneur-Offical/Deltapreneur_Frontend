import { useTranslation } from 'react-i18next';
import useCurrency from '../../context/CurrencyContext';

export default function CreatorAuctionInfoCard({ auction }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  if (!auction) return null;

  const startingBid = Number(auction.startingBid ?? auction.minBidPrice ?? 0);
  const currentBid = Number(auction.currentBid ?? auction.currentHighestBid ?? 0);
  const hasCurrentBid = currentBid > 0;

  return (
    <div className="creator-auction-bids" aria-label={t('creatorAuctionInfoTitle', 'Auction')}>
      <div className="creator-auction-bids__item">
        <span className="creator-auction-bids__label">
          {t('creatorAuctionStartingBid', 'Starting Bid')}
        </span>
        <span className="creator-auction-bids__value">
          {startingBid > 0 ? formatPrice(startingBid) : '—'}
        </span>
      </div>
      <div className="creator-auction-bids__divider" aria-hidden />
      <div className="creator-auction-bids__item">
        <span className="creator-auction-bids__label">
          {t('creatorAuctionCurrentBid', 'Current Bid')}
        </span>
        <span
          className={`creator-auction-bids__value${
            hasCurrentBid ? ' creator-auction-bids__value--active' : ''
          }`}
        >
          {hasCurrentBid ? formatPrice(currentBid) : '—'}
        </span>
      </div>
    </div>
  );
}
