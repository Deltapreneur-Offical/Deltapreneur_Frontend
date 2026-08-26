import { useState, useEffect, useMemo, useCallback } from 'react';
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
  resolveHomeAuctionViews,
} from '../../utils/homepageAuctions';
import { unwrapApiData } from '../../utils/apiResponse';
import { useLikes } from '../../hooks/useLikes';
import HomePreviewCardShell from './HomePreviewCardShell';
import { useShouldAutoScroll } from '../../hooks/useShouldAutoScroll';
import HomeAuctionPreviewCard from '../auctions/HomeAuctionPreviewCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
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

async function fetchHomeAuctionListingMeta(auction) {
  const category = auction.category || 'domain';
  const needsViews = resolveHomeAuctionViews(auction) <= 0;
  const needsPricing = !resolveHomeAuctionPricingType(auction);

  if (!needsViews && !needsPricing) return auction;

  try {
    if (category === 'domain') {
      const domainId = auction.domain?.id ?? auction.domainId ?? auction.domain_id;
      if (!domainId) return auction;
      const listing = unwrapApiData(await domainAPI.get(domainId));
      return mergeListingMeta(auction, listing);
    }

    if (category === 'community') {
      const communityId = auction.community?.id ?? auction.communityId ?? auction.community_id;
      if (!communityId) return auction;
      const profile = unwrapApiData(await communityAPI.getOne(communityId));
      return mergeListingMeta(auction, profile);
    }

    if (category === 'technology') {
      const softwareId = auction.software?.id ?? auction.softwareId ?? auction.software_id;
      if (!softwareId) return auction;
      const listing = unwrapApiData(await technologyAPI.get(softwareId));
      return mergeListingMeta(auction, listing);
    }
  } catch {
    return auction;
  }

  return auction;
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

  const loadAuctions = useCallback(async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true);
      const [domainsRes, communityRes, softwareRes] = await Promise.all([
        auctionAPI.getActive().catch(() => ({ data: [] })),
        communityAuctionAPI.getActive().catch(() => ({ data: [] })),
        softwareAuctionAPI.getActive().catch(() => ({ data: [] })),
      ]);

      setAuctions({
        domains: extractActiveList(domainsRes.data),
        community: extractActiveList(communityRes.data),
        software: extractActiveList(softwareRes.data),
      });
    } catch {
      setAuctions({ domains: [], community: [], software: [] });
    } finally {
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
    setDisplayAuctions(baseAuctions);

    if (!baseAuctions.length) return undefined;

    (async () => {
      const enriched = await Promise.all(
        baseAuctions.map((auction) => fetchHomeAuctionListingMeta(auction)),
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

  const shouldAutoScroll = useShouldAutoScroll(displayAuctions.length);

  if (loading) {
    return <HomeSectionCardSkeleton title="Registry Auctions" to="/auctions" accent="auction" variant="auction" />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader
          title="Registry Auctions"
          to="/auctions"
          accent="auction"
          showViewAll={displayAuctions.length > 0}
        />
        {displayAuctions.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{t('noAuctions')}</p>
        ) : shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={50} ariaLabel="Registry Auctions">
            {displayAuctions.map((auction) => (
              <HomeAutoScrollRowItem key={`${auction.category}-${auction.id}`}>
                <AuctionPreviewCard
                  auction={auction}
                  onView={() => handleViewAuction(auction)}
                  likeState={getAuctionLike(auction)}
                  onLike={() => toggleAuctionLike(auction)}
                />
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {displayAuctions.map((auction) => (
              <HomePreviewRowItem key={`${auction.category}-${auction.id}`}>
                <AuctionPreviewCard
                  auction={auction}
                  onView={() => handleViewAuction(auction)}
                  likeState={getAuctionLike(auction)}
                  onLike={() => toggleAuctionLike(auction)}
                />
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
