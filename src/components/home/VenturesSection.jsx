import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ventureAPI } from '../../api/services';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { isCoVentureListing } from '../../utils/ventureListingHelpers';
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
        const rows = await fetchHomepageSectionPreview(
          (params) => ventureAPI.getAll(params),
          'venture',
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

  const previewVentures = useMemo(
    () => ventures.filter((venture) => !isCoVentureListing(venture)),
    [ventures],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', previewVentures);

  const handleViewDetails = (ventureId) => {
    navigateToListingDetail(navigate, 'venture', ventureId);
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('coVentures')} to="/ventures?mode=venture" />;
  }

  return (
    <section className="bg-white pt-0 pb-4 md:pt-0 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('coVentures')} to="/ventures?mode=venture" />
        {previewVentures.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noVentures')}</p>
        ) : (
          <HomePreviewRow>
            {previewVentures.map((venture) => (
              <HomePreviewRowItem key={venture.id}>
                <HomePreviewCardShell>
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
