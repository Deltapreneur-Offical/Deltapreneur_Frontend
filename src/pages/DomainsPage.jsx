import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { pickMediaUrl } from '../utils/mediaUrl';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, LayoutDashboard, Plus, Gavel, ChevronDown, Eye, Globe } from 'lucide-react';
import EditActionLabel from '../components/common/EditActionLabel';
import ListingBackLink from '../components/common/ListingBackLink';
import '../styles/domain-listing-cards.css';
import '../styles/ventures-split-columns.css';
import DomainListingCard from '../components/listings/DomainListingCard';
import ShowcaseDomainCard from '../components/listings/ShowcaseDomainCard';
import EdgePointsRedeemToggle from '../components/profile/EdgePointsRedeemToggle';
import ListingCardShell from '../components/listings/ListingCardShell';
import OverflowMarqueeText from '../components/common/OverflowMarqueeText';
import { normalizeDomainExtension, resolveDomainDisplay } from '../utils/domainDisplay';
import { fetchSupportedTlds, getCachedSupportedTlds } from '../utils/domainSearch';
import { domainAPI, auctionAPI, domainStorefrontAPI } from '../api/services';
import AddToCartButton from '../components/cart/AddToCartButton';
import { useAuth } from '../context/AuthContext';
import useReferralTracker from '../hooks/useReferralTracker';
import { roundInr, roundMoney } from '../utils/money';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { buildOrderCurrencyPayload, convertPrice as convertInrToCurrency } from '../utils/currencyDisplay';
import { formatAuctionDateTime } from '../utils/auctionDate';
import AppLayout from '../components/layout/AppLayout';
import { useLikes } from '../hooks/useLikes';
import LikeButton from '../components/common/LikeButton';
import { useFilterSort } from '../hooks/useFilterSort';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import PageContentSkeleton from '../components/common/PageContentSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Confetti from '../components/common/Confetti';
import DomainsIcon from '../assets/CoBranding.png';
import AddonSections from '../components/addon/AddonSections';
import { addonTotal, addonLabel, ADDON_SERVICES } from '../components/addon/AddonSelector';
import { useVirtualAssistantCatalog, vaLabel, vaTotal } from '../hooks/useVirtualAssistantCatalog';
import { isPremiumDomain } from '../utils/domainPricing';
import { readApiError } from '../utils/apiError';
import { roleWaivesAuctionPlatformFees } from '../utils/adminRoles';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import SearchableCurrencySelect from '../components/common/SearchableCurrencySelect';
import FormSelect from '../components/common/FormSelect';
import { DEFAULT_LISTING_CURRENCY } from '../constants/currencies';
import { captureAppLayoutScroll, scheduleRestoreAppLayoutScroll } from '../utils/preserveAppLayoutScroll';
import { asArray } from '../utils/asArray';
import { APP_BASE_URL } from '../config/urls';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import { DOMAIN_PRICING_OPTIONS } from '../constants/listingCategories';
import { extractDomainList, normalizeDomainRecord } from '../utils/domainApiAdapter';
import { listingBuyerPayable } from '../utils/marketplaceListingPrice';
import { computeRegistrationPricing } from '../utils/domainRegistrationPricing';
import { normalizeContactInfo } from '../utils/ventureProfileUtils';
import { fetchAllListPages } from '../utils/listPagination';
import { resolveMarketplaceListingRows, isListingOwner } from '../utils/listingVisibility';
import DomainVerificationPendingBanner, { PendingVerificationDot } from '../components/domains/DomainVerificationPendingBanner';
import { isDomainPendingVerification } from '../utils/domainVerification';
import { useDomainPendingVerification } from '../hooks/useDomainPendingVerification';
import { notifyDomainVerificationChanged } from '../utils/domainVerificationEvents';

const STATUS_COLORS = {
  AVAILABLE: { color: '#6ec896', bg: 'rgba(110,200,150,0.1)', border: 'rgba(110,200,150,0.3)' },
  PENDING: { color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', border: 'rgba(200,169,110,0.3)' },
  SOLD: { color: '#c86e6e', bg: 'rgba(200,110,110,0.1)', border: 'rgba(200,110,110,0.3)' },
};

const formatInr = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function formatPriceInputAmount(value, currencyCode) {
  const code = (currencyCode || DEFAULT_LISTING_CURRENCY).toUpperCase();
  const amount = code === DEFAULT_LISTING_CURRENCY ? roundInr(value) : roundMoney(value);
  return String(amount);
}

function convertAmountBetweenCurrencies(amount, fromCurrency, toCurrency, convertToInr, ratesMeta) {
  if (amount == null || amount === '') return '';
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return amount;
  const source = (fromCurrency || DEFAULT_LISTING_CURRENCY).toUpperCase();
  const target = (toCurrency || DEFAULT_LISTING_CURRENCY).toUpperCase();
  if (source === target) return formatPriceInputAmount(numericAmount, target);

  const inrAmount =
    source === DEFAULT_LISTING_CURRENCY
      ? roundInr(numericAmount)
      : convertToInr(numericAmount, source);
  const convertedAmount =
    target === DEFAULT_LISTING_CURRENCY
      ? roundInr(inrAmount)
      : convertInrToCurrency(inrAmount, target, ratesMeta);

  return formatPriceInputAmount(convertedAmount, target);
}

function computeListingCurrencyCommission(sellerAmount, commissionPercent, currencyCode = DEFAULT_LISTING_CURRENCY) {
  const code = (currencyCode || DEFAULT_LISTING_CURRENCY).toUpperCase();
  const round = code === DEFAULT_LISTING_CURRENCY ? roundInr : roundMoney;
  const listingPrice = round(sellerAmount);
  const pct = Number(commissionPercent);
  const commissionAmount = Number.isFinite(pct) ? round((listingPrice * pct) / 100) : 0;
  const sellerEarnings = round(listingPrice - commissionAmount);

  return {
    listingPrice,
    sellerAmount: sellerEarnings,
    sellerEarnings,
    commissionAmount,
    finalListingPrice: listingPrice,
    commissionPercent: Number.isFinite(pct) ? pct : null,
  };
}

function buildDomainFormState(domain, navCurrency, ratesMeta) {
  const display = domain ? resolveDomainDisplay(domain) : { name: '', ext: null, fullDomain: '' };
  const listingCurrency = domain?.currency || navCurrency || DEFAULT_LISTING_CURRENCY;
  const storedAskingPrice = Number(domain?.askingPrice ?? 0);
  const displayAskingPrice =
    domain?.askingPrice != null
      ? convertInrToCurrency(storedAskingPrice, listingCurrency, ratesMeta)
      : '';
  return {
    domainName: ['—', 'Unnamed', 'domain'].includes(display.name) ? '' : display.name,
    logoText: domain?.logo_text ?? domain?.logoText ?? '',
    domainExtension: display.ext?.full ?? '',
    askingPrice: domain?.askingPrice != null ? formatPriceInputAmount(displayAskingPrice, listingCurrency) : '',
    pricingDemand: domain?.pricingDemand ?? '',
    currency: listingCurrency,
    saleType: domain?.saleType ?? 'ONE_TIME',
    minBidPrice: '',
    auctionDuration: 'SEVEN_DAYS',
    contactInfo: normalizeContactInfo(domain?.contactInfo, domain?.contact_info),
    agreement: { terms: false },
  };
}

export default function DomainsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { currency, getSymbol } = useCurrency();

  const { services: vaServices, loading: vaLoading } = useVirtualAssistantCatalog();
  const navigate = useNavigate();
  const location = useLocation();

  const [allDomains, setAllDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [buyTarget, setBuyTarget] = useState(null);
  const [successDomain, setSuccessDomain] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'premium' | 'standard' | 'mine'
  const [splitMobilePanel, setSplitMobilePanel] = useState('venture'); // 'venture' | 'coventure' — mobile split-panel selector
  const [showcaseDomains, setShowcaseDomains] = useState([]);
  const [showcaseEnabled, setShowcaseEnabled] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [globalNotice, setGlobalNotice] = useState('');
  const [auctionTarget, setAuctionTarget] = useState(null);
  const { pendingVerificationCount } = useDomainPendingVerification();

  useReferralTracker(detailTarget?.id, 'domain');

  const { toggle: toggleLike, get: getLike } = useLikes('DOMAIN', allDomains);

  // Merge active auction data into domain records so DomainListingCard can detect live auctions.
  const domainRows = useMemo(() => {
    const rows = asArray(allDomains);
    // If no auction data was fetched yet, return rows as-is.
    if (!rows.length) return rows;
    // Only enrich domains that have saleType AUCTION but no auction object.
    return rows.map((d) => {
      if (d.saleType !== 'AUCTION' || d.auction) return d;
      return d; // auction data not available from this endpoint — enrichment happens in useEffect below
    });
  }, [allDomains]);
  const visibleDomains = resolveMarketplaceListingRows(domainRows, { tab: activeTab, user, type: 'domain' });

  const marketplaceFilter = useFilterSort(visibleDomains, {
    searchFields: ['domainName', 'domainExtension'],
    priceField: 'askingPrice',
    categoryField: 'pricingDemand',
    dateField: 'createdAt',
  }, 20, {
    getLikeCount: (item) => getLike(item.id).count,
    resetPageWhen: activeTab,
  });

  // Showcase domains share the SAME FilterBar state/handlers as the marketplace
  // grid — one bar drives both lists, no second filter system.
  const showcaseFilterItems = useMemo(
    () =>
      showcaseDomains.map((d) => ({
        ...d,
        __source: 'showcase',
        domainExtension: d.extension || (d.tld ? `.${d.tld}` : ''),
        pricingDemand: 'Premium',
        createdAt: d.lastCheckedAt || null,
      })),
    [showcaseDomains],
  );

  const showcaseFilterConfig = useMemo(() => ({
    searchFields: ['domainName', 'name', 'domainExtension'],
    priceField: 'askingPrice',
    categoryField: 'pricingDemand',
    dateField: 'createdAt',
  }), []);

  const showcaseFilterOptions = useMemo(() => ({
    resetPageWhen: activeTab,
  }), [activeTab]);

  const showcaseFilter = useFilterSort(showcaseFilterItems, showcaseFilterConfig, 60, showcaseFilterOptions);

  // Shared FilterBar wiring — values come from the marketplace hook (both stay
  // in sync because every handler below updates both hooks).
  const search = marketplaceFilter.search;
  const category = marketplaceFilter.category;
  const minPrice = marketplaceFilter.minPrice;
  const maxPrice = marketplaceFilter.maxPrice;
  const sortBy = marketplaceFilter.sortBy;
  const activeFilterCount = marketplaceFilter.activeFilterCount;

  // Use refs for filter handlers so FilterBar's useEffect(onSearch) doesn't
  // re-trigger resetPage on every re-render of DomainsPage.
  const mfRef = useRef(null);
  mfRef.current = marketplaceFilter;
  const sfRef = useRef(null);
  sfRef.current = showcaseFilter;

  const handleSearch   = useCallback((v) => { mfRef.current.handleSearch(v);   sfRef.current.handleSearch(v); }, []);
  const handleCategory = useCallback((v) => { mfRef.current.handleCategory(v); sfRef.current.handleCategory(v); }, []);
  const handleMinPrice = useCallback((v) => { mfRef.current.handleMinPrice(v); sfRef.current.handleMinPrice(v); }, []);
  const handleMaxPrice = useCallback((v) => { mfRef.current.handleMaxPrice(v); sfRef.current.handleMaxPrice(v); }, []);
  const handleSort     = useCallback((v) => { mfRef.current.handleSort(v);     sfRef.current.handleSort(v); }, []);
  const clearAll       = useCallback(()  => { mfRef.current.clearAll();         sfRef.current.clearAll(); }, []);

  const showcaseVisibleInAll =
    activeTab === 'all' &&
    showcaseEnabled &&
    showcaseDomains.length > 0 &&
    showcaseFilter.filtered.length > 0;

  const domainListRef = useRef(null);

  const handlePageChange = (newPage) => {
    marketplaceFilter.setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadAll = activeTab === 'mine'
      ? domainAPI.getMyListings().then(({ data }) => extractDomainList(data))
      : fetchAllListPages((params) => domainAPI.getAll(params)).then(
        (items) => extractDomainList({ items, data: items }),
      );

    loadAll
      .then((rows) => {
        if (!cancelled) setAllDomains(rows);
      })
      .catch(() => {
        if (!cancelled) setAllDomains([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab]);

  // Fetch active auctions and merge auction data into domain records.
  // The /api/v1/domain/all endpoint does NOT include auction data,
  // so we fetch it separately and attach it to matching domains.
  useEffect(() => {
    let cancelled = false;
    auctionAPI.getActive({ page: 1, page_size: 200 })
      .then(({ data }) => {
        if (cancelled) return;
        const auctionItems = Array.isArray(data?.items) ? data.items : [];
        if (!auctionItems.length) return;
        // Build a map: domainId → auction object
        const auctionMap = new Map();
        for (const a of auctionItems) {
          const domainId = a.domainId || a.domain_id;
          if (domainId) auctionMap.set(String(domainId).toLowerCase(), a);
        }
        if (!auctionMap.size) return;
        // Merge auction data into domain records
        setAllDomains(prev => {
          const updated = asArray(prev).map(d => {
            const key = String(d.id).toLowerCase();
            const auction = auctionMap.get(key);
            if (auction && !d.auction) {
              return { ...d, auction };
            }
            return d;
          });
          return updated;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeTab]);

  // OpenProvider Premium Showcase (public feed) — fetched once, independent of tab.
  useEffect(() => {
    let cancelled = false;
    domainAPI
      .getShowcaseDomains()
      .then(({ data }) => {
        if (cancelled) return;
        setShowcaseDomains(data?.items || []);
        setShowcaseEnabled(!!data?.enabled);
      })
      .catch(() => {
        if (cancelled) return;
        setShowcaseDomains([]);
        setShowcaseEnabled(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (location.state?.openListDomainForm) {
      if (!user) {
        navigate('/login?redirect=' + encodeURIComponent('/domains'), { replace: true });
        return;
      }
      setActiveTab('all');
      setShowForm(true);
      setEditTarget(null);
      navigate('/domains', { replace: true, state: {} });
    }
  }, [location.state, navigate, user]);

  const { closeListingDetail, openDetailIfAllowed } = useOpenListingDetailFromUrl({
    items: domainRows,
    loading,
    setDetail: setDetailTarget,
    fetchById: async (id) => {
      const { data } = await domainAPI.get(id);
      return normalizeDomainRecord(data?.data ?? data);
    },
    listingType: 'domain',
    user,
    authLoading,
    onAccessDenied: () => {
      setGlobalNotice(t('listingDetailAccessDenied', 'This listing is not available to view yet.'));
    },
  });

  const handleDelete = async () => {
    try {
      await domainAPI.delete(deleteTarget);
      setAllDomains(d => asArray(d).filter(x => x.id !== deleteTarget));
    } catch (e) {
      alert(readApiError(e, t('domainsPageRemoveListingFailed')));
    } finally { setDeleteTarget(null); }
  };

  const refreshDomains = () =>
    fetchAllListPages((params) => domainAPI.getAll(params))
      .then((items) => setAllDomains(extractDomainList({ items, data: items })));
  return (
    <AppLayout>
      <Confetti show={showConfetti} />
      {showConfetti && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 text-center max-w-sm mx-4 animate-slideUp">
            <div className="text-5xl mb-3">🌐</div>
            <h2 className="font-display text-2xl font-extrabold text-gray-900 mb-1">{t('domainsPageListedSuccessTitle')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {t('domainsPageListedSuccessSubtitle', {
                defaultValue:
                  'Your domain has been listed successfully and is now live in the marketplace. Complete verification in Domains Dashboard to earn the Verified badge.',
              })}
            </p>
            <button
              type="button"
              className="btn-glow btn-glow-sm pointer-events-auto"
              onClick={() => navigate('/domains/dashboard')}
            >
              {t('domainsVerifyPendingAction', { defaultValue: 'Verify now' })}
            </button>
          </div>
        </div>
      )}
      <div>
        {(showForm || editTarget) ? (
          <>
            <ListingBackLink
              label={t('listingBackToDomains')}
              onClick={() => { setShowForm(false); setEditTarget(null); }}
            />
            <DomainForm
              editDomain={editTarget}
              onSaved={d => {
                const normalizedSaved = normalizeDomainRecord(d);
                const snap = captureAppLayoutScroll();
                flushSync(() => {
                  if (editTarget) {
                    setAllDomains(prev => prev.map(x => (x.id === normalizedSaved.id ? { ...x, ...normalizedSaved } : x)));
                    setDetailTarget(prev => (prev?.id === normalizedSaved.id ? { ...prev, ...normalizedSaved } : prev));
                    setBuyTarget(prev => (prev?.id === normalizedSaved.id ? { ...prev, ...normalizedSaved } : prev));
                    setSuccessDomain(prev => (prev?.id === normalizedSaved.id ? { ...prev, ...normalizedSaved } : prev));
                    setGlobalNotice(`Saved ${normalizedSaved.domainName}${normalizedSaved.domainExtension} at ${formatInr(normalizedSaved.askingPrice)}.`);
                    setEditTarget(null);
                  } else {
                    setAllDomains(prev => [normalizedSaved, ...prev]);
                    setShowForm(false);
                    setShowConfetti(true);
                    setActiveTab('mine');
                    setGlobalNotice(
                      d?._warning
                      || (isPremiumDomain(normalizedSaved)
                        ? t('domainsPagePremiumListedNotice')
                        : isDomainPendingVerification(normalizedSaved)
                          ? t('domainsVerifyPendingShort', {
                            defaultValue:
                              'Listed successfully and live in the marketplace. Complete verification in Domains Dashboard to earn the Verified badge.',
                          })
                          : ''),
                    );
                  }
                });
                scheduleRestoreAppLayoutScroll(snap);
                if (!editTarget) {
                  notifyDomainVerificationChanged();
                  setTimeout(() => setShowConfetti(false), 4000);
                }
              }}
              onCancel={() => { setShowForm(false); setEditTarget(null); }}
            />
          </>
        ) : (
          <>
            <ListingBackLink />

            {/* ── Visual polish: subtle background, refined header, tabs, filter, cards ── */}
            <style>{`
              /* Page: subtle cool-gray canvas for card separation */
              .domains-page-wrap {
                margin: 0 -0.5rem;
                padding: 1rem 0.75rem 2rem;
                background: linear-gradient(180deg, #f8f9fb 0%, #f3f4f6 100%);
                border-radius: 0.75rem;
              }
              @media (min-width: 768px) {
                .domains-page-wrap { margin: 0 -0.75rem; padding: 1.25rem 1rem 2.5rem; }
              }

              /* Header: subtle teal accent line */
              .domains-header-area {
                position: relative;
                padding: 0 0 0.75rem;
                margin: 0 0 0.5rem;
                border-bottom: 1px solid rgba(15,118,110,0.08);
                background: transparent;
                overflow: visible;
              }
              .domains-header-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 2.25rem;
                height: 2.25rem;
                border-radius: 0.6rem;
                background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
                border: 1px solid rgba(15,118,110,0.12);
                color: #0f766e;
                flex-shrink: 0;
              }

              /* Tabs: refined with brand-tinted active states */
              .domains-tab-bar {
                background: #ffffff !important;
                border: 1px solid rgba(0,0,0,0.06) !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
                padding: 3px !important;
              }
              .domains-tab-bar > button {
                transition: all 0.2s ease !important;
              }
              .domains-tab-bar > button.domains-tab--all-active {
                background: #f0fdfa !important;
                color: #0f766e !important;
                box-shadow: 0 1px 3px rgba(15,118,110,0.12), 0 0 0 1px rgba(15,118,110,0.18) !important;
              }
              .domains-tab-bar > button.domains-tab--premium-active {
                background: #FFFBF2 !important;
                color: #9A6700 !important;
                box-shadow: 0 1px 3px rgba(217,154,0,0.12), 0 0 0 1px rgba(217,154,0,0.18) !important;
              }
              .domains-tab-bar > button.domains-tab--standard-active {
                background: #f0fdfa !important;
                color: #0f766e !important;
                box-shadow: 0 1px 3px rgba(15,118,110,0.12), 0 0 0 1px rgba(15,118,110,0.18) !important;
              }
              .domains-tab-bar > button.domains-tab--mine-active {
                background: #FFFBF2 !important;
                color: #9A6700 !important;
                box-shadow: 0 1px 3px rgba(217,154,0,0.12), 0 0 0 1px rgba(217,154,0,0.18) !important;
              }

              /* FilterBar: white card with subtle shadow */
              .domains-page-wrap .filter-bar,
              .domains-page-wrap > div:has(.filter-bar) {
                background: #ffffff;
                border: 1px solid rgba(0,0,0,0.05);
                border-radius: 0.875rem;
                box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.015);
                padding: 0.75rem 1rem;
              }
              /* Search input & Newest First: teal border */
              .domains-page-wrap input[type="text"],
              .domains-page-wrap input:not([type]),
              .domains-page-wrap select.filter-sort-select {
                background: #ffffff !important;
                border-color: rgba(15,118,110,0.2) !important;
              }
              .domains-page-wrap input[type="text"]:focus,
              .domains-page-wrap input:not([type]):focus,
              .domains-page-wrap select.filter-sort-select:focus {
                border-color: rgba(15,118,110,0.4) !important;
                box-shadow: 0 0 0 3px rgba(15,118,110,0.08) !important;
                outline: none !important;
              }
              /* ONLY All Categories, Min, Max: amber border */
              .domains-page-wrap select.filter-category-select,
              .domains-page-wrap input[placeholder*="Min"],
              .domains-page-wrap input[placeholder*="Max"] {
                border-color: rgba(217,154,0,0.35) !important;
                background: #ffffff !important;
              }
              .domains-page-wrap select.filter-category-select:focus,
              .domains-page-wrap input[placeholder*="Min"]:focus,
              .domains-page-wrap input[placeholder*="Max"]:focus {
                border-color: rgba(217,154,0,0.55) !important;
                box-shadow: 0 0 0 3px rgba(217,154,0,0.1) !important;
                outline: none !important;
              }

              /* Standard domain cards: teal hover lift */
              .domain-listing-grid .listing-card-glow-shell {
                transition: transform 0.22s ease, box-shadow 0.22s ease;
              }
              .domain-listing-grid .listing-card-glow-shell:hover {
                transform: translateY(-4px);
              }
              .domain-listing-grid .listing-card-glow-shell::before {
                background: linear-gradient(135deg, rgba(15,118,110,0.1), rgba(15,118,110,0.03)) !important;
              }

              /* Premium cards: amber hover */
              .domains-split-premium .ventures-split__body .listing-card-glow-shell {
                transition: transform 0.22s ease, box-shadow 0.22s ease;
              }
              .domains-split-premium .ventures-split__body .listing-card-glow-shell:hover {
                transform: translateY(-4px);
              }
              .domains-split-premium .ventures-split__body .listing-card-glow-shell::before {
                background: linear-gradient(135deg, rgba(217,154,0,0.1), rgba(217,154,0,0.03)) !important;
              }

              /* Add-to-Cart buttons: subtle brand hover */
              .domain-listing-grid .domain-listing-card__price-cta,
              .domains-split-premium .ventures-split__body .domain-listing-card__price-cta {
                transition: all 0.2s ease;
              }
              .domains-split-premium .ventures-split__body .domain-listing-card__price-cta:hover {
                box-shadow: 0 2px 8px rgba(217,154,0,0.18);
              }
              .domain-listing-grid .domain-listing-card__price-cta:hover {
                box-shadow: 0 2px 8px rgba(15,118,110,0.18);
              }

              /* Standard domain cards: badges wrap on narrow cards */
              .domain-listing-grid .listing-card-glow-shell .pr-9 .flex.flex-wrap {
                flex-wrap: wrap !important;
              }

              /* Add-to-Cart buttons: subtle brand hover */
              .domain-listing-grid .domain-listing-card__price-cta,
              .domains-split-premium .ventures-split__body .domain-listing-card__price-cta {
                transition: all 0.2s ease;
              }
              .domains-split-premium .ventures-split__body .domain-listing-card__price-cta:hover {
                box-shadow: 0 2px 8px rgba(217,154,0,0.18);
              }
              .domain-listing-grid .domain-listing-card__price-cta:hover {
                box-shadow: 0 2px 8px rgba(15,118,110,0.18);
              }
            `}</style>

            {/* Global responsive overrides — must live outside ventures-split so they apply to single-column fallback too */}
            <style>{`
              /* Mobile: force full-width grid, remove restrictive 18rem cap */
              @media (max-width: 639px) {
                .domains-page-wrap .domain-listing-grid,
                .domains-page-wrap .listing-card-glow-grid.domain-listing-grid {
                  max-width: 100% !important;
                  margin-inline: 0 !important;
                  padding: 8px 0 12px !important;
                  grid-template-columns: 1fr !important;
                  display: grid !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  height: auto !important;
                  overflow: visible !important;
                }
                .domains-page-wrap .listing-card-glow-shell {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  height: auto !important;
                  overflow: visible !important;
                }
              }
              /* Tablet: 2-col until the page container can fit 3 (see container queries) */
              @media (min-width: 640px) and (max-width: 899px) {
                .domains-page-wrap .domain-listing-grid,
                .domains-page-wrap .listing-card-glow-grid.domain-listing-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  gap: 1rem !important;
                  max-width: 100% !important;
                  margin-inline: 0 !important;
                }
              }
              /* Standard domain cards: badges wrap on narrow cards */
              .domain-listing-grid .listing-card-glow-shell .pr-9 .flex.flex-wrap {
                flex-wrap: wrap !important;
              }
              /* Nest Hub Max: keep premium split cards 1-col. Standard marketplace uses auto-fill. */
              @media (min-width: 1024px) and (max-width: 1400px) {
                .ventures-split__body .domain-listing-grid:not(.domain-listing-grid--standard),
                .ventures-split__body .listing-card-glow-grid.domain-listing-grid:not(.domain-listing-grid--standard) {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>

            <div className="domains-page-wrap">
            <div className="domains-header-area">
            <div ref={domainListRef} className="scroll-mt-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 w-full md:w-auto">
                <h1 className="font-display text-3xl font-bold text-gray-900 m-0 inline-flex items-center gap-2.5">
                  <span className="domains-header-icon">
                    <Globe size={20} strokeWidth={1.8} />
                  </span>
                  {t('domains')}
                  {pendingVerificationCount > 0 ? (
                    <PendingVerificationDot className="h-2.5 w-2.5" title={t('domainsPageVerificationPending', { defaultValue: 'Verification pending' })} />
                  ) : null}
                </h1>
                <p className="text-gray-500 mt-1.5 text-sm">{t('buyAndSellDomains')}</p>
              </div>
              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end md:w-auto md:gap-3">
                <Link
                  className="btn-glow btn-glow-sm !px-3 !py-2 flex w-full min-w-0 items-center justify-center gap-1.5 text-center text-xs leading-tight sm:w-auto sm:flex-none md:text-sm"
                  to="/settings/payouts"
                >
                  <CreditCard className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                  <span className="truncate">
                    <span className="sm:hidden">Payouts</span>
                    <span className="hidden sm:inline">Payout Settings</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="btn-glow btn-glow-sm !px-3 !py-2 relative flex w-full min-w-0 items-center justify-center gap-1.5 text-center text-xs leading-tight sm:w-auto sm:flex-none md:text-sm"
                  onClick={() => navigate('/domains/dashboard')}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                  <span className="truncate">{t('dashboard')}</span>
                  {pendingVerificationCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center">
                      <PendingVerificationDot className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="btn-glow btn-glow-sm !px-3 !py-2 flex w-full min-w-0 items-center justify-center gap-1.5 text-center text-xs leading-tight sm:w-auto sm:flex-none md:text-sm"
                  onClick={() => {
                    if (!user) {
                      navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
                      return;
                    }
                    setShowForm(true); setEditTarget(null);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                  <span className="truncate">{t('listDomain')}</span>
                </button>
              </div>
            </div>
            </div>{/* domains-header-area */}

            <div className="mb-6 inline-flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors md:text-sm ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => { setActiveTab('all'); setShowForm(false); setEditTarget(null); }}
              >
                All
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors md:text-sm ${activeTab === 'premium' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => { setActiveTab('premium'); setShowForm(false); setEditTarget(null); }}
              >
                Premium
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors md:text-sm ${activeTab === 'standard' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => { setActiveTab('standard'); setShowForm(false); setEditTarget(null); }}
              >
                Standard
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors md:text-sm ${activeTab === 'mine' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => { setActiveTab('mine'); setShowForm(false); setEditTarget(null); }}
              >
                {t('myListings')}
              </button>
            </div>

            {activeTab === 'mine' && pendingVerificationCount > 0 ? (
              <DomainVerificationPendingBanner
                count={pendingVerificationCount}
                onVerifyClick={() => navigate('/domains/dashboard')}
              />
            ) : null}

            {globalNotice && (
              <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {globalNotice}
              </div>
            )}

            {/* Premium-results treatment — same stronger glow + staggered entrance
                as the Main Premium Domain search results (DomainStorefrontPage). */}
            <style>{`
              @keyframes registryResultsEnter {
                from { opacity: 0; transform: translateY(10px) scale(0.985); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              .premium-results-stagger .domain-search-card {
                animation: registryResultsEnter 300ms ease-out both;
                box-shadow:
                  0 0 0 1px rgba(251, 191, 36, 0.2),
                  0 8px 28px rgba(180, 83, 9, 0.1),
                  0 0 24px rgba(251, 191, 36, 0.12);
              }
              .premium-results-stagger > *:nth-child(1) .domain-search-card { animation-delay: 90ms; }
              .premium-results-stagger > *:nth-child(2) .domain-search-card { animation-delay: 140ms; }
              .premium-results-stagger > *:nth-child(3) .domain-search-card { animation-delay: 190ms; }
              .premium-results-stagger > *:nth-child(n+4) .domain-search-card { animation-delay: 230ms; }
            `}</style>

            {/* Unified content area — tab-driven: All | Premium | Standard | My Listings */}
            <FilterBar
              search={search} onSearch={handleSearch}
              category={category} onCategory={handleCategory}
              categoryOptions={DOMAIN_PRICING_OPTIONS}
              minPrice={minPrice} onMinPrice={handleMinPrice}
              maxPrice={maxPrice} onMaxPrice={handleMaxPrice}
              sortBy={sortBy} onSort={handleSort}
              onClear={clearAll} activeFilterCount={activeFilterCount}
              placeholder={t('domainsPageSearchPlaceholder')}
              priceSymbol={getSymbol(currency)}
              theme="light"
            />

            {activeTab === 'premium' ? (
              showcaseEnabled && showcaseDomains.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-extrabold text-gray-900">
                      Premium Domains
                    </h2>
                    <span className="text-xs text-gray-500">
                      {showcaseDomains.length} premium domain{showcaseDomains.length === 1 ? '' : 's'} · prices subject to change
                    </span>
                  </div>
                  {showcaseFilter.paginated.length === 0 ? (
                    <div className="text-center py-14 text-sm text-gray-500">
                      {activeFilterCount > 0
                        ? 'No premium domains match your filters.'
                        : 'No premium domains are currently showcased.'}
                    </div>
                  ) : (
                    <div className="premium-results-stagger listing-card-glow-grid domain-listing-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {showcaseFilter.paginated.map((d) => (
                        <ListingCardShell key={d.showcaseId}>
                          <ShowcaseDomainCard item={d} shareContext={{ shareType: 'DOMAIN_LISTING', originalQuery: d.domainName || d.name }} />
                        </ListingCardShell>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-14 text-sm text-gray-500">
                  No premium domains are currently showcased.
                </div>
              )
            ) : (
            <>

            {activeTab === 'all' && showcaseDomains.length > 0 && marketplaceFilter.totalCount > 0 ? (
              /* ── Side-by-side: Premium Domains | Standard Domains ── */
              <div className="ventures-split domains-split-premium">
                <style>{`
                  /* ── Refined Premium Domains theme: subtle cream + muted amber accents ── */
                  .domains-split-premium .ventures-split__mobile-tab--venture.ventures-split__mobile-tab--active {
                    background: #ffffff;
                    color: #7A5A00;
                    box-shadow: 0 1px 4px rgba(180,140,40,0.15), 0 0 0 1px rgba(217,154,0,0.3);
                  }
                  .domains-split-premium .ventures-split__panel--venture {
                    background: linear-gradient(180deg, #FFFBF2 0%, #FFFCF5 100%);
                    border-color: #EDE5D3;
                  }
                  .domains-split-premium .ventures-split__panel--venture::before {
                    background: linear-gradient(90deg, #D99A00 0%, #C8932A 50%, #E8C86A 100%);
                    height: 3px;
                  }
                  .domains-split-premium .ventures-split__header--venture::before,
                  .domains-split-premium .ventures-split__header--venture::after {
                    background: rgba(180,140,40,0.12);
                  }
                  .domains-split-premium .ventures-split__icon--venture {
                    color: #9A6700;
                    background: linear-gradient(145deg, #FFF8EC 0%, #FDF3E0 100%);
                    border: 1px solid rgba(217,154,0,0.25);
                  }
                  .domains-split-premium .ventures-split__count--venture {
                    color: #8A6A10;
                    background: rgba(217,154,0,0.08);
                    border: 1px solid rgba(217,154,0,0.15);
                  }
                  .domains-split-premium .ventures-split__empty--venture {
                    border-color: rgba(180,140,40,0.2);
                  }
                  /* ── Premium cards: white with neutral warm-gray border ── */
                  .domains-split-premium .ventures-split__body .listing-card-glow-shell {
                    padding: 10px;
                  }
                  .domains-split-premium .ventures-split__body .domain-listing-card.card-glow-hover,
                  .domains-split-premium .ventures-split__body .domain-listing-card {
                    background: #ffffff !important;
                    border: 1px solid #E7E1D5 !important;
                    border-radius: 0.85rem;
                    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
                  }
                  .domains-split-premium .ventures-split__body .listing-card-glow-shell:hover .domain-listing-card,
                  .domains-split-premium .ventures-split__body .listing-card-glow-shell:hover .domain-listing-card.card-glow-hover {
                    transform: translateY(-3px);
                    border-color: rgba(217,154,0,0.35) !important;
                    box-shadow: 0 8px 28px rgba(180,140,40,0.13), 0 2px 8px rgba(0,0,0,0.04) !important;
                  }
                  .domains-split-premium .ventures-split__body .listing-card-glow-shell::before {
                    background: linear-gradient(135deg, rgba(217,154,0,0.12), rgba(217,154,0,0.04)) !important;
                  }
                `}</style>
                <div className="ventures-split__mobile-tabs" role="tablist" aria-label="Domain sections">
                  <button role="tab" type="button" aria-selected={splitMobilePanel === 'venture'} className={`ventures-split__mobile-tab ventures-split__mobile-tab--venture ${splitMobilePanel === 'venture' ? 'ventures-split__mobile-tab--active' : ''}`} onClick={() => setSplitMobilePanel('venture')}>
                    Premium Domains
                    <span className="ventures-split__mobile-tab-count">{showcaseFilter.filtered.length}</span>
                  </button>
                  <button role="tab" type="button" aria-selected={splitMobilePanel === 'coventure'} className={`ventures-split__mobile-tab ventures-split__mobile-tab--coventure ${splitMobilePanel === 'coventure' ? 'ventures-split__mobile-tab--active' : ''}`} onClick={() => setSplitMobilePanel('coventure')}>
                    Standard Domains
                    <span className="ventures-split__mobile-tab-count">{marketplaceFilter.totalCount}</span>
                  </button>
                </div>
                <div className="ventures-split__mobile-viewport">
                  <div className={`ventures-split__mobile-track ${splitMobilePanel === 'coventure' ? 'ventures-split__mobile-track--coventure' : ''}`}>
                    <section className="ventures-split__panel ventures-split__panel--venture ventures-split__mobile-panel">
                      <header className="ventures-split__header ventures-split__header--venture">
                        <div className="ventures-split__header-main">
                          <span className="ventures-split__icon ventures-split__icon--venture" aria-hidden><Gavel size={20} strokeWidth={2} /></span>
                          <div className="ventures-split__header-text">
                            <h2 className="ventures-split__title">Premium Domains</h2>
                            <p className="ventures-split__subtitle">Showcase listings with premium pricing</p>
                          </div>
                        </div>
                        <span className="ventures-split__count ventures-split__count--venture">
                          {showcaseFilter.filtered.length} premium
                        </span>
                      </header>
                      <div className="ventures-split__body">
                        {showcaseFilter.filtered.length === 0 ? (
                          <div className="ventures-split__empty ventures-split__empty--venture">
                            <p>{activeFilterCount > 0 ? 'No premium domains match your filters.' : 'No premium domains are currently showcased.'}</p>
                          </div>
                        ) : (
                          <div className="premium-results-stagger listing-card-glow-grid domain-listing-grid grid grid-cols-1 sm:grid-cols-2">
                            {showcaseFilter.filtered.map((d) => (
                              <ListingCardShell key={d.showcaseId}>
                                <ShowcaseDomainCard item={d} shareContext={{ shareType: 'DOMAIN_LISTING', originalQuery: d.domainName || d.name }} />
                              </ListingCardShell>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                    <div className="ventures-split__divider ventures-split__mobile-divider" aria-hidden="true">
                      <span className="ventures-split__divider-line" />
                    </div>
                    <section className="ventures-split__panel ventures-split__panel--coventure ventures-split__mobile-panel">
                      <header className="ventures-split__header ventures-split__header--coventure">
                        <div className="ventures-split__header-main">
                          <span className="ventures-split__icon ventures-split__icon--coventure" aria-hidden><Gavel size={20} strokeWidth={2} /></span>
                          <div className="ventures-split__header-text">
                            <h2 className="ventures-split__title">Standard Domains</h2>
                            <p className="ventures-split__subtitle">Marketplace domain listings</p>
                          </div>
                        </div>
                        <span className="ventures-split__count ventures-split__count--coventure">
                          {marketplaceFilter.totalCount} listed
                        </span>
                      </header>
                      <div className="ventures-split__body">
                        {loading ? (
                          <PageContentSkeleton variant="cards" rows={4} />
                        ) : marketplaceFilter.paginated.length === 0 ? (
                          <div className="ventures-split__empty ventures-split__empty--coventure">
                            <p>{activeFilterCount > 0 ? 'No marketplace domains match your filters.' : 'No marketplace domains found.'}</p>
                          </div>
                        ) : (
                          <>
                            <div className="listing-card-glow-grid domain-listing-grid domain-listing-grid--standard grid grid-cols-1 sm:grid-cols-2">
                              {marketplaceFilter.paginated.map(d => (
                                <ListingCardShell key={d.id}>
                                  <DomainListingCard
                                    domain={d}
                                    marketplace
                                    isOwner={isListingOwner(d, user, 'domain')}
                                    likeState={getLike(d.id)}
                                    onLike={() => toggleLike(d.id)}
                                    onView={() => openDetailIfAllowed(d)}
                                    onEdit={() => { setEditTarget(d); setShowForm(false); }}
                                    onBuy={() => {
                                      if (!user) {
                                        navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
                                        return;
                                      }
                                      setBuyTarget(d);
                                    }}
                                    onViewAuction={() => navigate(d.auction?.id ? `/auction/${d.auction.id}` : '/auctions')}
                                    onDelete={() => setDeleteTarget(d.id)}
                                    onPutForAuction={isListingOwner(d, user, 'domain') && d.saleType !== 'AUCTION' ? () => setAuctionTarget(d) : undefined}
                                  />
                                </ListingCardShell>
                              ))}
                            </div>
                            <Pagination page={marketplaceFilter.page} totalPages={marketplaceFilter.totalPages}
                              onPage={handlePageChange} totalCount={marketplaceFilter.totalCount} pageSize={20} />
                          </>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            ) : (
            /* ── Single-column: Premium-only, Standard-only, or My Listings ── */
            <>

            {!loading && (marketplaceFilter.totalCount + showcaseFilter.filtered.length) > 0 && (
              <div className="text-sm text-gray-600 mb-4">
                {t('domainsPageResultsFound', {
                  count: marketplaceFilter.totalCount + showcaseFilter.filtered.length,
                })}
              </div>
            )}

            {showcaseVisibleInAll && (
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-extrabold text-gray-900">
                    Premium Domains
                  </h2>
                  <span className="text-xs text-gray-500">
                    {showcaseFilter.filtered.length} premium domain{showcaseFilter.filtered.length === 1 ? '' : 's'} · prices subject to change
                  </span>
                </div>
                <div className="premium-results-stagger listing-card-glow-grid domain-listing-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {showcaseFilter.filtered.map((d) => (
                    <ListingCardShell key={d.showcaseId}>
                      <ShowcaseDomainCard item={d} shareContext={{ shareType: 'DOMAIN_LISTING', originalQuery: d.domainName || d.name }} />
                    </ListingCardShell>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <PageContentSkeleton variant="cards" rows={8} />
            ) : marketplaceFilter.paginated.length === 0 ? (
              showcaseVisibleInAll ? (
                <div className="text-center py-10 text-sm text-gray-500">
                  No marketplace domains found.
                </div>
              ) : (
              <div className="text-center py-20">
                <img src={DomainsIcon} alt={t('domains')} className="mx-auto mb-4 w-16 h-16 object-contain" />
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                  {activeFilterCount > 0 ? t('domainsPageEmptyFilteredTitle') :
                    activeTab === 'mine' ? t('domainsPageEmptyMineTitle') :
                      t('domainsPageEmptyAllTitle')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeFilterCount > 0
                    ? t('domainsPageEmptyFilteredHint')
                    : t('domainsPageEmptyAllHint')}
                </p>
                {activeFilterCount > 0
                  ? <button className="btn-glow btn-glow-sm" onClick={clearAll}>{t('filterClear')}</button>
                  : <button className="btn-glow btn-glow-sm" onClick={() => {
                    if (!user) {
                      navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
                      return;
                    }
                    setShowForm(true);
                  }}>
                    {t('domainsPageListDomainCta')}
                  </button>
                }
              </div>
              )
            ) : (
              <>
                <div className="listing-card-glow-grid domain-listing-grid domain-listing-grid--standard grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1600px]:grid-cols-4">
                  {marketplaceFilter.paginated.map(d => (
                    <ListingCardShell key={d.id}>
                      <DomainListingCard
                        domain={d}
                        marketplace
                        isOwner={isListingOwner(d, user, 'domain')}
                        likeState={getLike(d.id)}
                        onLike={() => toggleLike(d.id)}
                        onView={() => openDetailIfAllowed(d)}
                        onEdit={() => { setEditTarget(d); setShowForm(false); }}
                        onBuy={() => {
                          if (!user) {
                            navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
                            return;
                          }
                          setBuyTarget(d);
                        }}
                        onViewAuction={() => navigate(d.auction?.id ? `/auction/${d.auction.id}` : '/auctions')}
                        onDelete={() => setDeleteTarget(d.id)}
                        onPutForAuction={isListingOwner(d, user, 'domain') && d.saleType !== 'AUCTION' ? () => setAuctionTarget(d) : undefined}
                      />
                    </ListingCardShell>
                  ))}
                </div>
                <Pagination page={marketplaceFilter.page} totalPages={marketplaceFilter.totalPages}
                  onPage={handlePageChange} totalCount={marketplaceFilter.totalCount} pageSize={20} />
              </>
            )}
          </>
        )}
        </>
        )}
        </div>{/* domains-page-wrap */}
          </>
        )}
      </div>

      {buyTarget && (
        <BuyDomainModal
          domain={buyTarget}
          vaServices={vaServices}
          vaLoading={vaLoading}
          onClose={() => setBuyTarget(null)}
          onSuccess={d => {
            const normalized = normalizeDomainRecord(d);
            setSuccessDomain(normalized);
            setBuyTarget(null);
            setAllDomains(prev => prev.map(x => x.id === normalized.id ? normalized : x));
          }}
        />
      )}

      {successDomain && (
        <PurchaseSuccessModal domain={successDomain} onClose={() => setSuccessDomain(null)} />
      )}

      {detailTarget && (
        <DomainDetailModal
          domain={detailTarget}
          isOwner={isListingOwner(detailTarget, user, 'domain')}
          likeState={getLike(detailTarget.id)}
          onLike={() => toggleLike(detailTarget.id)}
          onViewsUpdated={(id, views) => {
            setAllDomains((prev) => prev.map((row) => (row.id === id ? { ...row, views } : row)));
          }}
          onClose={() => { closeListingDetail(); refreshDomains(); }}
          onBuy={() => {
            if (!user) {
              navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
              return;
            }
            setBuyTarget(detailTarget); closeListingDetail();
          }}
          onViewAuction={() => {
            navigate(detailTarget.auction?.id ? `/auction/${detailTarget.auction.id}` : '/auctions');
            closeListingDetail();
          }}
          onEdit={() => {
            setEditTarget(detailTarget);
            setShowForm(false);
            closeListingDetail();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('domainsPageRemoveTitle')}
        message={t('domainsPageRemoveMessage')}
        confirmLabel={t('remove')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {auctionTarget && (
        <PutForAuctionModal
          domain={auctionTarget}
          user={user}
          onClose={() => setAuctionTarget(null)}
          onSuccess={(updatedDomain) => {
            setAuctionTarget(null);
            setAllDomains(prev => prev.map(x => x.id === updatedDomain.id ? { ...x, ...updatedDomain } : x));
            setGlobalNotice('Your domain has been put for auction successfully!');
          }}
        />
      )}
    </AppLayout>
  );
}

// ─── Put for Auction Modal ─────────────────────────────────────────────────────
function PutForAuctionModal({ domain, user, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { currency: navCurrency, convertToInr, ratesMeta } = useCurrency();
  const display = resolveDomainDisplay(domain);
  const [currency, setCurrency] = useState(() => navCurrency || 'INR');
  const [minBidPrice, setMinBidPrice] = useState('');
  const [duration, setDuration] = useState('SEVEN_DAYS');
  const [auctionFeeInr, setAuctionFeeInr] = useState(118);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = roleWaivesAuctionPlatformFees(user?.role);

  const handleCurrencyChange = (nextCurrency) => {
    if (!nextCurrency || nextCurrency === currency) return;
    if (minBidPrice != null && minBidPrice !== '') {
      const converted = convertAmountBetweenCurrencies(minBidPrice, currency, nextCurrency, convertToInr, ratesMeta);
      setMinBidPrice(converted);
    }
    setCurrency(nextCurrency);
  };

  useEffect(() => {
    import('../utils/auctionFees').then(({ fetchListingFeesAndCharges }) => {
      fetchListingFeesAndCharges()
        .then((fees) => setAuctionFeeInr(Number(fees?.auctionCreationFeeInr ?? 118)))
        .catch(() => { });
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!minBidPrice || parseFloat(minBidPrice) <= 0) {
      setError(t('domainsPageErrorMinBid', 'Please enter a valid minimum bid price.'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const minBidInr = currency === 'INR'
        ? parseFloat(minBidPrice)
        : convertToInr(parseFloat(minBidPrice), currency);

      let creationFeeOrderId = null;
      if (!isAdmin) {
        const { payAuctionCreationFee } = await import('../utils/auctionFees');
        creationFeeOrderId = await payAuctionCreationFee({
          auctionType: 'DOMAIN',
          user,
          description: t('domainsPageAuctionFeeDescription', { defaultValue: 'Domain auction listing fee' }),
        });
      }

      await auctionAPI.create(domain.id, {
        domain_id: domain.id,
        minBidPrice: minBidInr,
        duration,
        creationFeeOrderId,
      });

      onSuccess({ ...domain, saleType: 'AUCTION' });
    } catch (err) {
      setError(readApiError(err, 'Failed to create auction. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white outline-none focus:border-indigo-500 transition-all w-full placeholder:text-gray-400 text-sm';
  const labelCls = 'text-sm font-medium text-gray-700';

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-white border border-gray-200 rounded-[18px] shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Gavel size={20} className="text-indigo-600" />
            <h2 className="font-display text-xl font-bold text-gray-900 m-0">Put for Auction</h2>
          </div>
          <p className="text-sm text-gray-500">
            Set up an auction for <strong>{display.fullDomain}</strong>. The auction creation fee will be charged upfront.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              {t('domainsPageCurrencyLabel', 'Currency')} <span className="text-red-500">*</span>
            </label>
            <SearchableCurrencySelect
              className={inputCls}
              wrapperClassName="w-full"
              value={currency}
              onChange={handleCurrencyChange}
              showFullLabel
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="auction-min-bid">
              {t('domainsPageMinBidLabel', 'Minimum bid price')} <span className="text-red-500">*</span>
            </label>
            <input
              id="auction-min-bid"
              className={inputCls}
              type="number"
              min="0"
              step="any"
              value={minBidPrice}
              onChange={(e) => setMinBidPrice(e.target.value)}
              placeholder={t('domainsPageMinBidPlaceholder', 'e.g. 10000')}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('domainsPageAuctionDurationLabel', 'Auction duration')} *</label>
            <FormSelect
              className={inputCls}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="ONE_DAY">{t('domainsPageDurationOneDay', '1 day')}</option>
              <option value="SEVEN_DAYS">{t('domainsPageDurationSevenDays', '7 days')}</option>
              <option value="THIRTY_DAYS">{t('domainsPageDurationThirtyDays', '30 days')}</option>
              <option value="SIXTY_DAYS">{t('domainsPageDurationSixtyDays', '60 days')}</option>
              <option value="NINETY_DAYS">{t('domainsPageDurationNinetyDays', '90 days')}</option>
            </FormSelect>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900 leading-relaxed">
            {isAdmin ? t('domainsPageAuctionFeeNoticeAdmin', { defaultValue: 'Auction creation fee: Free (Admin)' }) : t('domainsPageAuctionFeeNotice', {
              defaultValue: 'Auction listing fee: {{fee}} (charged when you submit).',
              fee: formatInr(auctionFeeInr),
            })}
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-glow btn-glow-sm inline-flex items-center justify-center gap-2"
              disabled={submitting}
            >
              <Gavel size={14} />
              {submitting ? 'Processing…' : (isAdmin ? 'Create Auction' : 'Start Auction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Domain Form ──────────────────────────────────────────────────────────────
const BASE_DOMAIN_EXTENSIONS = ['.com', '.io', '.net', '.org', '.co', '.ai'];

function MoreExtensionsButton({ baseExtensions, selectedExt, onSelect, allTlds, loading, loadError, onRetry }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const isMoreSelected = selectedExt?.full && !baseExtensions.includes(selectedExt.full);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const filteredTlds = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^\./, '');
    if (!q) return allTlds;
    return allTlds.filter((tld) => {
      const normalized = tld.toLowerCase().replace(/^\./, '');
      return normalized.includes(q) || tld.toLowerCase().includes(q);
    });
  }, [allTlds, search]);

  const handleSelect = (tld) => {
    onSelect(tld);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors inline-flex items-center gap-1 ${isMoreSelected
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
          }`}
      >
        More Extensions
        <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-[2000] w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              placeholder="Search extensions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md outline-none focus:border-indigo-500 transition-colors"
              autoFocus
              disabled={Boolean(loadError)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {loading ? (
              <div className="text-center py-3 text-xs text-gray-400">Loading…</div>
            ) : loadError ? (
              <div className="text-center py-3 px-2 text-xs text-gray-500">
                {loadError}
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 block w-full text-indigo-600 font-semibold hover:text-indigo-800 border-none bg-transparent cursor-pointer"
                  >
                    Try again
                  </button>
                )}
              </div>
            ) : filteredTlds.length === 0 ? (
              <div className="text-center py-3 text-xs text-gray-400">No results found</div>
            ) : (
              filteredTlds.map((tld) => {
                const full = tld.startsWith('.') ? tld : `.${tld}`;
                return (
                  <button
                    key={full}
                    type="button"
                    onClick={() => handleSelect(full)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md border-none cursor-pointer ${selectedExt?.full === full
                        ? 'bg-indigo-50 font-semibold text-indigo-800'
                        : 'bg-transparent text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {full.toUpperCase()}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DomainForm({ editDomain, onSaved, onCancel }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency: navCurrency, convertToInr, ratesLoading, formatCurrency, ratesMeta } = useCurrency();
  const [commissionPercent, setCommissionPercent] = useState(null);
  const [gstConfig, setGstConfig] = useState(null);
  const [auctionCreationFeeInr, setAuctionCreationFeeInr] = useState(118);
  const isEdit = Boolean(editDomain?.id);
  const isAdmin = roleWaivesAuctionPlatformFees(user?.role);
  const [form, setForm] = useState(() => buildDomainFormState(editDomain, navCurrency, ratesMeta));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [allTlds, setAllTlds] = useState(() => getCachedSupportedTlds() || []);
  const [tldsLoading, setTldsLoading] = useState(() => !getCachedSupportedTlds()?.length);
  const [tldsError, setTldsError] = useState('');

  const loadSupportedTlds = (force = false) => {
    if (!force && getCachedSupportedTlds()?.length) {
      setAllTlds(getCachedSupportedTlds());
      setTldsLoading(false);
      setTldsError('');
      return Promise.resolve(getCachedSupportedTlds());
    }
    setTldsLoading(true);
    setTldsError('');
    return fetchSupportedTlds({ force })
      .then((tlds) => {
        setAllTlds(tlds);
      })
      .catch(() => {
        setAllTlds([]);
        setTldsError('Unable to load extensions. Please try again.');
      })
      .finally(() => {
        setTldsLoading(false);
      });
  };

  useEffect(() => {
    loadSupportedTlds();
  }, []);

  useEffect(() => {
    setForm(buildDomainFormState(editDomain, navCurrency, ratesMeta));
    setError('');
    setWarning('');
  }, [editDomain?.id, navCurrency, ratesMeta]);

  useEffect(() => {
    import('../utils/auctionFees').then(({ fetchListingFeesAndCharges }) => {
      fetchListingFeesAndCharges()
        .then((fees) => {
          const pct = Number(fees?.listingCommissionPercent);
          if (Number.isFinite(pct)) setCommissionPercent(pct);
          setAuctionCreationFeeInr(Number(fees?.auctionCreationFeeInr ?? 118));
        })
        .catch(() => { });
    });
    domainStorefrontAPI.getConfig()
      .then(({ data }) => {
        const payload = data?.data ?? data;
        const gst = payload?.gst;
        if (gst && typeof gst === 'object') setGstConfig(gst);
      })
      .catch(() => { });
  }, []);

  const setContact = (k, v) =>
    setForm(f => ({ ...f, contactInfo: { ...f.contactInfo, [k]: v } }));

  const setExtension = (ext) => {
    const full = ext.startsWith('.') ? ext : `.${ext}`;
    setForm(f => ({ ...f, domainExtension: full }));
  };

  const convertFormAmountBetweenCurrencies = (amount, fromCurrency, toCurrency) =>
    convertAmountBetweenCurrencies(amount, fromCurrency, toCurrency, convertToInr, ratesMeta);

  const changeFormCurrency = (nextCurrency) => {
    setForm((current) => ({
      ...current,
      currency: nextCurrency,
      askingPrice: convertFormAmountBetweenCurrencies(current.askingPrice, current.currency, nextCurrency),
      minBidPrice: convertFormAmountBetweenCurrencies(current.minBidPrice, current.currency, nextCurrency),
    }));
  };

  const getAskingPriceInr = () => {
    if (form.saleType === 'AUCTION') return 0;
    const rawPrice = parseFloat(form.askingPrice);
    if (!Number.isFinite(rawPrice)) return 0;
    return form.currency === DEFAULT_LISTING_CURRENCY
      ? roundInr(rawPrice)
      : convertToInr(rawPrice, form.currency);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const extNorm = normalizeDomainExtension(form.domainExtension);
    if (!extNorm) {
      setError(t('domainsPageErrorExtension'));
      return;
    }
    if (!isEdit && form.saleType === 'AUCTION' && (!form.minBidPrice || parseFloat(form.minBidPrice) <= 0)) {
      setError(t('domainsPageErrorMinBid'));
      return;
    }
    if (!form.pricingDemand) {
      setError(t('domainsPagePricingTypeSelect'));
      return;
    }
    setLoading(true); setError(''); setWarning('');
    try {
      const askingPriceInr = getAskingPriceInr();

      const payload = {
        domainName: form.domainName.trim(),
        logoText: form.logoText?.trim() || null,
        domainExtension: extNorm.full,
        askingPrice: askingPriceInr,
        contactInfo: form.contactInfo,
      };
      if (form.pricingDemand) {
        payload.pricingDemand = form.pricingDemand;
      }
      let saved = null;
      if (isEdit) {
        const { data: updated } = await domainAPI.update(editDomain.id, payload);
        const updatedListing = updated?.data ?? updated;
        const inrBreakdown = computeListingCurrencyCommission(askingPriceInr, commissionPercent, DEFAULT_LISTING_CURRENCY);
        saved = {
          ...updatedListing,
          askingPrice: askingPriceInr,
          asking_price: askingPriceInr,
          listingPrice: askingPriceInr,
          listing_price: askingPriceInr,
          finalListingPrice: askingPriceInr,
          final_listing_price: askingPriceInr,
          commissionPercentage: inrBreakdown.commissionPercent,
          commission_percentage: inrBreakdown.commissionPercent,
          commissionAmount: inrBreakdown.commissionAmount,
          commission_amount: inrBreakdown.commissionAmount,
          sellerPayoutAmount: inrBreakdown.sellerEarnings,
          seller_payout_amount: inrBreakdown.sellerEarnings,
          sellerPrice: inrBreakdown.sellerEarnings,
          seller_price: inrBreakdown.sellerEarnings,
        };
      } else {
        const createPayload = {
          ...payload,
          saleType: form.saleType,
          agreement: form.agreement,
        };

        if (form.saleType === 'AUCTION') {
          const minBidInr =
            form.currency === 'INR'
              ? parseFloat(form.minBidPrice)
              : convertToInr(parseFloat(form.minBidPrice), form.currency);

          let creationFeeOrderId = null;
          if (!isAdmin) {
            const { payAuctionCreationFee } = await import('../utils/auctionFees');
            creationFeeOrderId = await payAuctionCreationFee({
              auctionType: 'DOMAIN',
              user,
              description: t('domainsPageAuctionFeeDescription', {
                defaultValue: 'Domain auction listing fee',
              }),
            });
          }

          let createdId = null;
          try {
            const { data: domain } = await domainAPI.create(createPayload);
            saved = domain?.data ?? domain;
            createdId = saved?.id ?? null;

            await auctionAPI.create(saved.id, {
              domain_id: saved.id,
              minBidPrice: minBidInr,
              duration: form.auctionDuration,
              creationFeeOrderId,
            });
          } catch (auctionErr) {
            if (createdId) {
              try {
                await domainAPI.delete(createdId);
              } catch {
                // Best-effort rollback if auction setup fails after listing create.
              }
            }
            throw auctionErr;
          }
        } else {
          const { data: domain } = await domainAPI.create(createPayload);
          saved = domain?.data ?? domain;
        }
      }
      onSaved(saved);
    } catch (err) {
      setError(readApiError(err, isEdit ? t('domainsPageErrorUpdateFailed') : t('domainsPageErrorListFailed')));
    } finally { setLoading(false); }
  };

  const isAuction = form.saleType === 'AUCTION';
  const sellerAmount = parseFloat(form.askingPrice) || 0;
  const savedAskingPriceInr = getAskingPriceInr();
  const commissionBreakdown = !isAuction && sellerAmount > 0 && commissionPercent != null
    ? computeListingCurrencyCommission(sellerAmount, commissionPercent, form.currency)
    : null;
  const buyerPaysBreakdown = !isAuction && sellerAmount > 0 && gstConfig
    ? computeRegistrationPricing(sellerAmount, 1, gstConfig)
    : null;
  const formatListingCurrency = (value) => formatCurrency(value, form.currency || DEFAULT_LISTING_CURRENCY);
  const selectedExt = normalizeDomainExtension(form.domainExtension);

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white outline-none focus:border-purple-500 transition-all w-full placeholder:text-gray-400';
  const labelCls = 'text-sm font-medium text-gray-700';

  const extPreview = normalizeDomainExtension(form.domainExtension);

  return (
    <div className="p-8 bg-white border border-gray-200 rounded-[18px] shadow-sm">
      <h3 className="font-display text-2xl text-gray-900 font-semibold">
        {isEdit ? t('domainsPageFormEditTitle') : t('domainsPageFormListTitle')}
      </h3>
      <p className="text-gray-500 text-sm mt-1">
        {isEdit
          ? t('domainsPageFormEditSubtitle')
          : t('domainsPageFormListSubtitle')}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('domainsPageDomainNameLabel')} <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              value={form.domainName}
              onChange={e => setForm(f => ({ ...f, domainName: e.target.value.replace(/\s/g, '').toLowerCase() }))}
              placeholder={t('domainsPageDomainNamePlaceholder')}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Display Name</label>
            <input
              className={inputCls}
              value={form.logoText}
              onChange={e => setForm(f => ({ ...f, logoText: e.target.value }))}
              placeholder="e.g. Dry Chilli"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('domainsPageExtensionLabel')} <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {BASE_DOMAIN_EXTENSIONS.map((ext) => (
                <button
                  key={ext}
                  type="button"
                  onClick={() => setExtension(ext)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${selectedExt?.full === ext
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                >
                  {ext.toUpperCase()}
                </button>
              ))}
              <MoreExtensionsButton
                baseExtensions={BASE_DOMAIN_EXTENSIONS}
                selectedExt={selectedExt}
                onSelect={setExtension}
                allTlds={allTlds}
                loading={tldsLoading}
                loadError={tldsError}
                onRetry={() => loadSupportedTlds(true)}
              />
            </div>
          </div>
        </div>
        {form.domainName && extPreview && (
          <p className="text-sm text-slate-600 -mt-2 flex items-center gap-2 flex-wrap">
            <span>{t('domainsPagePreview')}</span>
            <strong>{form.domainName}</strong>
            <span className={`domain-listing-card__ext-badge domain-listing-card__ext-badge--${extPreview.cssKey}`}>
              {extPreview.label}
            </span>
          </p>
        )}

        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('domainsPageSaleTypeLabel')} <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              {[
                { value: 'ONE_TIME', label: t('domainsPageSaleOneTime'), desc: t('domainsPageSaleOneTimeDesc') },
                { value: 'AUCTION', label: t('domainsPageSaleAuction'), desc: t('domainsPageSaleAuctionDesc') },
              ].map(opt => (
                <div key={opt.value}
                  onClick={() => setForm(f => ({ ...f, saleType: opt.value }))}
                  className={`p-3.5 rounded-lg cursor-pointer border-2 transition-all duration-150 ${form.saleType === opt.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 bg-white'
                    }`}>
                  <div className={`font-semibold text-sm mb-1 ${form.saleType === opt.value ? 'text-purple-600' : 'text-gray-600'
                    }`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 leading-snug">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {(!isAuction || isEdit) && (
            <CurrencyPriceInput
              id="domain-asking-price"
              label={t('domainsPageAskingPriceLabel')}
              value={form.askingPrice}
              onChange={(v) => setForm((f) => ({ ...f, askingPrice: v }))}
              currency={form.currency}
              onCurrencyChange={changeFormCurrency}
              required={!isAuction}
              inputClassName={inputCls}
              labelClassName={labelCls}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('domainsPagePricingTypeLabel')} <span className="text-red-500">*</span></label>
            <FormSelect className={inputCls} value={form.pricingDemand}
              onChange={e => setForm(f => ({ ...f, pricingDemand: e.target.value }))} required>
              <option value="">{t('domainsPagePricingTypeSelect')}</option>
              <option value="FIXED">{t('domainsPagePricingFixed')}</option>
              <option value="NEGOTIABLE">{t('domainsPagePricingNegotiable')}</option>
            </FormSelect>
          </div>
        </div>
        {(!isAuction || isEdit) && form.currency !== 'INR' && (
          <p className="text-[0.72rem] text-gray-500 -mt-2">
            {ratesLoading
              ? t('domainsPageRatesLoading')
              : t('domainsPageRatesConvertHint')}
          </p>
        )}
        {(!isAuction || isEdit) && sellerAmount > 0 && (
          <p className="text-[0.72rem] text-gray-600 -mt-2">
            Marketplace card will show about {formatInr(
              gstConfig
                ? computeRegistrationPricing(savedAskingPriceInr, 1, gstConfig).total
                : savedAskingPriceInr
            )} (inclusive of applicable taxes) when your app currency is INR.
          </p>
        )}
        {commissionBreakdown && (
          <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3 text-sm text-gray-700 space-y-1">
            <div className="flex justify-between"><span>Listing Price</span><span>{formatListingCurrency(commissionBreakdown.listingPrice)}</span></div>
            <div className="flex justify-between">
              <span>Platform Fee ({commissionBreakdown.commissionPercent}%)</span>
              <span>{formatListingCurrency(commissionBreakdown.commissionAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <span>You Receive</span>
              <span>{formatListingCurrency(commissionBreakdown.sellerEarnings)}</span>
            </div>
            {buyerPaysBreakdown ? (
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-purple-100">
                <span>Buyer Pays</span>
                <span>{formatListingCurrency(buyerPaysBreakdown.total)}</span>
              </div>
            ) : null}
            <p className="pt-2 text-xs leading-5 text-gray-600">
              HubRegistrar deducts a {commissionBreakdown.commissionPercent}% marketplace commission from your payout.
              Buyers see the tax-inclusive price only — they are not shown this fee.
              {buyerPaysBreakdown ? ' Buyer pays includes applicable taxes.' : ''}
            </p>
          </div>
        )}

        {!isEdit && isAuction && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CurrencyPriceInput
                  id="domain-min-bid"
                  label={t('domainsPageMinBidLabel')}
                  value={form.minBidPrice}
                  onChange={(v) => setForm((f) => ({ ...f, minBidPrice: v }))}
                  currency={form.currency}
                  onCurrencyChange={changeFormCurrency}
                  required
                  placeholder={t('domainsPageMinBidPlaceholder')}
                  inputClassName={inputCls}
                  labelClassName={labelCls}
                />
                <span className="text-[0.72rem] text-gray-500 mt-1 block">
                  {t('domainsPageMinBidHint')}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>{t('domainsPageAuctionDurationLabel')} <span className="text-red-500">*</span></label>
                <FormSelect className={inputCls} value={form.auctionDuration}
                  onChange={e => setForm(f => ({ ...f, auctionDuration: e.target.value }))}>
                  <option value="ONE_DAY">{t('domainsPageDurationOneDay')}</option>
                  <option value="SEVEN_DAYS">{t('domainsPageDurationSevenDays')}</option>
                  <option value="THIRTY_DAYS">{t('domainsPageDurationThirtyDays')}</option>
                  <option value="SIXTY_DAYS">{t('domainsPageDurationSixtyDays')}</option>
                  <option value="NINETY_DAYS">{t('domainsPageDurationNinetyDays')}</option>
                </FormSelect>
              </div>
            </div>
            <div className="p-3.5 bg-amber-100 border border-amber-400 rounded-lg text-[0.82rem] text-amber-900 leading-relaxed">
              {t('domainsPageAuctionDraftNotice')}
              {' '}
              {isAdmin ? t('domainsPageAuctionFeeNoticeAdmin', { defaultValue: 'Auction creation fee: Free (Admin)' }) : t('domainsPageAuctionFeeNotice', {
                defaultValue: 'Auction listing fee: {{fee}} (charged when you submit).',
                fee: formatInr(auctionCreationFeeInr),
              })}
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('domainsPageContactEmailLabel')} <span className="text-red-500">*</span></label>
            <input className={inputCls} type="email" value={form.contactInfo.email}
              onChange={e => setContact('email', e.target.value)}
              placeholder={t('domainsPageEmailPlaceholder')} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('domainsPagePhoneLabel')}</label>
            <input className={inputCls} value={form.contactInfo.phoneNumber}
              onChange={e => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setContact('phoneNumber', value);
              }}
              type="tel"
              placeholder={t('domainsPagePhonePlaceholder')} maxLength={10} />
          </div>
        </div>

        {!isEdit && (
          <label className="inline-flex items-center gap-3 cursor-pointer self-start rounded-[12px] border border-purple-100 bg-purple-50/60 px-3.5 py-2.5 max-w-full">
            <input
              type="checkbox"
              checked={form.agreement.terms}
              onChange={e => setForm(f => ({ ...f, agreement: { terms: e.target.checked } }))}
              required
              className="peer sr-only"
            />
            <span className="relative w-5 h-5 rounded-[7px] border-2 border-purple-300 bg-white flex items-center justify-center flex-shrink-0 transition-all" style={{ backgroundColor: form.agreement.terms ? '#9333ea' : 'white', borderColor: form.agreement.terms ? '#9333ea' : '#d8b4fe' }}>
              {form.agreement.terms && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="4" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            <span className="text-sm text-gray-700 leading-snug">{t('domainsPageTermsAgreement')}</span>
          </label>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}
        {warning && <div className="text-sm text-amber-600">{warning}</div>}

        <div className="flex gap-3 mt-2">
          <button type="submit" className="btn-glow flex-1" disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> :
              isEdit ? t('domainsPageSaveChanges') : isAuction ? t('domainsPageListForAuction') : t('domainsPageListDomainBtn')}
          </button>
          <button type="button" className="btn-glow" onClick={onCancel}>{t('cancel')}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Buy Domain Modal ─────────────────────────────────────────────────────────
function BuyDomainModal({ domain, onClose, onSuccess, vaServices = [], vaLoading = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addons, setAddons] = useState([]);
  const [vaAddons, setVaAddons] = useState([]);
  const [buyer, setBuyer] = useState({
    buyerFullName: `${user?.firstname || user?.firstName || ''} ${user?.lastname || user?.lastName || ''}`.trim(),
    buyerEmail: user?.email || '',
    buyerPhone: (user?.phoneNumber || user?.phone || '').replace(/\D/g, '').slice(-10),
  });

  const addonExtra = addonTotal(addons);
  const domainPrice = listingBuyerPayable(domain);
  const asking = Number(domain.askingPrice) || 0;
  const gstConfig = domain.gstRate != null
    ? { enabled: domain.gstEnabled !== false, rate: Number(domain.gstRate), priceInclusive: false }
    : null;
  const billed = gstConfig
    ? computeRegistrationPricing(asking + addonExtra, 1, gstConfig)
    : { total: domainPrice + addonExtra, gst: 0 };
  const totalPrice = billed.total;

  const [redeemPoints, setRedeemPoints] = useState(false);
  const [finalPayable, setFinalPayable] = useState(totalPrice);

  useEffect(() => {
    setFinalPayable(totalPrice);
  }, [totalPrice]);

  const handlePhoneChange = (e) => {
    setBuyer(b => ({ ...b, buyerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }));
  };

  const handleBuy = async () => {
    if (!/^\d{10}$/.test(buyer.buyerPhone.trim())) {
      setError(t('domainsPageErrorPhone'));
      return;
    }
    setLoading(true); setError('');
    try {
      const { data: orderData } = await domainAPI.createOrder(domain.id, {
        services: [...addons, ...vaAddons],
        ...buyer,
        ...buildOrderCurrencyPayload(currency),
      }, redeemPoints);
      if (orderData?.contactOnly) {
        onSuccess({
          ...domain,
          domainStatus: 'SOLD',
          paymentStatus: orderData.paymentStatus || 'CONTACT_PENDING',
          _addons: [...addons, ...vaAddons],
        });
        setLoading(false);
        return;
      }
      openRazorpayCheckout({
        orderData,
        user,
        description: `Purchase ${domain.domainName}${domain.domainExtension}`,
        onSuccess: async (response) => {
          try {
            const { data: verifyData } = await domainAPI.verifyPayment(domain.id, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            const transactionId = verifyData?.transactionId;
            onSuccess({
              ...domain,
              domainStatus: 'SOLD',
              paymentStatus: 'COMPLETED',
              _addons: [...addons, ...vaAddons],
            });
            if (transactionId) {
              navigate(`/purchases/transfers/${transactionId}`);
            }
          } catch {
            setError(t('storefrontVerifyFailed'));
            setLoading(false);
          }
        },
        onFailure: async () => {
          await domainAPI.handleFailure(domain.id);
          setError(t('storefrontPaymentFailed'));
          setLoading(false);
        },
        onDismiss: async () => {
          await domainAPI.handleFailure(domain.id);
          setLoading(false);
        },
      });
    } catch (err) {
      setError(readApiError(err, t('domainsPageErrorPaymentInit')));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 overflow-x-hidden">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>

        <div className="mb-5">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide mb-2">{t('domainsPagePurchaseBadge')}</div>
          <h2
            className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1 w-full overflow-hidden"
            style={{ textOverflow: 'clip', whiteSpace: 'nowrap', display: 'block' }}
          >
            <OverflowMarqueeText text={`${domain.domainName}${domain.domainExtension}`} />
          </h2>
          <p className="text-sm text-gray-500">{domain.pricingDemand}</p>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[0.82rem] text-amber-800 leading-relaxed mb-4">
          {t('domainsPageTransferNotice')}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">{t('domainsPageFullNameLabel')}</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
              value={buyer.buyerFullName}
              onChange={e => setBuyer(b => ({ ...b, buyerFullName: e.target.value }))}
              placeholder={t('domainsPageFullNamePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">{t('emailLabel')}</label>
              <input
                type="email"
                className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
                value={buyer.buyerEmail}
                onChange={e => setBuyer(b => ({ ...b, buyerEmail: e.target.value }))}
                placeholder={t('domainsPageEmailPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">
                {t('domainsPagePhoneLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
                value={buyer.buyerPhone}
                onChange={handlePhoneChange}
                placeholder={t('domainsPagePhonePlaceholder')}
                maxLength={10}
                inputMode="numeric"
                required
              />
            </div>
          </div>
        </div>

        {/* ── Add-on selectors ── */}
        <AddonSections
          businessSelected={addons}
          onBusinessChange={setAddons}
          vaSelected={vaAddons}
          onVaChange={setVaAddons}
          vaServices={vaServices}
          vaLoading={vaLoading}
        />

        {/* ── Billing breakdown ── */}
        <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
          <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('domainsPageBillingBreakdown')}</div>
          <div className="flex justify-between text-gray-600 mb-1">
            <span>{domain.domainName}{domain.domainExtension}</span>
            <span>{formatPrice(domainPrice)}</span>
          </div>
          {addons.filter(k => !ADDON_SERVICES.find(s => s.key === k)?.contactOnly).map(k => {
            const svc = ADDON_SERVICES.find(s => s.key === k);
            return svc ? (
              <div key={k} className="flex justify-between text-indigo-600 mb-1">
                <span className="truncate mr-2">{addonLabel(k, t)}</span>
                <span>{formatPrice(svc.price)}</span>
              </div>
            ) : null;
          })}
          {vaAddons.map((k) => {
            const service = vaServices.find((s) => String(s.id) === String(k));
            return service ? (
              <div key={k} className="flex justify-between text-[#7c6fe0] mb-1">
                <span className="truncate mr-2">{vaLabel(k, vaServices)}</span>
                <span className="text-xs font-semibold text-amber-700">admin follow-up</span>
              </div>
            ) : null;
          })}
          {addons.some(k => ADDON_SERVICES.find(s => s.key === k)?.contactOnly) && (
            <div className="text-xs text-amber-600 mb-1">{t('domainsPageContactServicesNote')}</div>
          )}
          {vaAddons.length > 0 && (
            <div className="text-xs text-amber-600 mb-1">
              Virtual assistant selection will be shared with the admin team for hiring follow-up.
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
            <span>{t('domainsPageTotalLabel')}</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <p className="text-[0.7rem] text-gray-500 mt-1">Inclusive of applicable taxes</p>
        </div>

        <EdgePointsRedeemToggle
          originalAmount={totalPrice}
          onChange={(redeem, discount, final) => {
            setRedeemPoints(redeem);
            setFinalPayable(final);
          }}
        />

        {error && <div className="text-sm text-red-500 mt-4 mb-2">{error}</div>}

        <div className="flex gap-3 mt-5">
          <button type="button" className="btn-glow flex-1" onClick={handleBuy} disabled={loading}>
            {loading
              ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" />
              : t('domainsPagePayButton', { amount: formatPrice(finalPayable) })}
          </button>
          <AddToCartButton
            productType="DOMAIN_LISTING"
            productId={domain.id}
            addonServices={[...addons, ...vaAddons].map(a => typeof a === 'string' ? a : a.key)}
            size="md"
          />
          <button type="button" className="btn-glow" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}


// ─── Purchase Success Modal ───────────────────────────────────────────────────
function PurchaseSuccessModal({ domain, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] text-center bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-2">{t('domainsPagePurchaseSuccessTitle')}</h2>
        <p className="text-gray-500 mb-5">
          {t('domainsPagePurchaseSuccessBody')}{' '}
          <strong className="text-gray-900">{domain.domainName}{domain.domainExtension}</strong>
        </p>
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[0.82rem] text-amber-800 leading-relaxed mb-6">
          {t('domainsPagePurchaseEmailNotice')}
        </div>
        <button className="btn-glow w-full" onClick={onClose}>{t('domainVerifyDone')}</button>
      </div>
    </div>
  );
}

// ─── Domain Detail Modal ──────────────────────────────────────────────────────
function DomainDetailModal({ domain, isOwner, onClose, onBuy,
  onViewAuction, onEdit, likeState, onLike, onViewsUpdated }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const roleText = String(user?.role || '').toUpperCase().replace(/^ROLE_/, '');
  const isAdmin = roleText === 'ADMIN' || roleText === 'SUPER_ADMIN' || Boolean(user?.isAdmin);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    domainAPI.get(domain.id)
      .then(({ data }) => {
        const normalized = normalizeDomainRecord(data?.data ?? data);
        setDetail(normalized);
        onViewsUpdated?.(normalized.id, normalized.views);
      })
      .catch(() => setDetail(domain))
      .finally(() => setLoading(false));
  }, [domain.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow || '';
    };
  }, [onClose]);

  const d = detail || domain;
  const display = resolveDomainDisplay(d);
  const c = normalizeContactInfo(d.contactInfo, d.contact_info);
  const s = STATUS_COLORS[d.domainStatus] || STATUS_COLORS.AVAILABLE;
  const isAuction = d.saleType === 'AUCTION';
  const isHighValue = isPremiumDomain(d);
  const auction = d.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-fadeIn"
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div className="relative w-full h-[100dvh] sm:h-auto max-w-[600px] sm:max-h-[90vh] flex flex-col min-h-0 bg-white sm:border sm:border-gray-200 sm:rounded-[24px] shadow-2xl overflow-hidden animate-slideUp">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-indigo-50/80 to-blue-50/40 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-200/20 blur-3xl pointer-events-none" />

        <button
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
        >
          ✕
        </button>

        <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 sm:py-6">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Badges Section */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="inline-flex items-center px-3 py-1 bg-indigo-600 rounded-md text-[0.7rem] font-bold text-white uppercase tracking-widest shadow-sm">
                  {isAuction ? t('domainsPageDetailAuctionBadge') : t('domainsPageDetailDomainBadge')}
                </div>
                {d.verified && (
                  <span className="px-2.5 py-1 rounded-md text-[0.7rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 uppercase tracking-widest">
                    {t('domainsPageVerifiedBadge')}
                  </span>
                )}
                {isHighValue && (
                  <span className="px-2.5 py-1 rounded-md text-[0.7rem] font-bold text-purple-700 bg-purple-50 border border-purple-200 uppercase tracking-widest">
                    ✦ {t('domainsPagePremiumBadge')}
                  </span>
                )}
                {!isAuction && (
                  <span className="px-2.5 py-1 rounded-md text-[0.7rem] font-bold uppercase tracking-widest" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                    {d.domainStatus}
                  </span>
                )}
              </div>

              {/* Domain Name Section */}
              <div className="mb-4">
                <h2 className="font-display text-[2.25rem] sm:text-[2.5rem] font-extrabold text-gray-900 m-0 tracking-tight flex items-baseline flex-wrap leading-none">
                  <span>{display.name}</span>
                  {display.ext && (
                    <span className="text-indigo-600 font-bold ml-1">
                      {display.ext.label.toLowerCase()}
                    </span>
                  )}
                </h2>
                <div className="text-sm font-medium text-gray-500 mt-2">
                  {d.pricingDemand === 'NEGOTIABLE' ? t('domainsPageNegotiable') : t('domainsPageFixedPrice')}
                </div>
              </div>

              {/* Price & Stats Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {isAuction && auction ? (
                  <>
                    <div className="flex flex-col justify-center p-4 rounded-[16px] bg-emerald-50/80 border border-emerald-100">
                      <div className="text-[0.7rem] font-bold text-emerald-700 uppercase tracking-widest mb-1">
                        {auction.currentHighestBid > 0 ? 'Highest Bid' : 'Minimum Bid'}
                      </div>
                      <div className="text-2xl font-black text-emerald-700">
                        {auction.currentHighestBid > 0
                          ? formatPrice(auction.currentHighestBid)
                          : formatPrice(auction.minBidPrice)}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center p-4 rounded-[16px] bg-gray-50/80 border border-gray-200">
                      <div className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Bids</div>
                      <div className="text-xl font-bold text-gray-900">{auction.totalBids}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col justify-center p-4 rounded-[16px] bg-emerald-50/80 border border-emerald-100 sm:col-span-2">
                    <div className="text-[0.7rem] font-bold text-emerald-700 uppercase tracking-widest mb-1">Price</div>
                    <div className="text-3xl font-black text-emerald-700 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span>{formatPrice(listingBuyerPayable(d))}</span>
                      <span className="text-sm font-semibold text-emerald-600/70">Inclusive of applicable taxes</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Views Card */}
              <div className="p-3.5 bg-gray-50/80 border border-gray-100 rounded-[12px] mb-4">
                <div className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest mb-1">Listing Views</div>
                <div className="text-sm font-semibold text-gray-900">{t('domainsPageViewsChip', { count: d.views || 0 })}</div>
              </div>

              {isAuction && auction && (
                <div className="mb-4 p-4 rounded-[12px] border border-gray-200 bg-white shadow-sm">
                  <div className="text-xs font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                    {t('domainsPageAuctionInfoSection')}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label={t('domainsPageStatusLabel')}
                      value={auction.status === 'ACTIVE' ? t('domainsPageStatusLive') :
                        auction.status === 'EXTENDED' ? t('domainsPageStatusExtended') :
                          auction.status === 'DRAFT' ? t('domainsPageStatusPendingVerification') :
                            auction.status} />
                    <DetailItem label={t('domainsPageDurationLabel')} value={auction.duration?.replace(/_/g, ' ')} />
                    {auction.endTime && (
                      <DetailItem label={t('domainsPageEndsLabel')}
                        value={formatAuctionDateTime(auction.endTime, {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })} />
                    )}
                    {auction.currentHighestBid > 0 && (
                      <DetailItem label={t('domainsPageNextMinBidLabel')}
                        value={formatPrice(auction.currentHighestBid * 1.05)} />
                    )}
                  </div>
                </div>
              )}

              {isHighValue && !isOwner && d.domainStatus === 'AVAILABLE' && (
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-[10px] mb-4 text-sm font-medium text-purple-900 shadow-sm leading-relaxed">
                  {t('domainsPagePremiumEnquiryNotice')}
                </div>
              )}

              {isAdmin && (c.email || c.phoneNumber) && (
                <div className="mb-4">
                  <div className="text-xs font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                    {t('domainsPageContactSection')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {c.email && (
                      <DetailItem
                        label={t('emailLabel')}
                        value={c.email}
                        className="sm:col-span-2"
                      />
                    )}
                    {c.phoneNumber && (
                      <DetailItem label={t('domainsPagePhoneLabel')} value={c.phoneNumber} />
                    )}
                  </div>
                </div>
              )}

              {d.listedBy && (
                <div className="mb-4">
                  <div className="text-xs font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                    {t('domainsPageListedBySection')}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600 shadow-sm">
                      {d.listedBy.firstname?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="font-bold text-gray-900 text-sm">
                      {d.listedBy.firstname} {d.listedBy.lastname}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-3 flex gap-3 flex-col sm:flex-row items-center border-t border-gray-100">
                {isOwner && onEdit && (
                  <button type="button" className="btn-glow w-full sm:flex-1 py-3 justify-center shadow-sm" onClick={onEdit}>
                    <EditActionLabel iconSize={16}>{t('domainsPageEditListing')}</EditActionLabel>
                  </button>
                )}
                {!isOwner && (
                  isAuction ? (
                    <button
                      onClick={onViewAuction}
                      className="btn-glow w-full sm:flex-1 py-3 justify-center shadow-md hover:-translate-y-0.5 transition-all">
                      <Gavel size={16} className="shrink-0 mr-1.5" />
                      <span className="font-bold">{auctionLive ? t('domainsPageGoToAuction') : t('domainsPageViewAuction')} →</span>
                    </button>
                  ) : d.domainStatus === 'UNDER_REVIEW' ? (
                    <span className="w-full sm:flex-1 flex justify-center rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-bold text-amber-800 text-center">
                      {t('listingCardPremiumAcquisitionInProgress', 'Premium Acquisition in Progress')}
                    </span>
                  ) : d.domainStatus === 'AVAILABLE' ? (
                    <div className="w-full sm:flex-1 relative group">
                      <AddToCartButton
                        productType="DOMAIN_LISTING"
                        productId={d.id}
                        size="md"
                        tone="blue"
                        className="btn-glow w-auto min-w-[140px] py-3 justify-center shadow-md hover:-translate-y-0.5 transition-all !bg-indigo-600 hover:!bg-indigo-700 hover:!border-indigo-700 !text-white font-extrabold text-base"
                        label={t('listingCardAddToCart', 'Add to Cart')}
                      />
                    </div>
                  ) : null
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none">
                    <LikeButton liked={likeState?.liked} count={likeState?.count} onToggle={onLike} size="lg" className="!w-full sm:!w-auto !min-w-[80px] !h-[48px] !px-4 !justify-center !rounded-xl !border !border-gray-200 !bg-white !shadow-sm hover:!bg-gray-50" />
                  </div>
                  <button className="w-full sm:w-auto px-6 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-800 transition-colors h-[48px]" onClick={onClose}>
                    {t('close')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Domain Enquiry Modal ─────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailItem({ label, value, className = '' }) {
  return (
    <div className={`border border-gray-200 bg-white rounded-[10px] p-2.5 min-w-0${className ? ` ${className}` : ''}`}>
      <div className="text-[0.72rem] text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[0.95rem] text-gray-900 font-semibold break-words [overflow-wrap:anywhere] leading-snug">
        {value}
      </div>
    </div>
  );
}
