import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cocreationAPI } from '../../api/services';
import { pickHomepagePreviewListings, HOMEPAGE_PREVIEW_LIMIT } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { fetchListPage, HOME_PREVIEW_PAGE_SIZE } from '../../utils/listPagination';
import { useLikes } from '../../hooks/useLikes';
import ListingCardShell from '../listings/ListingCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import TechnologyListingCard from '../listings/TechnologyListingCard';
import '../../styles/domain-listing-cards.css';

export default function TechnologySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [softwares, setSoftwares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSoftwares = async () => {
      try {
        setLoading(true);
        const { items } = await fetchListPage((params) => cocreationAPI.getAll(params), {
          pageSize: HOME_PREVIEW_PAGE_SIZE,
        });
        setSoftwares(items);
      } catch {
        setSoftwares([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSoftwares();
  }, []);

  const previewSoftwares = useMemo(
    () => pickHomepagePreviewListings(softwares, 'software', HOMEPAGE_PREVIEW_LIMIT),
    [softwares],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('SOFTWARE', previewSoftwares);

  const handleViewDetails = (softwareId) => {
    navigateToListingDetail(navigate, 'software', softwareId);
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('technologySoftware')} to="/technology" />;
  }

  return (
    <section className="bg-white pt-0 pb-4 md:pt-0 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('technologySoftware')} to="/technology" />
        {previewSoftwares.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noSoftware')}</p>
        ) : (
          <HomePreviewRow>
            {previewSoftwares.map((item) => (
              <HomePreviewRowItem key={item.id}>
                <ListingCardShell className="home-preview-card-shell">
                  <TechnologyListingCard
                    item={item}
                    browseMode
                    likeState={getLike(item.id)}
                    onLike={() => toggleLike(item.id)}
                    onView={() => handleViewDetails(item.id)}
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
