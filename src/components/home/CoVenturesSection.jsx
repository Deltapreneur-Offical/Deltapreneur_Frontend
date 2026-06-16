import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ventureAPI } from '../../api/services';
import { pickHomepagePreviewListings, HOMEPAGE_PREVIEW_LIMIT } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { fetchListPage, HOME_FEATURED_LIST_PARAMS } from '../../utils/listPagination';
import { isCoVentureListing } from '../../utils/ventureListingHelpers';
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
        const { items } = await fetchListPage((params) => ventureAPI.getAll(params), {
          ...HOME_FEATURED_LIST_PARAMS,
        });
        setVentures(items.filter(isCoVentureListing));
      } catch {
        setVentures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCoVentures();
  }, []);

  const previewCoVentures = useMemo(() => {
    const featured = pickHomepagePreviewListings(ventures, 'venture', HOMEPAGE_PREVIEW_LIMIT);
    if (featured.length > 0) return featured;
    return ventures.slice(0, HOMEPAGE_PREVIEW_LIMIT);
  }, [ventures]);

  const { toggle: toggleLike, get: getLike } = useLikes('VENTURE', previewCoVentures);

  const handleViewDetails = (ventureId) => {
    navigateToListingDetail(navigate, 'venture', ventureId);
  };

  if (loading) {
    return (
      <HomeSectionCardSkeleton
        title={t('coVentureSectionTitle', { defaultValue: 'Co-Venture' })}
        to="/ventures?mode=co-venture"
      />
    );
  }

  return (
    <section className="bg-white pt-0 pb-4 md:pt-0 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={t('coVentureSectionTitle', { defaultValue: 'Co-Venture' })}
          to="/ventures?mode=co-venture"
        />
        {previewCoVentures.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {t('noCoVenturesAvailable', { defaultValue: 'No co-ventures available yet.' })}
          </p>
        ) : (
          <HomePreviewRow>
            {previewCoVentures.map((venture) => (
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
