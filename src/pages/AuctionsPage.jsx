import { useState, useEffect, useMemo } from 'react';
import { Gavel, Search, ChevronDown, X, Home, Smartphone, Cpu, Code } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  auctionAPI,
  communityAuctionAPI,
  softwareAuctionAPI,
} from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import AuctionImg from '../assets/Auction.png';
import DomainsIcon from '../assets/CoBranding.png';
import TechnologyIcon from '../assets/CoCreation.png';
import CreatorIcon from '../assets/Cobrother_Profile.png';
import { formatCountdown, parseAuctionDate, resolveAuctionEndTime } from '../utils/auctionDate';
import { resolveAuctionListerName } from '../utils/auctionLister';
import { useTranslation } from 'react-i18next';
import { normalizeDomainExtension, resolveAuctionDomainTitle } from '../utils/domainDisplay';
import { pickMediaUrl } from '../utils/mediaUrl';
import { normalizeCommunityAuction } from '../utils/homepageAuctions';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import CreatorPreviewModal from '../components/auctions/CreatorPreviewModal';
import '../styles/auctions-page.css';

function AuctionCategoryIcon({ src, selected, className = 'w-4 h-4 object-contain shrink-0' }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`${className} transition-all duration-200 ${selected ? 'brightness-0 invert' : ''}`}
    />
  );
}

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function AuctionCardNextBidLine({ highestBid }) {
  const hasNextBid = highestBid > 0;
  return (
    <div
      className={`text-sm font-semibold mb-3 min-h-[1.375rem] leading-snug ${hasNextBid ? 'text-gray-700' : 'invisible select-none pointer-events-none'}`}
      aria-hidden={!hasNextBid}
    >
      {hasNextBid
        ? `Next bid: ≥ ₹${Number(highestBid * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : '\u00A0'}
    </div>
  );
}

const normalizeAuction = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const domainRaw = raw.domain || {};
  return {
    ...raw,
    id: raw.id ?? raw.auctionId ?? raw.auction_id ?? null,
    minBidPrice: toNum(raw.minBidPrice ?? raw.min_bid_price, 0),
    currentHighestBid: toNum(raw.currentHighestBid ?? raw.current_highest_bid, 0),
    totalBids: toNum(raw.totalBids ?? raw.total_bids, 0),
    startTime: raw.startTime ?? raw.start_time ?? null,
    endTime: resolveAuctionEndTime(raw) ?? raw.endTime ?? raw.end_time ?? null,
    duration: raw.duration ?? null,
    domainDisplayName: raw.domainDisplayName ?? raw.domain_display_name ?? null,
    listedBy: raw.listedBy ?? raw.listed_by ?? domainRaw.listedBy ?? domainRaw.listed_by ?? null,
    domain: {
      ...domainRaw,
      fullDomain: domainRaw.fullDomain ?? domainRaw.full_domain ?? '',
      domainName: domainRaw.domainName ?? domainRaw.domain_name ?? '',
      domainExtension: domainRaw.domainExtension ?? domainRaw.domain_extension ?? '',
      verified: Boolean(domainRaw.verified ?? domainRaw.is_verified ?? false),
      listedBy: domainRaw.listedBy ?? domainRaw.listed_by ?? null,
    },
  };
};

const normalizeSoftwareAuction = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const software = raw.software || {};
  let endTime = resolveAuctionEndTime(raw) ?? raw.endTime ?? raw.end_time ?? null;
  if (typeof endTime === 'string' && endTime && !endTime.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(endTime)) {
    endTime = `${endTime}Z`;
  }
  return {
    ...normalizeAuction(raw),
    endTime,
    auctionTitle: raw.name || software.name || 'Technology',
    name: raw.name || software.name,
    imageUrl: pickMediaUrl(raw) || pickMediaUrl(software) || raw.imageUrl || software.imageUrl,
    category: raw.category || software.category,
    software,
  };
};

/** Backend may return a raw array, `{ data: [] }`, or `{ items: [] }`. */
const extractActiveList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const asItems = (data) => extractActiveList(data).map(normalizeAuction);
// Live countdown per card
function useCountdown(endTime) {
  const [timeLeft, setTimeLeft] = useState('—');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const { timeLeft: next, isUrgent: urgent } = formatCountdown(endTime);
      setTimeLeft(next);
      setIsUrgent(urgent);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return { timeLeft, isUrgent };
}

function AuctionFilterSelect({ label, value, onChange, options }) {
  return (
    <div className="auctions-page-select-wrap">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="auctions-page-select"
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="auctions-page-select-chevron" size={16} strokeWidth={2.25} aria-hidden />
    </div>
  );
}

const getAuctionPrice = (auction) => {
  const highest = toNum(auction.currentHighestBid, 0);
  const min = toNum(auction.minBidPrice, 0);
  return highest > 0 ? highest : min;
};

const getAuctionEndMs = (auction) => {
  const end = parseAuctionDate(auction.endTime);
  return end ? end.getTime() : Number.MAX_SAFE_INTEGER;
};

const sortAuctionList = (list, sortBy) => {
  if (sortBy === 'default' || !list.length) return list;
  const sorted = [...list];
  if (sortBy === 'ending_soon') {
    sorted.sort((a, b) => getAuctionEndMs(a) - getAuctionEndMs(b));
  } else if (sortBy === 'price_asc') {
    sorted.sort((a, b) => getAuctionPrice(a) - getAuctionPrice(b));
  } else if (sortBy === 'price_desc') {
    sorted.sort((a, b) => getAuctionPrice(b) - getAuctionPrice(a));
  }
  return sorted;
};

const SECTION_IDS = new Set(['all', 'domains', 'community', 'technology']);

const matchesAuctionSearch = (auction, query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;

  if (auction.domain) {
    return resolveAuctionDomainTitle(auction).toLowerCase().includes(q);
  }

  if (auction.software || auction.auctionTitle || auction.name) {
    const software = auction.software || {};
    const haystack = [
      auction.auctionTitle,
      auction.name,
      software.name,
      auction.category,
      software.category,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  }

  const community = auction.community || {};
  const haystack = [
    auction.auctionTitle,
    community.name,
    auction.workType,
    auction.auctionSkills,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
};

export default function AuctionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [domainAuctions, setDomainAuctions]       = useState([]);
  const [communityAuctions, setCommunityAuctions] = useState([]);
  const [softwareAuctions, setSoftwareAuctions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [section, setSection]   = useState('all'); // all | domains | community | technology
  const [filter, setFilter]     = useState('all'); // all | ending_soon | no_bids
  const [sortBy, setSortBy]     = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAuction, setPreviewAuction] = useState(null);

  useEffect(() => {
    const fromUrl = searchParams.get('section');
    if (fromUrl && SECTION_IDS.has(fromUrl)) {
      setSection(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      auctionAPI.getActive().then(({ data }) => asItems(data)).catch(() => []),
      communityAuctionAPI.getActive()
        .then(({ data }) => extractActiveList(data).map(normalizeCommunityAuction).filter(Boolean))
        .catch(() => []),
      softwareAuctionAPI.getActive()
        .then(({ data }) => extractActiveList(data).map(normalizeSoftwareAuction))
        .catch(() => []),
    ]).then(([domains, community, software]) => {
      setDomainAuctions(domains);
      setCommunityAuctions(community);
      setSoftwareAuctions(software);
    }).finally(() => setLoading(false));
  }, []);

  const applyFilter = (list) => list.filter(a => {
    if (!matchesAuctionSearch(a, searchQuery)) return false;
    if (filter === 'ending_soon') {
      const { timeLeft } = formatCountdown(a.endTime);
      if (timeLeft === 'Ended' || timeLeft === 'Awaiting schedule' || timeLeft === '—') {
        return false;
      }
      const end = parseAuctionDate(a.endTime);
      if (!end) return false;
      return end.getTime() - Date.now() < 86400000;
    }
    if (filter === 'no_bids') return a.totalBids === 0;
    return true;
  });

  const shownDomains    = sortAuctionList((section === 'community' || section === 'technology') ? [] : applyFilter(domainAuctions), sortBy);
  const shownCommunity  = sortAuctionList((section === 'domains' || section === 'technology') ? [] : applyFilter(communityAuctions), sortBy);
  const shownSoftware   = sortAuctionList((section === 'domains' || section === 'community') ? [] : applyFilter(softwareAuctions), sortBy);
  const totalLive       = domainAuctions.length + communityAuctions.length + softwareAuctions.length;
  const totalShown      = shownDomains.length + shownCommunity.length + shownSoftware.length;
  const hasActiveFilters = section !== 'all' || filter !== 'all' || sortBy !== 'default' || searchQuery.trim().length > 0;

  const categoryOptions = useMemo(() => ([
    { value: 'all', label: 'Category' },
    { value: 'domains', label: `Domains (${domainAuctions.length})` },
    { value: 'technology', label: `Technology (${softwareAuctions.length})` },
    { value: 'community', label: `Creators (${communityAuctions.length})` },
  ]), [domainAuctions.length, softwareAuctions.length, communityAuctions.length]);

  const statusOptions = useMemo(() => ([
    { value: 'all', label: 'Status' },
    { value: 'ending_soon', label: 'Ending Soon' },
    { value: 'no_bids', label: 'No Bids Yet' },
  ]), []);

  const sortOptions = useMemo(() => ([
    { value: 'default', label: 'Sort by' },
    { value: 'ending_soon', label: 'Ending Soon First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ]), []);

  const clearAllFilters = () => {
    setSection('all');
    setFilter('all');
    setSortBy('default');
    setSearchQuery('');
    navigate('/auctions', { replace: true });
  };

  const handleCategoryChange = (value) => {
    setSection(value);
    navigate(value === 'all' ? '/auctions' : `/auctions?section=${value}`, { replace: true });
  };

  return (
    <AppLayout>
      <div className="auctions-page">
        <div className="auctions-page-toolbar">
          <div className="auctions-page-toolbar-top">
            <div className="auctions-page-hero-main">
              <div className="auctions-page-hero-icon" aria-hidden>
                <Gavel className="w-[1.15rem] h-[1.15rem]" strokeWidth={2} />
              </div>
              <div className="auctions-page-hero-copy">
                <div className="auctions-page-title-row">
                  <h1 className="font-display text-3xl font-bold text-gray-900">Live Auctions</h1>
                  {totalLive > 0 && (
                    <span className="auctions-page-live-badge" aria-hidden>
                      <span className="auctions-page-live-dot" />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-gray-600">
                  {totalLive > 0
                    ? `${totalLive} auction${totalLive !== 1 ? 's' : ''} live right now`
                    : 'No live auctions at the moment'}
                </p>
              </div>
            </div>
          </div>

          <div className="auctions-page-toolbar-divider" aria-hidden />

          <div className="auctions-page-controls">
            <div className="auctions-page-search">
              <Search className="auctions-page-search-icon w-4 h-4" strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search auctions"
                className="auctions-page-search-input"
                aria-label="Search auctions"
              />
            </div>

            <AuctionFilterSelect
              label="Category"
              value={section}
              onChange={handleCategoryChange}
              options={categoryOptions}
            />

            <AuctionFilterSelect
              label="Status"
              value={filter}
              onChange={setFilter}
              options={statusOptions}
            />

            <AuctionFilterSelect
              label="Sort by"
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
            />

            {hasActiveFilters && (
              <button
                type="button"
                className="auctions-page-clear-filters"
                onClick={clearAllFilters}
              >
                <X size={14} strokeWidth={2.25} aria-hidden />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {!loading && totalShown > 0 && hasActiveFilters && (
          <p className="auctions-page-results-note">
            Showing {totalShown} auction{totalShown !== 1 ? 's' : ''}
            {searchQuery.trim() ? ` matching “${searchQuery.trim()}”` : ''}
          </p>
        )}

        {loading ? (
          <PageContentSkeleton variant="cards" rows={6} />
        ) : (shownDomains.length === 0 && shownCommunity.length === 0 && shownSoftware.length === 0) ? (
          <div className="auctions-page-empty">
            <div className="mb-4 flex justify-center">
              <img src={AuctionImg} alt="Auction" className="w-12 sm:w-20 md:w-24 lg:w-24 h-auto" />
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {section === 'technology'
                ? 'No live technology auctions'
                : searchQuery.trim()
                  ? 'No auctions match your search'
                  : 'No auctions match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {section === 'technology'
                ? 'Approved technology listings appear here once their auction is active. Check Technology after admin verification.'
                : searchQuery.trim()
                  ? 'Try a different keyword or clear your search to see all live auctions.'
                  : 'Check back soon — new auctions go live regularly.'}
            </p>
            {hasActiveFilters && (
              <button className="btn-glow btn-glow-sm" type="button" onClick={clearAllFilters}>
                View All Auctions
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Domain Auctions section ── */}
            {shownDomains.length > 0 && (
              <div className="auctions-page-section-block mb-8">
                <div className="auctions-page-section-head">
                  <h2 className="text-base font-bold text-blue-600 m-0 inline-flex items-center gap-2">
                    <AuctionCategoryIcon src={DomainsIcon} className="w-5 h-5 object-contain" />
                    Domain Auctions
                  </h2>
                  <span className="text-xs text-gray-500 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                    {shownDomains.length} live
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shownDomains.map(auction => (
                    <DomainAuctionCard
                      key={auction.id}
                      auction={auction}
                      onClick={() => navigate(`/auction/${auction.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Technology Auctions section ── */}
            {shownSoftware.length > 0 && (
              <div className="auctions-page-section-block mb-8">
                <div className="auctions-page-section-head">
                  <h2 className="text-base font-bold text-indigo-600 m-0 inline-flex items-center gap-2">
                    <AuctionCategoryIcon src={TechnologyIcon} className="w-5 h-5 object-contain" />
                    Technology Auctions
                  </h2>
                  <span className="text-xs text-gray-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                    {shownSoftware.length} live
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shownSoftware.map(auction => (
                    <SoftwareAuctionCard
                      key={auction.id}
                      auction={auction}
                      onClick={() => navigate(`/technology/auction/${auction.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Creator Profile Auctions section ── */}
            {shownCommunity.length > 0 && (
              <div className="auctions-page-section-block mb-8">
                <div className="auctions-page-section-head">
                  <h2 className="text-base font-bold text-teal-600 m-0 inline-flex items-center gap-2">
                    <AuctionCategoryIcon src={CreatorIcon} className="w-5 h-5 object-contain" />
                    Creator Profiles
                  </h2>
                  <span className="text-xs text-gray-500 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                    {shownCommunity.length} live
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shownCommunity.map(auction => (
                    <CommunityAuctionCard
                      key={auction.id}
                      auction={auction}
                      onClick={() => setPreviewAuction(auction)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {previewAuction && (
        <CreatorPreviewModal
          profile={previewAuction?.community}
          auction={previewAuction}
          open={!!previewAuction}
          onClose={() => setPreviewAuction(null)}
          onPlaceBid={() => {
            setPreviewAuction(null);
            navigate(`/creator-auction/${previewAuction.id}`);
          }}
        />
      )}
    </AppLayout>
  );
}

// ─── Domain Auction Card ────────────────────────────────────────────────────────────
function DomainAuctionCard({ auction, onClick }) {
  const { timeLeft, isUrgent } = useCountdown(auction.endTime);
  const domain                  = auction.domain || {};
  const domainTitle             = resolveAuctionDomainTitle(auction);
  const extMeta                 = normalizeDomainExtension(domain.domainExtension);
  const isExtended              = auction.status === 'EXTENDED';
  const highestBid = toNum(auction.currentHighestBid, 0);
  const minBid = toNum(auction.minBidPrice, 0);
  const currentAmount = highestBid > 0 ? highestBid : minBid;
  const totalBids = toNum(auction.totalBids, 0);

  return (
    <div
      className="card-glow-hover bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer relative h-[355px] max-h-[355px] overflow-hidden flex flex-col"
      onClick={onClick}
    >
      {/* Status pill */}
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold" style={{
        color: isExtended ? '#c8a96e' : '#6ec896',
        background: isExtended ? 'rgba(200,169,110,0.15)' : 'rgba(110,200,150,0.15)',
        border: `1px solid ${isExtended ? 'rgba(200,169,110,0.35)' : 'rgba(110,200,150,0.35)'}`,
      }}>
        {isExtended ? '⚡ EXTENDED' : '🟢 LIVE'}
      </div>

      {/* Domain info */}
      <div className="flex items-center gap-3 mb-4 pr-20">
        <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-xs font-bold text-purple-600 bg-purple-100 border border-purple-200 px-1">
          {extMeta?.label || (domainTitle?.includes('.') ? domainTitle.slice(domainTitle.lastIndexOf('.')) : '.?')}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 m-0 whitespace-normal break-words leading-snug">
            {domainTitle || 'Unnamed domain'}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-purple-600 font-semibold">
            <span>🔨 Auction</span>
            {resolveAuctionListerName(auction) && (
              <span className="text-gray-500 font-medium">Listed by {resolveAuctionListerName(auction)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 justify-between">
        <div>
          {domain.verified && (
            <div className="mb-2">
              <span className="text-xs font-bold text-green-600 bg-green-100 border border-green-300 px-2 py-0.5 rounded">
                ✓ Verified
              </span>
            </div>
          )}
          {domain.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed" title={domain.description}>
              {domain.description}
            </p>
          )}
        </div>

        <div>
          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 font-medium mb-1">
                {highestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
              </div>
              <div className={`font-display text-xl font-bold ${highestBid > 0 ? 'text-green-600' : 'text-amber-500'}`}>
                ₹{currentAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 font-medium mb-1">
                Total Bids
              </div>
              <div className="font-display text-xl font-bold text-gray-900">
                {totalBids}
              </div>
            </div>
          </div>

          <AuctionCardNextBidLine highestBid={highestBid} />
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-200 shrink-0">
        <div>
          <div className="text-xs text-gray-600 font-medium">
            Ends In
          </div>
          <div className={`font-display font-bold text-lg ${isUrgent ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
            {timeLeft}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          className="btn-glow btn-glow-sm">
          Bid Now →
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function AuctionSkeleton() {
  return (
    <div className="listing-card-skeleton border border-gray-200 rounded-xl p-5 shadow-sm pointer-events-none h-[355px] max-h-[355px]">
      <div className="flex gap-3 mb-4">
        <div className="w-11 h-11 rounded-[10px] bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3 w-[55%] rounded-md bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
          <div className="h-2.5 w-[35%] rounded-md bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="h-[52px] rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        <div className="h-[52px] rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
      </div>
      <div className="flex justify-between items-center">
        <div className="h-7 w-[40%] rounded-md bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        <div className="h-8 w-[30%] rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
      </div>
    </div>
  );
}

const bone = (style) => ({
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s infinite',
  ...style,
});

// ─── Software / Technology Auction Card ─────────────────────────────────────
function SoftwareAuctionCard({ auction, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const { timeLeft, isUrgent } = useCountdown(auction.endTime);
  const software = auction.software || {};
  const isExtended = auction.status === 'EXTENDED';
  const title = auction.auctionTitle || auction.name || software.name || 'Technology';
  const category = auction.category || software.category;
  const imageSrc = pickMediaUrl(auction) || pickMediaUrl(software) || auction.imageUrl || software.imageUrl;

  const CategoryIcon = useMemo(() => {
    const catUpper = String(category || '').toUpperCase();
    if (catUpper.includes('SMART_HOME') || catUpper.includes('SMART HOME')) return Home;
    if (catUpper.includes('MOBILE') || catUpper.includes('APP')) return Smartphone;
    if (catUpper.includes('WEB') || catUpper.includes('CODE') || catUpper.includes('SOFTWARE')) return Code;
    return Cpu; // Default fallback icon
  }, [category]);

  return (
    <div
      className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-b-[5px] border-purple-600 overflow-hidden flex flex-col p-5 h-full relative cursor-pointer transition-shadow duration-300"
      onClick={onClick}
    >
      {/* Top Row: Badges */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          {isExtended ? 'EXTENDED' : 'LIVE'}
        </div>
        
        {category && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[0.7rem] font-bold border border-purple-100 uppercase tracking-wider">
            <CategoryIcon className="w-3.5 h-3.5 text-purple-500" />
            {String(category).replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* Header Row: Image & Info */}
      <div className="flex items-start gap-4 mb-5">
        {imageSrc && !imgFailed ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-[5.5rem] h-[5.5rem] rounded-2xl object-cover border border-purple-100 flex-shrink-0 bg-purple-50/50"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-[5.5rem] h-[5.5rem] rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-3xl font-black text-purple-300 flex-shrink-0">
            {title[0]?.toUpperCase() || 'T'}
          </div>
        )}
        
        <div className="flex flex-col justify-center min-w-0 flex-1 pt-1">
          <h3 className="text-[1.1rem] font-bold text-gray-900 leading-tight mb-1.5 truncate">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-purple-600 mb-1.5 truncate">
            <AuctionCategoryIcon src={TechnologyIcon} className="w-3.5 h-3.5 object-contain" />
            Technology Auction
          </div>
          {resolveAuctionListerName(auction) && (
            <div className="text-[0.75rem] text-gray-500 truncate">
              Listed by {resolveAuctionListerName(auction)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {(() => {
          const description = software.what_it_does || software.whatItDoes || software.description || '';
          return description ? (
            <p className="text-[0.8rem] text-gray-500 line-clamp-2 mb-4 leading-relaxed" title={description}>
              {description}
            </p>
          ) : null;
        })()}

        <div className="mt-auto">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-purple-50/60 rounded-xl p-3.5 border border-purple-50">
              <div className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-bold mb-1">
                {auction.currentHighestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
              </div>
              <div className="font-display text-xl font-bold text-purple-700">
                ₹{Number(auction.currentHighestBid > 0 ? auction.currentHighestBid : auction.minBidPrice).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
              <div className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-bold mb-1">
                Total Bids
              </div>
              <div className="font-display text-xl font-bold text-gray-900">
                {auction.totalBids}
              </div>
            </div>
          </div>
          
          {auction.currentHighestBid > 0 && (
            <div className="mb-4">
              <AuctionCardNextBidLine highestBid={auction.currentHighestBid} />
            </div>
          )}
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4 shrink-0">
        <div className="flex flex-col">
          <div className="text-[0.65rem] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Ends In</div>
          <div className="flex items-center gap-1.5">
            <svg className={`w-4 h-4 ${isUrgent ? 'text-red-500' : 'text-purple-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className={`font-display font-bold text-[1.1rem] ${isUrgent ? 'text-red-500 animate-pulse' : 'text-purple-700'}`}>
              {timeLeft.split('').map((char, i) => {
                if (['D', 'H', 'M', 'S'].includes(char)) {
                  return <span key={i} className="text-gray-900">{char.toUpperCase()}</span>;
                }
                return char;
              })}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 py-2.5 text-[0.85rem] font-bold transition-colors shadow-sm"
        >
          Bid Now →
        </button>
      </div>
    </div>
  );
}

// ─── Creator Profile Auction Card ────────────────────────────────────────────
function CommunityAuctionCard({ auction, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const { timeLeft, isUrgent } = useCountdown(auction.endTime);
  const community  = auction.community || {};
  const isExtended = auction.status === 'EXTENDED';
  const profileImg = pickMediaUrl(community) || community.profileImageUrl || community.profilePicture;
  const skills     = auction.auctionSkills
    ? auction.auctionSkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <div className="card-glow-hover bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer relative h-[355px] max-h-[355px] overflow-hidden flex flex-col"
      onClick={onClick}>

      {/* Status pill */}
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold" style={{
        color: isExtended ? '#c8a96e' : '#6ec896',
        background: isExtended ? 'rgba(200,169,110,0.15)' : 'rgba(110,200,150,0.15)',
        border: `1px solid ${isExtended ? 'rgba(200,169,110,0.35)' : 'rgba(110,200,150,0.35)'}`,
      }}>
        {isExtended ? '⚡ EXTENDED' : '🟢 LIVE'}
      </div>

      {/* Profile info */}
      <div className="flex items-center gap-3 mb-3 pr-20 shrink-0">
        <div className="w-11 h-11 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {profileImg && !imgFailed ? (
            <img
              src={profileImg}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <AuctionCategoryIcon src={CreatorIcon} className="w-7 h-7 object-contain" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 m-0 whitespace-normal break-words leading-snug">
            {auction.auctionTitle || community.name || '—'}
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[0.72rem] text-teal-600 font-semibold inline-flex items-center gap-1">
              <AuctionCategoryIcon src={CreatorIcon} className="w-3.5 h-3.5 object-contain" />
              Profile Auction
            </span>
            {auction.workType && (
              <span className="text-[0.72rem] text-gray-500">· {auction.workType.replace(/_/g, ' ')}</span>
            )}
          </div>
          {resolveAuctionListerName(auction) && (
            <div className="text-[0.72rem] text-gray-500 mt-1 truncate">
              Listed by {resolveAuctionListerName(auction)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 justify-between">
        <div>
          <div className="flex flex-wrap gap-1 mb-3 min-h-[1.625rem]">
          {skills.length > 0 ? (
            <>
              {skills.map((s, i) => (
                <span key={i} className="venture-listing-card__badge venture-listing-card__badge--compact px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {s}
                </span>
              ))}
              {auction.auctionSkills?.split(',').length > 3 && (
                <span className="text-[0.68rem] text-gray-400 self-center">
                  +{auction.auctionSkills.split(',').length - 3} more
                </span>
              )}
            </>
          ) : null}
          </div>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 font-medium mb-1">
                {auction.currentHighestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
              </div>
              <div className={`font-display text-xl font-bold ${auction.currentHighestBid > 0 ? 'text-green-600' : 'text-amber-500'}`}>
                ₹{Number(auction.currentHighestBid > 0 ? auction.currentHighestBid : auction.minBidPrice).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 font-medium mb-1">Total Bids</div>
              <div className="font-display text-xl font-bold text-gray-900">{auction.totalBids}</div>
            </div>
          </div>

          <AuctionCardNextBidLine highestBid={auction.currentHighestBid} />
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-200 shrink-0">
        <div>
          <div className="text-xs text-gray-600 font-medium">Ends In</div>
          <div className={`font-display font-bold text-lg ${isUrgent ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
            {timeLeft}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={e => { e.stopPropagation(); onClick(); }}
            className="btn-glow btn-glow-sm">
            View →
          </button>
        </div>
      </div>
    </div>
  );
}
