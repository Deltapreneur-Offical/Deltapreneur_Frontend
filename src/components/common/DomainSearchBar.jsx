import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search, Loader2, ChevronRight } from 'lucide-react';
import { domainAPI, domainStorefrontAPI } from '../../api/services';
import { HOME_RESET_EVENT } from '../../utils/homeReset';
import { extractDomainList, normalizeDomainRecord } from '../../utils/domainApiAdapter';
import { listingBuyerPayable } from '../../utils/marketplaceListingPrice';
import { filterPublicMarketplaceListings, isPublicMarketplaceListing } from '../../utils/listingVisibility';
import useAIDomains from '../../hooks/useAIDomains';
import { useCurrency } from '../../context/CurrencyContext';
import { fetchAvailableTldsPage, fetchAvailableTldsChunk, fetchAvailableTlds, DOMAIN_SEARCH_CHUNK_SIZE } from '../../utils/availableTlds';
import { preferredTldRank, normalizeDomainLabel, normalizeDomainExtension, normalizeSearchFqdn } from '../../utils/domainSearch';
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

const PREMIUM_LOADING_MESSAGES = 3;
const SEARCH_MODE_IDS = ['new', 'ai', 'premium', 'auction'];
const SEARCH_MODE_CONFIG = {
  ai: { labelKey: 'searchTabAi', placeholderKey: 'searchPlaceholderAi' },
  new: { labelKey: 'searchTabNew', placeholderKey: 'searchPlaceholderNew' },
  premium: { labelKey: 'searchTabPremium', placeholderKey: 'searchPlaceholderPremium' },
  auction: { labelKey: 'searchTabAuction', placeholderKey: 'searchPlaceholderAuction' },
};

/** Preferred display order for hero TLD price pills (prices come from storefront API). */
const TLD_MARQUEE_ORDER = ['.com', '.in', '.net', '.org', '.co', '.io', '.ai'];
const TLD_MARQUEE_CACHE_KEY = 'cb-tld-marquee-registration-prices';

function normalizeTldKey(raw) {
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return '';
  return text.startsWith('.') ? text : `.${text}`;
}

function tldPricesFromByTldMap(byTld) {
  if (!byTld || typeof byTld !== 'object') return [];

  const normalized = {};
  Object.entries(byTld).forEach(([key, value]) => {
    const tld = normalizeTldKey(key);
    const price = Number(value);
    if (tld && Number.isFinite(price) && price > 0) normalized[tld] = price;
  });

  const known = TLD_MARQUEE_ORDER.filter((tld) => normalized[tld] != null);
  const extras = Object.keys(normalized)
    .filter((tld) => !TLD_MARQUEE_ORDER.includes(tld))
    .sort((a, b) => a.localeCompare(b));

  return [...known, ...extras].map((tld) => ({ tld, price: normalized[tld] }));
}

function readTldMarqueeCache() {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(TLD_MARQUEE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const tld = normalizeTldKey(item?.tld);
        const price = Number(item?.price);
        return tld && Number.isFinite(price) && price > 0 ? { tld, price } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeTldMarqueeCache(items) {
  if (typeof sessionStorage === 'undefined' || !Array.isArray(items) || items.length === 0) return;
  try {
    sessionStorage.setItem(TLD_MARQUEE_CACHE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const reduceMotion = useReducedMotion();
  const [tldPrices, setTldPrices] = useState(() => readTldMarqueeCache());
  const [isLoading, setIsLoading] = useState(() => readTldMarqueeCache().length === 0);

  const maskRef = useRef(null);
  const trackRef = useRef(null);
  const scrubbingRef = useRef(false);
  const lastPointerXRef = useRef(null);
  const baseOffsetRef = useRef(0);
  const durationSec = 48;

  useEffect(() => {
    let isCancelled = false;

    const applyItems = (items) => {
      if (isCancelled || !items.length) return;
      setTldPrices((prev) => {
        const same =
          prev.length === items.length
          && prev.every((p, i) => p.tld === items[i].tld && Number(p.price) === Number(items[i].price));
        return same ? prev : items;
      });
      writeTldMarqueeCache(items);
      setIsLoading(false);
    };

    const fromStorefront = domainStorefrontAPI
      .getPrices()
      .then(({ data }) => {
        const payload = data?.data ?? data;
        return tldPricesFromByTldMap(payload?.registration?.byTld);
      })
      .catch(() => []);

    const fromSearchTlds = fetchAvailableTlds('domain', { force: true })
      .then((fetchedItems) => {
        if (!Array.isArray(fetchedItems) || fetchedItems.length === 0) return [];
        const byTld = {};
        fetchedItems.forEach((it) => {
          const tld = normalizeTldKey(it?.tld);
          const price = Number(it?.registrationPrice ?? it?.unitPrice ?? it?.price);
          if (tld && Number.isFinite(price) && price > 0) byTld[tld] = price;
        });
        return tldPricesFromByTldMap(byTld);
      })
      .catch(() => []);

    fromSearchTlds.then((items) => {
      if (isCancelled || !items.length) return;
      setTldPrices((prev) => (prev.length > 0 ? prev : items));
      if (items.length) setIsLoading(false);
    });

    fromStorefront.then((items) => {
      if (items.length) applyItems(items);
      else if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const readTrackOffsetPx = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const style = window.getComputedStyle(track);
    const matrix = style.transform;
    if (!matrix || matrix === 'none') return 0;
    // matrix(a, b, c, d, tx, ty) or matrix3d(...)
    if (matrix.startsWith('matrix3d(')) {
      const parts = matrix.slice(9, -1).split(',').map((v) => Number(v.trim()));
      return Number.isFinite(parts[12]) ? parts[12] : 0;
    }
    if (matrix.startsWith('matrix(')) {
      const parts = matrix.slice(7, -1).split(',').map((v) => Number(v.trim()));
      return Number.isFinite(parts[4]) ? parts[4] : 0;
    }
    return 0;
  };

  const oneSetWidth = () => {
    const track = trackRef.current;
    if (!track) return 0;
    // Two identical sets → loop width is half the track.
    return track.scrollWidth / 2;
  };

  const wrapOffset = (value) => {
    const w = oneSetWidth();
    if (!(w > 0) || !Number.isFinite(value)) return value;
    let next = value % w;
    if (next > 0) next -= w;
    if (next <= -w) next += w;
    return next;
  };

  const setPausedClass = (on) => {
    maskRef.current?.classList.toggle('tld-price-marquee-mask--paused', on);
  };

  const freezeAtCurrent = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const x = wrapOffset(readTrackOffsetPx());
    track.style.animation = 'none';
    track.style.transform = `translate3d(${x}px,0,0)`;
    baseOffsetRef.current = x;
    return x;
  };

  const resumeAutoFrom = (offsetPx) => {
    const track = trackRef.current;
    if (!track) return;
    const w = oneSetWidth();
    const x = wrapOffset(offsetPx);
    // Negative delay resumes the CSS loop from the current pixel.
    const progress = w > 0 ? (Math.abs(x) % w) / w : 0;
    const delaySec = -(progress * durationSec);
    track.style.animation = 'none';
    track.style.transform = '';
    // Force reflow so the browser restarts the animation cleanly.
    void track.offsetWidth;
    track.style.animation = `tld-price-marquee-scroll ${durationSec}s linear infinite`;
    track.style.animationDelay = `${delaySec}s`;
  };

  const onMouseEnter = (event) => {
    if (reduceMotion) return;
    scrubbingRef.current = true;
    lastPointerXRef.current = event.clientX;
    freezeAtCurrent();
    setPausedClass(true);
  };

  const onMouseLeave = () => {
    if (reduceMotion) return;
    scrubbingRef.current = false;
    lastPointerXRef.current = null;
    setPausedClass(false);
    resumeAutoFrom(baseOffsetRef.current);
  };

  const onPointerMove = (event) => {
    if (reduceMotion || !scrubbingRef.current) return;
    if (lastPointerXRef.current == null) {
      lastPointerXRef.current = event.clientX;
      return;
    }
    const dx = event.clientX - lastPointerXRef.current;
    lastPointerXRef.current = event.clientX;
    if (!dx) return;
    const track = trackRef.current;
    if (!track) return;
    const next = wrapOffset(baseOffsetRef.current + dx);
    baseOffsetRef.current = next;
    track.style.transform = `translate3d(${next}px,0,0)`;
  };

  const onPointerDown = (event) => {
    if (reduceMotion || event.pointerType === 'mouse') return;
    scrubbingRef.current = true;
    lastPointerXRef.current = event.clientX;
    freezeAtCurrent();
    setPausedClass(true);
  };

  const onPointerUp = (event) => {
    if (reduceMotion || event.pointerType === 'mouse') return;
    scrubbingRef.current = false;
    lastPointerXRef.current = null;
    setPausedClass(false);
    resumeAutoFrom(baseOffsetRef.current);
  };

  const renderSet = (setKey, hidden) => (
    <div
      className="tld-price-marquee-set"
      aria-hidden={hidden || undefined}
    >
      {tldPrices.map((item) => (
        <div key={`${setKey}-${item.tld}`} className="tld-price-marquee-pill">
          <span className="tld-price-marquee-pill__tld">{item.tld}</span>
          <span className="tld-price-marquee-pill__price">
            {formatPrice(Number(item.price))}
            <span className="tld-price-marquee-pill__yr">{t('domainCardYearSuffix', { defaultValue: '/yr' })}</span>
          </span>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div
        className="tld-price-marquee-mask tld-price-marquee-mask--loading"
        aria-busy="true"
        aria-label={t('domainSearchLoadingTldPrices', { defaultValue: 'Loading domain extension prices' })}
      >
        <div className="tld-price-marquee-loading-track">
          {TLD_MARQUEE_ORDER.map((tld) => (
            <div key={tld} className="tld-price-marquee-skeleton-pill">
              <span className="tld-price-marquee-skeleton-tld">{tld}</span>
              <span className="tld-price-marquee-skeleton-bar" aria-hidden />
              <span className="tld-price-marquee-skeleton-yr">{t('domainCardYearSuffix', { defaultValue: '/yr' })}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tldPrices.length === 0) return null;

  return (
    <div
      ref={maskRef}
      className="tld-price-marquee-mask"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="tld-price-marquee-viewport">
        <div
          ref={trackRef}
          className={`tld-price-marquee-track${reduceMotion ? '' : ' tld-price-marquee-track--auto'}`}
          style={reduceMotion ? undefined : { animationDuration: `${durationSec}s` }}
        >
          {renderSet('a', false)}
          {renderSet('b', true)}
        </div>
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

/** Strip vendor names (e.g. OpenProvider) from user-facing registrar errors. */
function sanitizeRegistrarErrorMessage(raw) {
  const text = toSafeText(raw).trim();
  if (!text) return '';
  if (/open\s*provider/i.test(text)) {
    return 'Could not fetch available extensions from the registrar. Please try again shortly.';
  }
  return text;
}

function toSafeLower(value) {
  const text = toSafeText(value);
  if (typeof text === 'string') return text.toLowerCase();
  return '';
}

const LIGHTNING_TAIL_MS = 2400;
const LIGHTNING_TAIL_RETRIGGER_MS = 120;

/** One-shot premium light streak on the clicked/focused host (not a loop). */
function triggerLightningTail(host) {
  if (!host || typeof host.classList === 'undefined') return;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  // Coalesce click+focus that fire together on the same interaction.
  if (host._lightningTailAt && now - host._lightningTailAt < LIGHTNING_TAIL_RETRIGGER_MS) {
    return;
  }
  host._lightningTailAt = now;
  host.classList.remove('brand-lightning-tail--play');
  // Force reflow so replaying the same class restarts the animation.
  void host.offsetWidth;
  host.classList.add('brand-lightning-tail--play');
  window.clearTimeout(host._lightningTailTimer);
  host._lightningTailTimer = window.setTimeout(() => {
    host.classList.remove('brand-lightning-tail--play');
  }, LIGHTNING_TAIL_MS);
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
  onTabInteract,
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
        onClick={(event) => {
          triggerLightningTail(event.currentTarget);
          onTabInteract?.(event.currentTarget);
          onTabChange(tabId);
        }}
        className={`brand-lightning-host brand-lightning-host--ring ${buttonClassName}`}
        {...idleMotionProps}
      >
        {useMotionPill && isActive ? (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-full brand-search-tab-pill-fill shadow-[0_0_0_1px_rgba(14,165,233,0.22),0_4px_14px_rgba(2,132,199,0.12)]"
            transition={heroTabSpring}
            aria-hidden="true"
          />
        ) : null}
        <span className="brand-lightning-tail" aria-hidden="true" />
        <span className={`relative z-10 ${isActive ? 'text-sky-950' : ''}`}>
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
  const [premiumVisibleCount, setPremiumVisibleCount] = useState(15);
  const [resultsAnimKey, setResultsAnimKey] = useState(0);
  const registryPremiumAbortRef = useRef(null);
  const debounceRef           = useRef(null);
  const newSearchCacheRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const desktopSearchFrameRef = useRef(null);
  const mobileSearchFrameRef = useRef(null);

  const playSearchBarLightning = useCallback(() => {
    triggerLightningTail(desktopSearchFrameRef.current);
    triggerLightningTail(mobileSearchFrameRef.current);
  }, []);
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
    setPremiumVisibleCount(15);
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
    const name = normalizeDomainLabel(raw);
    const ext = normalizeDomainExtension(raw);
    if (!name || !ext) return null;
    return [{ name, ext }];
  };

  const mapTldItem = (item, label) => {
    const tld = (item.tld || '').replace(/^\./, '');
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
      renewalPrice: data.renewalPrice ?? data.renewalPriceInr ?? null,
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

    // Hard timeout (above the backend's 30s cap) so loading never hangs.
    const timeoutId = setTimeout(() => controller.abort(), 35_000);

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
        // Timed out or cancelled — still clear loading state.
        if (requestIdRef.current === currentRequestId) {
          setRegistryPremiumLoading(false);
        }
        return;
      }
      setRegistryPremiumItems([]);
    } finally {
      clearTimeout(timeoutId);
      if (requestIdRef.current === currentRequestId) {
        setRegistryPremiumLoading(false);
      }
    }
  }, []);

  const searchAllTlds = async (raw, force = false, currentRequestId) => {
    const q = toSafeLower(raw).trim();
    if (!q) return;

    const label = normalizeDomainLabel(q);
    const fqdn = normalizeSearchFqdn(q);
    if (!label || !fqdn) return;
    const cacheKey = `all-tlds:${label}`;

    setRegistrySegment(REGISTRY_PREMIUM_SEGMENT.STANDARD);
    setPremiumVisibleCount(15);
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
          const registrarMessage = sanitizeRegistrarErrorMessage(
            err?.response?.data?.message
            || err?.response?.data?.error
            || err?.message
            || 'Could not fetch available extensions.',
          );
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
          || t('domainSearchRegistrarCheckFailed', { defaultValue: 'Could not check this domain with the registrar.' });
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

  // Query-only deps: keep the text across pills, but do not search Domain
  // Register just because the user switched onto that pill.
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
  }, [query]);

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
  }, [query]);

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
    newSearchCacheRef.current.clear();
    clearAllSearchResults();
    setSearchMode(tabId);
  };

  const completedNewResults = results.filter((item) => item.status !== 'loading');
  // The exact domain the user typed (e.g. "batter.org"); empty when label-only.
  const searchedFqdn = normalizedQuery.includes('.') ? normalizedQuery : '';
  const availableNewResults = completedNewResults
    // Never drop valid TLDs (including premiums) — only prioritise the order.
    .filter((item) => item.status === 'available' || item.available === true)
    .sort((a, b) => {
      const aDomain = String(a.domain || '').toLowerCase();
      const bDomain = String(b.domain || '').toLowerCase();

      // 1. Exact searched domain always first (Case 2: "batter.org").
      if (searchedFqdn) {
        if (aDomain === searchedFqdn && bDomain !== searchedFqdn) return -1;
        if (bDomain === searchedFqdn && aDomain !== searchedFqdn) return 1;
      }

      // 2. Preferred/default TLD order.
      const aRank = preferredTldRank(a.ext || a.tld);
      const bRank = preferredTldRank(b.ext || b.tld);
      if (aRank !== bRank) return aRank - bRank;

      // 3. Remaining TLDs by price ascending.
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
      if (!byDomain.has(domain)) {
        byDomain.set(domain, it);
      } else {
        const existing = byDomain.get(domain);
        const existingRenew = existing.renewalPrice ?? existing.renewalPriceInr ?? null;
        const newRenew = it.renewalPrice ?? it.renewalPriceInr ?? null;
        const existingReg = existing.registrationPrice ?? existing.unitPrice ?? null;
        const newReg = it.registrationPrice ?? it.unitPrice ?? null;
        byDomain.set(domain, {
          ...existing,
          ...it,
          isPremium: true,
          renewalPrice: newRenew ?? existingRenew,
          renewalPriceInr: newRenew ?? existingRenew,
          registrationPrice: newReg ?? existingReg,
        });
      }
    };
    availableNewResults.forEach(add);
    (registryPremiumItems || []).forEach(add);
    return Array.from(byDomain.values()).sort((a, b) => {
      const aDomain = String(a.domain || '').toLowerCase();
      const bDomain = String(b.domain || '').toLowerCase();

      // 1. Premium version of the exact searched domain first.
      if (searchedFqdn) {
        if (aDomain === searchedFqdn && bDomain !== searchedFqdn) return -1;
        if (bDomain === searchedFqdn && aDomain !== searchedFqdn) return 1;
      }

      // 2. Common/preferred TLDs (.com, .ai, .org, .net, .io, .co, …).
      const aRank = preferredTldRank(a.tld || a.ext);
      const bRank = preferredTldRank(b.tld || b.ext);
      if (aRank !== bRank) return aRank - bRank;

      // 3. Remaining premiums by price ascending.
      return (Number(a.registrationPrice) || Infinity) - (Number(b.registrationPrice) || Infinity);
    });
  }, [availableNewResults, registryPremiumItems, searchedFqdn]);

  const premiumSlice = useMemo(
    () => premiumNewResults.slice(0, premiumVisibleCount),
    [premiumNewResults, premiumVisibleCount],
  );
  const premiumHasMore = premiumNewResults.length > premiumVisibleCount || tldHasMore;

  const handleLoadMorePremium = useCallback(() => {
    setPremiumVisibleCount((c) => c + 15);
    if (tldHasMore && !tldLoadingMore) {
      loadMoreTlds(normalizeDomainLabel(normalizedQuery));
    }
  }, [tldHasMore, tldLoadingMore, loadMoreTlds, normalizedQuery]);

  const visibleNewResults =
    registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
      ? premiumSlice
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

  const registrarErrorMessage = sanitizeRegistrarErrorMessage(
    completedNewResults.find((item) => item.registrarMessage)?.registrarMessage
    || (completedNewResults.length > 0 && completedNewResults.every((item) => item.status === 'error')
      ? completedNewResults[0]?.registrarMessage
      : '')
    || '',
  );
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
  const onSearchFrameInteract = (event) => {
    triggerLightningTail(event.currentTarget);
  };

  const onTabInteract = () => {
    // Also light the search bar when user switches Domain Names / AI / etc.
    playSearchBarLightning();
  };

  const desktopSearchForm = (
    <div
      ref={desktopSearchFrameRef}
      className="brand-lightning-host brand-lightning-host--ring brand-search-frame relative w-full rounded-2xl sm:rounded-full"
      onClick={onSearchFrameInteract}
      onFocusCapture={onSearchFrameInteract}
    >
      <span className="brand-lightning-tail" aria-hidden="true" />
      <form
        onSubmit={handleSearch}
        className="search-glow-focus brand-search-shell relative z-[1] flex w-full flex-row items-center gap-2 overflow-hidden rounded-2xl border bg-white py-2 pl-4 pr-2 transition-all duration-300 sm:pl-5 sm:rounded-full"
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
    </div>
  );

  const mobileSearchForm = (
    <div
      ref={mobileSearchFrameRef}
      className={`brand-lightning-host brand-lightning-host--ring brand-search-frame relative w-full rounded-2xl sm:rounded-full ${embedded ? '' : 'mx-auto max-w-[760px]'}`}
      onClick={onSearchFrameInteract}
      onFocusCapture={onSearchFrameInteract}
    >
      <span className="brand-lightning-tail" aria-hidden="true" />
      <form
        onSubmit={handleSearch}
        className="search-glow-focus brand-search-shell relative z-[1] w-full flex flex-row items-center bg-white rounded-2xl sm:rounded-full border overflow-hidden px-4 sm:pl-6 sm:pr-3 py-2.5 gap-2 flex-1 transition-all duration-300"
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
    </div>
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
              onTabInteract={onTabInteract}
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
              onTabInteract={onTabInteract}
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
            <AIDomainGrid
              results={aiDomains}
              shareContext={{ shareType: 'AI_BRAND_DOMAIN', originalQuery: query }}
            />
          )}

          {hasSearchQuery && searchMode === 'ai' && !aiLoading && !aiError && aiDomains.length === 0 && (
            <p className="text-left text-gray-500 text-sm py-4">
              {t('searchAiEmptyHint')}
            </p>
          )}

          {/* Domain Names — Standard / Premium (same as Storefront) */}
          {hasSearchQuery && searchMode === 'new' && (
            availableNewResults.length > 0
            || registryPremiumLoading
            || premiumNewResults.length > 0
            || tldLoading
          ) && (
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <RegistryPremiumSegment
                  value={registrySegment}
                  onChange={handleRegistrySegmentChange}
                  standardCount={standardNewResults.length}
                  premiumCount={premiumNewResults.length}
                  premiumLoading={registryPremiumLoading}
                  standardLoading={tldLoading}
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
                        {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                          ? t('domainSearchPremiumResultCount', {
                            defaultValue: '{{shown}} of {{total}} - sorted by price',
                            shown: visibleNewResults.length,
                            total: premiumNewResults.length,
                          })
                          : t('domainSearchStandardResultCount', {
                            defaultValue: '{{count}} shown - sorted by price',
                            count: visibleNewResults.length,
                          })}
                        {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM && registryPremiumLoading
                          ? t('domainSearchUpdatingSuffix', { defaultValue: ' - updating...' })
                          : ''}
                      </span>
                    </div>
                    <div
                      className={
                        registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                          ? 'premium-results-stagger'
                          : 'standard-results-stagger'
                      }
                    >
                      <DomainCardGrid
                        items={visibleNewResults}
                        featuredFirst
                        shareContext={{ shareType: 'DOMAIN_SEARCH', originalQuery: query }}
                        skeletonCount={
                          registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && tldLoading
                            ? tldSkeletonCount
                            : 0
                        }
                      />
                    </div>
                    {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM && premiumHasMore ? (
                      <div className="flex justify-center pt-4">
                        <button
                          type="button"
                          onClick={handleLoadMorePremium}
                          disabled={tldLoadingMore}
                          className="inline-flex items-center gap-2 text-sm font-bold text-white bg-amber-700 hover:bg-amber-600 disabled:opacity-60 px-6 h-11 rounded-xl transition-all shadow-sm select-none"
                        >
                          {tldLoadingMore ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {t('domainSearchLoadingPremiumDomains', { defaultValue: 'Loading Premium Domains...' })}
                            </>
                          ) : (
                            <>
                              {t('domainSearchLoadMorePremiumDomains', { defaultValue: 'Load More Premium Domains' })}
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
                    {registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && tldLoading ? (
                      <DomainExtensionsLoader />
                    ) : null}
                  </>
                ) : registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && tldLoading ? (
                  <DomainExtensionsLoader skeletonCount={tldSkeletonCount} />
                ) : (
                  <div
                    className={`flex items-center gap-2.5 text-xs rounded-xl border p-4 ${
                      registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                        ? 'text-amber-900/80 bg-amber-50/50 border-amber-100'
                        : 'text-sky-900/80 bg-sky-50/50 border-sky-100'
                    }`}
                  >
                    {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                      ? (registryPremiumLoading
                        ? t('domainSearchSearchingPremiumMarketplace', { defaultValue: 'Searching premium marketplace...' })
                        : t('domainSearchNoPremiumDomains', { defaultValue: 'No premium domains found. Try another keyword.' }))
                      : t('domainSearchNoStandardDomains', { defaultValue: 'No standard domains in these results. Try Premium Domains.' })}
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
                .standard-results-stagger .domain-search-card {
                  animation: registryResultsEnter 300ms ease-out both;
                  box-shadow:
                    0 0 0 1px rgba(125, 211, 252, 0.22),
                    0 8px 28px rgba(2, 132, 199, 0.1),
                    0 0 24px rgba(56, 189, 248, 0.14);
                }
                .standard-results-stagger .domain-search-card--featured {
                  animation-delay: 40ms;
                }
                .standard-results-stagger .grid .domain-search-card:nth-child(1) { animation-delay: 90ms; }
                .standard-results-stagger .grid .domain-search-card:nth-child(2) { animation-delay: 140ms; }
                .standard-results-stagger .grid .domain-search-card:nth-child(3) { animation-delay: 190ms; }
                .standard-results-stagger .grid .domain-search-card:nth-child(n+4) { animation-delay: 230ms; }
              `}</style>
            </div>
          )}

          {hasSearchQuery && searchMode === 'new' && !tldLoading && tldHasMore
            && registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadMoreTlds(normalizeDomainLabel(normalizedQuery))}
                disabled={tldLoadingMore}
                className="inline-flex items-center gap-2 text-sm font-bold text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-60 px-6 h-11 rounded-xl transition-all shadow-sm select-none"
              >
                {tldLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('loading', { defaultValue: 'Loading...' })}
                  </>
                ) : (
                  <>
                    {t('viewMore', { defaultValue: 'View More' })}
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
              {t('domainSearchNoAvailableDomains', { defaultValue: 'No available domains found for this search. Please try another domain name.' })}
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
                  className="domain-search-card bg-white border border-blue-200 ring-1 ring-blue-50 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
                >
                  <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mb-3 bg-blue-100 text-blue-700">
                    {t('domainSearchListedDomainBadge', { defaultValue: 'Listed Domain' })}
                  </span>
                  <h2 className="text-xl font-extrabold mb-3 text-gray-900 truncate" title={`${item.domainName || ''}${item.domainExtension || ''}`}>
                    <span translate="no">{item.domainName}</span><span translate="no" className="text-blue-600">{item.domainExtension}</span>
                  </h2>
                  <p className="text-blue-600 text-sm font-semibold mb-1 truncate tabular-nums" title={formatPrice(listingBuyerPayable(item))}>
                    {formatPrice(listingBuyerPayable(item))}
                  </p>
                  <p className="text-[11px] font-medium text-gray-400 mb-4">
                    {t('inclusiveTaxes', { defaultValue: 'Inclusive of applicable taxes' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/domains?highlight=${item.id}`)}
                    className="px-5 py-2 rounded-lg font-bold text-sm transition-all bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {t('domainSearchViewOnMarketplace', { defaultValue: 'View on Marketplace' })} →
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
                const title = domainTitleFromAuction(auction) || t('domainSearchUnnamedDomain', { defaultValue: 'Unnamed domain' });
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
                      {t('domainSearchLiveAuctionBadge', { defaultValue: 'Live Auction' })}
                    </span>
                    <h2 className="text-xl font-extrabold mb-3 text-gray-900 truncate" translate="no">{title}</h2>
                    <p className="text-sm text-gray-600 mb-1">
                      {currentBid > 0
                        ? t('domainSearchCurrentHighestBid', { defaultValue: 'Current highest bid' })
                        : t('domainSearchStartingBid', { defaultValue: 'Starting bid' })}
                    </p>
                    <p className="font-extrabold text-xl text-amber-600 mb-3">
                      {formatPrice(amount)}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('domainSearchBidsPlaced', { defaultValue: '{{count}} bids placed', count: totalBids })}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/auction/${auction.id}`)}
                      className="px-5 py-2 rounded-lg font-bold text-sm transition-all bg-gray-900 text-white hover:bg-gray-700"
                    >
                      {t('bidNow', { defaultValue: 'Bid Now' })}
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

        /* Thick orange/red border comet — search bar + pills */
        .brand-lightning-host {
          position: relative;
          isolation: isolate;
        }

        .brand-search-frame {
          overflow: visible;
        }

        .brand-lightning-tail {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 5;
          border-radius: inherit;
          overflow: hidden;
          opacity: 0;
        }

        .brand-lightning-host--ring > .brand-lightning-tail {
          /* Hairline ring — no leftover fill/shade on the control */
          inset: -1px;
          padding: 1px;
          background: transparent;
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
        }

        .brand-lightning-host--ring > .brand-lightning-tail::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 260%;
          aspect-ratio: 1;
          transform: translate(-50%, -50%) rotate(0deg);
          opacity: 0;
          /* Soft purple comet — no hard white tip that can flash at the end */
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 200deg,
            rgba(124, 58, 237, 0.15) 235deg,
            rgba(147, 51, 234, 0.45) 270deg,
            rgba(168, 85, 247, 0.75) 300deg,
            rgba(192, 132, 252, 0.9) 325deg,
            rgba(167, 139, 250, 0.55) 345deg,
            transparent 360deg
          );
          filter: drop-shadow(0 0 4px rgba(147, 51, 234, 0.55));
        }

        .brand-lightning-host.brand-lightning-tail--play > .brand-lightning-tail {
          animation: brand-lightning-veil 2.2s cubic-bezier(0.33, 0, 0.2, 1) forwards;
        }

        .brand-lightning-host--ring.brand-lightning-tail--play > .brand-lightning-tail::before {
          animation: brand-lightning-border-orbit 2.2s cubic-bezier(0.33, 0, 0.2, 1) forwards;
        }

        /* Whole layer eases out so nothing snaps or leaves a tint */
        @keyframes brand-lightning-veil {
          0% {
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          62% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes brand-lightning-border-orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          58% {
            opacity: 0.95;
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-lightning-host.brand-lightning-tail--play > .brand-lightning-tail,
          .brand-lightning-host.brand-lightning-tail--play > .brand-lightning-tail::before {
            animation: none !important;
            opacity: 0 !important;
          }
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

        .brand-search-tab-pill-fill {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 45%, #bae6fd 100%);
        }

        .brand-search-tab-active {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 45%, #bae6fd 100%);
          color: #0c4a6e;
          box-shadow:
            0 0 0 1px rgba(14, 165, 233, 0.22),
            0 4px 14px rgba(2, 132, 199, 0.12);
          border: 1px solid rgba(125, 211, 252, 0.85);
          overflow: visible;
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
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%);
          color: #0c4a6e;
          border-color: rgba(56, 189, 248, 0.9);
          box-shadow:
            0 0 0 1px rgba(14, 165, 233, 0.28),
            0 6px 16px rgba(2, 132, 199, 0.16);
        }

        .brand-search-tab-idle {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: none;
          overflow: visible;
          transition:
            background 0.48s cubic-bezier(0.22, 1, 0.36, 1),
            color 0.42s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.48s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.52s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .brand-search-tab-idle:hover,
        .brand-search-tab-idle:focus-visible {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 45%, #bae6fd 100%);
          color: #0c4a6e;
          border-color: rgba(125, 211, 252, 0.85);
          box-shadow:
            0 0 0 1px rgba(14, 165, 233, 0.22),
            0 4px 14px rgba(2, 132, 199, 0.12);
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
