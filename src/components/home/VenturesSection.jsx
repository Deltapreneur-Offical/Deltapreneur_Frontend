import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ventureAPI } from '../../api/services';
import { pickHomepagePreviewListings } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { fetchAllListPages } from '../../utils/listPagination';
import { useLikes } from '../../hooks/useLikes';
import ListingCardShell from '../listings/ListingCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import HomeUnifiedListingCard from './HomeUnifiedListingCard';

export default function VenturesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ventures, setVentures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVentures = async () => {
      try {
        setLoading(true);
        const items = await fetchAllListPages((params) => ventureAPI.getAll(params));
        setVentures(items);
      } catch {
        setVentures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVentures();
  }, []);

  const previewVentures = useMemo(
    () => pickHomepagePreviewListings(ventures, 'venture'),
    [ventures],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', previewVentures);

  const handleViewDetails = (ventureId) => {
    navigateToListingDetail(navigate, 'venture', ventureId);
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('coVentures')} to="/ventures" />;
  }

  return (
    <section className="bg-white py-4 md:py-6">
      <div className="w-full">
        <HomeSectionHeader title={t('coVentures')} to="/ventures" />
        {previewVentures.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noVentures')}</p>
        ) : (
          <HomePreviewRow>
            {previewVentures.map((venture) => (
              <HomePreviewRowItem key={venture.id}>
                <ListingCardShell>
                  <HomeUnifiedListingCard
                    type="venture"
                    listing={venture}
                    likeState={getLike(venture.id)}
                    onLike={() => toggleLike(venture.id)}
                    onView={() => handleViewDetails(venture.id)}
                  />
                </ListingCardShell>
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
