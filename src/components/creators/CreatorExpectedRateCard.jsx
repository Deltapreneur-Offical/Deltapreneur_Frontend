import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import useCurrency from '../../context/CurrencyContext';
import { formatCreatorExpectedRate, readCreatorExpectedRate } from '../../utils/creatorExpectedRate';

export default function CreatorExpectedRateCard({ profile, onView }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const expectedRate = readCreatorExpectedRate(profile);

  if (!expectedRate) return null;

  const displayRate = formatCreatorExpectedRate(profile, formatPrice) || expectedRate;

  const handleClick = (e) => {
    if (onView) {
      e.stopPropagation();
      onView(e);
    }
  };

  return (
    <div
      className="creator-expected-rate relative"
      aria-label={t('creatorExpectedRateLabel', 'Expected Rate')}
    >
      <span className="creator-expected-rate__label">
        {t('creatorExpectedRateLabel', 'Expected Rate')}
      </span>
      <div className="mt-2 relative">
        <span className="creator-expected-rate__value block pr-12">{displayRate}</span>
        <button
          type="button"
          onClick={handleClick}
          aria-label={t('viewProfile', 'View profile')}
          className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black text-white inline-flex items-center justify-center shadow-md hover:opacity-95"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
