import { currencyAPI } from '../api/services';
import { EXCHANGE_RATE_CACHE_TTL_MS, SUPPORTED_CURRENCIES } from '../constants/currencies';
import { buildMetaFromRates, buildFallbackMetaFromRates } from '../utils/currencyDisplay';

/** Bumped when rate aggregation changes — clears stale caches. */
const STORAGE_KEY = 'cobrother_exchange_rates_v3';
const LEGACY_STORAGE_KEYS = ['cobrother_exchange_rates_v1', 'cobrother_exchange_rates_v2'];

const PROVIDERS = {
  openErApi: 'https://open.er-api.com/v6/latest/INR',
  exchangeRateApiV4: 'https://api.exchangerate-api.com/v4/latest/INR',
};

function clearLegacyCaches() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** Reject pre-fix static fallbacks and other inflated snapshots. */
function isInflatedLegacyRates(rates) {
  const usd = Number(rates?.USD);
  const aed = Number(rates?.AED);
  if (Number.isFinite(usd) && usd >= 0.01052) return true;
  if (Number.isFinite(aed) && aed >= 0.03848) return true;
  return false;
}

function purgeBadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.fallback || isInflatedLegacyRates(parsed?.rates)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.rates || !parsed?.fetchedAt || parsed.fallback) return null;
    if (isInflatedLegacyRates(parsed.rates)) return null;
    if (Date.now() - parsed.fetchedAt > EXCHANGE_RATE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  if (payload.fallback) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rates: payload.rates,
        fetchedAt: Date.now(),
        updatedAt: payload.updatedAt,
        sourceUpdatedAt: payload.sourceUpdatedAt,
        source: payload.source,
        providers: payload.providers,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

function readStaleCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.rates || parsed.fallback) return null;
    if (isInflatedLegacyRates(parsed.rates)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeRatesObject(rawRates) {
  const rates = { INR: 1 };
  for (const code of SUPPORTED_CURRENCIES) {
    if (code === 'INR') continue;
    const rate = Number(rawRates[code]);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Missing or invalid rate for ${code}`);
    }
    rates[code] = rate;
  }
  return rates;
}

/**
 * Pick the lowest INR→foreign rate across providers (closest to Wise/Google mid-market).
 * Lower rate → lower displayed USD/AED for the same INR listing price.
 */
export function mergeConsumerRates(snapshots) {
  const merged = { INR: 1 };
  for (const code of SUPPORTED_CURRENCIES) {
    if (code === 'INR') continue;
    const candidates = snapshots
      .map((s) => Number(s?.[code]))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!candidates.length) {
      throw new Error(`No live rate for ${code}`);
    }
    merged[code] = Math.min(...candidates);
  }
  return merged;
}

function packPayload(rates, source, updatedAt, sourceUpdatedAt, extra = {}) {
  return {
    rates,
    meta: buildMetaFromRates(rates),
    updatedAt: updatedAt ?? sourceUpdatedAt ?? null,
    sourceUpdatedAt: sourceUpdatedAt ?? null,
    source,
    stale: false,
    fallback: false,
    ...extra,
  };
}

async function fetchOpenErApiRates() {
  const res = await fetch(PROVIDERS.openErApi, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
  const json = await res.json();
  if (json.result && json.result !== 'success') {
    throw new Error(json['error-type'] || 'open.er-api error');
  }
  return {
    rates: normalizeRatesObject(json.rates ?? {}),
    updatedAt: json.time_last_update_unix ?? null,
    name: 'open.er-api',
  };
}

async function fetchExchangeRateApiV4Rates() {
  const res = await fetch(PROVIDERS.exchangeRateApiV4, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`exchangerate-api HTTP ${res.status}`);
  const json = await res.json();
  return {
    rates: normalizeRatesObject(json.rates ?? {}),
    updatedAt: json.time_last_updated_unix ?? null,
    name: 'exchangerate-api',
  };
}

/** Aggregate live INR-base rates from multiple public providers (mid-market blend). */
export async function fetchLiveRatesFromProviders() {
  const results = await Promise.allSettled([
    fetchOpenErApiRates(),
    fetchExchangeRateApiV4Rates(),
  ]);

  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) {
    const reason = results.find((r) => r.status === 'rejected');
    throw reason?.reason ?? new Error('All exchange rate providers failed');
  }

  const merged = mergeConsumerRates(ok.map((o) => o.rates));
  const updatedAt = ok.map((o) => o.updatedAt).filter(Boolean).sort((a, b) => b - a)[0] ?? null;

  return packPayload(merged, 'live-midmarket', updatedAt, updatedAt, {
    providers: ok.map((o) => o.name),
  });
}

/** @deprecated Use fetchLiveRatesFromProviders */
export async function fetchLiveRatesFromProvider() {
  return fetchLiveRatesFromProviders();
}

function normalizeBackendResponse(data) {
  const body = data?.data ?? data;
  const rates = normalizeRatesObject(body?.rates ?? {});
  return packPayload(
    rates,
    'backend',
    body?.updatedAt ?? body?.sourceUpdatedAt ?? null,
    body?.sourceUpdatedAt ?? null,
    { cached: Boolean(body?.cached) },
  );
}

async function fetchFromBackend(force = false) {
  const { data } = await currencyAPI.getRates(force);
  return normalizeBackendResponse(data);
}

function fromCacheEntry(parsed) {
  const rates = parsed.rates;
  return {
    meta: buildMetaFromRates(rates),
    rates,
    fromCache: true,
    stale: false,
    fallback: false,
    updatedAt: parsed.updatedAt,
    source: parsed.source,
    providers: parsed.providers,
  };
}

/**
 * Load live INR-base rates: multi-provider (client) → backend → stale cache → fallback.
 */
export async function loadExchangeRates({ force = false } = {}) {
  clearLegacyCaches();
  purgeBadCache();

  if (!force) {
    const local = readCache();
    if (local?.rates) {
      return fromCacheEntry(local);
    }
  }

  const errors = [];

  try {
    const payload = await fetchLiveRatesFromProviders();
    writeCache(payload);
    return { ...payload, fromCache: false };
  } catch (err) {
    errors.push(err);
  }

  try {
    const payload = await fetchFromBackend(force);
    if (!isInflatedLegacyRates(payload.rates)) {
      writeCache(payload);
      return { ...payload, fromCache: false };
    }
  } catch (err) {
    errors.push(err);
  }

  const stale = readStaleCache();
  if (stale?.rates) {
    return {
      ...fromCacheEntry(stale),
      stale: true,
      error: errors[errors.length - 1],
    };
  }

  const fallbackMeta = buildFallbackMetaFromRates();
  return {
    meta: fallbackMeta,
    rates: Object.fromEntries(
      SUPPORTED_CURRENCIES.map((code) => [code, fallbackMeta[code]?.rateFromInr ?? 1]),
    ),
    fromCache: true,
    stale: true,
    fallback: true,
    error: errors[errors.length - 1],
  };
}
