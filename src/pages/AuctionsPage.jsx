import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  auctionAPI,
  ventureAPI,
  ventureAuctionAPI,
  communityAuctionAPI,
  softwareAuctionAPI,
} from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import AuctionImg from '../assets/Auction.png';
import { asArray } from '../utils/asArray';
import { formatCountdown, parseAuctionDate, resolveAuctionEndTime } from '../utils/auctionDate';
import { useTranslation } from 'react-i18next';
import { normalizeDomainExtension, resolveAuctionDomainTitle } from '../utils/domainDisplay';
import { pickMediaUrl } from '../utils/mediaUrl';
import PageContentSkeleton from '../components/common/PageContentSkeleton';

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

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

const normalizeListedVentureAuction = (ventureRaw) => {
  if (!ventureRaw || typeof ventureRaw !== 'object') return null;
  if (ventureRaw.status === false || ventureRaw.takenDown === true || ventureRaw.taken_down === true) {
    return null;
  }
  const auction = ventureRaw.auction;
  if (!auction || typeof auction !== 'object' || !auction.id) return null;

  const brand = ventureRaw.brandDetails || {};
  return {
    id: auction.id,
    status: auction.status ?? 'DRAFT',
    approvalStatus: auction.approvalStatus ?? auction.approval_status ?? null,
    minBidPrice: toNum(auction.minBidPrice ?? auction.min_bid_price, 0),
    currentHighestBid: toNum(auction.currentHighestBid ?? auction.current_highest_bid, 0),
    totalBids: toNum(auction.totalBids ?? auction.total_bids, 0),
    startTime: auction.startTime ?? auction.start_time ?? null,
    endTime: resolveAuctionEndTime(
      auction,
      ventureRaw.auctionDuration ?? ventureRaw.auction_duration,
    ),
    duration: auction.duration ?? ventureRaw.auctionDuration ?? ventureRaw.auction_duration ?? null,
    venture: {
      id: ventureRaw.id,
      stage: ventureRaw.stage,
      verified: Boolean(ventureRaw.verified),
      gstinVerified: Boolean(ventureRaw.gstinVerified ?? ventureRaw.gstin_verified),
      brandDetails: {
        brandName: brand.brandName ?? brand.brand_name ?? '',
        industry: brand.industry ?? null,
        ventureImageUrl: pickMediaUrl(brand),
        logoUrl: pickMediaUrl(brand),
      },
      listedBy: ventureRaw.listedBy ?? null,
    },
  };
};

const isVisibleVentureAuction = (auctionRaw) => {
  if (!auctionRaw || !auctionRaw.id) return false;
  const status = String(auctionRaw.status || '').toUpperCase();
  return ['ACTIVE', 'EXTENDED', 'DRAFT'].includes(status);
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

const SECTION_IDS = new Set(['all', 'ventures', 'domains', 'community', 'technology']);

export default function AuctionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [domainAuctions, setDomainAuctions]       = useState([]);
  const [ventureAuctions, setVentureAuctions]     = useState([]); // active + listed
  const [communityAuctions, setCommunityAuctions] = useState([]);
  const [softwareAuctions, setSoftwareAuctions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [section, setSection]   = useState('all'); // all | ventures | domains | community | technology
  const [filter, setFilter]     = useState('all'); // all | ending_soon | no_bids

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
      ventureAuctionAPI.getActive().then(({ data }) => asItems(data)).catch(() => []),
      ventureAPI.getAll()
        .then(({ data }) => asArray(data)
          .map(normalizeListedVentureAuction)
          .filter(Boolean))
        .catch(() => []),
      ventureAPI.getMyVentures()
        .then(({ data }) => asArray(data)
          .map(normalizeListedVentureAuction)
          .filter(Boolean))
        .catch(() => []),
      communityAuctionAPI.getActive().then(({ data }) => asItems(data)).catch(() => []),
      softwareAuctionAPI.getActive()
        .then(({ data }) => extractActiveList(data).map(normalizeSoftwareAuction))
        .catch(() => []),
    ]).then(([domains, activeVentures, allListedVentures, myListedVentures, community, software]) => {
      const mergedVentures = new Map();
      activeVentures.forEach((a) => mergedVentures.set(String(a.id), a));
      allListedVentures.forEach((a) => {
        if (!mergedVentures.has(String(a.id))) mergedVentures.set(String(a.id), a);
      });
      myListedVentures.forEach((a) => {
        if (!mergedVentures.has(String(a.id))) mergedVentures.set(String(a.id), a);
      });
      setDomainAuctions(domains);
      setVentureAuctions(Array.from(mergedVentures.values()).filter(isVisibleVentureAuction));
      setCommunityAuctions(community);
      setSoftwareAuctions(software);
    }).finally(() => setLoading(false));
  }, []);

  const applyFilter = (list) => list.filter(a => {
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

  const shownDomains    = (section === 'ventures' || section === 'community' || section === 'technology') ? [] : applyFilter(domainAuctions);
  const shownVentures   = (section === 'domains' || section === 'community' || section === 'technology') ? [] : applyFilter(ventureAuctions);
  const shownCommunity  = (section === 'ventures' || section === 'domains' || section === 'technology') ? [] : applyFilter(communityAuctions);
  const shownSoftware   = (section === 'ventures' || section === 'domains' || section === 'community') ? [] : applyFilter(softwareAuctions);
  const totalLive       = domainAuctions.length + ventureAuctions.length + communityAuctions.length + softwareAuctions.length;

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">Live Auctions</h1>
            <p className="text-gray-600 mt-1">
              {totalLive > 0
                ? `${totalLive} auction${totalLive !== 1 ? 's' : ''} live right now`
                : 'No live auctions at the moment'}
            </p>
          </div>
        </div>

        {/* ── Section tabs ── */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { id: 'all',        label: `All (${totalLive})` },
            { id: 'ventures',   label: `🔨 Ventures (${ventureAuctions.length})` },
            { id: 'domains',    label: `◇ Domains (${domainAuctions.length})` },
            { id: 'technology', label: `💻 Technology (${softwareAuctions.length})` },
            { id: 'community',  label: `👤 Creators (${communityAuctions.length})` },
          ].map(t => (
            <button key={t.id}
              className={`px-5 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 ${section === t.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'}`}
              onClick={() => {
                setSection(t.id);
                navigate(t.id === 'all' ? '/auctions' : `/auctions?section=${t.id}`, { replace: true });
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Sub-filter tabs ── */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all',          label: 'All' },
            { id: 'ending_soon',  label: '⚡ Ending Soon' },
            { id: 'no_bids',      label: '🆕 No Bids Yet' },
          ].map(t => (
            <button key={t.id}
              className={`px-5 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 ${filter === t.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'}`}
              onClick={() => setFilter(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <PageContentSkeleton variant="cards" rows={6} />
        ) : (shownDomains.length === 0 && shownVentures.length === 0 && shownCommunity.length === 0 && shownSoftware.length === 0) ? (
          <div className="text-center py-20">
            <div className="mb-4 flex justify-center">
              <img src={AuctionImg} alt="Auction" className="w-12 sm:w-20 md:w-24 lg:w-24 h-auto" />
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {section === 'technology'
                ? 'No live technology auctions'
                : 'No auctions match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {section === 'technology'
                ? 'Approved technology listings appear here once their auction is active. Check Technology after admin verification.'
                : 'Check back soon — new auctions go live regularly.'}
            </p>
            {(section !== 'all' || filter !== 'all') && (
              <button className="btn-glow btn-glow-sm" onClick={() => { setSection('all'); setFilter('all'); }}>
                View All Auctions
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Venture Auctions section ── */}
            {shownVentures.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-purple-600 m-0">🔨 Venture Auctions</h2>
                  <span className="text-xs text-gray-500 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                    {shownVentures.length} live
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shownVentures.map(auction => (
                    <VentureAuctionCard
                      key={auction.id}
                      auction={auction}
                      onClick={() => navigate(`/venture-auction/${auction.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Domain Auctions section ── */}
            {shownDomains.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-blue-600 m-0">◇ Domain Auctions</h2>
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
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-indigo-600 m-0">💻 Technology Auctions</h2>
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
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-teal-600 m-0">👤 Creator Profiles</h2>
                  <span className="text-xs text-gray-500 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                    {shownCommunity.length} live
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shownCommunity.map(auction => (
                    <CommunityAuctionCard
                      key={auction.id}
                      auction={auction}
                      onClick={() => navigate(`/creator-auction/${auction.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Venture Auction Card ────────────────────────────────────────────────────────────
function VentureAuctionCard({ auction, onClick }) {
  const { timeLeft, isUrgent } = useCountdown(auction.endTime);
  const venture  = auction.venture || {};
  const brand    = venture.brandDetails || {};
  const brandImage = pickMediaUrl(brand);
  const isExtended = auction.status === 'EXTENDED';
  const isDraft = auction.status === 'DRAFT';
  const isGstinVerified = Boolean(venture.verified || venture.gstinVerified);

  return (
    <div className="card-glow-hover bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer relative" onClick={onClick}>
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold" style={{
        color: isDraft ? '#6366f1' : (isExtended ? '#c8a96e' : '#6ec896'),
        background: isDraft ? 'rgba(99,102,241,0.14)' : (isExtended ? 'rgba(200,169,110,0.15)' : 'rgba(110,200,150,0.15)'),
        border: `1px solid ${isDraft ? 'rgba(99,102,241,0.35)' : (isExtended ? 'rgba(200,169,110,0.35)' : 'rgba(110,200,150,0.35)')}`,
      }}>
        {isDraft ? '📝 DRAFT' : (isExtended ? '⚡ EXTENDED' : '🟢 LIVE')}
      </div>

      <div className="flex items-center gap-3 mb-4 pr-20">
        {brandImage ? (
          <img
            src={brandImage}
            alt={brand.brandName || 'Venture'}
            className="w-11 h-11 rounded-[10px] object-cover border border-purple-200 flex-shrink-0"
          />
        ) : (
        <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-lg font-bold text-purple-600 bg-purple-100 border border-purple-200">
          {brand.brandName?.[0] || '?'}
        </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 m-0 truncate">{brand.brandName || '—'}</h3>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-purple-600 font-semibold">🔨 Equity Auction</span>
            {brand.industry && <span className="text-xs text-gray-500">· {brand.industry.replace(/_/g, ' ')}</span>}
          </div>
        </div>
      </div>

      {isGstinVerified && (
        <div className="mb-2">
          <span className="text-xs font-bold text-green-600 bg-green-100 border border-green-300 px-2 py-0.5 rounded">
            ✓ GSTIN Verified
          </span>
        </div>
      )}
      {isDraft && !isGstinVerified && (
        <div className="mb-2">
          <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
            GSTIN verification pending
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">
            {auction.currentHighestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
          </div>
          <div className={`font-display text-xl font-bold ${auction.currentHighestBid > 0 ? 'text-green-600' : 'text-amber-500'}`}>
            ₹{Number(auction.currentHighestBid > 0 ? auction.currentHighestBid : auction.minBidPrice).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">Total Bids</div>
          <div className="font-display text-xl font-bold text-gray-900">{auction.totalBids}</div>
        </div>
      </div>

      {auction.currentHighestBid > 0 && (
        <div className="text-sm text-gray-700 mb-3 font-semibold">
          Next bid: ≥ ₹{Number(auction.currentHighestBid * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      )}

      <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold">
            {isDraft ? 'Status' : 'Ends in'}
          </div>
          <div className={`font-display font-bold text-lg ${isDraft ? 'text-indigo-600' : (isUrgent ? 'text-red-500 animate-pulse' : 'text-amber-500')}`}>
            {isDraft ? 'Awaiting Start' : timeLeft}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onClick(); }}
          className="btn-glow btn-glow-sm">
          {isDraft ? 'View →' : 'Bid Now →'}
        </button>
      </div>
    </div>
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
      className="card-glow-hover bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer relative"
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
          <h3 className="text-base font-bold text-gray-900 m-0 truncate">
            {domainTitle || 'Unnamed domain'}
          </h3>
          <span className="text-xs text-purple-600 font-semibold">
            🔨 Auction
          </span>
        </div>
      </div>

      {/* Verified badge */}
      {domain.verified && (
        <div className="mb-2">
          <span className="text-xs font-bold text-green-600 bg-green-100 border border-green-300 px-2 py-0.5 rounded">
            ✓ Verified
          </span>
        </div>
      )}

      {/* Bid stats */}
      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">
            {highestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
          </div>
          <div className={`font-display text-xl font-bold ${highestBid > 0 ? 'text-green-600' : 'text-amber-500'}`}>
            ₹{currentAmount.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">
            Total Bids
          </div>
          <div className="font-display text-xl font-bold text-gray-900">
            {totalBids}
          </div>
        </div>
      </div>

      {/* Next bid minimum */}
      {highestBid > 0 && (
        <div className="text-sm text-gray-700 mb-3 font-semibold">
          Next bid: ≥ ₹{Number(highestBid * 1.05).toLocaleString('en-IN',
            { maximumFractionDigits: 0 })}
        </div>
      )}

      {/* Countdown */}
      <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold">
            Ends in
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
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm pointer-events-none">
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

  return (
    <div
      className="card-glow-hover bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer relative"
      onClick={onClick}
    >
      <div
        className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold"
        style={{
          color: isExtended ? '#c8a96e' : '#6ec896',
          background: isExtended ? 'rgba(200,169,110,0.15)' : 'rgba(110,200,150,0.15)',
          border: `1px solid ${isExtended ? 'rgba(200,169,110,0.35)' : 'rgba(110,200,150,0.35)'}`,
        }}
      >
        {isExtended ? '⚡ EXTENDED' : '🟢 LIVE'}
      </div>

      <div className="flex items-center gap-3 mb-3 pr-20">
        {imageSrc && !imgFailed ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-11 h-11 rounded-[10px] object-cover border-2 border-indigo-200 flex-shrink-0"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-11 h-11 rounded-[10px] bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-lg font-bold text-indigo-600 flex-shrink-0">
            {title[0]?.toUpperCase() || '💻'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 m-0 truncate">{title}</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-indigo-600 font-semibold">💻 Technology Auction</span>
            {category && (
              <span className="text-xs text-gray-500">
                · {String(category).replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">
            {auction.currentHighestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
          </div>
          <div className={`font-display text-xl font-bold ${auction.currentHighestBid > 0 ? 'text-green-600' : 'text-amber-500'}`}>
            ₹{Number(auction.currentHighestBid > 0 ? auction.currentHighestBid : auction.minBidPrice).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">Total Bids</div>
          <div className="font-display text-xl font-bold text-gray-900">{auction.totalBids}</div>
        </div>
      </div>

      {auction.currentHighestBid > 0 && (
        <div className="text-sm text-gray-700 mb-3 font-semibold">
          Next bid: ≥ ₹{Number(auction.currentHighestBid * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      )}

      <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Ends in</div>
          <div className={`font-display font-bold text-lg ${isUrgent ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
            {timeLeft}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="btn-glow btn-glow-sm"
        >
          Bid Now →
        </button>
      </div>
    </div>
  );
}

// ─── Creator Profile Auction Card ────────────────────────────────────────────
function CommunityAuctionCard({ auction, onClick }) {
  const { timeLeft, isUrgent } = useCountdown(auction.endTime);
  const community  = auction.community || {};
  const isExtended = auction.status === 'EXTENDED';
  const skills     = auction.auctionSkills
    ? auction.auctionSkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <div className="card-glow-hover bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer relative"
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
      <div className="flex items-center gap-3 mb-3 pr-20">
        {community.imageUrl ? (
          <img src={community.imageUrl} alt={community.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-teal-200 flex-shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-teal-100 border-2 border-teal-200 flex items-center justify-center text-lg font-bold text-teal-600 flex-shrink-0">
            {community.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 m-0 truncate">
            {auction.auctionTitle || community.name || '—'}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-teal-600 font-semibold">👤 Profile Auction</span>
            {auction.workType && (
              <span className="text-xs text-gray-500">· {auction.workType.replace(/_/g, ' ')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skills.map((s, i) => (
            <span key={i} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 border border-gray-200 text-gray-600">
              {s}
            </span>
          ))}
          {auction.auctionSkills?.split(',').length > 3 && (
            <span className="text-xs text-gray-400 self-center">
              +{auction.auctionSkills.split(',').length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Bid stats */}
      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">
            {auction.currentHighestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
          </div>
          <div className={`font-display text-xl font-bold ${auction.currentHighestBid > 0 ? 'text-green-600' : 'text-amber-500'}`}>
            ₹{Number(auction.currentHighestBid > 0 ? auction.currentHighestBid : auction.minBidPrice).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-700 uppercase tracking-wider mb-1 font-bold">Total Bids</div>
          <div className="font-display text-xl font-bold text-gray-900">{auction.totalBids}</div>
        </div>
      </div>

      {auction.currentHighestBid > 0 && (
        <div className="text-sm text-gray-700 mb-3 font-semibold">
          Next bid: ≥ ₹{Number(auction.currentHighestBid * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Ends in</div>
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