import { useTranslation } from 'react-i18next';
import useCurrency from '../../context/CurrencyContext';
import { formatCreatorExpectedRate, readCreatorExpectedRate } from '../../utils/creatorExpectedRate';

export default function CreatorExpectedRateCard({ profile }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const expectedRate = readCreatorExpectedRate(profile);

  if (!expectedRate) return null;

  const displayRate = formatCreatorExpectedRate(profile, formatPrice) || expectedRate;

  return (
    <div
      className="creator-expected-rate"
      aria-label={t('creatorExpectedRateLabel', 'Expected Rate')}
    >
      <span className="creator-expected-rate__label">
        {t('creatorExpectedRateLabel', 'Expected Rate')}
      </span>
      <span className="creator-expected-rate__value">{displayRate}</span>
    </div>
  );
}
