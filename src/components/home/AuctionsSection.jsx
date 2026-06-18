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
  }, []);

  const displayAuctions = useMemo(
    () => mergeHomepageAuctions(auctions),
    [auctions],
  );

  const handleViewAuction = (auction) => {
    navigate(resolveHomeAuctionPath(auction));
  };

  const shouldAutoScroll = displayAuctions.length > 5;

  if (loading) {
    return <HomeSectionCardSkeleton title={t('auctions')} to="/auctions" />;
  }

  return (
    <section className="bg-white pt-2 pb-4 md:pt-3 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('auctions')} to="/auctions" />
        {displayAuctions.length === 0 ? (
          <p className="text-center text-gray-500 py-4">{t('noAuctions')}</p>
        ) : shouldAutoScroll ? (
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
