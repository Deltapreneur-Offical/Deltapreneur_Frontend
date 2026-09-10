import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { communityAPI } from '../../api/services';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import { isCreatorProfileVisible } from '../../utils/creatorProfile';
import CommunityListingCard from '../listings/CommunityListingCard';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';

export default function CommunitySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const rows = await fetchHomepageSectionPreview(
          (params) => communityAPI.getAll(params),
          'community',
          undefined,
          { featuredQuery: {} },
        );
        setCommunities(rows);
      } catch {
        setCommunities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const previewCommunities = useMemo(
    () => {
      const seen = new Set();
      return communities.filter((item) => {
        if (!isCreatorProfileVisible(item)) return false;
        const id = item?.id;
        if (id == null || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },
    [communities],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('COMMUNITY', previewCommunities);

  const handleViewProfile = (communityId) => {
    navigateToListingDetail(navigate, 'community', communityId);
  };

  const renderCommunityCard = (item) => (
    <HomePreviewCardShell accent="community">
      <CommunityListingCard
        profile={item}
        isMe={false}
        likeState={getLike(item.id)}
        onLike={() => toggleLike(item.id)}
        onView={() => handleViewProfile(item.id)}
      />
    </HomePreviewCardShell>
  );

  if (loading) {
    return <HomeSectionCardSkeleton title="Deltapreneurs" to="/community" accent="community" compact />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 overflow-visible">
      <div className="w-full">
        <HomeSectionHeader
          title="Deltapreneurs"
          to="/community"
          accent="community"
          showViewAll={previewCommunities.length > 0}
        />
        {previewCommunities.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noDisruptors')}</p>
        ) : (
          <HomeCardsNavRow accent="community" ariaLabel="Deltapreneurs">
            {previewCommunities.map((item) => (
              <HomePreviewRowItem key={item.id}>
                {renderCommunityCard(item)}
              </HomePreviewRowItem>
            ))}
          </HomeCardsNavRow>
        )}
      </div>
    </section>
  );
}
