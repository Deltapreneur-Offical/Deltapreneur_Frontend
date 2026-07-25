import { ArrowRight } from 'lucide-react';
import useCurrency from '../../context/CurrencyContext';
import { readCreatorExpectedRate, parseCreatorExpectedRate } from '../../utils/creatorExpectedRate';

export default function CreatorExpectedRateCard({ profile, onView, onHire, hireLabel = 'Hire' }) {
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
    displayPeriod = `/ ${parsed.period.slice(1).replace(/^(\w)/, (l) => l.toUpperCase())}`;
  } else {
    displayPeriod = parsed.period;
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
          aria-label={onHire ? hireLabel : 'View creator details'}
          onClick={action}
        >
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </div>
  );
}
