import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ventureAPI } from '../../api/services';
import { pickHomepagePreviewListings, HOMEPAGE_PREVIEW_LIMIT } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { fetchAllListPages } from '../../utils/listPagination';
import { useLikes } from '../../hooks/useLikes';
import ListingCardShell from '../listings/ListingCardShell';
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
    () => pickHomepagePreviewListings(ventures, 'venture', HOMEPAGE_PREVIEW_LIMIT),
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
    <section className="bg-white pt-0 pb-4 md:pt-0 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('coVentures')} to="/ventures" />
        {previewVentures.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noVentures')}</p>
        ) : (
          <HomePreviewRow>
            {previewVentures.map((venture) => (
              <HomePreviewRowItem key={venture.id}>
                <ListingCardShell className="home-preview-card-shell">
                  <VentureListingCard
                    venture={venture}
                    browseMode
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
