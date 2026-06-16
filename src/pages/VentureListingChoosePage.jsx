import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import ListingBackLink from '../components/common/ListingBackLink';
import VentureListingTypeCards from '../components/venture/VentureListingTypeCards';

export default function VentureListingChoosePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const focusType = searchParams.get('type');
  const ventureCardRef = useRef(null);
  const coVentureCardRef = useRef(null);

  useEffect(() => {
    if (focusType !== 'venture' && focusType !== 'co-venture') return;
    const target = focusType === 'co-venture' ? coVentureCardRef.current : ventureCardRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusType]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <ListingBackLink
          to="/ventures"
          label={t('listingBackToVentures', { defaultValue: 'Back to Ventures' })}
        />
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 m-0">
            Which listing is right for you?
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2 m-0">
            Not sure where to start? Pick the path that matches what you want to achieve with your business.
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 sm:p-5 shadow-sm">
          <VentureListingTypeCards
            ventureCardRef={ventureCardRef}
            coVentureCardRef={coVentureCardRef}
          />
        </div>
      </div>
    </AppLayout>
  );
}
