import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Gavel, Search, ChevronDown, X, Home, Smartphone, Cpu, Code, Heart, Tag, Clock } from 'lucide-react';
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
import cobrotherViewMark from '../assets/Cobrother_Profile.png';
import { formatCountdown, parseAuctionDate, resolveAuctionEndTime } from '../utils/auctionDate';
import { resolveAuctionListerName } from '../utils/auctionLister';
import { useTranslation } from 'react-i18next';
import { normalizeDomainExtension, resolveAuctionDomainTitle } from '../utils/domainDisplay';
import { pickMediaUrl } from '../utils/mediaUrl';
import { normalizeCommunityAuction } from '../utils/homepageAuctions';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import CreatorPreviewModal from '../components/auctions/CreatorPreviewModal';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import ListingBackLink from '../components/common/ListingBackLink';
import '../styles/auctions-page.css';

const VIEW_IDS = new Set(['browse', 'yours', 'bids']);

const extractTrackedList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const paymentDueLabel = (auction) => {
  const dueRaw = auction?.winnerPaymentDueAt ?? auction?.winner_payment_due_at;
  if (!dueRaw) return null;
  const due = parseAuctionDate(dueRaw);
  if (!due) return null;
  const ms = due.getTime() - Date.now();
  if (ms <= 0) return 'Payment overdue';
  const days = Math.max(1, Math.ceil(ms / 86400000));
  if (days === 1) return 'Payment due today';
  return `Payment due in ${days} days`;
};

const resolveTrackingBadge = (auction, view) => {
  const status = String(auction?.status || '').toUpperCase();
  const approval = String(auction?.approvalStatus || auction?.approval_status || '').toUpperCase();
  const isLive = status === 'ACTIVE' || status === 'EXTENDED';
  const type = String(auction?.auctionType || '').toUpperCase();
  const hasWinner = Boolean(
    auction?.isWinner
    || auction?.currentWinnerId
    || auction?.current_winner_id
    || auction?.paymentPending,
  );
  const paymentDue = status === 'PAYMENT_PENDING' || (status === 'ENDED' && hasWinner);

  if (view === 'bids') {
    if (auction?.paymentPending || (auction?.isWinner && paymentDue)) {
      return {
        label: paymentDueLabel(auction) || 'Payment pending',
        className: 'auctions-track-badge--amber',
      };
    }
    if (auction?.isWinner && status === 'COMPLETED') {
      return { label: 'You won', className: 'auctions-track-badge--green' };
    }
    if (auction?.isLeading && isLive) {
      return { label: "You're leading", className: 'auctions-track-badge--green' };
    }
    if (isLive) {
      return { label: 'Outbid — still live', className: 'auctions-track-badge--orange' };
    }
    if (status === 'COMPLETED') return { label: 'Completed', className: 'auctions-track-badge--gray' };
    if (status === 'UNSOLD' || status === 'CLOSED' || status === 'CANCELLED') {
      return { label: status.replace(/_/g, ' '), className: 'auctions-track-badge--gray' };
    }
    return { label: status.replace(/_/g, ' ') || 'Ended', className: 'auctions-track-badge--gray' };
  }

  // Your Auctions (seller)
  if (type === 'TECHNOLOGY' && (approval === 'PENDING_APPROVAL' || approval === 'PENDING')) {
    return { label: 'Awaiting approval', className: 'auctions-track-badge--amber' };
  }
  if (status === 'DRAFT' || (type === 'CREATOR' && status === 'PAYMENT_PENDING' && !hasWinner)) {
    return { label: 'Pending activation', className: 'auctions-track-badge--amber' };
  }
  if (isLive) {
    return { label: status === 'EXTENDED' ? 'Live — extended' : 'Live', className: 'auctions-track-badge--green' };
  }
  if (paymentDue) {
    return { label: 'Waiting for winner payment', className: 'auctions-track-badge--amber' };
  }
  if (status === 'ENDED' && !hasWinner) {
    return { label: 'Awaiting winner decision', className: 'auctions-track-badge--amber' };
  }
  if (status === 'COMPLETED') return { label: 'Completed', className: 'auctions-track-badge--gray' };
  if (status === 'UNSOLD') return { label: 'Unsold', className: 'auctions-track-badge--gray' };
  if (status === 'CANCELLED' || status === 'CLOSED' || status === 'TAKEN_DOWN') {
    return { label: status.replace(/_/g, ' '), className: 'auctions-track-badge--gray' };
  }
  return { label: status.replace(/_/g, ' ') || 'Auction', className: 'auctions-track-badge--gray' };
};

const trackedAuctionHref = (auction) => {
  const type = String(auction?.auctionType || '').toUpperCase();
  if (type === 'TECHNOLOGY' || auction?.software || auction?.softwareId) {
    return `/technology/auction/${auction.id}`;
  }
  if (type === 'CREATOR' || auction?.community || auction?.communityId || auction?.community_id) {
    return `/creator-auction/${auction.id}`;
  }
  return `/auction/${auction.id}`;
};

const trackedAuctionTitle = (auction) => {
  if (auction?.domain || String(auction?.auctionType || '').toUpperCase() === 'DOMAIN') {
    return resolveAuctionDomainTitle(auction) || 'Domain auction';
  }
  if (auction?.software || auction?.name || String(auction?.auctionType || '').toUpperCase() === 'TECHNOLOGY') {
    return auction.auctionTitle || auction.name || auction.software?.name || 'Technology auction';
  }
  return auction.auctionTitle || auction.community?.name || 'Creator auction';
};

const trackedTypeMeta = (auction) => {
  const type = String(auction?.auctionType || '').toUpperCase();
  if (type === 'TECHNOLOGY' || auction?.software || auction?.softwareId) {
    return { label: 'Technology', icon: TechnologyIcon, tone: 'indigo' };
  }
  if (type === 'CREATOR' || auction?.community || auction?.communityId || auction?.community_id) {
    return { label: 'Creator', icon: CreatorIcon, tone: 'violet' };
  }
  return { label: 'Domain', icon: DomainsIcon, tone: 'blue' };
};

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
  const { formatPrice } = useCurrency();
  const hasNextBid = highestBid > 0;
  const nextBid = Math.ceil(highestBid * 1.05 / 100) * 100;
  return (
    <div
      className={`text-sm font-semibold mb-3 min-h-[1.375rem] leading-snug ${hasNextBid ? 'text-gray-700' : 'invisible select-none pointer-events-none'}`}
      aria-hidden={!hasNextBid}
    >
      {hasNextBid
        ? `Next bid: ≥ ${formatPrice(nextBid)}`
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
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(endTime).timeLeft);
  const [isUrgent, setIsUrgent] = useState(() => formatCountdown(endTime).isUrgent);

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative w-full min-w-0 max-w-full md:w-[170px] md:flex-none md:max-w-[170px]"
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="box-border flex w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-[11px] border border-gray-300 bg-white px-3.5 py-[0.68rem] text-left text-sm font-medium leading-tight text-gray-700 outline-none transition hover:border-gray-400 focus-visible:border-indigo-400 focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label || label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          aria-hidden
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 m-0 max-h-56 w-full min-w-0 max-w-full list-none overflow-y-auto overflow-x-hidden rounded-[11px] border border-gray-200 bg-white p-1 shadow-lg"
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full min-w-0 items-center rounded-lg px-3 py-2 text-left text-sm font-medium leading-tight transition ${
                    isActive
                      ? 'bg-sky-100 text-slate-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0 truncate">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [domainAuctions, setDomainAuctions]       = useState([]);
  const [communityAuctions, setCommunityAuctions] = useState([]);
  const [softwareAuctions, setSoftwareAuctions] = useState([]);
  const [myListed, setMyListed] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [section, setSection]   = useState('all'); // all | domains | community | technology
  const [filter, setFilter]     = useState('all'); // all | ending_soon | no_bids
  const [sortBy, setSortBy]     = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAuction, setPreviewAuction] = useState(null);
  const viewParam = searchParams.get('view');
  const view = VIEW_IDS.has(viewParam) ? viewParam : 'browse';

  useEffect(() => {
    const fromUrl = searchParams.get('section');
    if (fromUrl && SECTION_IDS.has(fromUrl)) {
      setSection(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (view !== 'browse') return undefined;
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
    return undefined;
  }, [view]);

  const loadTracking = useCallback(async (mode) => {
    if (!user) {
      setMyListed([]);
      setMyBids([]);
      return;
    }
    setTrackingLoading(true);
    try {
      if (mode === 'yours') {
        const [domains, software, creators] = await Promise.all([
          auctionAPI.getMyAuctions()
            .then(({ data }) => extractTrackedList(data).map((row) => ({
              ...normalizeAuction(row),
              auctionType: row.auctionType || 'DOMAIN',
            })))
            .catch(() => []),
          softwareAuctionAPI.getMyAuctions()
            .then(({ data }) => extractTrackedList(data).map((row) => ({
              ...normalizeSoftwareAuction(row),
              auctionType: row.auctionType || 'TECHNOLOGY',
              userHighestBid: row.userHighestBid,
              isLeading: row.isLeading,
              isWinner: row.isWinner,
              paymentPending: row.paymentPending,
              approvalStatus: row.approvalStatus,
            })))
            .catch(() => []),
          communityAuctionAPI.getMyAuctions()
            .then(({ data }) => extractTrackedList(data).map((row) => ({
              ...normalizeCommunityAuction(row),
              auctionType: row.auctionType || 'CREATOR',
            })).filter(Boolean))
            .catch(() => []),
        ]);
        setMyListed([...domains, ...software, ...creators]);
      } else if (mode === 'bids') {
        const [domains, software, creators] = await Promise.all([
          auctionAPI.getMyBids()
            .then(({ data }) => extractTrackedList(data).map((row) => ({
              ...normalizeAuction(row),
              auctionType: row.auctionType || 'DOMAIN',
              userHighestBid: row.userHighestBid,
              isLeading: row.isLeading,
              isWinner: row.isWinner,
              paymentPending: row.paymentPending,
            })))
            .catch(() => []),
          softwareAuctionAPI.getMyBids()
            .then(({ data }) => extractTrackedList(data).map((row) => ({
              ...normalizeSoftwareAuction(row),
              auctionType: row.auctionType || 'TECHNOLOGY',
              userHighestBid: row.userHighestBid,
              isLeading: row.isLeading,
              isWinner: row.isWinner,
              paymentPending: row.paymentPending,
            })))
            .catch(() => []),
          communityAuctionAPI.getMyBids()
            .then(({ data }) => extractTrackedList(data).map((row) => ({
              ...normalizeCommunityAuction(row),
              auctionType: row.auctionType || 'CREATOR',
              userHighestBid: row.userHighestBid,
              isLeading: row.isLeading,
              isWinner: row.isWinner,
              paymentPending: row.paymentPending,
            })).filter(Boolean))
            .catch(() => []),
        ]);
        setMyBids([...domains, ...software, ...creators]);
      }
    } finally {
      setTrackingLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (view === 'yours' || view === 'bids') {
      loadTracking(view);
    }
  }, [view, loadTracking]);

  const setView = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'browse') params.delete('view');
    else params.set('view', next);
    setSearchParams(params, { replace: true });
  };

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

  const categoryOptions = useMemo(() => {
    const source = view === 'yours' ? myListed : view === 'bids' ? myBids : null;
    const domainCount = source
      ? source.filter((a) => String(a.auctionType || '').toUpperCase() === 'DOMAIN' || a.domain).length
      : domainAuctions.length;
    const techCount = source
      ? source.filter((a) => String(a.auctionType || '').toUpperCase() === 'TECHNOLOGY' || a.software || a.softwareId).length
      : softwareAuctions.length;
    const creatorCount = source
      ? source.filter((a) => String(a.auctionType || '').toUpperCase() === 'CREATOR' || a.community || a.communityId).length
      : communityAuctions.length;
    return [
      { value: 'all', label: 'Category' },
      { value: 'domains', label: `Domains (${domainCount})` },
      { value: 'technology', label: `Technology (${techCount})` },
      { value: 'community', label: `Creators (${creatorCount})` },
    ];
  }, [view, myListed, myBids, domainAuctions.length, softwareAuctions.length, communityAuctions.length]);

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

  const trackedSource = view === 'yours' ? myListed : view === 'bids' ? myBids : [];
  const trackedFiltered = useMemo(() => {
    if (view === 'browse') return [];
    let list = trackedSource.filter((a) => matchesAuctionSearch(a, searchQuery));
    if (section === 'domains') {
      list = list.filter((a) => String(a.auctionType || '').toUpperCase() === 'DOMAIN' || a.domain);
    } else if (section === 'technology') {
      list = list.filter((a) => String(a.auctionType || '').toUpperCase() === 'TECHNOLOGY' || a.software || a.softwareId);
    } else if (section === 'community') {
      list = list.filter((a) => String(a.auctionType || '').toUpperCase() === 'CREATOR' || a.community || a.communityId);
    }
    return sortAuctionList(list, sortBy === 'default' ? 'ending_soon' : sortBy);
  }, [view, trackedSource, searchQuery, section, sortBy]);

  const clearAllFilters = () => {
    setSection('all');
    setFilter('all');
    setSortBy('default');
    setSearchQuery('');
    const params = new URLSearchParams();
    if (view !== 'browse') params.set('view', view);
    setSearchParams(params, { replace: true });
  };

  const handleCategoryChange = (value) => {
    setSection(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') params.delete('section');
    else params.set('section', value);
    setSearchParams(params, { replace: true });
  };

  const heroTitle = view === 'yours'
    ? 'Your Auctions'
    : view === 'bids'
      ? 'Your Bids'
      : 'Live Auctions';
  const heroSubtitle = view === 'yours'
    ? (user
      ? `${myListed.length} auction${myListed.length !== 1 ? 's' : ''} you listed`
      : 'Sign in to track auctions you listed')
    : view === 'bids'
      ? (user
        ? `${myBids.length} auction${myBids.length !== 1 ? 's' : ''} you bid on`
        : 'Sign in to track auctions you bid on')
      : (totalLive > 0
        ? `${totalLive} auction${totalLive !== 1 ? 's' : ''} live right now`
        : 'No live auctions at the moment');

  return (
    <AppLayout>
      <ListingBackLink />
      <div className="auctions-page">
        <div className="auctions-page-toolbar !overflow-visible">
          <div className="auctions-page-toolbar-top">
            <div className="auctions-page-hero-main min-w-0">
              <div className="auctions-page-hero-icon" aria-hidden>
                <Gavel className="w-[1.15rem] h-[1.15rem]" strokeWidth={2} />
              </div>
              <div className="auctions-page-hero-copy min-w-0">
                <div className="auctions-page-title-row">
                  <h1 className="font-display text-3xl font-bold text-gray-900">{heroTitle}</h1>
                  {view === 'browse' && totalLive > 0 && (
                    <span className="auctions-page-live-badge" aria-hidden>
                      <span className="auctions-page-live-dot" />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{heroSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="auctions-page-view-tabs" role="tablist" aria-label="Auction views">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'browse'}
              className={`auctions-page-view-tab ${view === 'browse' ? 'is-active' : ''}`}
              onClick={() => setView('browse')}
            >
              Browse
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'yours'}
              className={`auctions-page-view-tab ${view === 'yours' ? 'is-active' : ''}`}
              onClick={() => setView('yours')}
            >
              Your Auctions
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'bids'}
              className={`auctions-page-view-tab ${view === 'bids' ? 'is-active' : ''}`}
              onClick={() => setView('bids')}
            >
              Your Bids
            </button>
          </div>

          <div className="auctions-page-toolbar-divider" aria-hidden />

          <div className="auctions-page-controls flex w-full min-w-0 max-w-full flex-col items-stretch gap-2 overflow-visible sm:flex-row sm:flex-wrap sm:items-center md:gap-2.5">
            <div className="auctions-page-search relative w-full min-w-0 max-w-full sm:min-w-[180px] sm:flex-1">
              <Search className="auctions-page-search-icon w-4 h-4" strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search auctions"
                className="auctions-page-search-input box-border w-full max-w-full"
                aria-label="Search auctions"
              />
            </div>

            <AuctionFilterSelect
              label="Category"
              value={section}
              onChange={handleCategoryChange}
              options={categoryOptions}
            />

            {view === 'browse' && (
              <AuctionFilterSelect
                label="Status"
                value={filter}
                onChange={setFilter}
                options={statusOptions}
              />
            )}

            <AuctionFilterSelect
              label="Sort by"
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
            />

            {hasActiveFilters && (
              <button
                type="button"
                className="auctions-page-clear-filters w-full justify-center sm:w-auto"
                onClick={clearAllFilters}
              >
                <X size={14} strokeWidth={2.25} aria-hidden />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {view !== 'browse' ? (
          authLoading || trackingLoading ? (
            <PageContentSkeleton variant="cards" rows={4} />
          ) : !user ? (
            <div className="auctions-page-empty">
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Sign in to track</h3>
              <p className="text-gray-600 mb-6">
                {view === 'yours'
                  ? 'Your listed Domain, Technology, and Creator auctions appear here after you sign in.'
                  : 'Auctions you bid on across Domains, Technology, and Creators appear here after you sign in.'}
              </p>
              <button className="btn-glow btn-glow-sm" type="button" onClick={() => navigate('/login')}>
                Sign in →
              </button>
            </div>
          ) : trackedFiltered.length === 0 ? (
            <div className="auctions-page-empty">
              <div className="mb-4 flex justify-center">
                <img src={AuctionImg} alt="" className="w-12 sm:w-20 md:w-24 lg:w-24 h-auto" />
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                {view === 'yours' ? "You haven't listed an auction yet" : 'No bids yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {view === 'yours'
                  ? 'When you put a Domain, Technology, or Creator listing into auction, it shows up here with live status.'
                  : 'When you bid on any live auction, it shows up here so you can track leading / outbid / payment pending.'}
              </p>
              <button className="btn-glow btn-glow-sm" type="button" onClick={() => setView('browse')}>
                Browse live auctions →
              </button>
            </div>
          ) : (
            <div className="cb-mobile-card-grid grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {trackedFiltered.map((auction) => (
                <TrackedAuctionCard
                  key={`${auction.auctionType || 'x'}-${auction.id}`}
                  auction={auction}
                  view={view}
                  onClick={() => navigate(trackedAuctionHref(auction))}
                />
              ))}
            </div>
          )
        ) : !loading && totalShown > 0 && hasActiveFilters ? (
          <p className="auctions-page-results-note">
            Showing {totalShown} auction{totalShown !== 1 ? 's' : ''}
            {searchQuery.trim() ? ` matching “${searchQuery.trim()}”` : ''}
          </p>
        ) : null}

        {view === 'browse' && (loading ? (
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
                <div className="cb-mobile-card-grid grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
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
                <div className="cb-mobile-card-grid grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
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
                <div className="cb-mobile-card-grid grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
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
        ))}
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

function TrackedAuctionCard({ auction, view, onClick }) {
  const { timeLeft, isUrgent } = useCountdown(auction?.endTime || auction);
  const { formatPrice } = useCurrency();
  const badge = resolveTrackingBadge(auction, view);
  const typeMeta = trackedTypeMeta(auction);
  const title = trackedAuctionTitle(auction);
  const highestBid = toNum(auction.currentHighestBid, 0);
  const minBid = toNum(auction.minBidPrice, 0);
  const currentAmount = highestBid > 0 ? highestBid : minBid;
  const userHigh = toNum(auction.userHighestBid, 0);
  const totalBids = toNum(auction.totalBids, 0);
  const status = String(auction.status || '').toUpperCase();
  const isLive = status === 'ACTIVE' || status === 'EXTENDED';

  return (
    <div
      className="bg-white border border-[#BAE6FD] hover:border-[#38BDF8] rounded-2xl p-5 shadow-[0_8px_24px_rgba(56,189,248,0.15)] hover:shadow-[0_12px_28px_rgba(56,189,248,0.22)] transition-all duration-200 cursor-pointer relative min-h-[300px] overflow-hidden flex flex-col hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`auctions-track-type auctions-track-type--${typeMeta.tone}`}>
          <AuctionCategoryIcon src={typeMeta.icon} className="w-3.5 h-3.5 object-contain" />
          {typeMeta.label}
        </span>
        <span className={`auctions-track-badge ${badge.className}`}>{badge.label}</span>
      </div>

      <h3 className="text-base font-extrabold text-slate-900 m-0 mb-1 whitespace-normal break-words leading-snug tracking-tight">
        {title}
      </h3>
      {resolveAuctionListerName(auction) && (
        <p className="text-xs text-slate-500 m-0 mb-3 font-medium">Listed by {resolveAuctionListerName(auction)}</p>
      )}

      <div className="grid grid-cols-2 gap-3 my-auto">
        <div className="p-2.5 bg-white rounded-xl border border-[#BAE6FD]">
          <div className="text-xs text-slate-500 font-medium mb-1">
            {highestBid > 0 ? 'Highest Bid' : 'Starting Bid'}
          </div>
          <div className={`font-display text-lg font-bold ${highestBid > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {formatPrice(currentAmount)}
          </div>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-[#BAE6FD]">
          <div className="text-xs text-slate-500 font-medium mb-1">
            {isLive ? 'Ends In' : 'Status'}
          </div>
          <div className={`font-display font-bold text-lg ${isLive ? (isUrgent ? 'text-rose-500 animate-pulse' : 'text-slate-900') : 'text-slate-700'}`}>
            {isLive ? timeLeft : badge.label}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-3 pt-3 mt-3 border-t border-[#E2E8F0] shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 font-medium m-0">
            {view === 'bids' && userHigh > 0 ? `Your Bid: ${formatPrice(userHigh)}` : 'Live Marketplace Auction'}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="auctions-track-open-btn shrink-0 !bg-black !text-white hover:!bg-neutral-900 !rounded-full !px-4 !py-2 !text-xs !font-bold"
        >
          {view === 'bids' && auction.isWinner && (status === 'PAYMENT_PENDING' || status === 'ENDED')
            ? 'Pay now →'
            : 'Open →'}
        </button>
      </div>
    </div>
  );
}

// ─── Domain Auction Card ────────────────────────────────────────────────────────────
function DomainAuctionCard({ auction, onClick }) {
  const { timeLeft, isUrgent } = useCountdown(auction?.endTime || auction);
  const { formatPrice } = useCurrency();
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
      className="bg-[#f5faff] border border-[#BAE6FD] hover:border-[#38BDF8] rounded-3xl p-5 shadow-[0_8px_24px_rgba(56,189,248,0.06)] hover:shadow-[0_12px_28px_rgba(56,189,248,0.12)] transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Top Badge Row */}
      <div className="flex items-center gap-1.5 mb-3 pr-14">
        {/* Extension Badge */}
        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 uppercase">
          {extMeta?.label || (domainTitle?.includes('.') ? domainTitle.slice(domainTitle.lastIndexOf('.')) : '.com')}
        </span>

        {/* Verified Badge */}
        {domain.verified && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Status Pill (Top-Right) */}
      <div className="absolute top-5 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100/60 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {isExtended ? 'EXTENDED' : 'LIVE'}
      </div>

      {/* Domain info */}
      <div className="mb-4">
        <h3 className="text-xl font-extrabold text-slate-900 m-0 tracking-tight leading-snug">
          {domainTitle || 'Unnamed domain'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 m-0">
          Listed by {resolveAuctionListerName(auction) || 'HubRegistrar INDIA'}
        </p>
      </div>

      {/* Three Info Columns */}
      <div className="grid grid-cols-3 gap-2.5 mb-5 border-t border-slate-100 pt-3">
        {/* Starting Bid */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Starting Bid
          </span>
          <span className="font-display text-base font-extrabold text-orange-500 mt-1.5 truncate">
            {formatPrice(minBid || currentAmount)}
          </span>
        </div>

        {/* Activity */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Activity
          </span>
          <div className="inline-flex items-center gap-1 text-slate-700 font-bold text-xs mt-2">
            <Gavel size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{totalBids} Bids</span>
          </div>
        </div>

        {/* Ends In */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Ends In
          </span>
          <div className="flex items-start gap-1 mt-1.5">
            <Clock size={13} className="text-orange-500 shrink-0 mt-0.5" />
            <div className="flex flex-col font-display text-xs font-extrabold text-slate-800 leading-tight">
              {timeLeft.split(' ').map((part, i) => (
                <span key={i}>{part}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Place Bid Button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="w-full bg-[#312ecb] hover:bg-[#2522ad] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm mt-auto"
      >
        <span>Place Bid</span>
        <span className="text-sm font-semibold">→</span>
      </button>

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
  const { timeLeft, isUrgent } = useCountdown(auction?.endTime || auction);
  const { formatPrice } = useCurrency();
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
              <div className="font-display text-xl font-bold text-purple-500">
                {formatPrice(auction.currentHighestBid > 0 ? auction.currentHighestBid : auction.minBidPrice)}
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
              {timeLeft}
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
  const { timeLeft, isUrgent } = useCountdown(auction?.endTime || auction);
  const { formatPrice } = useCurrency();
  const community  = auction.community || {};
  const isExtended = auction.status === 'EXTENDED';
  const profileImg = pickMediaUrl(community) || community.profileImageUrl || community.profilePicture;
  const skills     = auction.auctionSkills
    ? auction.auctionSkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <div className="card-glow-hover bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer relative h-auto sm:h-[355px] sm:max-h-[355px] min-h-[355px] overflow-hidden flex flex-col"
      onClick={onClick}>

      {/* Status pill */}
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold" style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
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
                {formatPrice(auction.currentHighestBid > 0 ? auction.currentHighestBid : auction.minBidPrice)}
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
