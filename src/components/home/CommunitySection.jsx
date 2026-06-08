import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { communityAPI } from '../../api/services';
import { pickHomepagePreviewListings } from '../../utils/homepageListings';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { asArray } from '../../utils/asArray';
import { useLikes } from '../../hooks/useLikes';
import CommunityListingCard from '../listings/CommunityListingCard';
import ListingCardShell from '../listings/ListingCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';

export default function CommunitySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const response = await communityAPI.getAll();
        setCommunities(asArray(response.data));
      } catch {
        setCommunities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCommunities();
    };
    window.addEventListener('focus', fetchCommunities);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', fetchCommunities);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const previewCommunities = useMemo(
    () => pickHomepagePreviewListings(communities, 'community'),
    [communities],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('COMMUNITY', previewCommunities);

  const handleViewProfile = (communityId) => {
    navigateToListingDetail(navigate, 'community', communityId);
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('disruptors')} to="/community" />;
  }

  return (
    <section className="bg-white py-4 md:py-6 overflow-visible">
      <div className="w-full">
        <HomeSectionHeader title={t('disruptors')} to="/community" />
        {previewCommunities.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noDisruptors')}</p>
        ) : (
          <HomePreviewRow>
            {previewCommunities.map((item) => (
              <HomePreviewRowItem key={item.id}>
                <ListingCardShell>
                  <CommunityListingCard
                    browseMode
                    profile={item}
                    likeState={getLike(item.id)}
                    onLike={() => toggleLike(item.id)}
                    onView={() => handleViewProfile(item.id)}
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
