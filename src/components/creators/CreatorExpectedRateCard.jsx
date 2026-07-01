import { useTranslation } from 'react-i18next';
import useCurrency from '../../context/CurrencyContext';
import { readCreatorExpectedRate, parseCreatorExpectedRate } from '../../utils/creatorExpectedRate';

export default function CreatorExpectedRateCard({ profile }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const expectedRate = readCreatorExpectedRate(profile);

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
      aria-label={t('creatorExpectedRateLabel', 'Expected Rate')}
    >
      <span className="creator-expected-rate__label">
        {t('creatorExpectedRateLabel', 'Expected Rate')}
      </span>
      <span className="creator-expected-rate__value">{displayAmount}</span>
      {displayPeriod && (
        <span className="creator-expected-rate__period">{displayPeriod}</span>
      )}
    </div>
  );
}
