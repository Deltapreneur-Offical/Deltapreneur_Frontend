import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  auctionAPI,
  communityAPI,
  communityAuctionAPI,
  domainAPI,
  softwareAuctionAPI,
  technologyAPI,
} from '../../api/services';
import {
  buildHomeAuctionLikeItems,
  extractActiveList,
  pickHomepagePreviewAuctions,
  resolveHomeAuctionLikeTarget,
  resolveHomeAuctionPath,
  resolveHomeAuctionPricingType,
  hasHomeAuctionViewCount,
} from '../../utils/homepageAuctions';
import { useHomepageCardReveal } from '../../utils/homepageCardReveal';
import { unwrapApiData } from '../../utils/apiResponse';
import { useLikes } from '../../hooks/useLikes';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeAuctionPreviewCard from '../auctions/HomeAuctionPreviewCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeCardsNavRow from './HomeCardsNavRow';
import { HomePreviewRowItem } from './HomePreviewRow';
import '../../styles/domain-listing-cards.css';
import '../../styles/home-preview-cards.css';

function AuctionPreviewCard({ auction, onView, likeState, onLike }) {
  return (
    <HomePreviewCardShell accent="auction">
      <HomeAuctionPreviewCard
        auction={auction}
        onView={onView}
        likeState={likeState}
        onLike={onLike}
      />
    </HomePreviewCardShell>
  );
}

function mergeListingMeta(auction, listing) {
  if (!listing || typeof listing !== 'object') return auction;
  const views = listing.views ?? listing.view_count ?? listing.viewCount ?? listing.totalViews;
  const pricingDemand = listing.pricingDemand ?? listing.pricing_demand ?? listing.pricingType ?? listing.pricing_type;
  const category = auction.category || 'domain';

  if (category === 'domain') {
    return {
      ...auction,
      views: views ?? auction.views,
      domain: {
        ...auction.domain,
        views: views ?? auction.domain?.views,
        pricingDemand: pricingDemand ?? auction.domain?.pricingDemand,
      },
    };
  }

  if (category === 'community') {
    return {
      ...auction,
      views: views ?? auction.views,
      community: {
        ...auction.community,
        views: views ?? auction.community?.views,
      },
    };
  }

  if (category === 'technology') {
    return {
      ...auction,
      views: views ?? auction.views,
      software: {
        ...auction.software,
        views: views ?? auction.software?.views,
        pricingDemand: pricingDemand ?? auction.software?.pricingDemand,
      },
    };
  }

  return auction;
}

function listingMetaCacheKey(auction) {
  const category = auction.category || 'domain';
  if (category === 'domain') {
    const id = auction.domain?.id ?? auction.domainId ?? auction.domain_id;
    return id ? `domain:${id}` : null;
  }
  if (category === 'community') {
    const id = auction.community?.id ?? auction.communityId ?? auction.community_id;
    return id ? `community:${id}` : null;
  }
  if (category === 'technology') {
    const id = auction.software?.id ?? auction.softwareId ?? auction.software_id;
    return id ? `technology:${id}` : null;
  }
  return null;
}

function applyCachedListingMeta(auction, cache) {
  const key = listingMetaCacheKey(auction);
  if (!key) return auction;
  const cached = cache.get(key);
  return cached ? mergeListingMeta(auction, cached) : auction;
}

const listingMetaInflight = new Map();

async function fetchHomeAuctionListingMeta(auction, cache) {
  const hydrated = applyCachedListingMeta(auction, cache);
  const needsViews = !hasHomeAuctionViewCount(hydrated);
  const needsPricing = !resolveHomeAuctionPricingType(hydrated);
  if (!needsViews && !needsPricing) return hydrated;

  const category = auction.category || 'domain';
  const key = listingMetaCacheKey(auction);
  if (key && listingMetaInflight.has(key)) {
    try {
      const listing = await listingMetaInflight.get(key);
      if (listing && key) cache.set(key, listing);
      return listing ? mergeListingMeta(hydrated, listing) : hydrated;
    } catch {
      return hydrated;
    }
  }

  const request = (async () => {
    if (category === 'domain') {
      const domainId = auction.domain?.id ?? auction.domainId ?? auction.domain_id;
      if (!domainId) return null;
      return unwrapApiData(await domainAPI.get(domainId));
    }
    if (category === 'community') {
      const communityId = auction.community?.id ?? auction.communityId ?? auction.community_id;
      if (!communityId) return null;
      return unwrapApiData(await communityAPI.getOne(communityId));
    }
    if (category === 'technology') {
      const softwareId = auction.software?.id ?? auction.softwareId ?? auction.software_id;
      if (!softwareId) return null;
      return unwrapApiData(await technologyAPI.get(softwareId));
    }
    return null;
  })();

  if (key) listingMetaInflight.set(key, request);
  try {
    const listing = await request;
    if (listing && key) cache.set(key, listing);
    return listing ? mergeListingMeta(hydrated, listing) : hydrated;
  } catch {
    return hydrated;
  } finally {
    if (key) listingMetaInflight.delete(key);
  }
}

function activeListFingerprint(rows) {
  return extractActiveList(rows).map((row) => ([
    row?.id,
    row?.status,
    row?.endTime ?? row?.end_time,
    row?.currentBid ?? row?.current_bid ?? row?.highestBid ?? row?.highest_bid,
    row?.totalBids ?? row?.total_bids ?? row?.bidCount ?? row?.bid_count,
  ].join(':'))).join('|');
}

function auctionsFingerprint(bundle) {
  return [
    activeListFingerprint(bundle.domains),
    activeListFingerprint(bundle.community),
    activeListFingerprint(bundle.software),
  ].join('~');
}

export default function AuctionsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState({
    domains: [],
    community: [],
    software: [],
  });
  const [loading, setLoading] = useState(true);
  const loadInFlightRef = useRef(false);
  const auctionsFingerprintRef = useRef('');
  const listingMetaCacheRef = useRef(new Map());

  const loadAuctions = useCallback(async ({ showLoading = false } = {}) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    try {
      if (showLoading) setLoading(true);
      const [domainsRes, communityRes, softwareRes] = await Promise.all([
        auctionAPI.getActive({ page: 1, page_size: 8 }).catch(() => ({ data: [] })),
        communityAuctionAPI.getActive().catch(() => ({ data: [] })),
        softwareAuctionAPI.getActive().catch(() => ({ data: [] })),
      ]);

      const next = {
        domains: extractActiveList(domainsRes.data),
        community: extractActiveList(communityRes.data),
        software: extractActiveList(softwareRes.data),
      };
      const fingerprint = auctionsFingerprint(next);
      if (fingerprint !== auctionsFingerprintRef.current) {
        auctionsFingerprintRef.current = fingerprint;
        setAuctions(next);
      }
    } catch {
      auctionsFingerprintRef.current = '';
      setAuctions({ domains: [], community: [], software: [] });
    } finally {
      loadInFlightRef.current = false;
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions({ showLoading: true });
  }, [loadAuctions]);

  useEffect(() => {
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadAuctions();
    };

    const intervalId = window.setInterval(refresh, 45000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadAuctions]);

  const baseAuctions = useMemo(
    () => pickHomepagePreviewAuctions(auctions),
    [auctions],
  );
  const [displayAuctions, setDisplayAuctions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const cache = listingMetaCacheRef.current;
    const hydrated = baseAuctions.map((auction) => applyCachedListingMeta(auction, cache));
    setDisplayAuctions(hydrated);

    if (!hydrated.length) return undefined;

    (async () => {
      const enriched = await Promise.all(
        hydrated.map((auction) => fetchHomeAuctionListingMeta(auction, cache)),
      );
      if (!cancelled) setDisplayAuctions(enriched);
    })();

    return () => {
      cancelled = true;
    };
  }, [baseAuctions]);

  const domainLikeItems = useMemo(
    () => buildHomeAuctionLikeItems(displayAuctions, 'domain'),
    [displayAuctions],
  );
  const communityLikeItems = useMemo(
    () => buildHomeAuctionLikeItems(displayAuctions, 'community'),
    [displayAuctions],
  );
  const softwareLikeItems = useMemo(
    () => buildHomeAuctionLikeItems(displayAuctions, 'technology'),
    [displayAuctions],
  );

  const domainLikes = useLikes('DOMAIN', domainLikeItems);
  const communityLikes = useLikes('COMMUNITY', communityLikeItems);
  const softwareLikes = useLikes('SOFTWARE', softwareLikeItems);
  const { visible, hasMore, revealMore } = useHomepageCardReveal(displayAuctions);

  const getAuctionLike = useCallback((auction) => {
    const target = resolveHomeAuctionLikeTarget(auction);
    if (!target) return { liked: false, count: 0 };
    if (target.type === 'DOMAIN') return domainLikes.get(target.entityId);
    if (target.type === 'COMMUNITY') return communityLikes.get(target.entityId);
    if (target.type === 'SOFTWARE') return softwareLikes.get(target.entityId);
    return { liked: false, count: 0 };
  }, [domainLikes, communityLikes, softwareLikes]);

  const toggleAuctionLike = useCallback((auction) => {
    const target = resolveHomeAuctionLikeTarget(auction);
    if (!target) return undefined;
    if (target.type === 'DOMAIN') return domainLikes.toggle(target.entityId);
    if (target.type === 'COMMUNITY') return communityLikes.toggle(target.entityId);
    if (target.type === 'SOFTWARE') return softwareLikes.toggle(target.entityId);
    return undefined;
  }, [domainLikes, communityLikes, softwareLikes]);

  const handleViewAuction = (auction) => {
    navigate(resolveHomeAuctionPath(auction));
  };

  if (loading) {
    return <HomeSectionCardSkeleton title={t('homeRegistryAuctions', { defaultValue: 'Auctions' })} to="/auctions" accent="auction" variant="auction" />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title={t('homeRegistryAuctions', { defaultValue: 'Auctions' })}
          to="/auctions"
          accent="auction"
          showViewAll={displayAuctions.length > 0}
        />
        {displayAuctions.length === 0 ? (
          <p className="home-section-empty text-center text-gray-500">{t('noAuctions')}</p>
        ) : (
          <HomeCardsNavRow
            accent="auction"
            ariaLabel={t('homeRegistryAuctions', { defaultValue: 'Auctions' })}
            hasMore={hasMore}
            onRevealMore={revealMore}
          >
            {visible.map((auction) => (
              <HomePreviewRowItem key={`${auction.category}-${auction.id}`}>
                <AuctionPreviewCard
                  auction={auction}
                  onView={() => handleViewAuction(auction)}
                  likeState={getAuctionLike(auction)}
                  onLike={() => toggleAuctionLike(auction)}
                />
              </HomePreviewRowItem>
            ))}
          </HomeCardsNavRow>
        )}
      </div>
    </section>
  );
}
