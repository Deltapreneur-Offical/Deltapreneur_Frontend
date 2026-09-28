import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { virtualAssistantAPI } from '../../api/services';
import { asArray } from '../../utils/asArray';
import { unwrapApiList } from '../../utils/apiResponse';
import { navigateToVirtualAssistantDetail } from '../../utils/listingNavigation';
import { isActiveListing } from '../../utils/homepageListings';
import { mapVirtualAssistantToCreatorCard, normalizeHomepageListing } from '../../utils/homepagePreview';
import { useHomepageCardReveal } from '../../utils/homepageCardReveal';
import { useLikes } from '../../hooks/useLikes';
import CommunityListingCard from '../listings/CommunityListingCard';
import HomePreviewCardShell from '../home/HomePreviewCardShell';
import HomeCardsNavRow from '../home/HomeCardsNavRow';
import { HomePreviewRowItem } from '../home/HomePreviewRow';
import PageContentSkeleton from '../common/PageContentSkeleton';

const INACTIVE_OPERATOR_STATUSES = new Set([
  'inactive',
  'archived',
  'deleted',
  'removed',
  'unpublished',
  'draft',
]);

function operatorStatusValues(item) {
  return [
    item?.publishStatus,
    item?.publish_status,
    item?.overallStatus,
    item?.overall_status,
    item?.profileStatus,
    item?.profile_status,
    item?.listingStatus,
    item?.listing_status,
  ]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean);
}

/** Published DeltaOperators only — excludes inactive, deleted, and archived records. */
export function isActiveDeltaOperator(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.deleted === true || item.isDeleted === true || item.is_deleted === true) return false;
  if (item.archived === true || item.isArchived === true || item.is_archived === true) return false;
  if (item.active === false || item.isActive === false || item.is_active === false) return false;
  if (operatorStatusValues(item).some((status) => INACTIVE_OPERATOR_STATUSES.has(status))) return false;
  return isActiveListing(item, 'virtual-assistant');
}

/**
 * Total active operators from the published DeltaOperators payload.
 * Uses the API total when the page is truncated, minus any inactive rows in that page.
 * When the page contains the full roster, counts only rows that pass the active filter.
 */
export function readActiveOperatorTotal(response) {
  const body = response?.data ?? {};
  const items = unwrapApiList(response);
  const activeCount = items.filter((item) => isActiveDeltaOperator(item)).length;
  const reported = Number(body?.meta?.total);
  if (Number.isFinite(reported) && items.length < reported) {
    const inactiveInPage = Math.max(0, items.length - activeCount);
    return Math.max(0, reported - inactiveInPage);
  }
  return activeCount;
}

export function useFeaturedVirtualAssistants(pageSize = 48, {
  enabled = true,
  featuredOnly = false,
  includeActiveTotal = false,
} = {}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [activeTotal, setActiveTotal] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const request = featuredOnly
      ? virtualAssistantAPI.getPublicList({ featured_only: true, page_size: pageSize })
      : virtualAssistantAPI.getPublicList({ page_size: pageSize });

    request
      .then(async (response) => {
        let list = unwrapApiList(response);
        if (!featuredOnly && !cancelled && asArray(list).length === 0) {
          const fallback = await virtualAssistantAPI.getPublicList({
            featured_only: true,
            page_size: pageSize,
          });
          list = unwrapApiList(fallback);
        }
        const sorted = asArray(list).slice().sort((a, b) => (
          Number(Boolean(b.featured)) - Number(Boolean(a.featured))
        ));
        if (!cancelled) setProfiles(sorted);
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
  }, [pageSize, enabled, featuredOnly]);

  useEffect(() => {
    if (!enabled || !includeActiveTotal) {
      setActiveTotal(null);
      return undefined;
    }

    let cancelled = false;
    virtualAssistantAPI.getPublicList({
      page: 1,
      page_size: Math.max(Number(pageSize) || 1, 48),
    })
      .then((response) => {
        if (!cancelled) setActiveTotal(readActiveOperatorTotal(response));
      })
      .catch(() => {
        if (!cancelled) setActiveTotal(null);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, includeActiveTotal, pageSize]);

  const patchProfile = useCallback((id, patch) => {
    setProfiles((prev) => prev.map((item) => (
      String(item.id) === String(id) ? { ...item, ...patch } : item
    )));
  }, []);

  const cards = useMemo(
    () => asArray(profiles)
      .map((item) => {
        const normalized = normalizeHomepageListing(item, 'virtual-assistant');
        return normalized ? mapVirtualAssistantToCreatorCard(normalized) : null;
      })
      .filter(Boolean),
    [profiles],
  );

  return { cards, loading, count: cards.length, activeTotal, patchProfile };
}

export function FeaturedVirtualAssistantCard({
  profile,
  onView,
  onHire,
  likeState,
  onLike,
  accent = 'assistance',
  showAvailabilityBadge = false,
  priceLabelOutside = false,
  compensationLabel = 'Compensation',
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
        showAvailabilityBadge={showAvailabilityBadge}
        priceLabelOutside={priceLabelOutside}
        compensationLabel={compensationLabel}
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
  featuredOnly = false,
  cards: externalCards,
  loading: externalLoading,
  emptyMessage,
  ariaLabel,
  onViewProfile,
  onHireProfile,
  loadingFallback = null,
  revealInPages = false,
  className = '',
  rowClassName = '',
  showAvailabilityBadge = false,
  priceLabelOutside = false,
  compensationLabel = 'Compensation',
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const internal = useFeaturedVirtualAssistants(pageSize, {
    enabled: externalCards === undefined,
    featuredOnly,
  });
  const cards = externalCards ?? internal.cards;
  const loading = externalLoading ?? internal.loading;
  const count = cards.length;
  const { visible } = useHomepageCardReveal(cards);
  const rendered = revealInPages ? visible : cards;
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
      showAvailabilityBadge={showAvailabilityBadge}
      priceLabelOutside={priceLabelOutside}
      compensationLabel={compensationLabel}
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

  return (
    <HomeCardsNavRow
      accent="assistance"
      className={['home-va-auto-scroll-row', className].filter(Boolean).join(' ')}
      rowClassName={rowClassName}
      ariaLabel={ariaLabel || 'Featured Virtual Assistants'}
    >
      {rendered.map((profile, index) => (
        <HomePreviewRowItem key={cardKey(profile, index)}>
          {renderCard(profile)}
        </HomePreviewRowItem>
      ))}
    </HomeCardsNavRow>
  );
}
