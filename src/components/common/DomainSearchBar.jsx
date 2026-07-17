import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { domainAPI } from '../../api/services';
import { HOME_RESET_EVENT } from '../../utils/homeReset';
import { extractDomainList, normalizeDomainRecord } from '../../utils/domainApiAdapter';
import { filterPublicMarketplaceListings, isPublicMarketplaceListing } from '../../utils/listingVisibility';
import useAIDomains from '../../hooks/useAIDomains';
import { useCurrency } from '../../context/CurrencyContext';
import AIDomainGrid from '../ai-domains/AIDomainGrid';
import AIDomainLoader from '../ai-domains/AIDomainLoader';
import RegistrarDomainLoader from './RegistrarDomainLoader';
import {
  heroSearchStackEnter,
  heroSubmitHover,
  heroSubmitTap,
  heroTabIdleHover,
  heroTabSpring,
  HOME_EASE_OUT,
} from '../home/motion/homeMotion';

const SEARCH_MODE_IDS = ['ai', 'new', 'premium', 'auction'];
const SEARCH_MODE_CONFIG = {
  ai: { labelKey: 'searchTabAi', placeholderKey: 'searchPlaceholderAi' },
  new: { labelKey: 'searchTabNew', placeholderKey: 'searchPlaceholderNew' },
  premium: { labelKey: 'searchTabPremium', placeholderKey: 'searchPlaceholderPremium' },
  auction: { labelKey: 'searchTabAuction', placeholderKey: 'searchPlaceholderAuction' },
};

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
  const { formatPrice, convertToInr } = useCurrency();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const animateHero = embedded && !reduceMotion;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState('ai');
  const [auctionResults, setAuctionResults] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [premiumDomains, setPremiumDomains] = useState([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
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
    resetAiDomains();
    setResults([]);
    setPremiumDomains([]);
    setAuctionResults([]);
    setLoading(false);
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

  const searchAllTlds = async (label, force = false, currentRequestId) => {
    const cacheKey = `all-tlds:${label}`;
    if (!force && newSearchCacheRef.current.has(cacheKey)) {
      setResults(newSearchCacheRef.current.get(cacheKey));
      setLoading(false);
      return;
    }

    const seededResults = Array.from({ length: 7 }, () => ({
      domain: `${label}.tld`,
      name: label,
      ext: 'tld',
      status: 'loading',
      price: null,
      unitPrice: null,
      priceCurrency: null,
      minPeriodYears: 1,
      listing: null,
    }));
    setResults(seededResults);
    const nextResults = seededResults.map((item) => ({ ...item }));

    try {
      const { data } = await domainAPI.searchTlds({ name: label, page: 1, pageSize: 200 });
      const items = data?.items || data?.data?.items || [];

      const mapped = items.map((item) => {
        const tld = (item.tld || '').replace('.', '');
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
          minPeriodYears: 1,
          listing: null,
        };
      });

      if (requestIdRef.current !== currentRequestId) return;
      newSearchCacheRef.current.set(cacheKey, mapped);
      setResults(mapped);
    } catch (err) {
      if (requestIdRef.current !== currentRequestId) return;
      const registrarMessage =
        err?.response?.data?.message
        || err?.response?.data?.error
        || err?.message
        || 'Could not fetch available extensions.';
      setResults(
        nextResults.map((item) => ({
          ...item,
          status: 'error',
          registrarMessage,
        })),
      );
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setLoading(false);
      }
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
      const dot = q.indexOf('.');
      if (dot === -1) {
        await searchAllTlds(q, force, currentRequestId);
        return;
      }
    }

    const pairs = parseQuery(raw);
    if (!pairs) return;
    const cacheKey = buildSearchKey(raw);
    if (!force && newSearchCacheRef.current.has(cacheKey)) {
      setResults(newSearchCacheRef.current.get(cacheKey));
      setLoading(false);
      return;
    }

    // Seed skeleton rows immediately
    const seededResults = pairs.map(({ name, ext }) => ({
      domain: `${name}.${ext}`,
      name,
      ext,
      status:  'loading',
      price:   null,
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
        const listing = data.listing ? normalizeDomainRecord(data.listing) : null;
        const onPublicMarketplace = data.status === 'marketplace'
          && listing
          && isPublicMarketplaceListing(listing, 'domain');
        const idx = nextResults.findIndex((r) => r.domain === fullDomain);
        if (idx !== -1) {
          nextResults[idx] = {
            ...nextResults[idx],
            status: onPublicMarketplace ? 'marketplace' : (data.status === 'marketplace' ? 'taken' : data.status),
            price: data.price ?? null,
            unitPrice: data.unitPrice ?? data.price ?? null,
            priceCurrency: data.priceCurrency ?? null,
            minPeriodYears: data.minPeriodYears ?? 1,
            registrarMessage: data.message ?? null,
            listing: onPublicMarketplace ? listing : null,
          };
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
    debounceRef.current = setTimeout(() => doSearch(query), 700);
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

  const goToMarketplace = (listing) => {
    window.location.href = `/domains?highlight=${listing.id}`;
  };

  const goRegister = (name, ext) => {
    navigate(`/storefront?domain=${encodeURIComponent(`${name}.${ext}`)}`);
  };

  const completedNewResults = results.filter((item) => item.status !== 'loading');
  const availableNewResults = completedNewResults
    .filter((item) => item.status === 'available' || item.available === true)
    .sort((a, b) => {
      const priceA = a.unitPrice != null ? Number(a.unitPrice) : (a.price != null ? Number(a.price) : Infinity);
      const priceB = b.unitPrice != null ? Number(b.unitPrice) : (b.price != null ? Number(b.price) : Infinity);
      return priceA - priceB;
    });
  const visibleNewBest = availableNewResults[0] || null;
  const visibleNewOthers = availableNewResults.slice(1);
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

  // ── Sub-components ──────────────────────────────────────────────────────────
  const Badge = ({ status }) => {
    const map = {
      loading:     ['bg-gray-100 text-gray-400',     'CHECKING…'],
      marketplace: ['bg-indigo-100 text-indigo-700', '🏪 ON OUR MARKETPLACE'],
      available:   ['bg-[var(--cobrother-brand-green-soft)] text-[var(--cobrother-brand-green)]','✓ AVAILABLE'],
      taken:       ['bg-red-100 text-red-500',        'TAKEN'],
      error:       ['bg-amber-100 text-amber-700',    'CHECK FAILED'],
    };
    const [cls, label] = map[status] ?? map.taken;
    return (
      <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3 ${cls}`}>
        {label}
      </span>
    );
  };

  const Price = ({ result, large }) => {
    const unit = Number(result.unitPrice ?? result.price);
    const renewal = Number(result.renewalPrice);
    if (!Number.isFinite(unit) || unit <= 0) return null;
    const currency = result.priceCurrency || 'INR';
    const years = result.minPeriodYears > 1 ? result.minPeriodYears : 1;
    const total = years > 1 ? unit * years : unit;
    const inrTotal = convertToInr(total, currency);
    const inrRenewal = Number.isFinite(renewal) && renewal > 0 ? convertToInr(renewal, currency) : null;
    const periodLabel = years > 1 ? `/${years} yrs` : '/yr';
    return (
      <div className="mb-4">
        <p className={`font-extrabold text-gray-900 ${large ? 'text-3xl' : 'text-xl'}`}>
          {formatPrice(inrTotal)}
          <span className={`font-normal text-gray-400 ml-1 ${large ? 'text-sm' : 'text-xs'}`}>
            {periodLabel}
          </span>
        </p>
        {inrRenewal !== null && (
          <p className={`text-gray-500 mt-1 ${large ? 'text-sm' : 'text-xs'}`}>
            Renews at {formatPrice(inrRenewal)}/yr
          </p>
        )}
        {result.status === 'available' && years > 1 && (
          <p className={`text-gray-500 mt-1 ${large ? 'text-xs' : 'text-[11px]'}`}>
            {years}-year minimum registration
          </p>
        )}
      </div>
    );
  };

  const Action = ({ result, large }) => {
    const base = large
      ? 'px-8 py-3 rounded-xl font-bold text-base transition-all'
      : 'px-5 py-2 rounded-lg font-bold text-sm transition-all';

    if (result.status === 'loading')
      return <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />;

    if (result.status === 'marketplace')
      return (
        <button onClick={() => goToMarketplace(result.listing)}
          className={`bg-indigo-600 text-white hover:bg-indigo-700 ${base}`}>
          View on Marketplace →
        </button>
      );

    if (result.status === 'available')
      return (
        <button onClick={() => goRegister(result.name, result.ext)}
          className={`bg-gray-900 text-white hover:bg-gray-700 ${base}`}>
          {large ? 'Register Now →' : 'Register'}
        </button>
      );

    return (
      <button disabled className={`bg-gray-100 text-gray-400 cursor-not-allowed ${base}`}>
        {result.status === 'error' ? 'Could not check' : 'Taken'}
      </button>
    );
  };

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

        {/* Desktop: compact search and mode tabs */}
        <div className="hidden lg:flex lg:flex-row lg:items-start lg:justify-start">
          <HeroSearchStack
            animateHero={animateHero}
            className="w-full max-w-[760px] flex-[1_1_700px]"
          >
            {desktopSearchForm}

            <div className="mt-3 flex justify-center">
              <BrandSearchTabs
                searchMode={searchMode}
                onTabChange={handleTabChange}
                layoutId="brand-search-active-pill-desktop"
              />
            </div>
          </HeroSearchStack>
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

          {/* New Domains */}
          {hasSearchQuery && searchMode === 'new' && visibleNewBest && (
            <div className={`domain-search-card domain-search-card--featured mb-8 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)] border transition-all ${
              visibleNewBest.status === 'available' ? 'border-[var(--cobrother-brand-green)] ring-1 ring-[rgba(var(--cobrother-brand-green-rgb),0.16)]' :
                                                      'border-gray-200'
            }`}>
              <Badge status={visibleNewBest.status} />
              <h2 className={`text-4xl font-extrabold mb-4 ${
                visibleNewBest.status === 'taken' || visibleNewBest.status === 'error'
                  ? 'text-gray-300 line-through' : 'text-gray-900'
              }`}>
                {visibleNewBest.name}
                <span className={
                  visibleNewBest.status === 'taken' || visibleNewBest.status === 'error'
                    ? 'text-purple-200' : 'text-purple-600'
                }>.{visibleNewBest.ext}</span>
              </h2>

              {visibleNewBest.status === 'available' && <Price result={visibleNewBest} large />}

              <Action result={visibleNewBest} large />
            </div>
          )}

          {/* New domains: other TLDs */}
          {hasSearchQuery && searchMode === 'new' && visibleNewOthers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleNewOthers.map((item, i) => (
                <div key={i} className={`domain-search-card bg-white border rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_32px_rgba(79,70,229,0.12)] hover:-translate-y-0.5 transition-all duration-200 ${
                  item.status === 'taken'       ? 'border-gray-100 opacity-60' :
                  item.status === 'error'       ? 'border-gray-100 opacity-60' :
                  item.status === 'marketplace' ? 'border-indigo-200 ring-1 ring-indigo-50' :
                  item.status === 'available'   ? 'border-[rgba(var(--cobrother-brand-green-rgb),0.42)] ring-1 ring-[rgba(var(--cobrother-brand-green-rgb),0.14)]' :
                                                  'border-gray-200'
                }`}>
                  <Badge status={item.status} />
                  <h2 className={`text-xl font-extrabold mb-3 ${
                    item.status === 'taken' || item.status === 'error'
                      ? 'text-gray-300 line-through' : 'text-gray-900'
                  }`}>
                    {item.name}
                    <span className={
                      item.status === 'taken' || item.status === 'error'
                        ? 'text-purple-200' : 'text-purple-500'
                    }>.{item.ext}</span>
                  </h2>

                  {item.status === 'marketplace' && item.listing && (
                    <p className="text-indigo-600 text-sm font-semibold mb-3">
                      {formatPrice(item.listing.askingPrice || 0)} · Marketplace
                    </p>
                  )}

                  {item.status === 'available' && <Price result={item} large={false} />}

                  <Action result={item} large={false} />
                </div>
              ))}
            </div>
          )}

          {hasSearchQuery && searchMode === 'new' && !loading && registrarErrorMessage && completedNewResults.every((item) => item.status === 'error') && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {registrarErrorMessage}
            </p>
          )}

          {hasSearchQuery && searchMode === 'new' && !loading && availableNewResults.length === 0 && (!registrarErrorMessage || !completedNewResults.every((item) => item.status === 'error')) && (
            <p className="text-center text-gray-500 text-sm py-6">
              No available domains found for this search. Please try another domain name.
            </p>
          )}

          {/* Premium domains */}
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
