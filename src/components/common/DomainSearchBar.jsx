import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCurrency from '../../context/CurrencyContext';
import { Search } from 'lucide-react';
import { domainAPI } from '../../api/services';
import CompactDomainTicker from '../home/domainTicker/CompactDomainTicker';

const TLDS = ['com', 'net', 'org', 'in', 'co', 'io', 'ai'];

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
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tld, setTld] = useState('com');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef           = useRef(null);

  const parseQuery = (raw) => {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    const dot = q.indexOf('.');
    if (dot !== -1) return [{ name: q.slice(0, dot), ext: q.slice(dot + 1) }];
    // No TLD typed: check selected extension first, then others (prices differ per TLD)
    const ordered = [tld, ...TLDS.filter((ext) => ext !== tld)];
    return ordered.map((ext) => ({ name: q, ext }));
  };

  const doSearch = async (raw) => {
    const pairs = parseQuery(raw);
    if (!pairs) return;
    setLoading(true);

    // Seed skeleton rows immediately
    setResults(pairs.map(({ name, ext }) => ({
      domain: `${name}.${ext}`,
      name,
      ext,
      status:  'loading',
      price:   null,
      priceCurrency: null,
      minPeriodYears: 1,
      listing: null,
    })));

    await Promise.all(pairs.map(async ({ name, ext }) => {
      const fullDomain = `${name}.${ext}`;
      try {
        const { data } = await domainAPI.check(encodeURIComponent(fullDomain));
        // Backend returns: { status: 'marketplace'|'available'|'taken', price, listing }
        setResults(prev => prev.map(r =>
          r.domain === fullDomain
            ? {
                ...r,
                status: data.status,
                price: data.price ?? null,
                priceCurrency: data.priceCurrency ?? null,
                minPeriodYears: data.minPeriodYears ?? 1,
                listing: data.listing ?? null,
              }
            : r
        ));
      } catch {
        setResults(prev => prev.map(r =>
          r.domain === fullDomain ? { ...r, status: 'error' } : r
        ));
      }
    }));

    setLoading(false);
  };

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 700);
    return () => clearTimeout(debounceRef.current);
  }, [query, tld]);

  const handleSearch = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    doSearch(query);
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
    const currency = (result.priceCurrency || 'INR').toUpperCase();
    const years = result.minPeriodYears > 1 ? result.minPeriodYears : 1;
    const periodLabel = years > 1 ? `/${years} yrs` : '/yr';
    const formatAmount = (amount) =>
      currency === 'INR' ? formatPrice(amount) : formatRegistrarPrice(amount, currency);
    return (
      <div className="mb-4">
        <p className={`text-gray-400 line-through ${large ? 'text-base' : 'text-xs'}`}>
          {formatAmount(p * 1.8)}
        </p>
        <p className={`font-extrabold text-gray-900 ${large ? 'text-3xl' : 'text-xl'}`}>
          {formatAmount(p)}
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
          <form onSubmit={handleSearch}
            className="search-glow-focus flex w-full max-w-[700px] flex-[1_1_640px] flex-row items-center gap-2 overflow-hidden rounded-2xl border border-indigo-400/40 bg-black py-2 pl-4 pr-2 shadow-[0_4px_24px_rgba(99,102,241,0.12)] transition-all duration-300 sm:pl-5 sm:rounded-full xl:max-w-[740px]">
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

        {/* Results */}
        <div className="mt-8">
          {loading && results.every(r => r.status === 'loading') && (
            <p className="text-center text-gray-400 text-sm mb-6">Checking domains…</p>
          )}

          {/* Best match */}
          {best && (
            <div className={`domain-search-card domain-search-card--featured mb-8 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)] border transition-all ${
              best.status === 'marketplace' ? 'border-indigo-300 ring-1 ring-indigo-100' :
              best.status === 'available'   ? 'border-emerald-300 ring-1 ring-emerald-50' :
              best.status === 'loading'     ? 'border-gray-200'   :
                                              'border-red-200'
            }`}>
              <Badge status={best.status} />
              <h2 className={`text-4xl font-extrabold mb-4 ${
                best.status === 'taken' || best.status === 'error'
                  ? 'text-gray-300 line-through' : 'text-gray-900'
              }`}>
                {best.name}
                <span className={
                  best.status === 'taken' || best.status === 'error'
                    ? 'text-purple-200' : 'text-purple-600'
                }>.{best.ext}</span>
              </h2>

              {best.status === 'marketplace' && best.listing && (
                <p className="text-indigo-600 font-semibold mb-5">
                  Asking {formatPrice(best.listing.askingPrice)}
                  {best.listing.pricingDemand ? ` · ${best.listing.pricingDemand}` : ''}
                </p>
              )}

              {best.status === 'available' && <Price result={best} large />}

              <Action result={best} large />
            </div>
          )}

          {/* Grid of other TLDs */}
          {others.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {others.map((item, i) => (
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
                      {formatPrice(item.listing.askingPrice)} · Marketplace
                    </p>
                  )}

                  {item.status === 'available' && <Price result={item} large={false} />}

                  <Action result={item} large={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
