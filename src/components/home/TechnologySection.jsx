import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cocreationAPI } from '../../api/services';
import { pickHomepagePreviewListings } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { asArray } from '../../utils/asArray';
import { useLikes } from '../../hooks/useLikes';
import TechnologyListingCard from '../listings/TechnologyListingCard';
import ListingCardShell from '../listings/ListingCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';

export default function TechnologySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [softwares, setSoftwares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSoftwares = async () => {
      try {
        setLoading(true);
        const response = await cocreationAPI.getAll();
        setSoftwares(asArray(response.data));
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
    <section className="bg-white py-4 md:py-6">
      <div className="w-full">
        <HomeSectionHeader title={t('technologySoftware')} to="/technology" />
        {previewSoftwares.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noSoftware')}</p>
        ) : (
          <HomePreviewRow>
            {previewSoftwares.map((item) => (
              <HomePreviewRowItem key={item.id}>
                <ListingCardShell>
                  <TechnologyListingCard
                    browseMode
                    compact
                    item={item}
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
