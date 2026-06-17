import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  auctionAPI,
  communityAuctionAPI,
  softwareAuctionAPI,
} from '../../api/services';
import {
  extractActiveList,
  mergeHomepageAuctions,
  normalizeCommunityAuction,
  normalizeDomainAuction,
  normalizeSoftwareAuction,
  resolveHomeAuctionPath,
} from '../../utils/homepageAuctions';
import {
  STATIC_HOMEPAGE_AUCTIONS,
  resolveStaticHomeAuctionPath,
} from '../../utils/staticHomepageAuctions';
import HomePreviewCardShell from './HomePreviewCardShell';
import HomeAuctionPreviewCard from '../auctions/HomeAuctionPreviewCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import '../../styles/domain-listing-cards.css';
import '../../styles/home-preview-cards.css';

function AuctionPreviewCard({ auction, onView }) {
  return (
    <HomePreviewCardShell>
      <HomeAuctionPreviewCard auction={auction} onView={onView} />
    </HomePreviewCardShell>
  );
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

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        const [domainsRes, communityRes, softwareRes] = await Promise.all([
          auctionAPI.getActive().catch(() => ({ data: [] })),
          communityAuctionAPI.getActive().catch(() => ({ data: [] })),
          softwareAuctionAPI.getActive().catch(() => ({ data: [] })),
        ]);

        setAuctions({
          domains: extractActiveList(domainsRes.data).map(normalizeDomainAuction).filter(Boolean),
          community: extractActiveList(communityRes.data).map(normalizeCommunityAuction).filter(Boolean),
          software: extractActiveList(softwareRes.data).map(normalizeSoftwareAuction).filter(Boolean),
        });
      } catch {
        setAuctions({ domains: [], community: [], software: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();

    const refresh = () => {
      if (document.visibilityState === 'visible') fetchAuctions();
    };
    window.addEventListener('focus', fetchAuctions);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', fetchAuctions);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const displayAuctions = useMemo(() => {
    const live = mergeHomepageAuctions(auctions);
    return live.length > 0 ? live : STATIC_HOMEPAGE_AUCTIONS;
  }, [auctions]);

  const handleViewAuction = (auction) => {
    if (auction?.isStatic) {
      navigate(resolveStaticHomeAuctionPath(auction));
      return;
    }
    navigate(resolveHomeAuctionPath(auction));
  };

  const shouldAutoScroll = displayAuctions.length > 5;

  if (loading) {
    return <HomeSectionCardSkeleton title={t('auctions')} to="/auctions" />;
  }

  return (
    <section className="bg-white pt-0 pb-4 md:pt-0 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('auctions')} to="/auctions" />
        {shouldAutoScroll ? (
          <HomeAutoScrollRow durationSec={50} ariaLabel={t('auctions')}>
            {displayAuctions.map((auction) => (
              <HomeAutoScrollRowItem key={`${auction.category}-${auction.id}`}>
                <AuctionPreviewCard
                  auction={auction}
                  onView={() => handleViewAuction(auction)}
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
                />
              </HomePreviewRowItem>
            ))}
          </HomePreviewRow>
        )}
      </div>
    </section>
  );
}
