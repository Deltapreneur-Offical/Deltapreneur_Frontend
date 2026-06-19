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

export default function CoVenturesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ventures, setVentures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoVentures = async () => {
      try {
        setLoading(true);
        const rows = await fetchHomepageVenturePreview(
          (params) => ventureAPI.getAll(params),
          'CO_VENTURE',
        );
        setVentures(rows);
      } catch {
        setVentures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCoVentures();
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', ventures);

  const handleViewDetails = (ventureId) => {
    navigateToListingDetail(navigate, 'venture', ventureId);
  };

  if (loading) {
    return (
      <HomeSectionCardSkeleton
        title={t('coVentureSectionTitle', { defaultValue: 'Co-Ventures' })}
        to="/ventures?mode=co-venture"
      />
    );
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={t('coVentureSectionTitle', { defaultValue: 'Co--Ventures' })}
          to="/ventures?mode=co-venture"
        />
        {ventures.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {t('noCoVenturesAvailable', { defaultValue: 'No co-ventures are available yet.' })}
          </p>
        ) : (
          <HomePreviewRow>
            {ventures.map((venture) => (
              <HomePreviewRowItem key={venture.id}>
                <HomePreviewCardShell accent="coventure">
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
