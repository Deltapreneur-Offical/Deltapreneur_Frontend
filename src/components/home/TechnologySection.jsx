import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cocreationAPI } from '../../api/services';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import TechnologyListingCard from '../listings/TechnologyListingCard';
import '../../styles/domain-listing-cards.css';

export default function TechnologySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [previewSoftwares, setPreviewSoftwares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSoftwares = async () => {
      try {
        setLoading(true);
        const rows = await fetchHomepageSectionPreview(
          (params) => cocreationAPI.getAll(params),
          'software',
          undefined,
          { featuredQuery: {} },
        );
        setPreviewSoftwares(rows);
      } catch {
        setPreviewSoftwares([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSoftwares();
  }, []);

  const { toggle: toggleLike, get: getLike } = useLikes('SOFTWARE', previewSoftwares);

  const handleViewDetails = (softwareId) => {
    navigateToListingDetail(navigate, 'software', softwareId);
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('technologySoftware')} to="/technology" />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('technologySoftware')} to="/technology" />
        {previewSoftwares.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noSoftware')}</p>
        ) : (
          <HomePreviewRow>
            {previewSoftwares.map((item) => (
              <HomePreviewRowItem key={item.id}>
                <HomePreviewCardShell>
                  <TechnologyListingCard
                    item={item}
                    browseMode
                    likeState={getLike(item.id)}
                    onLike={() => toggleLike(item.id)}
                    onView={() => handleViewDetails(item.id)}
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
