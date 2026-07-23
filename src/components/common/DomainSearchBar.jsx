import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search, Loader2, ChevronRight } from 'lucide-react';
import { domainAPI } from '../../api/services';
import { HOME_RESET_EVENT } from '../../utils/homeReset';
import { IS_IPHONE } from '../../utils/deviceDetection';
import { extractDomainList, normalizeDomainRecord } from '../../utils/domainApiAdapter';
import { filterPublicMarketplaceListings, isPublicMarketplaceListing } from '../../utils/listingVisibility';
import useAIDomains from '../../hooks/useAIDomains';
import { useCurrency } from '../../context/CurrencyContext';
import { fetchAvailableTldsPage, fetchAvailableTldsChunk, DOMAIN_SEARCH_CHUNK_SIZE } from '../../utils/availableTlds';
import { DomainCardGrid } from '../domain/DomainCard';
import RegistryPremiumSegment from '../domain/RegistryPremiumSegment';
import RegistryPremiumLoader from '../domain/RegistryPremiumLoader';
import { isRegistryPremium, REGISTRY_PREMIUM_SEGMENT } from '../../utils/registryPremium';
import {
  getCachedPremiumItems,
  premiumCacheKey,
  setCachedPremiumItems,
} from '../../utils/registryPremiumCache';
import AIDomainGrid from '../ai-domains/AIDomainGrid';
import AIDomainLoader from '../ai-domains/AIDomainLoader';
import RegistrarDomainLoader from './RegistrarDomainLoader';
import DomainExtensionsLoader from './DomainExtensionsLoader';
import {
  heroSearchStackEnter,
  heroSubmitHover,
  heroSubmitTap,
  heroTabIdleHover,
  heroTabSpring,
  HOME_EASE_OUT,
} from '../home/motion/homeMotion';

const TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];
const PREMIUM_LOADING_MESSAGES = 3;
const SEARCH_MODE_IDS = ['new', 'ai', 'premium', 'auction'];
const SEARCH_MODE_CONFIG = {
  ai: { labelKey: 'searchTabAi', placeholderKey: 'searchPlaceholderAi' },
  new: { labelKey: 'searchTabNew', placeholderKey: 'searchPlaceholderNew' },
  premium: { labelKey: 'searchTabPremium', placeholderKey: 'searchPlaceholderPremium' },
  auction: { labelKey: 'searchTabAuction', placeholderKey: 'searchPlaceholderAuction' },
};

// Easily editable initial TLD prices for the marquee strip shown under 'Domain Names' tab
export const INITIAL_TLD_PRICES = [
  { tld: '.com', price: '1,049.53' },
  { tld: '.in', price: '500' },
  { tld: '.net', price: '1,190.01' },
  { tld: '.org', price: '753' },
  { tld: '.co', price: '1,505' },
  { tld: '.io', price: '5,017' },
  { tld: '.ai', price: '8,027' },
];

function useMinWidthLg() {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isLg;
}

function TldPriceMarquee() {
  // Double items — enough for seamless wrap without excessive DOM
  const items = useMemo(
    () => [
      ...INITIAL_TLD_PRICES,
      ...INITIAL_TLD_PRICES,
    ],
    []
  );

  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);

  useEffect(() => {
    const onVisibility = () => setIsPageHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Single rAF loop; pause when tab hidden, hovered, or dragging.
  // Never runs on iPhone — a permanent rAF loop mutating scrollLeft keeps the
  // compositor busy for the page's whole lifetime, eating into the WebKit
  // memory budget that the rest of the homepage needs. Users swipe instead.
  useEffect(() => {
    if (IS_IPHONE || isPaused || isPageHidden) return undefined;

    let animationFrameId;
    const scrollStep = () => {
      const el = scrollRef.current;
      if (el && !isDragging.current) {
        el.scrollLeft += 0.65;
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, isPageHidden]);

  // Click & drag handlers for mouse dragging
  const handleMouseDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftPos.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.6;
    el.scrollLeft = scrollLeftPos.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  return (
    <div
      className="tld-price-marquee-mask relative w-full overflow-hidden py-2 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        handleMouseUpOrLeave();
      }}
    >
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className="flex items-center gap-4 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
      >
        {items.map((item, index) => (
          <div
            key={`${item.tld}-${index}`}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-purple-50/95 border border-purple-200/90 shadow-sm hover:border-purple-400 hover:bg-purple-100/90 hover:shadow-md transition-all duration-200 shrink-0 select-none"
          >
            <span className="font-black text-purple-950 text-[16px] tracking-tight">{item.tld}</span>
            <span className="text-[15px] font-extrabold text-purple-700">
              ₹{item.price}
              <span className="text-[12px] font-semibold text-purple-500 ml-0.5">/yr</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function toSafeText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return `${value}`;
  } catch {
    return '';
  }
}

function toSafeLower(value) {
  const text = toSafeText(value);
  if (typeof text === 'string') return text.toLowerCase();
  return '';
}

function BrandSearchIcon() {
  return (
    <Search
      className="domain-search-icon h-7 w-7 shrink-0 text-slate-900 transition-colors duration-200"
      strokeWidth={2.25}
      aria-hidden="true"
    />
  );
}

function BrandSearchSubmitButton({ label }) {
  const reduceMotion = useReducedMotion();
  const ButtonTag = reduceMotion ? 'button' : motion.button;
  const motionProps = reduceMotion
    ? {}
    : {
        whileHover: heroSubmitHover,
        whileTap: heroSubmitTap,
      };

  return (
    <ButtonTag
      type="submit"
      aria-label={label}
      className="domain-search-submit brand-search-submit grid h-11 w-11 shrink-0 place-items-center rounded-full border text-white transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2"
      {...motionProps}
    >
      {reduceMotion ? (
        <ArrowRight className="h-5 w-5 text-white" strokeWidth={2.4} />
      ) : (
        <motion.span
          className="grid place-items-center"
          whileHover={{ x: 2 }}
          transition={{ duration: 0.2, ease: HOME_EASE_OUT }}
        >
          <ArrowRight className="h-5 w-5 text-white" strokeWidth={2.4} />
        </motion.span>
      )}
    </ButtonTag>
  );
}

function HeroSearchStack({ animateHero, className = '', children }) {
  const reduceMotion = useReducedMotion();

  if (!animateHero || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={heroSearchStackEnter}
    >
      {children}
    </motion.div>
  );
}

function BrandSearchTabs({
  searchMode,
  onTabChange,
  mobile = false,
  layoutId = 'brand-search-active-pill',
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const useMotionPill = !reduceMotion;

  const tabButtons = SEARCH_MODE_IDS.map((tabId) => {
    const isActive = searchMode === tabId;
    const buttonClassName = mobile
      ? `relative min-h-11 flex-1 basis-[calc(50%-0.25rem)] sm:min-h-12 sm:basis-[calc(50%-0.375rem)] rounded-full px-2.5 py-2 text-center text-[11.5px] sm:text-sm font-medium leading-snug md:min-h-9 md:flex-none md:basis-auto md:w-auto md:whitespace-nowrap md:px-4 md:font-semibold md:leading-none ${
          isActive
            ? useMotionPill
              ? 'brand-search-tab-active brand-search-tab--motion'
              : 'brand-search-tab-active'
            : 'brand-search-tab-idle'
        }`
      : `relative min-h-9 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-semibold leading-none ${
          isActive
            ? useMotionPill
              ? 'brand-search-tab-active brand-search-tab--motion'
              : 'brand-search-tab-active'
            : 'brand-search-tab-idle'
        }`;

    const TabButtonTag = reduceMotion || isActive ? 'button' : motion.button;
    const idleMotionProps = !reduceMotion && !isActive
      ? { whileHover: heroTabIdleHover, whileTap: { scale: 0.98 } }
      : {};

    return (
      <TabButtonTag
        key={tabId}
        type="button"
        onClick={() => onTabChange(tabId)}
        className={buttonClassName}
        {...idleMotionProps}
      >
        {useMotionPill && isActive ? (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-full bg-black shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
            transition={heroTabSpring}
            aria-hidden="true"
          />
        ) : null}
        <span className={`relative z-10 ${isActive ? 'text-white' : ''}`}>
          {t(SEARCH_MODE_CONFIG[tabId].labelKey)}
        </span>
      </TabButtonTag>
    );
  });

  const tabsMarkup = (
    <LayoutGroup id={layoutId}>
      <div
        className={
          mobile
            ? 'brand-search-tabs brand-search-tabs-mobile flex w-full flex-wrap items-stretch justify-center gap-2 sm:gap-2.5 md:inline-flex md:w-auto md:flex-nowrap md:items-center md:gap-1 md:rounded-full md:border md:bg-white/95 md:p-1'
            : 'brand-search-tabs inline-flex items-center gap-1 rounded-full border bg-white/95 p-1'
        }
      >
        {tabButtons}
      </div>
    </LayoutGroup>
  );

  return tabsMarkup;
}

function normalizeSearchText(value) {
  return toSafeLower(value).replace(/[^a-z0-9]/g, '');
}

function buildSearchKey(raw) {
  return toSafeLower(raw).trim();
}

function damerauLevenshteinDistance(a, b) {
  const source = normalizeSearchText(a);
  const target = normalizeSearchText(b);
  const sourceLen = source.length;
  const targetLen = target.length;
  if (!sourceLen) return targetLen;
  if (!targetLen) return sourceLen;

  const dist = Array.from({ length: sourceLen + 1 }, () => Array(targetLen + 1).fill(0));
  for (let i = 0; i <= sourceLen; i += 1) dist[i][0] = i;
  for (let j = 0; j <= targetLen; j += 1) dist[0][j] = j;

  for (let i = 1; i <= sourceLen; i += 1) {
    for (let j = 1; j <= targetLen; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );

      if (
        i > 1
        && j > 1
        && source[i - 1] === target[j - 2]
        && source[i - 2] === target[j - 1]
      ) {
        dist[i][j] = Math.min(dist[i][j], dist[i - 2][j - 2] + 1);
      }
    }
  }

  return dist[sourceLen][targetLen];
}

export default function DomainSearchBar({ className = '', embedded = false }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const animateHero = embedded && !reduceMotion;
  const isDesktopLayout = useMinWidthLg();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState('new');
  const [auctionResults, setAuctionResults] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [premiumDomains, setPremiumDomains] = useState([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [tldPage, setTldPage] = useState(1);
  const [tldHasMore, setTldHasMore] = useState(false);
  const [tldLoadingMore, setTldLoadingMore] = useState(false);
  const [tldLoading, setTldLoading] = useState(false);
  /** Real backend chunk progress for remaining TLDs (1→100). */
  const [tldProgress, setTldProgress] = useState(0);
  const [tldSkeletonCount, setTldSkeletonCount] = useState(0);
  const [registrySegment, setRegistrySegment] = useState(REGISTRY_PREMIUM_SEGMENT.STANDARD);
  const [registryPremiumItems, setRegistryPremiumItems] = useState([]);
  const [registryPremiumLoading, setRegistryPremiumLoading] = useState(false);
  const [registryPremiumMsgIndex, setRegistryPremiumMsgIndex] = useState(0);
  const [resultsAnimKey, setResultsAnimKey] = useState(0);
  const registryPremiumAbortRef = useRef(null);
  const debounceRef           = useRef(null);
  const newSearchCacheRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const safeQuery = toSafeText(query);
  const normalizedQuery = toSafeLower(query).trim();
  const hasSearchQuery = normalizedQuery.length > 0;
  const placeholder = t(
    SEARCH_MODE_CONFIG[searchMode]?.placeholderKey || SEARCH_MODE_CONFIG.new.placeholderKey,
  );
  const {
    results: aiDomains,
    loading: aiLoading,
    stage: aiStage,
    progress: aiProgress,
    error: aiError,
    generate: generateAiDomains,
    reset: resetAiDomains,
  } = useAIDomains();

  const clearAllSearchResults = useCallback(() => {
    requestIdRef.current += 1;
    clearTimeout(debounceRef.current);
    if (registryPremiumAbortRef.current) {
      registryPremiumAbortRef.current.abort();
      registryPremiumAbortRef.current = null;
    }
    resetAiDomains();
    setResults([]);
    setPremiumDomains([]);
    setAuctionResults([]);
    setRegistryPremiumItems([]);
    setRegistryPremiumLoading(false);
    setRegistrySegment(REGISTRY_PREMIUM_SEGMENT.STANDARD);
    setLoading(false);
    setTldLoading(false);
    setTldProgress(0);
    setTldSkeletonCount(0);
    setPremiumLoading(false);
    setAuctionsLoading(false);
  }, [resetAiDomains]);

  const resetSearchBar = useCallback(() => {
    clearAllSearchResults();
    setQuery('');
    setSearchMode('ai');
    newSearchCacheRef.current.clear();
  }, [clearAllSearchResults]);

  useEffect(() => {
    const onHomeReset = () => resetSearchBar();
    window.addEventListener(HOME_RESET_EVENT, onHomeReset);
    return () => window.removeEventListener(HOME_RESET_EVENT, onHomeReset);
  }, [resetSearchBar]);

  const parseQuery = (raw) => {
    const q = toSafeLower(raw).trim();
    if (!q) return null;
    const dot = q.indexOf('.');
    if (dot !== -1) return [{ name: q.slice(0, dot), ext: q.slice(dot + 1) }];
    return null;
  };

  const mapTldItem = (item, label) => {
    const tld = (item.tld || '').replace('.', '');
    const isPremium = item.isPremium === true || item.is_premium === true;
    return {
      domain: item.domain || `${item.name || label}.${tld}`,
      name: item.name || label,
      ext: tld,
      status: item.status,
      available: item.available,
      unitPrice: item.registrationPrice ?? null,
      renewalPrice: item.renewalPrice ?? null,
      price: item.registrationPrice ?? null,
      priceCurrency: item.currency || 'INR',
      minPeriodYears: item.minPeriodYears || 1,
      isPremium,
      registryTier: item.registryTier || (isPremium ? 'premium' : 'standard'),
      listing: null,
    };
  };

  const mapCheckResult = (fullDomain, data) => {
    const [name, ...extParts] = fullDomain.split('.');
    const ext = extParts.join('.');
    const listing = data.listing ? normalizeDomainRecord(data.listing) : null;
    const onPublicMarketplace = data.status === 'marketplace'
      && listing
      && isPublicMarketplaceListing(listing, 'domain');
    const isPremium = data.isPremium === true || data.is_premium === true;
    return {
      domain: fullDomain,
      name,
      ext,
      status: onPublicMarketplace ? 'marketplace' : (data.status === 'marketplace' ? 'taken' : data.status),
      available: data.status === 'available',
      // Never fall back to `price` (GST-inclusive total) for the /yr unit display.
      price: data.unitPrice ?? null,
      unitPrice: data.unitPrice ?? null,
      priceCurrency: data.priceCurrency ?? null,
      minPeriodYears: data.minPeriodYears ?? 1,
      isPremium,
      registryTier: data.registryTier || (isPremium ? 'premium' : 'standard'),
      registrarMessage: data.message ?? null,
      listing: onPublicMarketplace ? listing : null,
    };
  };

  /**
   * Homepage Domain Names — primary result paints ASAP; remaining TLDs load
   * in the background (same APIs as Storefront, progressive UI).
   */
  const loadRegistryPremiumMarketplace = useCallback(async (label, currentRequestId) => {
    const key = premiumCacheKey(label);
    if (!key) {
      setRegistryPremiumItems([]);
      setRegistryPremiumLoading(false);
      return;
    }

    const cached = getCachedPremiumItems(key);
    if (cached) {
      if (requestIdRef.current !== currentRequestId) return;
      setRegistryPremiumItems(cached);
      setRegistryPremiumLoading(false);
      return;
    }

    if (registryPremiumAbortRef.current) {
      registryPremiumAbortRef.current.abort();
    }
    const controller = new AbortController();
    registryPremiumAbortRef.current = controller;

    setRegistryPremiumLoading(true);
    setRegistryPremiumMsgIndex(0);
    setRegistryPremiumItems([]);
    try {
      const { data } = await domainAPI.searchPremium(
        { name: key },
        { signal: controller.signal },
      );
      if (requestIdRef.current !== currentRequestId || controller.signal.aborted) return;
      const items = Array.isArray(data?.items) ? data.items : [];
      setCachedPremiumItems(key, items);
      setRegistryPremiumItems(items);
    } catch (err) {
      if (
        controller.signal.aborted
        || err?.code === 'ERR_CANCELED'
        || err?.name === 'CanceledError'
        || requestIdRef.current !== currentRequestId
      ) {
        return;
      }
      setRegistryPremiumItems([]);
    } finally {
      if (requestIdRef.current === currentRequestId && !controller.signal.aborted) {
        setRegistryPremiumLoading(false);
      }
    }
  }, []);

  const searchAllTlds = async (raw, force = false, currentRequestId) => {
    const q = toSafeLower(raw).trim();
    if (!q) return;

    const hasTld = q.includes('.');
    const label = hasTld ? q.split('.')[0] : q;
    const fqdn = hasTld ? q : `${label}.com`;
    const cacheKey = `all-tlds:${label}`;

    setRegistrySegment(REGISTRY_PREMIUM_SEGMENT.STANDARD);
    void loadRegistryPremiumMarketplace(label, currentRequestId);

    if (!force && newSearchCacheRef.current.has(cacheKey)) {
      const cached = newSearchCacheRef.current.get(cacheKey);
      setResults(cached);
      setTldPage(2);
      setTldHasMore(false);
      setLoading(false);
      setTldLoading(false);
      setTldProgress(0);
      setTldSkeletonCount(0);
      return;
    }

    setTldLoading(true);
    setTldProgress(1);
    setTldSkeletonCount(6);
    setResults([{
      domain: fqdn,
      name: label,
      ext: fqdn.split('.').slice(1).join('.') || 'com',
      status: 'loading',
      price: null,
      unitPrice: null,
      priceCurrency: null,
      minPeriodYears: 1,
      listing: null,
    }]);

    const mergeMappedIntoResults = (mapped) => {
      setResults((prev) => {
        const exact = prev.find(
          (r) =>
            r.domain === fqdn
            && (r.status === 'available' || r.status === 'marketplace')
            && r.unitPrice != null,
        );
        const byDomain = new Map();
        if (exact) byDomain.set(exact.domain, exact);
        for (const item of mapped) {
          if (!item?.domain || item.status === 'loading') continue;
          if (!byDomain.has(item.domain)) byDomain.set(item.domain, item);
        }
        // Keep any other already-painted available rows (from prior chunks).
        for (const row of prev) {
          if (
            row.status === 'available'
            || row.status === 'marketplace'
            || (row.available === true && row.unitPrice != null)
          ) {
            if (!byDomain.has(row.domain)) byDomain.set(row.domain, row);
          }
        }
        const list = [...byDomain.values()];
        if (exact) {
          return [exact, ...list.filter((it) => it.domain !== exact.domain)];
        }
        return list;
      });
    };

    // Primary / exact-match — paint ASAP so Add to Cart is usable immediately.
    const checkPromise = (async () => {
      try {
        const { data } = await domainAPI.check(fqdn, 'new');
        if (requestIdRef.current !== currentRequestId) return null;
        const mapped = mapCheckResult(fqdn, data?.data ?? data);
        setResults((prev) => {
          const rest = prev.filter((r) => r.status !== 'loading' && r.domain !== fqdn);
          if (mapped.status === 'available' || mapped.status === 'marketplace') {
            return [mapped, ...rest];
          }
          return rest.length ? rest : [mapped];
        });
        setLoading(false);
        return mapped;
      } catch {
        if (requestIdRef.current === currentRequestId) setLoading(false);
        return null;
      }
    })();

    // Remaining TLDs: progressive backend chunks → real progress + card-by-card reveal.
    void (async () => {
      const collected = [];
      try {
        let chunkIndex = 0;
        let chunkTotal = null;
        let moreChunks = true;

        while (moreChunks) {
          if (requestIdRef.current !== currentRequestId) return;

          const {
            items,
            moreAvailable,
            chunkTotal: totalFromApi,
            moreChunks: moreFromApi,
          } = await fetchAvailableTldsChunk(label, chunkIndex, {
            chunkSize: DOMAIN_SEARCH_CHUNK_SIZE,
          });

          if (requestIdRef.current !== currentRequestId) return;

          if (Number.isInteger(totalFromApi) && totalFromApi > 0) {
            chunkTotal = totalFromApi;
          } else if (chunkTotal == null) {
            chunkTotal = chunkIndex + 1;
          }

          const mapped = items.map((item) => mapTldItem(item, label));
          for (const item of mapped) {
            if (!collected.some((c) => c.domain === item.domain)) {
              collected.push(item);
            }
          }
          // Reveal only cards that finished in this (or prior) wave.
          mergeMappedIntoResults(collected);

          const doneWaves = chunkIndex + 1;
          const totalWaves = Math.max(doneWaves, chunkTotal || doneWaves);
          const finishedAll = moreFromApi !== true || doneWaves >= totalWaves;
          if (finishedAll) {
            setTldProgress(100);
            setTldSkeletonCount(0);
            moreChunks = false;
          } else {
            // Cap mid-flight below 100 so we never sit at 99 waiting on a phantom last step.
            const pct = Math.round((doneWaves / totalWaves) * 100);
            setTldProgress(Math.max(1, Math.min(95, pct)));
            const secondaryCount = collected.filter((it) => it.domain !== fqdn).length;
            setTldSkeletonCount(Math.max(3, 6 - Math.min(secondaryCount, 6)));
            moreChunks = true;
          }

          chunkIndex += 1;

          // Storefront-style load-more remains available after first-page waves.
          setTldHasMore(moreAvailable === true);
          setTldPage(2);

          if (!moreChunks) break;
        }

        const exactSettled = await checkPromise;
        if (requestIdRef.current !== currentRequestId) return;

        let merged = [...collected];
        if (
          exactSettled
          && (exactSettled.status === 'available' || exactSettled.status === 'marketplace')
          && !merged.some((it) => it.domain === exactSettled.domain)
        ) {
          merged = [exactSettled, ...merged];
        } else if (exactSettled?.status === 'available' || exactSettled?.status === 'marketplace') {
          const others = merged.filter((it) => it.domain !== exactSettled.domain);
          const fromList = merged.find((it) => it.domain === exactSettled.domain) || exactSettled;
          merged = [fromList, ...others];
        }
        newSearchCacheRef.current.set(cacheKey, merged);
        mergeMappedIntoResults(merged);
        setTldProgress(100);
        setTldSkeletonCount(0);
      } catch (err) {
        if (requestIdRef.current !== currentRequestId) return;
        const exact = await checkPromise;
        if (exact && (exact.status === 'available' || exact.status === 'marketplace')) {
          setResults((prev) => {
            if (prev.some((r) => r.domain === exact.domain && r.status !== 'loading')) return prev;
            return [exact];
          });
        } else if (!exact) {
          const registrarMessage =
            err?.response?.data?.message
            || err?.response?.data?.error
            || err?.message
            || 'Could not fetch available extensions.';
          setResults([{
            domain: fqdn,
            name: label,
            ext: fqdn.split('.').slice(1).join('.') || 'com',
            status: 'error',
            registrarMessage,
          }]);
        }
        setTldProgress(100);
        setTldSkeletonCount(0);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
          setTldLoading(false);
          setTldProgress((p) => (p > 0 && p < 100 ? 100 : p));
          setTldSkeletonCount(0);
        }
      }
    })();

    // Unblock the search pipeline as soon as the primary check settles.
    await checkPromise;
    if (requestIdRef.current === currentRequestId) setLoading(false);
  };

  // Append the next page of available TLDs on "View More". Guarded so a
  // single in-flight click cannot launch duplicate requests, and previously
  // loaded pages are never re-fetched.
  const loadMoreTlds = async (label) => {
    if (tldLoadingMore || !tldHasMore) return;
    setTldLoadingMore(true);
    try {
      const { items, moreAvailable } = await fetchAvailableTldsPage(label, tldPage);
      if (items.length) {
        const mapped = items.map((item) => mapTldItem(item, label));
        setResults((prev) => {
          const seen = new Set(prev.map((r) => r.domain));
          const fresh = mapped.filter((r) => !seen.has(r.domain));
          return [...prev, ...fresh];
        });
        setTldPage((p) => p + 1);
        setTldHasMore(moreAvailable);
      } else {
        setTldHasMore(false);
      }
    } catch {
      setTldHasMore(false);
    } finally {
      setTldLoadingMore(false);
    }
  };

  const doSearch = async (raw, options = {}) => {
    const { force = false } = options;
    const q = toSafeLower(raw).trim();
    if (!q) return;

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setLoading(true);

    if (searchMode === 'new') {
      // Always use the Storefront-aligned TLD search (with parallel exact check).
      // Previously, queries with a TLD only hit /domain/check and never loaded
      // extensions — and bare labels blocked the UI until all 60 TLDs finished.
      await searchAllTlds(q, force, currentRequestId);
      return;
    }

    const pairs = parseQuery(raw);
    if (!pairs) {
      setLoading(false);
      return;
    }
    const cacheKey = buildSearchKey(raw);
    if (!force && newSearchCacheRef.current.has(cacheKey)) {
      setResults(newSearchCacheRef.current.get(cacheKey));
      setLoading(false);
      return;
    }

    const seededResults = pairs.map(({ name, ext }) => ({
      domain: `${name}.${ext}`,
      name,
      ext,
      status: 'loading',
      price: null,
      unitPrice: null,
      priceCurrency: null,
      minPeriodYears: 1,
      listing: null,
    }));
    setResults(seededResults);
    const nextResults = seededResults.map((item) => ({ ...item }));

    await Promise.all(pairs.map(async ({ name, ext }) => {
      const fullDomain = `${name}.${ext}`;
      try {
        const { data } = await domainAPI.check(fullDomain, 'new');
        const idx = nextResults.findIndex((r) => r.domain === fullDomain);
        if (idx !== -1) {
          nextResults[idx] = mapCheckResult(fullDomain, data);
        }
      } catch (err) {
        const idx = nextResults.findIndex((r) => r.domain === fullDomain);
        const registrarMessage =
          err?.response?.data?.message
          || err?.response?.data?.error
          || err?.message
          || 'Could not check this domain with the registrar.';
        if (idx !== -1) {
          nextResults[idx] = {
            ...nextResults[idx],
            status: 'error',
            registrarMessage,
          };
        }
      }
    }));

    if (requestIdRef.current !== currentRequestId) return;
    newSearchCacheRef.current.set(cacheKey, nextResults);
    setResults(nextResults);
    setLoading(false);
  };

  useEffect(() => {
    if (searchMode !== 'new') return;
    if (!normalizedQuery) { setResults([]); return; }
    const cacheKey = buildSearchKey(query);
    if (newSearchCacheRef.current.has(cacheKey)) {
      clearTimeout(debounceRef.current);
      setResults(newSearchCacheRef.current.get(cacheKey));
      setLoading(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchMode]);

  const fetchPremiumDomains = async (raw, options = {}) => {
    const { force = false } = options;
    const q = toSafeText(raw).trim();
    if (!q) {
      setPremiumDomains([]);
      setPremiumLoading(false);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setPremiumLoading(true);
    if (force) setPremiumDomains([]);

    try {
      const { data } = await domainAPI.search({ query: q, mode: 'premium' });
      if (requestIdRef.current !== currentRequestId) return;
      setPremiumDomains(filterPublicMarketplaceListings(extractDomainList(data), 'domain'));
    } catch {
      if (requestIdRef.current !== currentRequestId) return;
      setPremiumDomains([]);
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setPremiumLoading(false);
      }
    }
  };

  const fetchAuctions = async (raw, options = {}) => {
    const { force = false } = options;
    const q = toSafeText(raw).trim();
    if (!q) {
      setAuctionResults([]);
      setAuctionsLoading(false);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setAuctionsLoading(true);
    if (force) setAuctionResults([]);

    try {
      const { data } = await domainAPI.search({ query: q, mode: 'auction' });
      if (requestIdRef.current !== currentRequestId) return;
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setAuctionResults(items);
    } catch {
      if (requestIdRef.current !== currentRequestId) return;
      setAuctionResults([]);
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setAuctionsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!normalizedQuery) {
      setPremiumDomains([]);
      setAuctionResults([]);
      resetAiDomains();
      return undefined;
    }
    if (searchMode === 'premium') {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPremiumDomains(query), 400);
      return () => clearTimeout(debounceRef.current);
    }
    if (searchMode === 'auction') {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchAuctions(query), 400);
      return () => clearTimeout(debounceRef.current);
    }
    return undefined;
  }, [query, searchMode]);

  const handleSearch = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    if (searchMode === 'ai') {
      generateAiDomains(query);
    } else if (searchMode === 'new') {
      doSearch(query, { force: true });
    } else if (searchMode === 'premium') {
      fetchPremiumDomains(query, { force: true });
    } else {
      fetchAuctions(query, { force: true });
    }
  };

  const domainTitleFromAuction = (auction) => {
    const domain = auction?.domain || {};
    return (
      auction?.domainDisplayName
      || domain.fullDomain
      || `${domain.domainName || ''}${domain.domainExtension || ''}`.trim()
      || null
    );
  };

  const handleTabChange = (tabId) => {
    if (tabId === searchMode) return;
    setQuery('');
    newSearchCacheRef.current.clear();
    clearAllSearchResults();
    setSearchMode(tabId);
  };

  const completedNewResults = results.filter((item) => item.status !== 'loading');
  const availableNewResults = completedNewResults
    .filter((item) => {
      const isAvail = item.status === 'available' || item.available === true;
      if (!isAvail) return false;
      
      const ext = (item.ext || item.tld || '').replace(/^\./, '').toLowerCase();
      const isPriority = TLDS.indexOf(ext) !== -1;
      if (isPriority) return true;
      
      const price = item.unitPrice != null ? Number(item.unitPrice) : (item.price != null ? Number(item.price) : Infinity);
      return price < 3000;
    })
    .sort((a, b) => {
      const aExt = (a.ext || a.tld || '').replace(/^\./, '').toLowerCase();
      const bExt = (b.ext || b.tld || '').replace(/^\./, '').toLowerCase();
      
      const aPriority = TLDS.indexOf(aExt);
      const bPriority = TLDS.indexOf(bExt);
      
      const aIsPriority = aPriority !== -1;
      const bIsPriority = bPriority !== -1;
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      if (aIsPriority && bIsPriority) return aPriority - bPriority;
      
      const priceA = a.unitPrice != null ? Number(a.unitPrice) : (a.price != null ? Number(a.price) : Infinity);
      const priceB = b.unitPrice != null ? Number(b.unitPrice) : (b.price != null ? Number(b.price) : Infinity);
      
      return priceA - priceB;
    })
    .map((item) => ({
      domain: item.domain || `${item.name}.${item.ext || item.tld}`,
      name: item.name,
      tld: item.ext || item.tld,
      status: item.status,
      available: true,
      registrationPrice: item.unitPrice ?? item.price,
      renewalPrice: item.renewalPrice,
      period: 1,
      minPeriodYears: item.minPeriodYears || 1,
      isPremium: item.isPremium === true,
      registryTier: item.registryTier || (item.isPremium ? 'premium' : 'standard'),
    }));

  const standardNewResults = useMemo(
    () => availableNewResults.filter((it) => !isRegistryPremium(it)),
    [availableNewResults],
  );

  const premiumNewResults = useMemo(() => {
    const byDomain = new Map();
    const add = (it) => {
      const domain = String(it?.domain || '').toLowerCase();
      if (!domain || !isRegistryPremium(it)) return;
      if (!byDomain.has(domain)) byDomain.set(domain, it);
    };
    availableNewResults.forEach(add);
    (registryPremiumItems || []).forEach(add);
    return Array.from(byDomain.values()).sort(
      (a, b) => (Number(a.registrationPrice) || Infinity) - (Number(b.registrationPrice) || Infinity),
    );
  }, [availableNewResults, registryPremiumItems]);

  const visibleNewResults =
    registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
      ? premiumNewResults
      : standardNewResults;

  useEffect(() => {
    if (!registryPremiumLoading) return undefined;
    const id = setInterval(() => {
      setRegistryPremiumMsgIndex((i) => (i + 1) % PREMIUM_LOADING_MESSAGES);
    }, 2000);
    return () => clearInterval(id);
  }, [registryPremiumLoading]);

  useEffect(() => {
    if (registryPremiumLoading) return;
    if (premiumNewResults.length > 0 && standardNewResults.length === 0) {
      setRegistrySegment(REGISTRY_PREMIUM_SEGMENT.PREMIUM);
      setResultsAnimKey((k) => k + 1);
    }
  }, [registryPremiumLoading, premiumNewResults.length, standardNewResults.length]);

  const handleRegistrySegmentChange = (next) => {
    setRegistrySegment(next);
    setResultsAnimKey((k) => k + 1);
  };

  const registrarErrorMessage = completedNewResults.find((item) => item.registrarMessage)?.registrarMessage
    || (completedNewResults.length > 0 && completedNewResults.every((item) => item.status === 'error')
      ? completedNewResults[0]?.registrarMessage
      : '');
  const filteredPremiumDomains = premiumDomains.filter((item) => {
    const q = normalizedQuery;
    const domainName = toSafeLower(item.domainName || '');
    const domainExtension = toSafeLower(item.domainExtension || '');
    const fullDomain = `${domainName}${domainExtension}`;
    if (fullDomain.includes(q) || domainName.includes(q)) return true;

    // Tolerate small typos when searching exact listed domain names.
    if (q.length >= 6) {
      return damerauLevenshteinDistance(domainName, q) <= 2;
    }
    return false;
  });
  const filteredAuctionResults = auctionResults.filter((auction) => {
    const fullDomain = toSafeLower(domainTitleFromAuction(auction) || '');
    return fullDomain.includes(normalizedQuery);
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  const desktopSearchForm = (
    <form
      onSubmit={handleSearch}
      className="search-glow-focus brand-search-shell flex w-full flex-row items-center gap-2 overflow-hidden rounded-2xl border bg-white py-2 pl-4 pr-2 transition-all duration-300 sm:pl-5 sm:rounded-full"
    >
      <BrandSearchIcon />
      <input
        type="text"
        className="min-w-0 flex-1 border-none bg-transparent py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 sm:text-base"
        placeholder={placeholder}
        value={safeQuery}
        onChange={(e) => setQuery(e.target.value)}
      />
      <BrandSearchSubmitButton label={t('search')} />
    </form>
  );

  const mobileSearchForm = (
    <form
      onSubmit={handleSearch}
      className={`search-glow-focus brand-search-shell w-full flex flex-row items-center bg-white rounded-2xl sm:rounded-full border overflow-hidden px-4 sm:pl-6 sm:pr-3 py-2.5 gap-2 flex-1 transition-all duration-300 ${embedded ? '' : 'mx-auto max-w-[760px]'}`}
    >
      <BrandSearchIcon />
      <input
        type="text"
        className="w-full min-w-0 flex-1 bg-transparent border-none outline-none text-slate-900 text-base sm:text-lg placeholder:text-slate-400 py-2.5 sm:py-3 focus:ring-0"
        placeholder={placeholder}
        value={safeQuery}
        onChange={(e) => setQuery(e.target.value)}
      />
      <BrandSearchSubmitButton label={t('search')} />
    </form>
  );

  return (
    <div
      className={`relative z-20 w-full ${embedded ? 'py-0' : 'py-3 pl-4 pr-4 sm:py-4 sm:pl-6 sm:pr-5 md:pl-10 lg:pl-20 lg:pr-8'} ${className}`.trim()}
    >
      <div className={`w-full ${embedded ? '' : 'mx-auto max-w-[1200px]'}`}>

        {/* Desktop: search input perfectly aligned with TLD Price Marquee row, tabs below */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-6 w-full">
            <div className="w-full max-w-[660px] shrink-0">
              {desktopSearchForm}
            </div>

            {searchMode === 'new' && isDesktopLayout && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <TldPriceMarquee />
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-start pl-2">
            <BrandSearchTabs
              searchMode={searchMode}
              onTabChange={handleTabChange}
              layoutId="brand-search-active-pill-desktop"
            />
          </div>
        </div>

        {/* Mobile / tablet — search + tabs share one entrance so spacing never collapses */}
        <HeroSearchStack animateHero={animateHero} className="lg:hidden">
          <div className="flex flex-col items-stretch gap-3 sm:gap-4">
            {mobileSearchForm}
          </div>

          <div className="mt-3 flex justify-center pb-2 overflow-visible">
            <BrandSearchTabs
              searchMode={searchMode}
              onTabChange={handleTabChange}
              mobile
              layoutId="brand-search-active-pill-mobile"
            />
          </div>

          {searchMode === 'new' && !isDesktopLayout && (
            <div className="mt-2 w-full overflow-hidden">
              <TldPriceMarquee />
            </div>
          )}
        </HeroSearchStack>

        {/* Results */}
        <div className="mt-4">
          {hasSearchQuery && searchMode === 'ai' && aiLoading && (
            <AIDomainLoader
              stage={aiStage}
              progress={aiProgress}
              compact={aiDomains.length > 0}
            />
          )}

          {hasSearchQuery && searchMode === 'ai' && !aiLoading && aiError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {aiError}
            </div>
          )}

          {hasSearchQuery && searchMode === 'ai' && !aiError && aiDomains.length > 0 && (
            <AIDomainGrid results={aiDomains} />
          )}

          {hasSearchQuery && searchMode === 'ai' && !aiLoading && !aiError && aiDomains.length === 0 && (
            <p className="text-left text-gray-500 text-sm py-4">
              {t('searchAiEmptyHint')}
            </p>
          )}

          {hasSearchQuery && searchMode === 'new' && loading && completedNewResults.length === 0 && (
            <RegistrarDomainLoader />
          )}

          {/* Domain Names — Standard / Premium (same as Storefront) */}
          {hasSearchQuery && searchMode === 'new' && (
            availableNewResults.length > 0
            || registryPremiumLoading
            || premiumNewResults.length > 0
            || (tldLoading && completedNewResults.length > 0)
          ) && (
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Available Extensions
                </h3>
                <RegistryPremiumSegment
                  value={registrySegment}
                  onChange={handleRegistrySegmentChange}
                  standardCount={standardNewResults.length}
                  premiumCount={premiumNewResults.length}
                  premiumLoading={registryPremiumLoading}
                />
              </div>

              <div key={`${resultsAnimKey}-${registrySegment}`} className="registry-results-enter">
                {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                  && registryPremiumLoading
                  && premiumNewResults.length === 0 ? (
                  <RegistryPremiumLoader messageIndex={registryPremiumMsgIndex} />
                ) : visibleNewResults.length > 0 ? (
                  <>
                    <div className="flex justify-end mb-3">
                      <span className="text-xs font-semibold text-gray-400">
                        {visibleNewResults.length} shown · sorted by price
                        {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM && registryPremiumLoading
                          ? ' · updating…'
                          : ''}
                      </span>
                    </div>
                    <div
                      className={
                        registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                          ? 'premium-results-stagger'
                          : undefined
                      }
                    >
                      <DomainCardGrid
                        items={visibleNewResults}
                        featuredFirst
                        skeletonCount={
                          registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && tldLoading
                            ? tldSkeletonCount
                            : 0
                        }
                      />
                    </div>
                    {registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && tldLoading ? (
                      <DomainExtensionsLoader />
                    ) : null}
                  </>
                ) : (
                  <div
                    className={`flex items-center gap-2.5 text-xs rounded-xl border p-4 ${
                      registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                        ? 'text-amber-900/80 bg-amber-50/50 border-amber-100'
                        : 'text-gray-500 bg-gray-50 border-gray-150'
                    }`}
                  >
                    {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                      ? '✨ No premium domains found. Try another keyword.'
                      : tldLoading
                        ? 'Loading standard domains…'
                        : 'No standard domains in these results. Try Premium Domains.'}
                  </div>
                )}
              </div>

              <style>{`
                @keyframes registryResultsEnter {
                  from { opacity: 0; transform: translateY(10px) scale(0.985); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .registry-results-enter {
                  animation: registryResultsEnter 280ms ease-out;
                }
                .premium-results-stagger .domain-search-card {
                  animation: registryResultsEnter 300ms ease-out both;
                  box-shadow:
                    0 0 0 1px rgba(251, 191, 36, 0.2),
                    0 8px 28px rgba(180, 83, 9, 0.1),
                    0 0 24px rgba(251, 191, 36, 0.12);
                }
                .premium-results-stagger .domain-search-card--featured {
                  animation-delay: 40ms;
                }
                .premium-results-stagger .grid .domain-search-card:nth-child(1) { animation-delay: 90ms; }
                .premium-results-stagger .grid .domain-search-card:nth-child(2) { animation-delay: 140ms; }
                .premium-results-stagger .grid .domain-search-card:nth-child(3) { animation-delay: 190ms; }
                .premium-results-stagger .grid .domain-search-card:nth-child(n+4) { animation-delay: 230ms; }
              `}</style>
            </div>
          )}

          {hasSearchQuery && searchMode === 'new' && !tldLoading && tldHasMore
            && registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadMoreTlds(normalizedQuery.split('.')[0])}
                disabled={tldLoadingMore}
                className="inline-flex items-center gap-2 text-sm font-bold text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-60 px-6 h-11 rounded-xl transition-all shadow-sm select-none"
              >
                {tldLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    View More
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {hasSearchQuery && searchMode === 'new' && !loading && !tldLoading && registrarErrorMessage && completedNewResults.every((item) => item.status === 'error') && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {registrarErrorMessage}
            </p>
          )}

          {hasSearchQuery && searchMode === 'new' && !loading && !tldLoading && !registryPremiumLoading
            && availableNewResults.length === 0 && premiumNewResults.length === 0
            && (!registrarErrorMessage || !completedNewResults.every((item) => item.status === 'error')) && (
            <p className="text-center text-gray-500 text-sm py-6">
              No available domains found for this search. Please try another domain name.
            </p>
          )}

          {/* Pre-owned / listed marketplace domains (separate tab) */}
          {hasSearchQuery && searchMode === 'premium' && premiumLoading && (
            <p className="text-center text-gray-400 text-sm mb-6">{t('searchLoadingListedDomains')}</p>
          )}
          {hasSearchQuery && searchMode === 'premium' && !premiumLoading && filteredPremiumDomains.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPremiumDomains.map((item) => (
                <div
                  key={item.id}
                  className="domain-search-card bg-white border border-indigo-200 ring-1 ring-indigo-50 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
                >
                  <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3 bg-indigo-100 text-indigo-700">
                    LISTED DOMAIN
                  </span>
                  <h2 className="text-xl font-extrabold mb-3 text-gray-900">
                    {item.domainName}<span className="text-purple-500">{item.domainExtension}</span>
                  </h2>
                  <p className="text-indigo-600 text-sm font-semibold mb-4">
                    Asking {formatPrice(item.askingPrice || 0)}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/domains?highlight=${item.id}`)}
                    className="px-5 py-2 rounded-lg font-bold text-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    View on Marketplace →
                  </button>
                </div>
              ))}
            </div>
          )}

          {hasSearchQuery && searchMode === 'premium' && !premiumLoading && filteredPremiumDomains.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">
              {t('searchNoListedDomains')}
            </p>
          )}

          {/* Ongoing domain auctions */}
          {hasSearchQuery && searchMode === 'auction' && auctionsLoading && (
            <p className="text-center text-gray-400 text-sm mb-6">{t('searchLoadingAuctions')}</p>
          )}
          {hasSearchQuery && searchMode === 'auction' && !auctionsLoading && filteredAuctionResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAuctionResults.map((auction) => {
                const title = domainTitleFromAuction(auction) || 'Unnamed domain';
                const currentBid = Number(auction.currentHighestBid ?? 0);
                const minBid = Number(auction.minBidPrice ?? 0);
                const amount = currentBid > 0 ? currentBid : minBid;
                const totalBids = Number(auction.totalBids ?? 0);
                return (
                  <div
                    key={auction.id}
                    className="domain-search-card bg-white border border-gray-200 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_32px_rgba(79,70,229,0.12)] hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3 bg-amber-100 text-amber-700">
                      LIVE AUCTION
                    </span>
                    <h2 className="text-xl font-extrabold mb-3 text-gray-900 truncate">{title}</h2>
                    <p className="text-sm text-gray-600 mb-1">
                      {currentBid > 0 ? 'Current highest bid' : 'Starting bid'}
                    </p>
                    <p className="font-extrabold text-xl text-amber-600 mb-3">
                      {formatPrice(amount)}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">{totalBids} bids placed</p>
                    <button
                      type="button"
                      onClick={() => navigate(`/auction/${auction.id}`)}
                      className="px-5 py-2 rounded-lg font-bold text-sm transition-all bg-gray-900 text-white hover:bg-gray-700"
                    >
                      Bid Now
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {hasSearchQuery && searchMode === 'auction' && !auctionsLoading && filteredAuctionResults.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">
              {t('searchNoOngoingAuctions')}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .brand-search-shell {
          border: 2px solid transparent;
          background:
            linear-gradient(#ffffff, #ffffff) padding-box,
            linear-gradient(90deg, #7dd3fc 0%, #66ccff 50%, #38bdf8 100%) border-box;
        }

        .brand-search-submit {
          background: #000000;
          border-color: #000000;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
        }

        .brand-search-submit:hover,
        .brand-search-submit:focus-visible {
          background: #000000;
          border-color: #000000;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.24);
        }

        .brand-search-submit:focus-visible {
          --tw-ring-color: rgba(0, 0, 0, 0.25);
        }

        .brand-search-tabs {
          border-color: rgba(0, 0, 0, 0.12);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .brand-search-tabs-mobile {
          border: 0;
          background: transparent;
          box-shadow: none;
          overflow: visible;
        }

        .brand-search-tab-active {
          background: #000000;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
          border: 1px solid #000000;
          transition:
            background 0.48s cubic-bezier(0.22, 1, 0.36, 1),
            color 0.42s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.48s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.52s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .brand-search-tab-active.brand-search-tab--motion {
          background: transparent;
          border-color: transparent;
          box-shadow: none;
        }

        .brand-search-tab-active.brand-search-tab--motion:hover,
        .brand-search-tab-active.brand-search-tab--motion:focus-visible {
          background: transparent;
          border-color: transparent;
          box-shadow: none;
        }

        .brand-search-tab-active:hover,
        .brand-search-tab-active:focus-visible {
          background: #000000;
          color: #ffffff;
          border-color: #000000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        .brand-search-tab-idle {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: none;
          transition:
            background 0.48s cubic-bezier(0.22, 1, 0.36, 1),
            color 0.42s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.48s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.52s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .brand-search-tab-idle:hover,
        .brand-search-tab-idle:focus-visible {
          background: #000000;
          color: #ffffff;
          border-color: #000000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-search-tab-active,
          .brand-search-tab-idle {
            transition-duration: 0.01ms;
          }
        }

        @media (min-width: 768px) {
          .brand-search-tabs-mobile {
            border-color: rgba(0, 0, 0, 0.12);
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          }
        }

        .search-glow-focus {
          box-shadow:
            0 10px 30px -12px rgba(102, 204, 255, 0.35),
            0 0 0 1px rgba(102, 204, 255, 0.2),
            0 0 24px -10px rgba(102, 204, 255, 0.4);
        }

        .search-glow-focus:hover,
        .search-glow-focus:focus-within {
          box-shadow:
            0 12px 34px -12px rgba(102, 204, 255, 0.45),
            0 0 0 1px rgba(102, 204, 255, 0.28),
            0 0 28px -9px rgba(102, 204, 255, 0.5);
        }

        .search-glow-focus:hover .domain-search-icon,
        .search-glow-focus:focus-within .domain-search-icon {
          color: var(--cobrother-brand-green);
        }

        .domain-search-submit:hover,
        .domain-search-submit:focus-visible {
          color: #ffffff;
          outline: none;
        }
      `}</style>
    </div>
  );
}
