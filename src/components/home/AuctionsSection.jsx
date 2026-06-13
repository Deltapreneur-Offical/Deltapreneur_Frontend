import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  auctionAPI,
  ventureAPI,
  ventureAuctionAPI,
  communityAuctionAPI,
  softwareAuctionAPI,
} from '../../api/services';
import { asArray } from '../../utils/asArray';
import { fetchAllListPages } from '../../utils/listPagination';
import {
  extractActiveList,
  mergeHomepageAuctions,
  normalizeCommunityAuction,
  normalizeDomainAuction,
  normalizeListedVentureAuction,
  normalizeSoftwareAuction,
  normalizeVentureAuction,
  resolveHomeAuctionPath,
} from '../../utils/homepageAuctions';
import ListingCardShell from '../listings/ListingCardShell';
import HomeAuctionPreviewCard from '../auctions/HomeAuctionPreviewCard';
import HomeSectionCardSkeleton from './HomeSectionCardSkeleton';
import HomeSectionHeader from './HomeSectionHeader';
import HomeAutoScrollRow, { HomeAutoScrollRowItem } from './HomeAutoScrollRow';
import HomePreviewRow, { HomePreviewRowItem } from './HomePreviewRow';
import '../../styles/domain-listing-cards.css';
import '../../styles/home-preview-cards.css';

function mergeVentureAuctionRows(activeRows, listedRows) {
  const merged = new Map();
  activeRows.forEach((row) => {
    if (row?.id) merged.set(String(row.id), row);
  });
  listedRows.forEach((row) => {
    if (row?.id && !merged.has(String(row.id))) merged.set(String(row.id), row);
  });
  return Array.from(merged.values());
}

export default function AuctionsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState({
    domains: [],
    ventures: [],
    community: [],
    software: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        const [
          domainsRes,
          venturesRes,
          listedVentures,
          myVenturesRes,
          communityRes,
          softwareRes,
        ] = await Promise.all([
          auctionAPI.getActive().catch(() => ({ data: [] })),
          ventureAuctionAPI.getActive().catch(() => ({ data: [] })),
          fetchAllListPages((params) => ventureAPI.getAll(params))
            .then((rows) => rows.map(normalizeListedVentureAuction).filter(Boolean))
            .catch(() => []),
          ventureAPI.getMyVentures()
            .then(({ data }) => asArray(data).map(normalizeListedVentureAuction).filter(Boolean))
            .catch(() => []),
          communityAuctionAPI.getActive().catch(() => ({ data: [] })),
          softwareAuctionAPI.getActive().catch(() => ({ data: [] })),
        ]);

        const activeVentures = extractActiveList(venturesRes.data)
          .map(normalizeVentureAuction)
          .filter(Boolean);

        setAuctions({
          domains: extractActiveList(domainsRes.data).map(normalizeDomainAuction).filter(Boolean),
          ventures: mergeVentureAuctionRows(activeVentures, [...listedVentures, ...myVenturesRes]),
          community: extractActiveList(communityRes.data).map(normalizeCommunityAuction).filter(Boolean),
          software: extractActiveList(softwareRes.data).map(normalizeSoftwareAuction).filter(Boolean),
        });
      } catch {
        setAuctions({ domains: [], ventures: [], community: [], software: [] });
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

  const previewAuctions = useMemo(
    () => mergeHomepageAuctions(auctions),
    [auctions],
  );

  const handleViewAuction = (auction) => {
    navigate(resolveHomeAuctionPath(auction));
  };

  const useAutoScroll = previewAuctions.length > 5;

  if (loading) {
    return <HomeSectionCardSkeleton title={t('auctions')} to="/auctions" />;
  }

  return (
    <section className="bg-white pt-0 pb-4 md:pt-0 md:pb-6 min-w-0 overflow-visible">
      <div className="w-full min-w-0">
        <HomeSectionHeader title={t('auctions')} to="/auctions" />
        {previewAuctions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noAuctions')}</p>
        ) : useAutoScroll ? (
          <HomeAutoScrollRow
            className="home-preview-row--always-scroll"
            durationSec={50}
            minItemsToScroll={6}
            ariaLabel={t('auctions')}
          >
            {previewAuctions.map((auction) => (
              <HomeAutoScrollRowItem key={`${auction.category}-${auction.id}`}>
                <ListingCardShell className="home-preview-card-shell">
                  <HomeAuctionPreviewCard
                    auction={auction}
                    onView={() => handleViewAuction(auction)}
                  />
                </ListingCardShell>
              </HomeAutoScrollRowItem>
            ))}
          </HomeAutoScrollRow>
        ) : (
          <HomePreviewRow>
            {previewAuctions.map((auction) => (
              <HomePreviewRowItem key={`${auction.category}-${auction.id}`}>
                <ListingCardShell className="home-preview-card-shell">
                  <HomeAuctionPreviewCard
                    auction={auction}
                    onView={() => handleViewAuction(auction)}
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

