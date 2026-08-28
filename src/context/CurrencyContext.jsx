import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { SUPPORTED_CURRENCIES, DEFAULT_LISTING_CURRENCY } from '../constants/currencies';
import {
  convertPrice,
  convertForeignToInr,
  formatInrAsCurrency,
  formatCurrency,
  getCurrencySymbol,
  buildMetaFromRates,
  buildFallbackMetaFromRates,
} from '../utils/currencyDisplay';
import { loadExchangeRates } from '../services/currencyRates';

const STORAGE_KEY = 'cobrother_currency';

/** Direct API fetch — bypasses cached currencyRates.js module. */
async function fetchRatesDirectly() {
  const supported = new Set(SUPPORTED_CURRENCIES);
  const APIs = [
    'https://open.er-api.com/v6/latest/INR',
    'https://api.exchangerate-api.com/v4/latest/INR',
  ];
  const results = await Promise.allSettled(
    APIs.map((url) => fetch(url, { cache: 'no-store' }).then((r) => r.json()))
  );
  const ok = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value?.rates ?? {});
  if (!ok.length) throw new Error('All exchange rate APIs failed');

  const merged = { INR: 1 };
  for (const code of supported) {
    if (code === 'INR') continue;
    const candidates = ok
      .map((rates) => Number(rates[code]))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (candidates.length === 0) continue;
    merged[code] = candidates.reduce((s, r) => s + r, 0) / candidates.length;
  }
  return merged;
}

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const code = (saved || DEFAULT_LISTING_CURRENCY).toUpperCase();
      return SUPPORTED_CURRENCIES.includes(code) ? code : DEFAULT_LISTING_CURRENCY;
    } catch {
      return DEFAULT_LISTING_CURRENCY;
    }
  });

  const [meta, setMeta] = useState(() => buildMetaFromRates({ INR: 1 }));
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesStale, setRatesStale] = useState(false);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

  const refreshRates = useCallback(async (force = false) => {
    setRatesLoading(true);
    try {
      // Always fetch directly from live APIs for accurate rates.
      // The shared currencyRates.js module may have stale cached data.
      const rates = await fetchRatesDirectly();
      setMeta(buildMetaFromRates(rates));
      setRatesStale(false);
    } catch {
      // Direct fetch failed — try legacy path as fallback
      try {
        const result = await loadExchangeRates({ force: true });
        setMeta(result.fallback ? buildFallbackMetaFromRates() : result.meta);
        setRatesStale(Boolean(result.stale || result.fallback));
        setRatesUpdatedAt(result.updatedAt ?? null);
      } catch {
        setMeta(buildFallbackMetaFromRates());
        setRatesStale(true);
      }
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRates(false);
  }, [refreshRates]);

  const setCurrency = useCallback((code) => {
    const upper = (code || DEFAULT_LISTING_CURRENCY).toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(upper)) return;
    setSelectedCurrencyState(upper);
    try {
      localStorage.setItem(STORAGE_KEY, upper);
    } catch {
      /* ignore */
    }
  }, []);

  const convertFromInr = useCallback(
    (inrAmount) => convertPrice(inrAmount, selectedCurrency, meta),
    [selectedCurrency, meta],
  );

  const convertToInr = useCallback(
    (amount, fromCode = selectedCurrency) => convertForeignToInr(amount, fromCode, meta),
    [selectedCurrency, meta],
  );

  const formatPrice = useCallback(
    (inrAmount, options) => formatInrAsCurrency(inrAmount, selectedCurrency, meta, options),
    [selectedCurrency, meta],
  );

  /** Domain registration prices — always 2 decimal places (matches OpenProvider). */
  const formatDomainPrice = useCallback(
    (inrAmount) =>
      formatInrAsCurrency(inrAmount, selectedCurrency, meta, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [selectedCurrency, meta],
  );

  const formatMajor = useCallback(
    (amount, code = selectedCurrency) => {
      const converted =
        code === DEFAULT_LISTING_CURRENCY
          ? safeNumberMajor(amount)
          : convertPrice(amount, code, meta);
      return formatCurrency(converted, code, meta);
    },
    [selectedCurrency, meta],
  );

  const getSymbol = useCallback(
    (code = selectedCurrency) => getCurrencySymbol(code, meta),
    [selectedCurrency, meta],
  );

  const value = useMemo(
    () => ({
      currency: selectedCurrency,
      selectedCurrency,
      setCurrency,
      setSelectedCurrency: setCurrency,
      symbol: getCurrencySymbol(selectedCurrency, meta),
      formatPrice,
      formatDomainPrice,
      formatCurrency: (amount, code = selectedCurrency, options) =>
        formatCurrency(amount, code, meta, options),
      formatMajor,
      getSymbol,
      convertFromInr,
      convertToInr,
      convertPrice: convertFromInr,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      ratesMeta: meta,
      ratesLoading,
      ratesStale,
      ratesUpdatedAt,
      refreshRates,
      loaded: !ratesLoading,
    }),
    [
      selectedCurrency,
      setCurrency,
      meta,
      formatPrice,
      formatDomainPrice,
      formatMajor,
      getSymbol,
      convertFromInr,
      convertToInr,
      ratesLoading,
      ratesStale,
      ratesUpdatedAt,
      refreshRates,
    ],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

function safeNumberMajor(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return ctx;
}

export default useCurrency;
