import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cocreationAPI } from '../../api/services';
import { pickHomepagePreviewListings } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { fetchAllListPages } from '../../utils/listPagination';
import { useLikes } from '../../hooks/useLikes';
import ListingCardShell from '../listings/ListingCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import HomeUnifiedListingCard from './HomeUnifiedListingCard';

export default function TechnologySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [softwares, setSoftwares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSoftwares = async () => {
      try {
        setLoading(true);
        const items = await fetchAllListPages((params) => cocreationAPI.getAll(params));
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
    () => pickHomepagePreviewListings(softwares, 'software'),
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
    <section className="bg-white py-4 md:py-6 overflow-visible">
      <div className="w-full">
        <HomeSectionHeader title={t('technologySoftware')} to="/technology" />
        {previewSoftwares.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noSoftware')}</p>
        ) : (
          <HomePreviewRow>
            {previewSoftwares.map((item) => (
              <HomePreviewRowItem key={item.id}>
                <ListingCardShell>
                  <HomeUnifiedListingCard
                    type="technology"
                    listing={item}
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
