import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { communityAPI } from '../../api/services';
import { fetchHomepageSectionPreview } from '../../utils/homepagePreview';
import { navigateToListingDetail } from '../../utils/listingNavigation';
import { useLikes } from '../../hooks/useLikes';
import { hasLinkedInAccount, isCreatorProfileVisible, unwrapCreatorProfile } from '../../utils/creatorProfile';
import { HOMEPAGE_PREVIEW_LIMIT } from '../../utils/homepageListings';
import { useHomepageCardReveal } from '../../utils/homepageCardReveal';
import { useAuth } from '../../context/AuthContext';
import CommunityListingCard from '../listings/CommunityListingCard';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';
import DeltapreneurShowcaseHint from './DeltapreneurShowcaseHint';

export default function CommunitySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [myProfileReady, setMyProfileReady] = useState(false);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const rows = await fetchHomepageSectionPreview(
          (params) => communityAPI.getAll(params),
          'community',
          undefined,
          { featuredQuery: {}, fillCatalog: false, maxPages: 2 },
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

  useEffect(() => {
    if (authLoading) {
      setMyProfileReady(false);
      return undefined;
    }

    const userId = user?.id ?? user?.userId;
    if (!userId) {
      setMyProfile(null);
      setMyProfileReady(true);
      return undefined;
    }

    let cancelled = false;
    setMyProfileReady(false);
    communityAPI.getMy()
      .then((res) => {
        if (cancelled) return;
        setMyProfile(unwrapCreatorProfile(res?.data) || unwrapCreatorProfile(res?.data?.data) || null);
      })
      .catch(() => {
        if (!cancelled) setMyProfile(null);
      })
      .finally(() => {
        if (!cancelled) setMyProfileReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, user?.userId]);

  const previewCommunities = useMemo(
    () => {
      const seen = new Set();
      return communities.filter((item) => {
        if (!isCreatorProfileVisible(item)) return false;
        const id = item?.id;
        if (id == null || seen.has(id)) return false;
        seen.add(id);
        return true;
      }).slice(0, HOMEPAGE_PREVIEW_LIMIT);
    },
    [communities],
  );

  const { toggle: toggleLike, get: getLike } = useLikes('COMMUNITY', previewCommunities);
  const { visible } = useHomepageCardReveal(previewCommunities);
  const hasCompletedLinkedInSignup = hasLinkedInAccount(myProfile);

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

  const headerAction = !myProfileReady
    ? null
    : hasCompletedLinkedInSignup
      ? <DeltapreneurShowcaseHint />
      : (
        <Link
          to="/creator#connect-linkedin"
          className="home-section-header__signup"
        >
          {t('signUp', { defaultValue: 'Sign Up' })}
        </Link>
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
          showViewAll
          extraActions={headerAction}
        />
        {previewCommunities.length === 0 ? (
          <p className="home-section-empty text-center text-gray-500">{t('noDisruptors')}</p>
        ) : (
          <HomeCardsNavRow accent="community" ariaLabel="Deltapreneurs" viewAllTo="/community">
            {visible.map((item) => (
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
