import PriceSectionIcon from '../common/PriceSectionIcon';
import useCurrency from '../../context/CurrencyContext';
import { readCreatorExpectedRate, parseCreatorExpectedRate } from '../../utils/creatorExpectedRate';

export default function CreatorExpectedRateCard({
  profile,
  onView,
  onHire,
  hireLabel = 'Hire',
  variant = 'default',
}) {
  const { formatPrice } = useCurrency();
  const expectedRate = readCreatorExpectedRate(profile);
  const action = onHire || onView;

  if (!expectedRate) return null;

  const parsed = parseCreatorExpectedRate(expectedRate);
  const numericAmount = Number(parsed.amount);
  const displayAmount = Number.isFinite(numericAmount) && numericAmount > 0 
      ? formatPrice(numericAmount) 
      : parsed.amount;
  
  let displayPeriod = '';
  if (parsed.period && parsed.period.startsWith('/')) {
    displayPeriod = `/ ${parsed.period.slice(1).toLowerCase()}`;
  } else {
    displayPeriod = parsed.period;
  }

  if (variant === 'domain') {
    return (
      <div
        className="domain-listing-card__price-box va-listing-card__compensation"
        aria-label="Compensation"
      >
        <div className="domain-listing-card__price-text min-w-0">
          <span className="va-listing-card__compensation-label">Compensation</span>
          <span className="domain-listing-card__price-value truncate">
            {displayAmount}
            {displayPeriod ? (
              <span className="va-listing-card__compensation-period">{displayPeriod}</span>
            ) : null}
          </span>
        </div>
        {action ? (
          <button
            type="button"
            className="domain-listing-card__price-cta"
            aria-label={onHire ? hireLabel : 'View Deltapreneur details'}
            onClick={action}
          >
            <PriceSectionIcon className="domain-listing-card__price-cta-icon" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="creator-expected-rate"
      aria-label="Compensation"
    >
      <div className="creator-expected-rate__text">
        <span className="creator-expected-rate__label">Compensation</span>
        <div className="creator-expected-rate__amount-row">
          <span className="creator-expected-rate__value">{displayAmount}</span>
          {displayPeriod && (
            <span className="creator-expected-rate__period">{displayPeriod}</span>
          )}
        </div>
      </div>
      {action && (
        <button
          type="button"
          className="creator-expected-rate__cta"
          aria-label={onHire ? hireLabel : 'View Deltapreneur details'}
          onClick={action}
        >
          <PriceSectionIcon />
        </button>
      )}
    </div>
  );
}
