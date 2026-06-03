import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { auctionAPI, domainAPI } from '../../api/services';
import { extractDomainList } from '../../utils/domainApiAdapter';
import { isActiveListing, isAdminCreatedListing } from '../../utils/homepageListings';
import CompactDomainTicker from '../home/domainTicker/CompactDomainTicker';

const TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildSearchKey(raw, selectedTld) {
  return `${String(raw || '').trim().toLowerCase()}::${selectedTld}`;
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
  const code = String(currency || 'INR').toUpperCase();
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
  const [tld, setTld] = useState('com');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [auctionResults, setAuctionResults] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionsLoaded, setAuctionsLoaded] = useState(false);
  const [premiumDomains, setPremiumDomains] = useState([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumLoaded, setPremiumLoaded] = useState(false);
  const debounceRef           = useRef(null);
  const newSearchCacheRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const hasSearchQuery = query.trim().length > 0;

  const parseQuery = (raw) => {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    const dot = q.indexOf('.');
    if (dot !== -1) return [{ name: q.slice(0, dot), ext: q.slice(dot + 1) }];
    // No TLD typed: check selected extension first, then others (prices differ per TLD)
    const ordered = [tld, ...TLDS.filter((ext) => ext !== tld)];
    return ordered.map((ext) => ({ name: q, ext }));
  };

  const doSearch = async (raw, options = {}) => {
    const { force = false } = options;
    const pairs = parseQuery(raw);
    if (!pairs) return;
    const cacheKey = buildSearchKey(raw, tld);
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
      priceCurrency: null,
      minPeriodYears: 1,
      listing: null,
    }));
    setResults(seededResults);
    const nextResults = seededResults.map((item) => ({ ...item }));

    await Promise.all(pairs.map(async ({ name, ext }) => {
      const fullDomain = `${name}.${ext}`;
      try {
        const { data } = await domainAPI.check(encodeURIComponent(fullDomain));
        const idx = nextResults.findIndex((r) => r.domain === fullDomain);
        if (idx !== -1) {
          nextResults[idx] = {
            ...nextResults[idx],
            status: data.status,
            price: data.price ?? null,
            priceCurrency: data.priceCurrency ?? null,
            minPeriodYears: data.minPeriodYears ?? 1,
            listing: data.listing ?? null,
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
    if (activeTab !== 'new') return;
    if (!query.trim()) { setResults([]); return; }
    const cacheKey = buildSearchKey(query, tld);
    if (newSearchCacheRef.current.has(cacheKey)) {
      clearTimeout(debounceRef.current);
      setResults(newSearchCacheRef.current.get(cacheKey));
      setLoading(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 700);
    return () => clearTimeout(debounceRef.current);
  }, [query, tld, activeTab]);

  useEffect(() => {
    if (!hasSearchQuery) {
      setActiveTab('new');
    }
  }, [hasSearchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab !== 'new') return;
    clearTimeout(debounceRef.current);
    doSearch(query, { force: true });
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

  const fetchAuctions = async () => {
    try {
      setAuctionsLoading(true);
      const [activeAuctionsRes, allDomainsRes] = await Promise.all([
        auctionAPI.getActive().catch(() => ({ data: [] })),
        domainAPI.getAll().catch(() => ({ data: [] })),
      ]);

      const activeAuctions = Array.isArray(activeAuctionsRes.data)
        ? activeAuctionsRes.data
        : Array.isArray(activeAuctionsRes.data?.data)
          ? activeAuctionsRes.data.data
          : Array.isArray(activeAuctionsRes.data?.items)
            ? activeAuctionsRes.data.items
            : [];

      const domainAuctionFallback = extractDomainList(allDomainsRes.data)
        .filter((d) => d.saleType === 'AUCTION' && d.auction)
        .filter((d) => {
          const status = String(d.auction?.status || '').toUpperCase();
          return ['ACTIVE', 'EXTENDED', 'DRAFT'].includes(status);
        })
        .map((d) => ({
          id: d.auction?.id ?? d.id,
          status: d.auction?.status ?? 'DRAFT',
          minBidPrice: Number(d.auction?.minBidPrice ?? 0),
          currentHighestBid: Number(d.auction?.currentHighestBid ?? 0),
          totalBids: Number(d.auction?.totalBids ?? 0),
          domain: {
            fullDomain: `${d.domainName || ''}${d.domainExtension || ''}`,
            domainName: d.domainName || '',
            domainExtension: d.domainExtension || '',
          },
        }));

      const mergedById = new Map();
      [...activeAuctions, ...domainAuctionFallback].forEach((item) => {
        if (!item?.id) return;
        mergedById.set(String(item.id), item);
      });
      setAuctionResults(Array.from(mergedById.values()));
    } catch {
      setAuctionResults([]);
    } finally {
      setAuctionsLoading(false);
      setAuctionsLoaded(true);
    }
  };

  const fetchPremiumDomains = async () => {
    try {
      setPremiumLoading(true);
      const { data } = await domainAPI.getAll();
      const domains = extractDomainList(data);
      const adminListed = domains.filter(
        (item) => isActiveListing(item, 'domain') && isAdminCreatedListing(item, 'domain'),
      );
      setPremiumDomains(adminListed);
    } catch {
      setPremiumDomains([]);
    } finally {
      setPremiumLoading(false);
      setPremiumLoaded(true);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'auctions' && !auctionsLoaded && !auctionsLoading) {
      fetchAuctions();
    }
    if (tabId === 'premium' && !premiumLoaded && !premiumLoading) {
      fetchPremiumDomains();
    }
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
    const q = query.trim().toLowerCase();
    const domainName = String(item.domainName || '').toLowerCase();
    const domainExtension = String(item.domainExtension || '').toLowerCase();
    const fullDomain = `${domainName}${domainExtension}`;
    if (fullDomain.includes(q) || domainName.includes(q)) return true;

    // Tolerate small typos when searching exact admin domain names.
    if (q.length >= 6) {
      return damerauLevenshteinDistance(domainName, q) <= 2;
    }
    return false;
  });
  const filteredAuctionResults = auctionResults.filter((auction) => {
    const fullDomain = (domainTitleFromAuction(auction) || '').toLowerCase();
    return fullDomain.includes(query.trim().toLowerCase());
  });

  // ── Sub-components ──────────────────────────────────────────────────────────
  const Badge = ({ status }) => {
    const map = {
      loading:     ['bg-gray-100 text-gray-400',     'CHECKING…'],
      marketplace: ['bg-indigo-100 text-indigo-700', '🏪 ON OUR MARKETPLACE'],
      available:   ['bg-emerald-100 text-emerald-700','✓ AVAILABLE'],
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
    if (!result.price) return null;
    const p = Number(result.price);
    const currency = result.priceCurrency;
    const years = result.minPeriodYears > 1 ? result.minPeriodYears : 1;
    const periodLabel = years > 1 ? `/${years} yrs` : '/yr';
    return (
      <div className="mb-4">
        <p className={`text-gray-400 line-through ${large ? 'text-base' : 'text-xs'}`}>
          {formatRegistrarPrice(p * 1.8, currency)}
        </p>
        <p className={`font-extrabold text-gray-900 ${large ? 'text-3xl' : 'text-xl'}`}>
          {formatRegistrarPrice(p, currency)}
          <span className={`font-normal text-gray-400 ml-1 ${large ? 'text-sm' : 'text-xs'}`}>
            {periodLabel}
          </span>
        </p>
        {result.status === 'available' && (
          <p className={`text-gray-500 mt-1 ${large ? 'text-xs' : 'text-[11px]'}`}>
            Registrar create price for .{result.ext} (per OpenProvider; same for any available name on this extension)
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

        {/* Desktop: compact search beside live domain feed */}
        <div className={`hidden lg:flex lg:flex-row lg:items-end gap-4 xl:gap-5 ${embedded ? 'lg:justify-start' : 'lg:justify-center'}`}>
          <div className="w-full max-w-[700px] flex-[1_1_640px] xl:max-w-[740px]">
            <form onSubmit={handleSearch}
              className="search-glow-focus flex w-full flex-row items-center gap-2 overflow-hidden rounded-2xl border border-indigo-400/40 bg-black py-2 pl-4 pr-2 shadow-[0_4px_24px_rgba(99,102,241,0.12)] transition-all duration-300 sm:pl-5 sm:rounded-full">
              <Search className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={2} />
              <input
                type="text"
                className="min-w-0 flex-1 border-none bg-transparent py-3 text-[15px] text-white-800 outline-none placeholder:text-gray-400 focus:ring-0 sm:text-base"
                placeholder={t('domainSearchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="relative flex shrink-0 items-center">
                <select
                  value={tld}
                  onChange={(e) => setTld(e.target.value)}
                  className="cursor-pointer rounded-full border border-gray-700 bg-[#111827] py-2.5 pl-4 pr-8 text-sm font-semibold text-white outline-none transition-all duration-300 hover:bg-[#1f2937] focus:border-purple-400"
                  aria-label="Domain extension"
                >
                  {TLDS.map((ext) => (
                    <option key={ext} value={ext}>
                      .{ext}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-full bg-white/95 backdrop-blur-md border border-purple-200 px-7 py-3 text-[14px] font-semibold text-gray-900 shadow-md transition-all duration-300 hover:bg-white hover:shadow-lg"
              >
                {t('search')}
              </button>
            </form>

            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                {[
                  { id: 'new', label: 'New Domains' },
                  { id: 'premium', label: 'Premium Domains' },
                  { id: 'auctions', label: 'Domain Auctions' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <CompactDomainTicker className="hidden lg:block w-full max-w-[390px] flex-[0_1_390px] self-end xl:max-w-[430px] xl:basis-[430px]" />
        </div>

        {/* Mobile / tablet */}
        <div className="lg:hidden flex flex-col items-stretch gap-3 sm:gap-4">
          <form onSubmit={handleSearch}
            className={`search-glow-focus w-full flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-2xl sm:rounded-full shadow-[0_8px_40px_rgba(99,102,241,0.2)] border-2 border-indigo-300/50 hover:border-indigo-400 hover:shadow-[0_12px_60px_rgba(99,102,241,0.35)] overflow-hidden px-4 sm:pl-6 sm:pr-3 py-3 sm:py-2.5 gap-3 sm:gap-0 flex-1 transition-all duration-300 hover:scale-[1.01] ${embedded ? '' : 'mx-auto max-w-[760px]'}`}>
            <input
              type="text"
              className="w-full min-w-0 flex-1 bg-transparent border-none outline-none text-white-800 text-base sm:text-lg placeholder:text-gray-400 py-2.5 sm:py-3 focus:ring-0"
              placeholder={t('domainSearchPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit"
              className="bg-[#232f3e] text-white py-3 px-6 sm:px-7 rounded-full text-sm sm:text-base font-semibold transition-all w-full sm:w-auto hover:bg-gray-700 hover:-translate-y-0.5 flex-shrink-0">
              {t('search')}
            </button>
          </form>
        </div>

        <div className="mt-4 flex justify-center lg:hidden">
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm">
            {[
              { id: 'new', label: 'New Domains' },
              { id: 'premium', label: 'Premium Domains' },
              { id: 'auctions', label: 'Domain Auctions' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          {hasSearchQuery && activeTab === 'new' && loading && results.every(r => r.status === 'loading') && (
            <p className="text-center text-gray-400 text-sm mb-6">Checking domains…</p>
          )}

          {/* New Domains */}
          {hasSearchQuery && activeTab === 'new' && visibleNewBest && (
            <div className={`domain-search-card domain-search-card--featured mb-8 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)] border transition-all ${
              visibleNewBest.status === 'available' ? 'border-emerald-300 ring-1 ring-emerald-50' :
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
          {hasSearchQuery && activeTab === 'new' && visibleNewOthers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleNewOthers.map((item, i) => (
                <div key={i} className={`domain-search-card bg-white border rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_32px_rgba(79,70,229,0.12)] hover:-translate-y-0.5 transition-all duration-200 ${
                  item.status === 'taken'       ? 'border-gray-100 opacity-60' :
                  item.status === 'error'       ? 'border-gray-100 opacity-60' :
                  item.status === 'marketplace' ? 'border-indigo-200 ring-1 ring-indigo-50' :
                  item.status === 'available'   ? 'border-emerald-200 ring-1 ring-emerald-50' :
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

          {hasSearchQuery && activeTab === 'new' && !loading && !visibleNewBest && (
            <p className="text-center text-gray-500 text-sm py-6">
              No registrar domains available for this query right now.
            </p>
          )}

          {/* Premium domains */}
          {hasSearchQuery && activeTab === 'premium' && premiumLoading && (
            <p className="text-center text-gray-400 text-sm mb-6">Loading premium domains…</p>
          )}
          {hasSearchQuery && activeTab === 'premium' && !premiumLoading && filteredPremiumDomains.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPremiumDomains.map((item) => (
                <div
                  key={item.id}
                  className="domain-search-card bg-white border border-indigo-200 ring-1 ring-indigo-50 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
                >
                  <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3 bg-indigo-100 text-indigo-700">
                    ADMIN LISTED
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

          {hasSearchQuery && activeTab === 'premium' && !premiumLoading && filteredPremiumDomains.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">
              No premium domains listed by admin.
            </p>
          )}

          {/* Ongoing domain auctions */}
          {hasSearchQuery && activeTab === 'auctions' && auctionsLoading && (
            <p className="text-center text-gray-400 text-sm mb-6">Loading live auctions…</p>
          )}
          {hasSearchQuery && activeTab === 'auctions' && !auctionsLoading && filteredAuctionResults.length > 0 && (
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
          {hasSearchQuery && activeTab === 'auctions' && !auctionsLoading && filteredAuctionResults.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">
              No ongoing auctions found right now.
            </p>
          )}
        </div>
      </div>

      <style>{`
        .search-glow-focus {
          box-shadow:
            -12px 0 20px -6px rgba(0,195,255,0.35),
            12px 0 20px -6px rgba(255,48,108,0.35),
            0 0 14px -3px rgba(120,80,220,0.25);
          border-color: rgba(120,80,220,0.35);
        }
      `}</style>
    </div>
  );
}
