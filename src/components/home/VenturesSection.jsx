import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ventureAPI } from '../../api/services';
import { fetchHomepageVenturePreview } from '../../utils/homepagePreview';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import VentureListingCard from '../listings/VentureListingCard';
import '../../styles/domain-listing-cards.css';

export default function VenturesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ventures, setVentures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVentures = async () => {
      try {
        setLoading(true);
        const rows = await fetchHomepageVenturePreview(
          (params) => ventureAPI.getAll(params),
          'VENTURE',
        );
        setVentures(rows);
      } catch {
        setVentures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVentures();
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', ventures);

  const handleViewDetails = (ventureId) => {
    navigateToListingDetail(navigate, 'venture', ventureId);
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('coVentures')} to="/ventures?mode=venture" />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('coVentures')} to="/ventures?mode=venture" />
        {ventures.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noVentures')}</p>
        ) : (
          <HomePreviewRow>
            {ventures.map((venture) => (
              <HomePreviewRowItem key={venture.id}>
                <HomePreviewCardShell accent="venture">
                  <VentureListingCard
                    venture={venture}
                    browseMode
                    compact
                    likeState={getLike(venture.id)}
                    onLike={() => toggleLike(venture.id)}
                    onView={() => handleViewDetails(venture.id)}
                  />
                </HomePreviewCardShell>
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
