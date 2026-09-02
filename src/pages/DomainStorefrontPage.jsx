import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, Globe, ArrowRight, Loader2, Lock, ShieldAlert, Key, Plus, ChevronRight, X, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCurrency from '../context/CurrencyContext';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { domainAPI, domainStorefrontAPI } from '../api/services';
import { fetchStorefrontAvailableTldsPage } from '../utils/storefrontTlds';
import { registrationOrderDetailPath } from '../utils/domainRegistrationOrder';
import { readApiError } from '../utils/apiError';
import { canManageRegisteredDomain, domainManagementHref } from '../utils/domainManagement';
import ListingBackLink from '../components/common/ListingBackLink';
import DomainServices from '../components/storefront/DomainServices';
import DomainCard, { DomainCardGrid } from '../components/domain/DomainCard';
import RegistryPremiumSegment from '../components/domain/RegistryPremiumSegment';
import RegistryPremiumLoader from '../components/domain/RegistryPremiumLoader';
import DomainExtensionsLoader from '../components/common/DomainExtensionsLoader';
import { isRegistryPremium, REGISTRY_PREMIUM_SEGMENT } from '../utils/registryPremium';
import {
  getCachedPremiumItems,
  premiumCacheKey,
  setCachedPremiumItems,
} from '../utils/registryPremiumCache';
import { preferredTldRank, normalizeSearchFqdn } from '../utils/domainSearch';

const DEFAULT_TLD = 'com';
const PREMIUM_LOADING_MESSAGES = 3;

function parseDomainInput(raw, fallbackTld) {
  return normalizeSearchFqdn(raw, fallbackTld) || null;
}

function statusBadgeClass(status, lifecycleStatus) {
  const life = (lifecycleStatus || '').toLowerCase();
  if (life === 'registration_confirmed' || (status || '').toUpperCase() === 'ACTIVE') {
    return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  }
  if (
    life === 'payment_success' ||
    life === 'registration_pending' ||
    ['CREATED', 'PAYMENT_COMPLETED', 'REGISTRATION_PENDING'].includes((status || '').toUpperCase())
  ) {
    return 'bg-amber-50 border-amber-200 text-amber-800';
  }
  if (life === 'registration_failed' || (status || '').toUpperCase().includes('FAIL')) {
    return 'bg-rose-50 border-rose-200 text-rose-700';
  }
  return 'bg-gray-50 border-gray-200 text-gray-700';
}

function statusLabel(status, lifecycleStatus, t) {
  const life = lifecycleStatus || '';
  if (life === 'registration_confirmed') return t('storefrontStatusConfirmed', { defaultValue: 'Confirmed' });
  if (life === 'registration_pending') return t('storefrontStatusPending', { defaultValue: 'Pending' });
  if (life === 'payment_success') return t('storefrontStatusPaid', { defaultValue: 'Paid' });
  if (life === 'registration_failed') return t('storefrontStatusFailed', { defaultValue: 'Failed' });
  return status || life;
}

function isOrderConfirmed(order) {
  if (!order) return false;
  const life = (order.lifecycleStatus || '').toLowerCase();
  const s = (order.status || '').toUpperCase();
  return life === 'registration_confirmed' || s === 'ACTIVE';
}

/* ─── Premium Copy Button ─── */
function CopyBtn({ text, label }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handle}
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border transition-colors select-none ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Key className="w-3 h-3" />}
      {copied ? t('copied', { defaultValue: 'Copied' }) : (label || t('copy', { defaultValue: 'Copy' }))}
    </button>
  );
}

export default function DomainStorefrontPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatPrice, formatDomainPrice } = useCurrency();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDomain = searchParams.get('domain') || '';

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'register'); // 'register' or 'transfer'
  const [transferSubMode, setTransferSubMode] = useState('in'); // 'in' or 'out'
  
  const [query, setQuery] = useState(initialDomain);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState('');

  /* ─ Storefront available-TLD list (independent of the Home page search) ─ */
  const [tldItems, setTldItems] = useState([]);
  const [tldLoading, setTldLoading] = useState(false);
  const [tldError, setTldError] = useState('');
  const [tldPage, setTldPage] = useState(1);
  const [registrySegment, setRegistrySegment] = useState(REGISTRY_PREMIUM_SEGMENT.STANDARD);
  const [premiumVisibleCount, setPremiumVisibleCount] = useState(15);
  const [resultsAnimKey, setResultsAnimKey] = useState(0);
  const [premiumMarketplaceItems, setPremiumMarketplaceItems] = useState([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumLoadedLabel, setPremiumLoadedLabel] = useState('');
  const [premiumMsgIndex, setPremiumMsgIndex] = useState(0);
  const premiumAbortRef = useRef(null);
  const [tldHasMore, setTldHasMore] = useState(false);
  const [tldLoadingMore, setTldLoadingMore] = useState(false);
  const [tldSkeletonCount, setTldSkeletonCount] = useState(0);

  // Aborts the in-flight availability check + TLD load so the user can cancel a
  // slow search and immediately search again.
  const checkAbortRef = useRef(null);
  const storefrontSearchFrameRef = useRef(null);
  const storefrontSearchTailAtRef = useRef(0);
  const storefrontSearchTailTimerRef = useRef(0);

  const playStorefrontSearchTail = useCallback(() => {
    const host = storefrontSearchFrameRef.current;
    if (!host) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - storefrontSearchTailAtRef.current < 120) return;
    storefrontSearchTailAtRef.current = now;
    host.classList.remove('storefront-search-tail--play');
    void host.offsetWidth;
    host.classList.add('storefront-search-tail--play');
    window.clearTimeout(storefrontSearchTailTimerRef.current);
    storefrontSearchTailTimerRef.current = window.setTimeout(() => {
      host.classList.remove('storefront-search-tail--play');
    }, 2400);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(storefrontSearchTailTimerRef.current);
  }, []);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /* ─ Transfer-In states ─ */
  const [transferDomain, setTransferDomain] = useState('');
  const [transferAuthCode, setTransferAuthCode] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  /* ─ Transfer-Out states ─ */
  const [outDomain, setOutDomain] = useState('');
  const [outLoading, setOutLoading] = useState(false);
  const [outError, setOutError] = useState('');
  const [outSuccessCode, setOutSuccessCode] = useState('');
  const [outSuccessMsg, setOutSuccessMsg] = useState('');

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data } = await domainStorefrontAPI.listOrders();
      setOrders(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const confirmedOrders = useMemo(
    () => orders.filter(isOrderConfirmed),
    [orders],
  );

  const transferOrders = useMemo(
    () => orders.filter(o => o.isTransfer),
    [orders]
  );

  const standardTldItems = useMemo(
    () => tldItems.filter((it) => !isRegistryPremium(it)),
    [tldItems],
  );
  const premiumTldItems = useMemo(() => {
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
    (tldItems || []).forEach(add);
    (premiumMarketplaceItems || []).forEach(add);
    if (
      checkResult
      && checkResult.status === 'available'
      && isRegistryPremium(checkResult)
    ) {
      const domain = String(checkResult.domain || '').toLowerCase();
      if (domain) {
        add({
          domain,
          name: domain.split('.')[0],
          tld: domain.split('.').slice(1).join('.'),
          status: 'available',
          available: true,
          isPremium: true,
          registrationPrice: checkResult.unitPrice ?? checkResult.price,
          renewalPrice: checkResult.renewalPrice,
          minPeriodYears: checkResult.minPeriodYears || 1,
        });
      }
    }
    return Array.from(byDomain.values()).sort((a, b) => {
      const aDomain = String(a.domain || '').toLowerCase();
      const bDomain = String(b.domain || '').toLowerCase();

      // 1. Premium version of the exact searched domain first.
      if (checkResult?.domain) {
        const searchedFqdn = checkResult.domain.toLowerCase();
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
  }, [tldItems, premiumMarketplaceItems, checkResult]);

  const premiumSlice = useMemo(
    () => premiumTldItems.slice(0, premiumVisibleCount),
    [premiumTldItems, premiumVisibleCount],
  );
  const premiumHasMore = premiumTldItems.length > premiumVisibleCount || tldHasMore;

  const visibleTldItems =
    registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
      ? premiumSlice
      : standardTldItems;

  // Rotate premium loading copy every 2s.
  useEffect(() => {
    if (!premiumLoading) return undefined;
    const id = setInterval(() => {
      setPremiumMsgIndex((i) => (i + 1) % PREMIUM_LOADING_MESSAGES);
    }, 2000);
    return () => clearInterval(id);
  }, [premiumLoading]);

  // Auto-switch to Premium when marketplace premiums arrive (do not interrupt Standard paint).
  useEffect(() => {
    if (premiumLoading) return;
    if (premiumTldItems.length > 0 && standardTldItems.length === 0) {
      setRegistrySegment(REGISTRY_PREMIUM_SEGMENT.PREMIUM);
      setResultsAnimKey((k) => k + 1);
    }
  }, [premiumLoading, premiumTldItems.length, standardTldItems.length]);

  const handleRegistrySegmentChange = (next) => {
    setRegistrySegment(next);
    setResultsAnimKey((k) => k + 1);
  };

  const loadPremiumMarketplace = useCallback(async (raw, signal) => {
    const fqdn = parseDomainInput(raw, DEFAULT_TLD);
    const label = premiumCacheKey(fqdn ? fqdn.split('.')[0] : '');
    if (!label) {
      setPremiumMarketplaceItems([]);
      setPremiumLoadedLabel('');
      setPremiumLoading(false);
      return;
    }

    const cached = getCachedPremiumItems(label);
    if (cached) {
      setPremiumMarketplaceItems(cached);
      setPremiumLoadedLabel(label);
      setPremiumLoading(false);
      return;
    }

    if (premiumAbortRef.current) {
      premiumAbortRef.current.abort();
    }
    const controller = signal ? null : new AbortController();
    const activeSignal = signal || controller?.signal;
    if (controller) premiumAbortRef.current = controller;

    // Hard timeout (above the backend's 30s cap) so loading never hangs.
    const timeoutId = controller ? setTimeout(() => controller.abort(), 35_000) : null;

    setPremiumLoading(true);
    setPremiumMsgIndex(0);
    setPremiumMarketplaceItems([]);
    setPremiumVisibleCount(15);
    setPremiumLoadedLabel(label);
    try {
      const { data } = await domainAPI.searchPremium({ name: label }, { signal: activeSignal });
      if (activeSignal?.aborted) return;
      const items = Array.isArray(data?.items) ? data.items : [];
      setCachedPremiumItems(label, items);
      setPremiumMarketplaceItems(items);
    } catch (err) {
      if (activeSignal?.aborted || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
        // Timed out or cancelled — still clear loading state.
        setPremiumLoading(false);
        return;
      }
      setPremiumMarketplaceItems([]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setPremiumLoading(false);
    }
  }, []);

  const loadStorefrontTlds = useCallback(async (raw, signal) => {
    const fqdn = parseDomainInput(raw, DEFAULT_TLD);
    const label = fqdn ? fqdn.split('.')[0] : '';
    if (!label) {
      setTldItems([]);
      setTldPage(1);
      setTldHasMore(false);
      return;
    }

    setTldLoading(true);
    setTldSkeletonCount(6);
    setTldError('');
    setTldItems([]);
    setTldPage(1);
    setTldHasMore(false);
    try {
      const { items, moreAvailable } = await fetchStorefrontAvailableTldsPage(label, 1, { signal });
      if (signal?.aborted) return;
      setTldItems(items);
      setTldPage(2);
      setTldHasMore(moreAvailable);
      // A successful TLD search means the domain search worked. Clear any
      // stale error from the independent single-domain check so we never show
      // a false "server error" banner over valid results.
      setCheckError('');
    } catch (err) {
      if (signal?.aborted || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
        return;
      }
      setTldError(t('storefrontTldsFailed', { defaultValue: 'Could not load available extensions. Please try again.' }));
      setTldItems([]);
      setTldPage(1);
      setTldHasMore(false);
    } finally {
      setTldLoading(false);
      setTldSkeletonCount(0);
    }
  }, [t]);

  const loadMoreStorefrontTlds = useCallback(async () => {
    if (tldLoadingMore) return;
    const fqdn = parseDomainInput(query, DEFAULT_TLD);
    const label = fqdn ? fqdn.split('.')[0] : '';
    if (!label) return;

    setTldLoadingMore(true);
    try {
      const { items, moreAvailable } = await fetchStorefrontAvailableTldsPage(label, tldPage);
      // Append whatever this window returned (may be empty) and keep the
      // "View More" control driven by the backend's paging flag so a sparse
      // window never ends pagination prematurely.
      if (items.length) {
        setTldItems((prev) => {
          const seen = new Set(prev.map((it) => String(it.domain || '').toLowerCase()));
          const fresh = items.filter((it) => !seen.has(String(it.domain || '').toLowerCase()));
          return [...prev, ...fresh];
        });
      }
      setTldPage((p) => p + 1);
      setTldHasMore(moreAvailable);
    } catch {
      setTldHasMore(false);
    } finally {
      setTldLoadingMore(false);
    }
  }, [query, tldPage, tldLoadingMore]);

  const handleLoadMorePremium = useCallback(() => {
    setPremiumVisibleCount((c) => c + 15);
    if (tldHasMore && !tldLoadingMore) {
      loadMoreStorefrontTlds();
    }
  }, [tldHasMore, tldLoadingMore, loadMoreStorefrontTlds]);

  const runCheck = useCallback(
    async (raw) => {
      const fqdn = parseDomainInput(raw, DEFAULT_TLD);
      if (!fqdn) return;

      // Cancel any previously running check so a new/refreshed search always
      // starts clean and never gets stuck behind a slow prior request.
      if (checkAbortRef.current) {
        checkAbortRef.current.abort();
      }
      const controller = new AbortController();
      checkAbortRef.current = controller;
      const { signal } = controller;

      setChecking(true);
      setCheckError('');
      setCheckResult(null);
      setSuccessMessage('');
      setPayError('');
      setRegistrySegment(REGISTRY_PREMIUM_SEGMENT.STANDARD);
      setResultsAnimKey((k) => k + 1);

      // Start TLD extensions + premium marketplace in parallel with exact-match.
      // Premium must never block Standard results.
      const tldsPromise = loadStorefrontTlds(raw, signal);
      void loadPremiumMarketplace(raw, signal);

      try {
        const { data } = await domainAPI.check(encodeURIComponent(fqdn), undefined, { signal });
        if (signal.aborted) return;
        const result = data?.data ?? data;
        setCheckResult(result);
        setSearchParams({ domain: fqdn }, { replace: true });
      } catch (err) {
        if (signal.aborted || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
          return; // user cancelled — no error UI
        }
        setCheckError(readApiError(err, t('storefrontCheckFailed')));
      } finally {
        // Only clear the spinner if this is still the active request (a newer
        // search may have replaced it).
        if (checkAbortRef.current === controller) {
          setChecking(false);
        }
      }

      await tldsPromise;
    },
    [setSearchParams, t, loadStorefrontTlds, loadPremiumMarketplace],
  );

  const handleCancelCheck = useCallback(() => {
    if (checkAbortRef.current) {
      checkAbortRef.current.abort();
      checkAbortRef.current = null;
    }
    if (premiumAbortRef.current) {
      premiumAbortRef.current.abort();
      premiumAbortRef.current = null;
    }
    setChecking(false);
    setTldLoading(false);
    setTldLoadingMore(false);
    setPremiumLoading(false);
    setCheckError('');
  }, []);

  // When aftermarket premium arrives for the exact FQDN, upgrade a "taken" card.
  useEffect(() => {
    if (!checkResult?.domain || checkResult.status === 'available') return;
    const domain = String(checkResult.domain).toLowerCase();
    const hit = (premiumMarketplaceItems || []).find(
      (it) => String(it.domain || '').toLowerCase() === domain && it.available,
    );
    if (!hit) return;
    setCheckResult((prev) => ({
      ...(prev || {}),
      status: 'available',
      isPremium: true,
      unitPrice: hit.registrationPrice ?? hit.registrationPriceInr,
      price: hit.registrationPrice ?? hit.registrationPriceInr,
      minPeriodYears: hit.minPeriodYears || 1,
    }));
  }, [premiumMarketplaceItems, checkResult?.domain, checkResult?.status]);

  useEffect(() => {
    // On every mount / page refresh, read the domain straight from the URL and
    // re-run the availability check so the UI always reflects the LATEST API
    // response for that domain. runCheck() aborts any previous in-flight request
    // and resets checkResult before fetching, so there is no stale React state,
    // memoization or cached UI blocking the update. The user can still cancel a
    // slow check via the Cancel button.
    const domainFromUrl = searchParams.get('domain') || '';
    if (domainFromUrl) {
      runCheck(domainFromUrl);
    }
    return () => {
      // Abort any in-flight check when leaving the page.
      if (checkAbortRef.current) {
        checkAbortRef.current.abort();
        checkAbortRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    runCheck(query);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError(''); setTransferSuccess('');
    if (!transferDomain.trim() || !transferAuthCode.trim()) {
      setTransferError(t('storefrontTransferRequired', { defaultValue: 'Domain name and EPP/Authorization code are required.' }));
      return;
    }
    if (!user) {
      setTransferError('Please log in to transfer a domain.');
      return;
    }
    
    // Form Safety: prevent duplicate submission only for genuinely active/paid
    // transfers. An unpaid/cancelled checkout (no captured Razorpay payment) is
    // NOT a blocker — the customer may retry payment for the same attempt.
    const blockedTransfer = transferOrders.find(o =>
      o.domain.toLowerCase() === transferDomain.trim().toLowerCase() &&
      (
        o.razorpayPaymentId ||
        ['ACTIVE', 'REGISTRATION_PENDING', 'PAYMENT_COMPLETED'].includes((o.status || '').toUpperCase()) ||
        (o.transferStatus || '').toUpperCase() === 'PENDING'
      )
    );
    if (blockedTransfer) {
      setTransferError(t('storefrontTransferDuplicate', { defaultValue: 'You already have an active or pending transfer request for this domain. Check Your Transfers history below.' }));
      return;
    }

    // Step 1: show the EPP/Auth Code confirmation. Razorpay is NOT opened here
    // and NO payment order is created — the user must explicitly choose CONTINUE.
    setShowTransferConfirm(true);
  };

  const handleTransferConfirmContinue = async () => {
    // Step 2: user confirmed the EPP/Auth Code — now proceed to the existing
    // payment flow (create Razorpay order + open checkout).
    setShowTransferConfirm(false);
    setTransferError(''); setTransferSuccess('');
    setTransferLoading(true);
    try {
      const { payDomainTransfer } = await import('../utils/domainTransferCheckout');
      const orderData = await payDomainTransfer({
        domain: transferDomain.trim(),
        authCode: transferAuthCode.trim(),
        user,
        description: `Transfer ${transferDomain.trim()}`,
      });
      setTransferSuccess(t('storefrontTransferInitiated', {
        defaultValue: 'Domain transfer initiated successfully for {{domain}}!',
        domain: orderData.domain,
      }));
      setTransferDomain('');
      setTransferAuthCode('');
      await loadOrders();
    } catch (err) {
      setTransferError(readApiError(err, 'Failed to initiate domain transfer.'));
    } finally { setTransferLoading(false); }
  };

  const handleTransferOutSubmit = async (e) => {
    e.preventDefault();
    setOutError(''); setOutSuccessCode(''); setOutSuccessMsg('');
    const target = outDomain.trim().toLowerCase();
    if (!target) {
      setOutError('Domain name is required.');
      return;
    }
    setOutLoading(true);
    try {
      const { data } = await domainStorefrontAPI.initiateTransferOut({ domain: target });
      const res = data?.data ?? data;
      setOutSuccessCode(res.authCode);
      setOutSuccessMsg(res.message || t('storefrontDomainUnlocked', { defaultValue: 'Domain successfully unlocked.' }));
    } catch (err) {
      setOutError(readApiError(err, t('storefrontCouldNotRetrieveEpp', { defaultValue: 'Could not retrieve EPP code.' })));
    } finally { setOutLoading(false); }
  };

  const isMarketplace = checkResult?.status === 'marketplace'; // reserved for marketplace CTA if needed
  void isMarketplace;

  const handleRetry = async (orderId) => {
    try {
      await domainStorefrontAPI.retryProvision(orderId);
      await loadOrders();
    } catch (err) {
      setPayError(readApiError(err, t('storefrontRetryFailed')));
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50/50 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <ListingBackLink />

          {/* Header info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md max-w-fit">
                {t('storefrontHeaderEyebrow', { defaultValue: 'HubRegistrar Storefront' })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{t('storefrontHeaderTitle', { defaultValue: 'Domain Storefront' })}</h1>
              <p className="text-sm text-gray-500">
                {t('storefrontHeaderDesc', { defaultValue: 'Register branded domains, update DNS configuration, and manage EPP transfers in and out.' })}
              </p>
            </div>
          </div>

          {/* Tab selector */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center overflow-x-auto gap-1 max-w-fit shadow-inner">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap select-none ${
                activeTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {t('storefrontRegisterTab', { defaultValue: 'Register a Domain' })}
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap select-none ${
                activeTab === 'transfer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {t('storefrontTransferTab', { defaultValue: 'Transfer Options' })}
            </button>
          </div>

          {/* ══ TAB: REGISTER ══ */}
          {activeTab === 'register' && (
            <div className="space-y-6">
              {successMessage && (
                <div className="flex items-start gap-2.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="font-semibold">{successMessage}</span>
                </div>
              )}

              {/* Domain Search Card — Standard sky × Premium gold + border tail */}
              <section className="storefront-domain-search relative overflow-hidden bg-white rounded-2xl shadow-sm p-5 sm:p-6">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-sky-50/40 via-white/80 to-amber-50/35"
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1">
                        {t('storefrontDomainSearchEyebrow', { defaultValue: 'Domain search' })}
                      </p>
                      <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                        {t('storefrontFindDomainName', { defaultValue: 'Find your domain name' })}
                      </h2>
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="storefront-search-form">
                    <div
                      ref={storefrontSearchFrameRef}
                      className="storefront-search-frame"
                      onMouseEnter={playStorefrontSearchTail}
                      onClick={playStorefrontSearchTail}
                      onFocusCapture={playStorefrontSearchTail}
                    >
                      <span className="storefront-search-tail" aria-hidden="true" />
                      <div className="storefront-search-shell search-glow-focus">
                        <div className="storefront-search-form__fields">
                          <Search className="storefront-search-form__icon" aria-hidden="true" />
                          <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('storefrontSearchPlaceholder', { defaultValue: 'Search for domain e.g. mybrand' })}
                            className="storefront-search-form__input"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={checking}
                          className="storefront-search-form__submit"
                        >
                          {checking ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                              {t('storefrontChecking', { defaultValue: 'Checking...' })}
                            </>
                          ) : (
                            <>
                              {t('storefrontCheckAvailability', { defaultValue: 'Check Availability' })}
                              <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {checking && (
                      <button
                        type="button"
                        onClick={handleCancelCheck}
                        className="storefront-search-form__cancel"
                      >
                        <X className="w-4 h-4" />
                        {t('cancel', { defaultValue: 'Cancel' })}
                      </button>
                    )}
                  </form>
                </div>

                {checkError && tldItems.length === 0 && (
                  <div className="mt-4 flex items-start gap-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{checkError}</span>
                  </div>
                )}

                {checkResult && !checkError && checkResult.status === 'available' && (
                  <div className="mt-6">
                    <DomainCard
                      featured
                      item={{
                        domain: checkResult.domain,
                        name: String(checkResult.domain || '').split('.')[0],
                        tld: String(checkResult.domain || '').split('.').slice(1).join('.'),
                        status: 'available',
                        available: true,
                        registrationPrice: checkResult.unitPrice ?? checkResult.price,
                        renewalPrice: checkResult.renewalPrice,
                        // Cart starts at 1-year unit; minPeriodYears is checkout metadata only.
                        period: 1,
                        minPeriodYears: checkResult.minPeriodYears || 1,
                        isPremium: Boolean(checkResult.isPremium),
                      }}
                    />
                    <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {t('storefrontAddDomainsToCartPrefix', { defaultValue: 'Add domains to cart, then complete registrant details and payment in' })}{' '}
                      <Link to="/cart" className="font-semibold text-indigo-600 hover:underline">
                        {t('cart', { defaultValue: 'Cart' })}
                      </Link>
                      .
                    </p>
                  </div>
                )}

                {checkResult && !checkError && checkResult.status === 'taken' && (
                  <div className="mt-6 rounded-xl border border-rose-100 p-5 bg-rose-50/40">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-950" translate="no">{checkResult.domain}</span>
                      <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 uppercase tracking-wide">
                        {t('domainCardTaken', { defaultValue: 'Taken' })}
                      </span>
                    </div>
                    {premiumLoading ? (
                      <p className="mt-2 text-xs font-semibold text-amber-800/90">
                        {t('storefrontCheckingPremiumMarketplace', { defaultValue: 'Checking Premium Marketplace for this name...' })}
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Available TLDs — same DomainCard as Homepage */}
                {tldError && (
                  <div className="mt-6 flex items-start gap-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{tldError}</span>
                  </div>
                )}

                {!tldError && (tldItems.length > 0 || premiumLoading || premiumTldItems.length > 0 || tldLoading) && (
                  <div className="mt-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                      <RegistryPremiumSegment
                        value={registrySegment}
                        onChange={handleRegistrySegmentChange}
                        standardCount={standardTldItems.length}
                        premiumCount={premiumTldItems.length}
                        premiumLoading={premiumLoading}
                        standardLoading={tldLoading}
                      />
                    </div>

                    <div
                      key={`${resultsAnimKey}-${registrySegment}`}
                      className="registry-results-enter"
                    >
                      {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM && premiumLoading && premiumTldItems.length === 0 ? (
                        <RegistryPremiumLoader messageIndex={premiumMsgIndex} />
                      ) : visibleTldItems.length > 0 ? (
                        <>
                          <div className="flex justify-end mb-3">
                            <span className="text-xs font-semibold text-gray-400">
                              {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM
                                ? t('domainSearchPremiumResultCount', {
                                  defaultValue: '{{shown}} of {{total}} - sorted by price',
                                  shown: visibleTldItems.length,
                                  total: premiumTldItems.length,
                                })
                                : t('domainSearchStandardResultCount', {
                                  defaultValue: '{{count}} shown - sorted by price',
                                  count: visibleTldItems.length,
                                })}
                              {registrySegment === REGISTRY_PREMIUM_SEGMENT.PREMIUM && premiumLoading
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
                              items={visibleTldItems}
                              featuredFirst
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
                            ? (premiumLoading
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

                    {tldHasMore && registrySegment === REGISTRY_PREMIUM_SEGMENT.STANDARD && (
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={loadMoreStorefrontTlds}
                          disabled={tldLoadingMore}
                          className="inline-flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-6 h-11 rounded-xl transition-all shadow-sm select-none"
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
                  </div>
                )}

                {!tldLoading && !tldError && checkResult && tldItems.length === 0 && !premiumLoading && premiumTldItems.length === 0 && (
                  <div className="mt-6 flex items-center gap-2.5 text-xs text-gray-500 bg-gray-50 border border-gray-150 rounded-xl p-4">
                    <Globe className="w-4 h-4 shrink-0 text-gray-400" />
                    {t('storefrontNoOtherExtensions', { defaultValue: 'No other available extensions found for this name. Try another domain.' })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ══ TAB: TRANSFER ══ */}
          {activeTab === 'transfer' && (
            <div className="space-y-6">
              
              {/* Transfer Mode selector */}
              <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 max-w-fit shadow-inner">
                <button
                  onClick={() => setTransferSubMode('in')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all select-none ${
                    transferSubMode === 'in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t('storefrontTransferInTab', { defaultValue: 'Transfer to HubRegistrar' })}
                </button>
                <button
                  onClick={() => setTransferSubMode('out')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all select-none ${
                    transferSubMode === 'out' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t('storefrontTransferOutTab', { defaultValue: 'Transfer to Others' })}
                </button>
              </div>

              {/* ══ Mode: Transfer In ══ */}
              {transferSubMode === 'in' && (
                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">{t('storefrontTransferInTitle', { defaultValue: 'Transfer Domain in to HubRegistrar' })}</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {t('storefrontTransferInDesc', { defaultValue: 'Move your domain hosting and registrar management over to HubRegistrar. A 1-year registration extension is automatically applied upon successful EPP transfer.' })}
                    </p>
                  </div>

                  {transferError && (
                    <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                      {transferError}
                    </div>
                  )}
                  {transferSuccess && (
                    <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      {transferSuccess}
                    </div>
                  )}

                  <form onSubmit={handleTransferSubmit} className="space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {t('domainNameLabel', { defaultValue: 'Domain Name' })}
                      </label>
                      <input
                        type="text"
                        value={transferDomain}
                        onChange={(e) => setTransferDomain(e.target.value)}
                        placeholder="e.g. mycompany.com"
                        className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {t('eppAuthorizationCode', { defaultValue: 'EPP / Authorization Code' })}
                      </label>
                      <input
                        type="text"
                        value={transferAuthCode}
                        onChange={(e) => setTransferAuthCode(e.target.value)}
                        placeholder="Verify auth code inside your current registrar"
                        className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={transferLoading}
                        className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
                      >
                        {transferLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('storefrontRequestingTransfer', { defaultValue: 'Requesting Transfer...' })}
                          </>
                        ) : (
                          <>
                            {t('storefrontSubmitTransferRequest', { defaultValue: 'Submit Transfer Request' })} <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* ══ EPP / Auth Code confirmation — shown only after Submit ══ */}
              {showTransferConfirm && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                  style={{ background: 'rgba(15, 23, 42, 0.55)' }}
                  onClick={() => setShowTransferConfirm(false)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="transfer-confirm-title"
                >
                  <div
                    className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-6 sm:p-7 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3
                          id="transfer-confirm-title"
                          className="text-sm font-bold text-amber-900 uppercase tracking-wide"
                        >
                          {t('storefrontEppConfirmTitle', { defaultValue: 'Important: Please Check Your EPP/Auth Code Carefully' })}
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {t('storefrontEppConfirmDesc', { defaultValue: 'Confirm your transfer details before proceeding to payment.' })}
                        </p>
                      </div>
                    </div>

                    {/* Entered details for the final double-check */}
                    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-gray-500 uppercase tracking-wide">{t('domain', { defaultValue: 'Domain' })}</span>
                        <span className="font-bold text-gray-900 break-all" translate="no">{transferDomain.trim()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-gray-500 uppercase tracking-wide">{t('eppAuthCodeShort', { defaultValue: 'EPP / Auth Code' })}</span>
                        <span className="font-mono font-bold text-gray-900 break-all" translate="no">{transferAuthCode.trim()}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 space-y-2.5">
                      <p className="text-xs text-amber-800/90 leading-relaxed">
                        {t('storefrontEppConfirmWarning', { defaultValue: 'Before proceeding with payment, please make sure your EPP/Auth Code is entered exactly as provided by your current registrar.' })}
                      </p>
                      <p className="text-xs text-amber-800/90 leading-relaxed">
                        {t('storefrontEppSimilarChars', { defaultValue: 'Some characters can look very similar and are easy to confuse, for example:' })}
                      </p>
                      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        <li className="flex items-center gap-1.5 text-xs text-amber-900">
                          <code className="font-mono font-bold text-base leading-none text-amber-950 bg-white border border-amber-200 rounded-md px-1.5 py-1">I</code>
                          <span>{t('storefrontEppUpperI', { defaultValue: '- uppercase letter i' })}</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-xs text-amber-900">
                          <code className="font-mono font-bold text-base leading-none text-amber-950 bg-white border border-amber-200 rounded-md px-1.5 py-1">l</code>
                          <span>{t('storefrontEppLowerL', { defaultValue: '- lowercase letter L' })}</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-xs text-amber-900">
                          <code className="font-mono font-bold text-base leading-none text-amber-950 bg-white border border-amber-200 rounded-md px-1.5 py-1">1</code>
                          <span>{t('storefrontEppNumberOne', { defaultValue: '- number one' })}</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-xs text-amber-900">
                          <code className="font-mono font-bold text-base leading-none text-amber-950 bg-white border border-amber-200 rounded-md px-1.5 py-1">O</code>
                          <span>{t('storefrontEppUpperO', { defaultValue: '- uppercase letter o' })}</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-xs text-amber-900">
                          <code className="font-mono font-bold text-base leading-none text-amber-950 bg-white border border-amber-200 rounded-md px-1.5 py-1">0</code>
                          <span>{t('storefrontEppNumberZero', { defaultValue: '- number zero' })}</span>
                        </li>
                      </ul>
                      <p className="text-xs text-amber-800/90 leading-relaxed">
                        {t('storefrontEppPasteAdvice', { defaultValue: 'Please copy and paste the EPP/Auth Code directly from your current registrar whenever possible. Avoid adding extra spaces before or after the code.' })}
                      </p>
                      <p className="text-xs text-amber-800/90 leading-relaxed">
                        {t('storefrontEppRefundAdvice', { defaultValue: 'The EPP/Auth Code is verified during the transfer process. If the code is incorrect, the transfer will fail and your payment will be automatically refunded.' })}
                      </p>
                      <p className="text-xs font-semibold text-amber-900">
                        {t('storefrontEppDoubleCheck', { defaultValue: 'Please double-check the code before making the payment.' })}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row-reverse gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleTransferConfirmContinue}
                        disabled={transferLoading}
                        className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
                      >
                        {transferLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('storefrontOpeningCheckout', { defaultValue: 'Opening Checkout...' })}
                          </>
                        ) : (
                          <>{t('continue', { defaultValue: 'Continue' })} <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTransferConfirm(false)}
                        disabled={transferLoading}
                        className="inline-flex h-11 items-center justify-center gap-2 px-6 text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-xl disabled:opacity-50 transition-all shadow-sm select-none"
                      >
                        {t('cancel', { defaultValue: 'Cancel' })}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {transferSubMode === 'in' && transferOrders.length > 0 && (
                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mt-8 space-y-4">
                  <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider border-b border-gray-100 pb-3">
                    {t('storefrontYourTransfers', { defaultValue: 'Your Transfers' })}
                  </h2>
                  <div className="space-y-3">
                    {transferOrders.map(order => {
                      const isComplete = (order.status || '').toUpperCase() === 'ACTIVE';
                      const isPending = (order.status || '').toUpperCase() === 'REGISTRATION_PENDING';
                      const isPaidComplete = ((order.status || '').toUpperCase() === 'PAYMENT_COMPLETED');
                      const isPaidFailed = ['PAYMENT_FAILED', 'PROVISION_FAILED'].includes((order.status || '').toUpperCase());
                      const isCancelled = !order.razorpayPaymentId &&
                        ['CREATED', 'EXPIRED', 'PAYMENT_FAILED'].includes((order.status || '').toUpperCase());
                      
                      let uiMsg = order.status;
                      let badgeColor = 'bg-gray-50 text-gray-600 border-gray-200';
                      
                      if (isComplete) {
                        uiMsg = t('storefrontTransferCompleted', { defaultValue: 'Transfer completed.' });
                        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      } else if (isPending) {
                        uiMsg = t('storefrontTransferPending', { defaultValue: 'Transfer pending - your domain transfer has been submitted and is being processed.' });
                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      } else if (isPaidComplete) {
                        uiMsg = t('storefrontTransferInProgress', { defaultValue: 'Transfer in progress.' });
                        badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      } else if (isPaidFailed) {
                        uiMsg = t('storefrontTransferNeedsProcessing', { defaultValue: 'Payment received - your domain transfer needs processing.' });
                        badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      } else if (isCancelled) {
                        uiMsg = t('storefrontPaymentCancelled', { defaultValue: 'Payment Cancelled.' });
                        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                      }

                      return (
                        <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-150 bg-gray-50/50 gap-4">
                          <div>
                            <div className="font-bold text-gray-900" translate="no">{order.domain}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('orderedDate', { defaultValue: 'Ordered: {{date}}', date: new Date(order.createdAt).toLocaleDateString() })}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor}`}>
                              {uiMsg}
                            </span>
                            <Link 
                              to={registrationOrderDetailPath(order.id)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                            >
                              {t('viewDetails', { defaultValue: 'View Details' })}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ══ Mode: Transfer Out ══ */}
              {transferSubMode === 'out' && (
                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">{t('storefrontTransferOutTitle', { defaultValue: 'Transfer Domain out to Others' })}</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {t('storefrontTransferOutDesc', { defaultValue: 'Retrieve your domain authorization EPP code and disable registrar transfer-lock to move your domain to an external provider.' })}
                    </p>
                  </div>

                  {outError && (
                    <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-4">
                      {outError}
                    </div>
                  )}

                  {outSuccessCode ? (
                    <div className="border border-emerald-250 bg-emerald-50/40 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                        <span>{outSuccessMsg}</span>
                      </div>
                      <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2">
                        <label className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">
                          {t('storefrontEppAuthorizationCodeTitle', { defaultValue: 'EPP Authorization Code' })}
                        </label>
                        <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                          <span className="font-mono text-sm font-bold text-gray-800 select-all" translate="no">{outSuccessCode}</span>
                          <CopyBtn text={outSuccessCode} />
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                        <span className="font-medium leading-relaxed">
                          {t('storefrontTransferLockDisabled', { defaultValue: 'Your registrar transfer-lock is successfully disabled. Enter the EPP code above at your new domain provider to complete your transfer-out.' })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setOutSuccessCode(''); setOutDomain(''); }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        {t('storefrontUnlockAnotherDomain', { defaultValue: 'Unlock another domain' })}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleTransferOutSubmit} className="space-y-4 max-w-lg">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          {t('domainNameLabel', { defaultValue: 'Domain Name' })}
                        </label>
                        <input
                          type="text"
                          value={outDomain}
                          onChange={(e) => setOutDomain(e.target.value)}
                          placeholder="e.g. drymortar.in"
                          className="w-full rounded-xl border border-gray-250 bg-gray-50/30 px-4 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                          required
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={outLoading}
                          className="inline-flex h-11 items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 rounded-xl transition-all shadow-sm select-none"
                        >
                          {outLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {t('storefrontUnlockingDomain', { defaultValue: 'Unlocking Domain...' })}
                            </>
                          ) : (
                            <>
                              {t('storefrontDisableLockGetCode', { defaultValue: 'Disable Lock & Get Code' })} <Key className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              )}

            </div>
          )}

          {/* ══ ORDERS LIST ══ */}
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('storefrontYourRegistrations', { defaultValue: 'Your Registrations' })}</h2>
              <button
                type="button"
                onClick={loadOrders}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <RefreshCw className="w-4 h-4" />
                {t('storefrontRefreshList', { defaultValue: 'Refresh List' })}
              </button>
            </div>

            {ordersLoading ? (
              <p className="text-xs text-gray-400 font-semibold">{t('storefrontOrdersLoading')}</p>
            ) : confirmedOrders.length === 0 ? (
              <p className="text-xs text-gray-400 font-semibold">{t('storefrontOrdersEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                      <th className="py-2.5 pr-4 font-bold">{t('domain', { defaultValue: 'Domain' })}</th>
                      <th className="py-2.5 pr-4 font-bold">{t('totalPrice', { defaultValue: 'Total Price' })}</th>
                      <th className="py-2.5 pr-4 font-bold">{t('status', { defaultValue: 'Status' })}</th>
                      <th className="py-2.5 font-bold">{t('actions', { defaultValue: 'Actions' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pr-4 font-bold text-gray-950">
                          <Link
                            to={registrationOrderDetailPath(order.id)}
                            className="text-indigo-700 hover:text-indigo-900 hover:underline"
                          >
                            <span translate="no">{order.domain}</span>
                          </Link>
                        </td>
                        <td className="py-4 pr-4 text-gray-600 font-medium">
                          {formatDomainPrice(order.priceInr || 0)}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadgeClass(order.status, order.lifecycleStatus)}`}
                          >
                            {statusLabel(order.status, order.lifecycleStatus, t)}
                          </span>
                        </td>
                        <td className="py-4 flex flex-wrap items-center gap-3">
                          <Link
                            to={registrationOrderDetailPath(order.id)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold"
                          >
                            {t('storefrontManageDomain', { defaultValue: 'Manage Domain' })}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ══ DOMAIN SERVICES ══ */}
          <DomainServices orders={orders} ordersLoading={ordersLoading} />
        </div>
      </div>
    </AppLayout>
  );
}
