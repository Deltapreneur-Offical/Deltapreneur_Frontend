import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { virtualAssistantAPI } from '../../api/services';
import { asArray } from '../../utils/asArray';
import { unwrapApiList } from '../../utils/apiResponse';
import { navigateToVirtualAssistantDetail } from '../../utils/listingNavigation';
import {
  mapVirtualAssistantToCreatorCard,
  normalizeHomepageListing,
} from '../../utils/homepagePreview';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import { useLikes } from '../../hooks/useLikes';
import CommunityListingCard from '../listings/CommunityListingCard';
import HomePreviewCardShell from '../home/HomePreviewCardShell';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from '../home/HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from '../home/HomePreviewRow';
import PageContentSkeleton from '../common/PageContentSkeleton';

export function useFeaturedVirtualAssistants(pageSize = 20, { enabled = true } = {}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    virtualAssistantAPI
      .getPublicList({ featured_only: true, page_size: pageSize })
      .then(async (response) => {
        let list = unwrapApiList(response);
        // Homepage should not stay empty when none are marked featured yet.
        if (!cancelled && asArray(list).length === 0) {
          const fallback = await virtualAssistantAPI.getPublicList({ page_size: pageSize });
          list = unwrapApiList(fallback);
        }
        if (!cancelled) setProfiles(list);
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageSize, enabled]);

  const cards = useMemo(
    () => asArray(profiles)
      .map((item) => {
        const normalized = normalizeHomepageListing(item, 'virtual-assistant');
        return normalized ? mapVirtualAssistantToCreatorCard(normalized) : null;
      })
      .filter(Boolean),
    [profiles],
  );

  return { cards, loading, count: cards.length };
}

export function FeaturedVirtualAssistantCard({
  profile,
  onView,
  onHire,
  likeState,
  onLike,
  accent = 'community',
}) {
  return (
    <HomePreviewCardShell accent={accent}>
      <CommunityListingCard
        profile={profile}
        isMe={false}
        skipVisibilityCheck
        onView={onView}
        onHire={onHire}
        likeState={likeState}
        onLike={onLike}
      />
    </HomePreviewCardShell>
  );
}

/**
 * Featured Virtual Assistants — shared between homepage Operations strip and /operations Virtual Assistance.
 */
export default function FeaturedVirtualAssistantsListing({
  layout = 'row',
  pageSize = 20,
  cards: externalCards,
  loading: externalLoading,
  emptyMessage,
  ariaLabel,
  onViewProfile,
  onHireProfile,
  loadingFallback = null,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const internal = useFeaturedVirtualAssistants(pageSize, { enabled: externalCards === undefined });
  const cards = externalCards ?? internal.cards;
  const loading = externalLoading ?? internal.loading;
  const count = cards.length;
  const shouldAutoScroll = useShouldAutoScroll(count);
  // Dedicated like bucket — do not reuse COMMUNITY (Creators) likes.
  const { toggle: toggleLike, get: getLike } = useLikes('VIRTUAL_ASSISTANT', cards);

  const handleView = onViewProfile || ((profileId) => navigateToVirtualAssistantDetail(navigate, profileId));
  const handleHire = onHireProfile || ((profileId) => navigateToVirtualAssistantDetail(navigate, profileId, { intent: 'hire' }));

  const resolvedEmptyMessage = emptyMessage
    ?? t('operationsHomeEmptyFeaturedVa', { defaultValue: 'No featured virtual assistants available.' });

  if (loading) {
    if (loadingFallback) return loadingFallback;
    return <PageContentSkeleton variant="grid" rows={layout === 'grid' ? 6 : 3} />;
  }

  if (count === 0) {
    return <p className="text-center text-gray-500 py-8">{resolvedEmptyMessage}</p>;
  }

  const cardKey = (profile, index) =>
    String(profile?.id || profile?.referenceNumber || profile?.reference_number || `va-${index}`);

  const renderCard = (profile) => (
    <FeaturedVirtualAssistantCard
      profile={profile}
      onView={() => handleView(profile.id)}
      onHire={() => handleHire(profile.id)}
      likeState={getLike(profile.id)}
      onLike={() => toggleLike(profile.id)}
    />
  );

  if (layout === 'grid') {
    return (
      <div className="featured-va-grid listing-card-glow-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 min-w-0 items-stretch">
        {cards.map((profile, index) => (
          <div key={cardKey(profile, index)} className="featured-va-grid__item min-w-0 h-full flex flex-col">
            {renderCard(profile)}
          </div>
        ))}
      </div>
    );
  }

  if (shouldAutoScroll) {
    return (
      <HomeAutoScrollRow durationSec={50} className="home-va-auto-scroll-row" ariaLabel={ariaLabel || 'Featured Virtual Assistants'}>
        {cards.map((profile, index) => (
          <HomeAutoScrollRowItem key={cardKey(profile, index)}>
            {renderCard(profile)}
          </HomeAutoScrollRowItem>
        ))}
      </HomeAutoScrollRow>
    );
  }

  return (
    <HomePreviewRow>
      {cards.map((profile, index) => (
        <HomePreviewRowItem key={cardKey(profile, index)}>
          {renderCard(profile)}
        </HomePreviewRowItem>
      ))}
    </HomePreviewRow>
  );
}
