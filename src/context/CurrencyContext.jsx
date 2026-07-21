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
      const result = await loadExchangeRates({ force });
      setMeta(result.fallback ? buildFallbackMetaFromRates() : result.meta);
      setRatesStale(Boolean(result.stale || result.fallback));
      setRatesUpdatedAt(result.updatedAt ?? null);
    } catch {
      setMeta(buildFallbackMetaFromRates());
      setRatesStale(true);
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
