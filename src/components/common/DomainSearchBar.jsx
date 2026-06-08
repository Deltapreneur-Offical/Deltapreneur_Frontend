import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import searchIcon from '../../assets/search.png';
import searchGreenIcon from '../../assets/search_green.png';
import { domainAPI } from '../../api/services';
import { extractDomainList, normalizeDomainRecord } from '../../utils/domainApiAdapter';
import { filterPublicMarketplaceListings, isPublicMarketplaceListing } from '../../utils/listingVisibility';
import useAIDomains from '../../hooks/useAIDomains';
import AIDomainGrid from '../ai-domains/AIDomainGrid';
import AIDomainLoader from '../ai-domains/AIDomainLoader';

const TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];
const SEARCH_MODES = {
  ai: {
    label: 'AI Brand Names',
    placeholder: 'Enter your business and brand name',
  },
  new: {
    label: 'Domain Names',
    placeholder: 'Search your domain name',
  },
  premium: {
    label: 'Pre-Owned Domains',
    placeholder: 'Search premium domain name',
  },
  auction: {
    label: 'Domain Auctions',
    placeholder: 'Explore domain name auctions',
  },
};
const SEARCH_TABS = Object.entries(SEARCH_MODES).map(([id, config]) => ({
  id,
  label: config.label,
}));

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
    <span className="domain-search-icon relative inline-flex h-7 w-7 shrink-0" aria-hidden="true">
      <img
        src={searchIcon}
        alt=""
        className="domain-search-icon-img domain-search-icon-img--default h-7 w-7 object-contain transition-opacity duration-200"
      />
      <img
        src={searchGreenIcon}
        alt=""
        className="domain-search-icon-img domain-search-icon-img--hover absolute inset-0 h-7 w-7 object-contain opacity-0 transition-opacity duration-200"
      />
    </span>
  );
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

function registrarPriceSymbol(currency) {
  const code = toSafeText(currency || 'INR').toUpperCase();
  const map = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  return map[code] || `${code} `;
}

function formatRegistrarPrice(amount, currency) {
  const sym = registrarPriceSymbol(currency);
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  const formatted = n.toLocaleString('en-IN', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}

export default function DomainSearchBar({ className = '', embedded = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const placeholder = SEARCH_MODES[searchMode]?.placeholder || SEARCH_MODES.new.placeholder;
  const {
    results: aiDomains,
    loading: aiLoading,
    stage: aiStage,
    progress: aiProgress,
    error: aiError,
    generate: generateAiDomains,
    reset: resetAiDomains,
  } = useAIDomains();

  const parseQuery = (raw) => {
    const q = toSafeLower(raw).trim();
    if (!q) return null;
    const dot = q.indexOf('.');
    if (dot !== -1) return [{ name: q.slice(0, dot), ext: q.slice(dot + 1) }];
    return TLDS.map((ext) => ({ name: q, ext }));
  };

  const doSearch = async (raw, options = {}) => {
    const { force = false } = options;
    const pairs = parseQuery(raw);
    if (!pairs) return;
    const cacheKey = buildSearchKey(raw);
    if (!force && newSearchCacheRef.current.has(cacheKey)) {
      setResults(newSearchCacheRef.current.get(cacheKey));
      setLoading(false);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setLoading(true);

    // Seed skeleton rows immediately
    const seededResults = pairs.map(({ name, ext }) => ({
      domain: `${name}.${ext}`,
      name,
      ext,
      status:  'loading',
      price:   null,
      unitPrice: null,
      priceCurrency: null,
      priceSource: null,
      registrarSandbox: null,
      registrarEnv: null,
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
            priceSource: data.priceSource ?? null,
            registrarSandbox: data.registrarSandbox ?? null,
            registrarEnv: data.registrarEnv ?? null,
            minPeriodYears: data.minPeriodYears ?? 1,
            listing: onPublicMarketplace ? listing : null,
          };
        }
      } catch {
        const idx = nextResults.findIndex((r) => r.domain === fullDomain);
        if (idx !== -1) nextResults[idx] = { ...nextResults[idx], status: 'error' };
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

  useEffect(() => {
    if (searchMode === 'ai') {
      resetAiDomains();
    }
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
    requestIdRef.current += 1;
    clearTimeout(debounceRef.current);
    setSearchMode(tabId);
    resetAiDomains();
    setResults([]);
    setPremiumDomains([]);
    setAuctionResults([]);
    setLoading(false);
    setPremiumLoading(false);
    setAuctionsLoading(false);
  };

  const goToMarketplace = (listing) => {
    window.location.href = `/domains?highlight=${listing.id}`;
  };

  const goRegister = (name, ext) => {
    navigate(`/storefront?domain=${encodeURIComponent(`${name}.${ext}`)}`);
  };

  const best   = results.find(r => r.status === 'marketplace')
              || results.find(r => r.status === 'available')
              || results[0];
  const others = results.filter(r => r !== best);
  const visibleNewBest = best?.status === 'available' ? best : others.find((r) => r.status === 'available') || null;
  const visibleNewOthers = [best, ...others]
    .filter(Boolean)
    .filter((item) => item !== visibleNewBest && item.status === 'available');
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
      error:       ['bg-gray-100 text-gray-400',      'UNAVAILABLE'],
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
    if (!Number.isFinite(unit) || unit <= 0) return null;
    const currency = result.priceCurrency || 'INR';
    const years = result.minPeriodYears > 1 ? result.minPeriodYears : 1;
    const total = years > 1 ? unit * years : unit;
    const periodLabel = years > 1 ? `/${years} yrs` : '/yr';
    return (
      <div className="mb-4">
        <p className={`font-extrabold text-gray-900 ${large ? 'text-3xl' : 'text-xl'}`}>
          {formatRegistrarPrice(total, currency)}
          <span className={`font-normal text-gray-400 ml-1 ${large ? 'text-sm' : 'text-xs'}`}>
            {periodLabel}
          </span>
        </p>
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
        Taken
      </button>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative z-20 w-full ${embedded ? 'py-0' : 'py-3 pl-4 pr-4 sm:py-4 sm:pl-6 sm:pr-5 md:pl-10 lg:pl-20 lg:pr-8'} ${className}`.trim()}
    >
      <div className={`w-full ${embedded ? '' : 'mx-auto max-w-[1200px]'}`}>

        {/* Desktop: compact search and mode tabs */}
        <div className="hidden lg:flex lg:flex-row lg:items-end lg:justify-start">
          <div className="w-full max-w-[760px] flex-[1_1_700px]">
            <form onSubmit={handleSearch}
              className="search-glow-focus brand-search-shell flex w-full flex-row items-center gap-2 overflow-hidden rounded-2xl border bg-white py-2 pl-4 pr-2 transition-all duration-300 sm:pl-5 sm:rounded-full">
              <BrandSearchIcon />
              <input
                type="text"
                className="min-w-0 flex-1 border-none bg-transparent py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 sm:text-base"
                placeholder={placeholder}
                value={safeQuery}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                aria-label={t('search')}
                className="domain-search-submit brand-search-submit grid h-11 w-11 shrink-0 place-items-center rounded-full border text-white transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
              >
                <ArrowRight className="h-5 w-5 text-white" strokeWidth={2.4} />
              </button>
            </form>

            <div className="mt-3 flex justify-center">
              <div className="brand-search-tabs inline-flex items-center gap-1 rounded-full border bg-white/95 p-1">
                {SEARCH_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`min-h-9 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-semibold leading-none ${
                      searchMode === tab.id
                        ? 'brand-search-tab-active'
                        : 'brand-search-tab-idle'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile / tablet */}
        <div className="lg:hidden flex flex-col items-stretch gap-3 sm:gap-4">
          <form onSubmit={handleSearch}
            className={`search-glow-focus brand-search-shell w-full flex flex-row items-center bg-white rounded-2xl sm:rounded-full border overflow-hidden px-4 sm:pl-6 sm:pr-3 py-2.5 gap-2 flex-1 transition-all duration-300 ${embedded ? '' : 'mx-auto max-w-[760px]'}`}>
            <BrandSearchIcon />
            <input
              type="text"
              className="w-full min-w-0 flex-1 bg-transparent border-none outline-none text-slate-900 text-base sm:text-lg placeholder:text-slate-400 py-2.5 sm:py-3 focus:ring-0"
              placeholder={placeholder}
              value={safeQuery}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit"
              aria-label={t('search')}
              className="domain-search-submit brand-search-submit grid h-11 w-11 shrink-0 place-items-center rounded-full border text-white transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2">
              <ArrowRight className="h-5 w-5 text-white" strokeWidth={2.4} />
            </button>
          </form>
        </div>

        <div className="mt-3 flex justify-center pb-2 lg:hidden overflow-visible">
          <div className="brand-search-tabs brand-search-tabs-mobile flex w-full flex-wrap items-stretch justify-center gap-2 sm:gap-2.5 md:inline-flex md:w-auto md:flex-nowrap md:items-center md:gap-1 md:rounded-full md:border md:bg-white/95 md:p-1">
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`min-h-11 flex-1 basis-[calc(50%-0.25rem)] sm:min-h-12 sm:basis-[calc(50%-0.375rem)] rounded-full px-2.5 py-2 text-center text-[11.5px] sm:text-sm font-medium leading-snug md:min-h-9 md:flex-none md:basis-auto md:w-auto md:whitespace-nowrap md:px-4 md:font-semibold md:leading-none ${
                  searchMode === tab.id
                    ? 'brand-search-tab-active'
                    : 'brand-search-tab-idle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

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
              Enter a business idea to generate AI-powered domain names.
            </p>
          )}

          {hasSearchQuery && searchMode === 'new' && loading && results.every(r => r.status === 'loading') && (
            <p className="text-center text-gray-400 text-sm mb-6">Checking domains…</p>
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
                      ₹{Number(item.listing.askingPrice).toLocaleString('en-IN')} · Marketplace
                    </p>
                  )}

                  {item.status === 'available' && <Price result={item} large={false} />}

                  <Action result={item} large={false} />
                </div>
              ))}
            </div>
          )}

          {hasSearchQuery && searchMode === 'new' && !loading && !visibleNewBest && (
            <p className="text-center text-gray-500 text-sm py-6">
              No registrar domains available for this query right now.
            </p>
          )}

          {/* Premium domains */}
          {hasSearchQuery && searchMode === 'premium' && premiumLoading && (
            <p className="text-center text-gray-400 text-sm mb-6">Loading listed domains...</p>
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
                    Asking ₹{Number(item.askingPrice || 0).toLocaleString('en-IN')}
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
              No listed domains found.
            </p>
          )}

          {/* Ongoing domain auctions */}
          {hasSearchQuery && searchMode === 'auction' && auctionsLoading && (
            <p className="text-center text-gray-400 text-sm mb-6">Loading live auctions…</p>
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
                      ₹{amount.toLocaleString('en-IN')}
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
              No ongoing auctions found right now.
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

        .brand-search-tab-active,
        .brand-search-tab-idle {
          transition: none;
        }

        .brand-search-tab-active {
          background: #000000;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
          border: 1px solid #000000;
        }

        /* While hovering another tab, show only one black pill at a time */
        .brand-search-tabs:has(.brand-search-tab-idle:hover) .brand-search-tab-active,
        .brand-search-tabs:has(.brand-search-tab-idle:focus-visible) .brand-search-tab-active {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: none;
        }

        .brand-search-tab-active:hover,
        .brand-search-tab-active:focus-visible {
          background: #000000;
          color: #ffffff;
          border-color: #000000;
        }

        .brand-search-tab-idle {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: none;
        }

        .brand-search-tab-idle:hover,
        .brand-search-tab-idle:focus-visible {
          background: #000000;
          border-color: #000000;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
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

        .search-glow-focus:hover .domain-search-icon-img--default,
        .search-glow-focus:focus-within .domain-search-icon-img--default {
          opacity: 0;
        }

        .search-glow-focus:hover .domain-search-icon-img--hover,
        .search-glow-focus:focus-within .domain-search-icon-img--hover {
          opacity: 1;
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
