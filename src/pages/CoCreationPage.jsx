import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Plus, CircleUser, ShoppingCart, ArrowLeft } from 'lucide-react';
import PayoutSettingsButton from '../components/payout/PayoutSettingsButton';
import { technologyAPI } from '../api/services';
import { technologyServicesAPI } from '../api/technologyServicesApi';
import TechnologyServiceCard, { techT } from '../components/technology/TechnologyServiceCard';
import { Sparkles } from 'lucide-react';
import AddToCartButton from '../components/cart/AddToCartButton';
import TechnologyPlanPicker from '../components/cart/TechnologyPlanPicker';
import { normalizePricingPlans, getEnabledPricingPlans } from '../utils/technologyPricingPlans';
import { useAuth } from '../context/AuthContext';
import EdgePointsRedeemToggle from '../components/profile/EdgePointsRedeemToggle';
import useReferralTracker from '../hooks/useReferralTracker';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { buildOrderCurrencyPayload, convertForeignToInr, convertPrice as convertInrToForeign } from '../utils/currencyDisplay';
import AppLayout from '../components/layout/AppLayout';
import TechnologyIcon from '../assets/CoCreation.png';
import { useLikes } from '../hooks/useLikes';
import LikeButton from '../components/common/LikeButton';
import { useFilterSort } from '../hooks/useFilterSort';
import FilterBar from '../components/common/FilterBar';
import ListingBackLink from '../components/common/ListingBackLink';
import Pagination from '../components/common/Pagination';
import SkeletonCard from '../components/common/Skeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SoftwareAuctionRequestModal from './SoftwareAuctionRequestModal';
import { softwareAuctionAPI } from '../api/services';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import FormSelect from '../components/common/FormSelect';
import SearchableCurrencySelect from '../components/common/SearchableCurrencySelect';
import { DEFAULT_LISTING_CURRENCY, CURRENCY_LABELS } from '../constants/currencies';
import { captureAppLayoutScroll, scheduleRestoreAppLayoutScroll } from '../utils/preserveAppLayoutScroll';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import TechnologyListingCard from '../components/listings/TechnologyListingCard';
import ListingCardShell from '../components/listings/ListingCardShell';
import { TECHNOLOGY_CATEGORIES, TECHNOLOGY_CATEGORY_OPTIONS, HARDWARE_CATEGORIES, HARDWARE_CATEGORY_OPTIONS } from '../constants/listingCategories';
import TechnologyDemoVideoSection, { isValidDemoVideoUrl } from '../components/technology/TechnologyDemoVideoSection';
import { REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE } from '../config/featureFlags';
import {
  canRequestTechnologyAuction,
  isTechnologyAuctionLive,
  isTechnologyAuctionPending,
  isTechnologyListingOwner,
  technologyAuctionId,
} from '../utils/technologyAuctionUi';
import ConfettiBurst from '../components/common/ConfettiBurst';
import LearnMoreTooltip from '../components/common/LearnMoreTooltip';
import { fetchAllListPages } from '../utils/listPagination';
import { resolveMarketplaceListingRows } from '../utils/listingVisibility';
import { asArray } from '../utils/asArray';
import { computeCommissionBreakdown, fetchListingFeesAndCharges, payAuctionCreationFee } from '../utils/auctionFees';

export default function CoCreationPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { currency, getSymbol, formatPrice, supportedCurrencies, ratesMeta } = useCurrency();

  const navigate = useNavigate();
  const location = useLocation();

  const [allSoftware, setAllSoftware] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [buyTarget, setBuyTarget] = useState(null);
  const [buyTargetPlan, setBuyTargetPlan] = useState(null);
  const [successItem, setSuccessItem] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [filterTab, setFilterTab] = useState('all');
  const [showConfetti, setShowConfetti] = useState(false);
  const [accessNotice, setAccessNotice] = useState('');
  const [technologyType, setTechnologyType] = useState('');
  const [auctionTarget, setAuctionTarget] = useState(null);
  const [auctionStatuses, setAuctionStatuses] = useState({});    // softwareId → auction info
  const [techServices, setTechServices] = useState([]);
  const [serviceCategory, setServiceCategory] = useState('All');

  useEffect(() => {
    technologyServicesAPI.getServices()
      .then(res => setTechServices(res.data || res || []))
      .catch(() => setTechServices([]));
  }, []);

  const filteredTechServices = useMemo(() => {
    if (serviceCategory === 'All') return techServices;
    return techServices.filter(s => (s.category || '').toLowerCase() === serviceCategory.toLowerCase());
  }, [techServices, serviceCategory]);

  useReferralTracker(detailTarget?.id, 'technology');

  const filteredByType = useMemo(() => {
    if (!technologyType) return allSoftware;
    return allSoftware.filter(item => (item.technologyType || 'SOFTWARE') === technologyType);
  }, [allSoftware, technologyType]);

  const activeCategoryOptions = useMemo(() => {
    const rawOptions =
      technologyType === 'HARDWARE'
        ? HARDWARE_CATEGORY_OPTIONS
        : technologyType === 'SOFTWARE'
        ? TECHNOLOGY_CATEGORY_OPTIONS
        : [...TECHNOLOGY_CATEGORY_OPTIONS, ...HARDWARE_CATEGORY_OPTIONS];
    const seen = new Set();
    return rawOptions.filter(opt => {
      const val = opt.value;
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }, [technologyType]);

  const { toggle: toggleLike, get: getLike } = useLikes('SOFTWARE', filteredByType);

  const {
    paginated, totalCount,
    search, category, minPrice, maxPrice, sortBy,
    handleSearch, handleCategory, handleMinPrice, handleMaxPrice, handleSort,
    clearAll, activeFilterCount,
    page, totalPages, setPage,
  } = useFilterSort(
    resolveMarketplaceListingRows(filteredByType, {
      tab: filterTab,
      user,
      type: 'technology',
    }),
    {
      searchFields: ['name', 'description', 'techStack'],
      priceField: 'price',
      categoryField: 'category',
      dateField: 'createdAt',
    },
    20,
    {
      getLikeCount: (item) => getLike(item.id).count,
      resetPageWhen: filterTab,
    },
  );

  const handleTechnologyTypeChange = useCallback((val) => {
    setTechnologyType(val);
    handleCategory('');
  }, [handleCategory]);

  useEffect(() => {
    if (location.state?.openListTechnologyForm) {
      if (!user) {
        navigate('/login?redirect=' + encodeURIComponent('/technology'), { replace: true });
        return;
      }
      setFilterTab('all');
      setShowForm(true);
      navigate('/technology', { replace: true, state: {} });
    }
  }, [location.state, navigate, user]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const loadAll = filterTab === 'mine'
      ? technologyAPI.getMyListings().then(({ data }) => asArray(data))
      : fetchAllListPages((params) => technologyAPI.getAll(params));

    loadAll
      .then((rows) => {
        if (!cancelled) {
          setAllSoftware(rows);
        }
      })
      .catch(() => {
        if (!cancelled) setAllSoftware([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filterTab]);

  const { closeListingDetail, openDetailIfAllowed } = useOpenListingDetailFromUrl({
    items: allSoftware,
    loading,
    setDetail: setDetailTarget,
    fetchById: async (id) => {
      const { data } = await technologyAPI.get(id);
      return data?.data ?? data;
    },
    listingType: 'technology',
    user,
    authLoading,
    onAccessDenied: () => {
      setAccessNotice(t('listingDetailAccessDenied', 'This listing is not available to view yet.'));
    },
  });

  useEffect(() => {
    if (!user || allSoftware.length === 0) return;
    const myListings = allSoftware.filter(s => isTechnologyListingOwner(s, user));
    myListings.forEach(s => {
      softwareAuctionAPI.getBySoftware(s.id)
        .then(({ data }) => {
          setAuctionStatuses(prev => ({ ...prev, [s.id]: data?.auction ?? data?.data?.auction ?? null }));
        })
        .catch(() => { });
    });
  }, [allSoftware, user]);


  const handleDelete = async () => {
    try {
      await technologyAPI.delete(deleteTarget);
      setAllSoftware(s => s.filter(x => x.id !== deleteTarget));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to remove listing.');
    } finally { setDeleteTarget(null); }
  };

  const handleAuctionSubmitted = () => {
    const targetId = auctionTarget?.id;
    setAuctionTarget(null);
    alert('Auction request submitted! An admin will review it shortly.');
    if (targetId) {
      softwareAuctionAPI.getBySoftware(targetId)
        .then(({ data }) => {
          setAuctionStatuses(prev => ({ ...prev, [targetId]: data?.auction ?? data?.data?.auction ?? null }));
        })
        .catch(() => { });
      const refreshListings = filterTab === 'mine'
        ? technologyAPI.getMyListings().then(({ data }) => asArray(data))
        : fetchAllListPages((params) => technologyAPI.getAll(params));
      refreshListings
        .then((rows) => setAllSoftware(rows))
        .catch(() => { });
    }
  };


  const refreshSoftware = () =>
    fetchAllListPages((params) => technologyAPI.getAll(params))
      .then((rows) => setAllSoftware(rows));

  return (
    <AppLayout>
      <div className="cocreation-page">
        {(showForm || editTarget) && user ? (
          <>
            <ListingBackLink
              label={t('listingBackToTechnology')}
              onClick={() => { setShowForm(false); setEditTarget(null); }}
            />
            <SoftwareForm
              key={editTarget?.id || 'create'}
              initial={editTarget}
              onSaved={s => {
                const snap = captureAppLayoutScroll();
                flushSync(() => {
                  if (editTarget) {
                    setAllSoftware(prev => prev.map(x => (x.id === s.id ? { ...x, ...s } : x)));
                    setEditTarget(null);
                    if (detailTarget?.id === s.id) setDetailTarget(s);
                  } else {
                    setAllSoftware(prev => [s, ...prev]);
                    setShowForm(false);
                    setShowConfetti(true);
                  }
                });
                scheduleRestoreAppLayoutScroll(snap);
              }}
              onCancel={() => { setShowForm(false); setEditTarget(null); }}
            />
          </>
        ) : (
          <>
            <ListingBackLink />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {/* <img src={''} alt="Technology" className="w-10 h-10 object-contain" /> */}
                  <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{t('technology')}</h1>
                </div>
                <p className="text-gray-600">{t('buyAndSellSoftware')}</p>
              </div>
              <div className="flex gap-2 md:gap-3 flex-wrap">
                {user ? (
                  <PayoutSettingsButton className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" />
                ) : null}
                <button className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" onClick={() => navigate('/technology/dashboard')}>
                  <LayoutDashboard size={14} className="md:w-4 md:h-4" /> <span className="truncate">{t('dashboard')}</span>
                </button>
                <button className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" onClick={() => {
                  if (!user) {
                    navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
                    return;
                  }
                  setEditTarget(null); setShowForm(true);
                }}>
                  <Plus size={14} className="md:w-4 md:h-4" /> <span className="truncate">{t('listTechnology')}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'all' ? 'dashboard-active-control' : ''}`}
                onClick={() => { setFilterTab('all'); setShowForm(false); setEditTarget(null); }}>{t('allTechnology')}</button>
              <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'mine' ? 'dashboard-active-control' : ''}`}
                onClick={() => { setFilterTab('mine'); setShowForm(false); setEditTarget(null); }}>{t('myListings')}</button>
            </div>

            {accessNotice && (
              <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {accessNotice}
              </div>
            )}

            <FilterBar
              search={search} onSearch={handleSearch}
              category={category} onCategory={handleCategory}
              categoryOptions={activeCategoryOptions}
              technologyType={technologyType} onTechnologyType={handleTechnologyTypeChange}
              minPrice={minPrice} onMinPrice={handleMinPrice}
              maxPrice={maxPrice} onMaxPrice={handleMaxPrice}
              sortBy={sortBy} onSort={handleSort}
              onClear={() => { clearAll(); setTechnologyType(''); }} activeFilterCount={activeFilterCount + (technologyType ? 1 : 0)}
              placeholder={t('technologyPageSearchPlaceholder')}
              priceSymbol={getSymbol(currency)}
              theme="light"
            />

            {!loading && totalCount > 0 && (
              <div className="text-sm text-gray-600 mb-4">
                {totalCount} {t('techListingsCount', { count: totalCount, defaultValue: totalCount !== 1 ? 'technology listings found' : 'technology listing found' })}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-20">
                <div className="flex justify-center mb-6">
                  <img src={TechnologyIcon} alt="No software" className="w-20 h-20 object-contain opacity-30" />
                </div>
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                  {activeFilterCount > 0 ? 'No software matches your filters' :
                    filterTab === 'mine' ? 'You have no listings' :
                      'No technology listed yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeFilterCount > 0
                    ? 'Try adjusting your search or filters.'
                    : t('technologyPageEmptyHint', { defaultValue: 'Check back soon for new technology listings.' })}
                </p>
                {activeFilterCount > 0 && (
                  <button className="btn-glow btn-glow-sm" onClick={clearAll}>Clear Filters</button>
                )}
              </div>
            ) : (
              <>
                <div className="listing-card-glow-grid technology-listing-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginated.map(s => (
                    <ListingCardShell key={s.id}>
                      <TechnologyListingCard
                        item={s}
                        isOwner={filterTab === 'mine' || isTechnologyListingOwner(s, user)}
                        likeState={getLike(s.id)}
                        onLike={() => toggleLike(s.id)}
                        onView={() => openDetailIfAllowed(s)}
                        onBuy={() => {
                      if (!user) {
                        navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
                        return;
                      }
                      setBuyTarget(s);
                    }}
                        onEdit={user ? () => { setEditTarget(s); setShowForm(false); setDetailTarget(null); } : undefined}
                        onDelete={() => setDeleteTarget(s.id)}
                        onAuction={() => setAuctionTarget(s)}
                        auctionStatus={auctionStatuses[s.id]}
                      />
                    </ListingCardShell>
                  ))}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPage={setPage}
                  totalCount={totalCount}
                  pageSize={20}
                />
              </>
            )}

            {/* Technology Services Catalogue */}
            <div className="technology-services-catalogue mt-16 pt-12 border-t border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/10 to-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-600 mb-2 border border-blue-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('techServicesEnterpriseCatalogue', { defaultValue: 'Deltapreneur Enterprise Catalogue' })}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {t('techServicesTitle', { defaultValue: 'DeltaOs (Operating System)' })}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('techServicesSubtitle', { defaultValue: 'White-labelled provider-powered applications & cloud services.' })}
                  </p>
                </div>

                {/* Service Category Filter Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'All', label: t('commonAll', { defaultValue: 'All' }) },
                    { value: 'AI', label: techT(t, 'techCat_', 'AI') },
                    { value: 'Business', label: techT(t, 'techCat_', 'Business') },
                    { value: 'Marketing', label: techT(t, 'techCat_', 'Marketing') },
                    { value: 'Productivity', label: techT(t, 'techCat_', 'Productivity') },
                    { value: 'Communication', label: techT(t, 'techCat_', 'Communication') },
                    { value: 'Hosting', label: techT(t, 'techCat_', 'Hosting') },
                    { value: 'Security', label: techT(t, 'techCat_', 'Security') },
                    { value: 'Storage', label: techT(t, 'techCat_', 'Storage') },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setServiceCategory(value)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        serviceCategory === value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTechServices.map((service) => (
                  <TechnologyServiceCard key={service.id || service.slug} service={service} homeLayout />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {buyTarget && (
        <BuySoftwareModal
          item={buyTarget}
          selectedPlan={buyTargetPlan}
          user={user}
          onClose={() => { setBuyTarget(null); setBuyTargetPlan(null); }}
          onSuccess={item => {
            setSuccessItem(item);
            setBuyTarget(null);
            setBuyTargetPlan(null);
            setAllSoftware(prev => prev.map(x => x.id === item.id ? item : x));
          }}
        />
      )}

      {successItem && (
        <PurchaseSuccessModal item={successItem} onClose={() => setSuccessItem(null)} />
      )}

      {detailTarget && (
        <SoftwareDetailModal
          item={detailTarget}
          isOwner={isTechnologyListingOwner(detailTarget, user)}
          likeState={getLike(detailTarget.id)}
          onLike={() => toggleLike(detailTarget.id)}
          onClose={() => { closeListingDetail(); refreshSoftware(); }}
          onBuy={(plan) => {
            if (!user) {
              navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
              return;
            }
            setBuyTarget(detailTarget);
            setBuyTargetPlan(plan || null);
            closeListingDetail();
          }}
          onEdit={user ? () => {
            setEditTarget(detailTarget);
            setShowForm(false);
            closeListingDetail();
          } : undefined}
          onAuction={() => { setAuctionTarget(detailTarget); closeListingDetail(); }}
          auctionStatus={auctionStatuses[detailTarget.id]}
          onViewsUpdated={(id, views) => {
            setAllSoftware((prev) => prev.map((row) => (row.id === id ? { ...row, views } : row)));
          }}
        />
      )}

      {auctionTarget && (
        <SoftwareAuctionRequestModal
          software={auctionTarget}
          onClose={() => setAuctionTarget(null)}
          onSubmitted={handleAuctionSubmitted}
        />
      )}


      <ConfirmDialog
        open={!!deleteTarget}
        title={t('technologyPageRemoveTitle')}
        message={t('technologyPageRemoveMessage')}
        confirmLabel={t('remove')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfettiBurst active={showConfetti} onDone={() => setShowConfetti(false)} />
    </AppLayout>
  );
}


// ─── Pricing plan definitions ─────────────────────────────────────────────────
// normalizePricingPlans + getEnabledPricingPlans live in utils/technologyPricingPlans.js

function formatListingAmountForInput(inrAmount, listingCurrency, ratesMeta) {
  const code = (listingCurrency || DEFAULT_LISTING_CURRENCY).toUpperCase();
  const inr = Number(inrAmount);
  if (!Number.isFinite(inr)) return '';
  if (code === 'INR') return String(inr);
  const converted = convertInrToForeign(inr, code, ratesMeta);
  if (converted == null || !Number.isFinite(converted)) return String(inr);
  // Keep input tidy: drop trailing zeros for whole amounts.
  return String(Number.isInteger(converted) ? converted : Number(converted.toFixed(2)));
}

function softwareToFormFields(item, navCurrency, ratesMeta) {
  const listingCurrency = item?.currency || navCurrency || DEFAULT_LISTING_CURRENCY;
  const plans = normalizePricingPlans(item?.pricingPlans || item?.pricing_plans).map((plan) => ({
    ...plan,
    price: plan.price !== ''
      ? formatListingAmountForInput(plan.price, listingCurrency, ratesMeta)
      : '',
  }));
  const legacyPrice = item?.price != null && item?.price !== ''
    ? formatListingAmountForInput(item.price, listingCurrency, ratesMeta)
    : '';

  return {
    name: item?.name || '',
    description: item?.description || '',
    videoLink: item?.videoLink || item?.video_link || '',
    whatItDoes: item?.whatItDoes || item?.what_it_does || '',
    howItHelps: item?.howItHelps || item?.how_it_helps || '',
    githubLink: item?.githubLink || item?.github_link || '',
    liveDemoLink: item?.liveDemoLink || item?.live_demo_link || '',
    demoUrl: item?.demoUrl || item?.demo_url || '',
    techStack: item?.techStack || item?.tech_stack || '',
    category: item?.category || '',
    pricingDemand: item?.pricingDemand || item?.pricing_demand || '',
    price: legacyPrice,
    currency: listingCurrency,
    technologyType: item?.technologyType || item?.technology_type || 'SOFTWARE',
    purchaseType: item?.purchaseType || item?.purchase_type || 'ONE_TIME',
    pricingPlans: plans,
    supportingDocuments: [],
    agreement: { terms: Boolean(item?.id) },
  };
}


// ─── Software / Hardware Listing Form (create + edit) ─────────────────────────
function SoftwareForm({ initial, onSaved, onCancel }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency: navCurrency, ratesMeta, supportedCurrencies, getSymbol, formatCurrency } = useCurrency();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(() => softwareToFormFields(initial, navCurrency, ratesMeta));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(15);
  const [auctionCreationFeeInr, setAuctionCreationFeeInr] = useState(118);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  // Supporting documents state
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [docsError, setDocsError] = useState('');
  const docsInputRef = useRef(null);

  useEffect(() => {
    if (initial?.id) {
      setForm(softwareToFormFields(initial, navCurrency, ratesMeta));
      setImagePreview(initial.imageUrl || initial.image_url || null);
      setImageFile(null);
      setImageError('');
      setError('');
    }
  }, [initial?.id, navCurrency, ratesMeta]);

  useEffect(() => {
    fetchListingFeesAndCharges()
      .then((fees) => {
        setCommissionPercent(Number(fees?.softwareOnetimeCommissionPercent ?? fees?.listingCommissionPercent ?? 15));
        setAuctionCreationFeeInr(Number(fees?.auctionCreationFeeInr ?? 118));
      })
      .catch(() => { });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCurrencyChange = (newCurrency) => {
    const oldCurrency = form.currency || DEFAULT_LISTING_CURRENCY;
    set('currency', newCurrency);
    if (oldCurrency !== newCurrency) {
      setForm(f => {
        const nextF = { ...f, currency: newCurrency };
        
        const convertVal = (valStr) => {
          if (!valStr) return valStr;
          const currentVal = Number(valStr);
          if (Number.isFinite(currentVal) && currentVal > 0) {
            const inr = convertForeignToInr(currentVal, oldCurrency, ratesMeta);
            const newVal = convertInrToForeign(inr, newCurrency, ratesMeta);
            if (newVal != null && Number.isFinite(newVal)) {
              return String(newVal);
            }
          }
          return valStr;
        };

        nextF.pricingPlans = f.pricingPlans.map(p => ({
          ...p,
          price: convertVal(p.price)
        }));
        nextF.minBidPrice = convertVal(f.minBidPrice);
        return nextF;
      });
    }
  };

  // Derived helpers
  const isHardware = form.technologyType === 'HARDWARE';
  const activeCategories = isHardware ? HARDWARE_CATEGORIES : TECHNOLOGY_CATEGORIES;

  // GitHub URL validation
  const isValidGithubUrl = (url) => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?\/?$/;
    return githubRegex.test(url);
  };

  // Pricing plan helpers
  const setPlanField = (key, field, value) => {
    setForm(f => ({
      ...f,
      pricingPlans: f.pricingPlans.map(p =>
        p.key === key ? { ...p, [field]: value } : p
      ),
    }));
  };

  // First enabled plan's price used as the legacy price for backward compat
  const firstEnabledPlan = form.pricingPlans.find(p => p.enabled);
  const legacyPriceFromPlans = firstEnabledPlan ? (parseFloat(firstEnabledPlan.price) || 0) : 0;

  // Commission breakdown based on first enabled plan
  const commissionBreakdown = legacyPriceFromPlans > 0
    ? computeCommissionBreakdown(legacyPriceFromPlans, commissionPercent)
    : null;

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');

    // Validate demo video URL
    if (!form.videoLink?.trim()) {
      setError('Demo video link is required.');
      setLoading(false);
      return;
    }
    if (!isValidDemoVideoUrl(form.videoLink)) {
      setError('Please enter a valid demo video URL (YouTube or Loom).');
      setLoading(false);
      return;
    }

    // Validate GitHub URL — required for Software, optional for Hardware
    if (!isHardware && !isValidGithubUrl(form.githubLink)) {
      setError('Please enter a valid GitHub URL (e.g., https://github.com/username/repo).');
      setLoading(false);
      return;
    }
    if (isHardware && form.githubLink && !isValidGithubUrl(form.githubLink)) {
      setError('Please enter a valid GitHub URL or leave it blank.');
      setLoading(false);
      return;
    }

    try {
      let creationFeeOrderId;
      if (!isEdit && form.purchaseType === 'AUCTION') {
        if (!user) {
          throw new Error('Please sign in again.');
        }
        if (!form.minBidPrice || parseFloat(form.minBidPrice) <= 0) {
          setError('Minimum bid price is required for auction listings.');
          setLoading(false);
          return;
        }
        if (!form.auctionDuration) {
          setError('Auction duration is required for auction listings.');
          setLoading(false);
          return;
        }
        creationFeeOrderId = await payAuctionCreationFee({
          auctionType: 'SOFTWARE',
          user,
          referenceId: null,
          description: t('softwareAuctionCreationFee', { defaultValue: 'Software auction creation fee' }),
        });
      }
      // Build payload: keep all legacy fields, append new pricingPlans and technologyType
      const payload = {
        ...form,
        currency: form.currency || DEFAULT_LISTING_CURRENCY,
        technologyType: form.technologyType,
        purchaseType: form.purchaseType,
        // Legacy price auto-set from first enabled plan for backward compat
        price: legacyPriceFromPlans > 0 ? legacyPriceFromPlans : (parseFloat(form.price) || 0),
        // pricingDemand kept from form state (legacy compat)
        pricingDemand: form.pricingDemand || 'FIXED',
        // Dedicated pricingPlans field — only enabled plans with a price
        pricingPlans: form.purchaseType === 'AUCTION' ? [] : form.pricingPlans.map(p => ({
          key: p.key,
          label: p.label,
          enabled: p.enabled,
          price: p.enabled && p.price !== '' ? parseFloat(p.price) || null : null,
        })),
        // Auction fields
        minBidPrice: form.purchaseType === 'AUCTION' ? (parseFloat(form.minBidPrice) || 0) : undefined,
        auctionDuration: form.purchaseType === 'AUCTION' ? form.auctionDuration : undefined,
        sourceCodeIncluded: form.purchaseType === 'AUCTION' ? form.sourceCodeIncluded : undefined,
        supportIncluded: form.purchaseType === 'AUCTION' ? form.supportIncluded : undefined,
        supportDays: form.purchaseType === 'AUCTION' ? (parseInt(form.supportDays) || 0) : undefined,
        transferDetails: form.purchaseType === 'AUCTION' ? form.transferDetails : undefined,
        creationFeeOrderId: form.purchaseType === 'AUCTION' ? (creationFeeOrderId || undefined) : undefined,
      };

      const { data } = isEdit
        ? await technologyAPI.update(initial.id, payload)
        : await technologyAPI.create(payload);
      let saved = data?.data ?? data;

      if (imageFile && saved?.id) {
        const formData = new FormData();
        formData.append('file', imageFile);
        try {
          const { data: imgRes } = await technologyAPI.uploadImage(saved.id, formData);
          const imgPayload = imgRes?.data ?? imgRes;
          saved = {
            ...saved,
            imageUrl: imgPayload?.imageUrl ?? imgPayload?.image_url ?? saved.imageUrl,
          };
        } catch (uploadErr) {
          const errMsg = uploadErr.response?.data?.detail
            || uploadErr.response?.data?.error
            || uploadErr.response?.data?.message
            || 'Listing saved but logo upload failed. Please try again.';
          setError(errMsg);
          setLoading(false);
          return;
        }
      }

      // Supporting documents upload (mirrors image upload pattern)
      if (supportingDocs.length > 0 && saved?.id && technologyAPI.uploadSupportingDoc) {
        for (const docFile of supportingDocs) {
          const fd = new FormData();
          fd.append('file', docFile);
          try {
            await technologyAPI.uploadSupportingDoc(saved.id, fd);
          } catch {
            setDocsError('Listing saved but one or more supporting documents failed to upload. You can retry later.');
          }
        }
      }

      onSaved(saved);
    } catch (err) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message;
      if (status === 401) {
        setError(msg || 'Please sign in again.');
      } else {
        setError(msg || (isEdit ? 'Failed to update technology listing.' : 'Failed to list technology.'));
      }
    } finally { setLoading(false); }
  };

  const handleImageChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImageError('Only image files are allowed.'); return; }
    setImageError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDocsChange = e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setDocsError('');
    setSupportingDocs(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const newOnes = files.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...newOnes];
    });
    // Reset the input so the same file can be re-selected after removal
    e.target.value = '';
  };

  const removeDoc = (idx) => {
    setSupportingDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white outline-none focus:border-indigo-500 transition-all w-full placeholder:text-gray-400';
  const labelCls = 'text-sm font-medium text-gray-700';

  return (
    <div className="p-8 bg-white border border-gray-200 rounded-[18px] shadow-sm">
      <h3 className="font-display text-2xl text-gray-900 font-semibold">
        {isEdit ? 'Edit technology listing' : 'List technology'}
      </h3>
      <p className="text-gray-500 text-sm mt-1">
        {isEdit
          ? 'Update your technology listing details.'
          : 'Add a new technology product to the marketplace.'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">

        {/* ── Technology Type Selector ── */}
        {!isEdit && (
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Technology Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'SOFTWARE', label: 'Software', desc: 'Apps, SaaS, APIs, automation tools, and other software products.', accent: 'blue' },
                { value: 'HARDWARE', label: 'Hardware', desc: 'Physical devices, IoT, electronics, robotics, and embedded systems.', accent: 'teal' },
              ].map((opt) => {
                const selected = form.technologyType === opt.value;
                const borderCls = opt.accent === 'teal'
                  ? (selected ? 'border-teal-400 bg-teal-50/40' : 'border-gray-200 hover:border-teal-200')
                  : (selected ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 hover:border-blue-200');
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      set('technologyType', opt.value);
                      set('category', ''); // reset category on type switch
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${borderCls}`}
                  >
                    <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Name ── */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            {isHardware ? 'Hardware Name' : 'Software Name'} <span className="text-red-500">*</span>
          </label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)}
            placeholder={isHardware ? 'e.g. SmartSensor Pro' : 'e.g. InvoiceFlow'} required />
        </div>

        {/* ── Description ── */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Description <span className="text-red-500">*</span></label>
          <textarea className={`${inputCls} resize-vertical`} value={form.description} onChange={e => set('description', e.target.value)}
            placeholder={isHardware ? 'Brief overview of your hardware product' : 'Brief overview of your software'} rows={3} required />
        </div>

        {/* ── What It Does / How It Helps ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>What It Does <span className="text-red-500">*</span></label>
            <textarea className={`${inputCls} resize-vertical`} value={form.whatItDoes} onChange={e => set('whatItDoes', e.target.value)}
              placeholder="Core functionality" rows={3} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>How It Helps <span className="text-red-500">*</span></label>
            <textarea className={`${inputCls} resize-vertical`} value={form.howItHelps} onChange={e => set('howItHelps', e.target.value)}
              placeholder="The problem it solves" rows={3} required />
          </div>
        </div>

        {/* ── Category / Tech Stack or Hardware Specs ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Category <span className="text-red-500">*</span></label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} required>
              <option value="">Select category</option>
              {activeCategories.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{isHardware ? 'Hardware Specifications' : 'Tech Stack'}</label>
            <input className={inputCls} value={form.techStack} onChange={e => set('techStack', e.target.value)}
              placeholder={isHardware
                ? 'Processor, chipset, sensors, communication protocol, power requirements…'
                : 'React, Spring Boot, PostgreSQL'} />
          </div>
        </div>

        {/* ── Purchase Type ── */}
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Purchase Type <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'ONE_TIME', label: 'Regular Listing', desc: 'Fixed price, one-time purchase' },
              { value: 'AUCTION', label: 'Auction Listing', desc: 'Bidding system for one-time sale' },
            ].map((opt) => {
              const selected = form.purchaseType === opt.value;
              const borderCls = selected
                ? 'border-indigo-400 bg-indigo-50/40'
                : 'border-gray-200 hover:border-indigo-200';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    set('purchaseType', opt.value);
                  }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${borderCls}`}
                >
                  <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Pricing Plans (hidden for Auction) ── */}
        {form.purchaseType !== 'AUCTION' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelCls}>Pricing Plans <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-400 mt-0.5">Enable one or more plans and set a price for each.</p>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {form.pricingPlans.map((plan) => (
                <div key={plan.key} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 bg-white">
                  {/* Checkbox */}
                  <label className="flex items-center gap-2.5 cursor-pointer w-full sm:w-[180px] sm:flex-shrink-0">
                    <span
                      onClick={() => setPlanField(plan.key, 'enabled', !plan.enabled)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${plan.enabled
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white border-gray-300 hover:border-indigo-400'
                        }`}
                    >
                      {plan.enabled && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="4" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium text-gray-700 select-none">{plan.label}</span>
                  </label>

                  {/* Price input — only visible when enabled */}
                  {plan.enabled ? (
                    <div className="flex items-center gap-2 w-full sm:flex-1">
                      <SearchableCurrencySelect
                        className="shrink-0 w-[6rem] sm:w-[7.25rem] px-2 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        wrapperClassName="shrink-0 w-[6rem] sm:w-[7.25rem]"
                        value={form.currency}
                        onChange={handleCurrencyChange}
                        showFlag={false}
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className={`${inputCls} flex-1 sm:max-w-[180px]`}
                        placeholder="Enter price"
                        value={plan.price}
                        onChange={e => setPlanField(plan.key, 'price', e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="w-full sm:flex-1 text-xs text-gray-300 italic">Not offered</div>
                  )}
                </div>
              ))}
            </div>
            {/* Commission breakdown for One-Time Purchase */}
            {form.pricingPlans.find(p => p.key === 'ONE_TIME')?.enabled && commissionBreakdown && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm text-gray-700 space-y-1">
                <div className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wide">
                  Commission preview · One-Time Purchase
                </div>
                <div className="flex justify-between"><span>Listing price (buyer pays)</span><span>{formatCurrency(commissionBreakdown.finalListingPrice, form.currency)}</span></div>
                <div className="flex justify-between"><span>Platform commission ({commissionBreakdown.commissionPercent}%)</span><span>{formatCurrency(commissionBreakdown.commissionAmount, form.currency)}</span></div>
                <div className="flex justify-between font-semibold text-gray-900"><span>Estimated seller earnings</span><span>{formatCurrency(commissionBreakdown.sellerEarnings, form.currency)}</span></div>
                <p className="text-xs text-gray-500 pt-1">
                  Commission is deducted from your payout. Buyers pay the listed price only.
                </p>
              </div>
            )}
            {/* Subscription Revenue Policy if any subscription is enabled */}
            {form.pricingPlans.some(p => p.enabled && p.key !== 'ONE_TIME') && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm text-gray-700 space-y-2">
                <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Subscription Revenue Policy
                </div>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 text-xs leading-relaxed">
                  <li>Deltapreneur retains <strong>100%</strong> of the first subscription payment when a customer initially subscribes.</li>
                  <li>Deltapreneur charges <strong>no commission</strong> on renewal payments.</li>
                  <li>The seller receives <strong>100%</strong> of all future subscription renewals.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Auction Fields (only shown when Auction is selected) ── */}
        {form.purchaseType === 'AUCTION' && (
          <div className="flex flex-col gap-3 p-4 border-2 border-indigo-200 bg-indigo-50/40 rounded-xl">
            <div className="text-sm font-semibold text-indigo-900">Auction Settings</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Minimum Bid Price ({getSymbol(form.currency)}) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={inputCls}
                  placeholder="Enter minimum bid"
                  value={form.minBidPrice || ''}
                  onChange={e => set('minBidPrice', e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Auction Duration <span className="text-red-500">*</span></label>
                <select
                  className={inputCls}
                  value={form.auctionDuration || ''}
                  onChange={e => set('auctionDuration', e.target.value)}
                  required
                >
                  <option value="">Select duration</option>
                  <option value="ONE_DAY">1 Day</option>
                  <option value="THREE_DAYS">3 Days</option>
                  <option value="FIVE_DAYS">5 Days</option>
                  <option value="SEVEN_DAYS">7 Days</option>
                  <option value="FOURTEEN_DAYS">14 Days</option>
                  <option value="THIRTY_DAYS">30 Days</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.sourceCodeIncluded || false}
                  onChange={e => set('sourceCodeIncluded', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Source code included</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.supportIncluded || false}
                  onChange={e => set('supportIncluded', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Support included</span>
              </label>
            </div>
            {form.supportIncluded && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Support Duration (days)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  placeholder="Number of support days"
                  value={form.supportDays || ''}
                  onChange={e => set('supportDays', e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Transfer Details</label>
              <textarea
                className={`${inputCls} resize-vertical`}
                value={form.transferDetails || ''}
                onChange={e => set('transferDetails', e.target.value)}
                placeholder="How will the technology be transferred to the buyer?"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* ── Demo Video ── */}
        <TechnologyDemoVideoSection
          value={form.videoLink}
          onChange={(v) => set('videoLink', v)}
          inputClassName={inputCls}
          labelClassName={labelCls}
        />

        {/* ── Demo URL (replaces Live Demo Link) ── */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Demo URL <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
          <input className={inputCls} value={form.demoUrl} onChange={e => set('demoUrl', e.target.value)}
            placeholder="https://demo.yourproduct.com" />
        </div>



        {/* ── GitHub Link ── */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            GitHub Link {!isHardware && <span className="text-red-500">*</span>}
            {isHardware && <span className="text-[0.72rem] text-gray-400 ml-2 font-normal">(optional)</span>}
            <span className="text-[0.72rem] text-gray-400 ml-2 font-normal">
              🔒 Not shared until buyer confirms purchase
            </span>
          </label>
          <input className={inputCls} value={form.githubLink} onChange={e => set('githubLink', e.target.value)}
            placeholder="https://github.com/you/repo" required={!isHardware} />
        </div>

        {/* ── Logo / Cover Image ── */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            Logo / cover image <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${imagePreview ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
              }`}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-[120px] max-w-full rounded-lg object-contain mx-auto" />
            ) : (
              <>
                <div className="text-3xl mb-1">🖼</div>
                <div className="text-sm text-gray-500">Click to upload logo or cover</div>
                <div className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {imagePreview && (
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-red-500 self-start"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
            >
              ✕ Remove image
            </button>
          )}
          {imageError && <div className="text-sm text-amber-700">{imageError}</div>}
        </div>

        {/* ── Supporting Documents ── */}
        <div className="flex flex-col gap-2">
          <label className={labelCls}>
            Supporting Documents <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <p className="text-xs text-gray-400 -mt-1">
            PDFs, ZIP, DOC/DOCX, PPT/PPTX, images, or other downloadable resources. Multiple files allowed.
          </p>
          <div
            onClick={() => docsInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 bg-gray-50 hover:border-indigo-300 rounded-xl p-5 text-center cursor-pointer transition-all"
          >
            <div className="text-2xl mb-1">📎</div>
            <div className="text-sm text-gray-500">Click to attach documents</div>
            <div className="text-xs text-gray-400 mt-1">PDF, ZIP, DOC, DOCX, PPT, PPTX, images</div>
          </div>
          <input
            ref={docsInputRef}
            type="file"
            multiple
            accept=".pdf,.zip,.doc,.docx,.ppt,.pptx,image/*"
            className="hidden"
            onChange={handleDocsChange}
          />
          {supportingDocs.length > 0 && (
            <ul className="flex flex-col gap-1.5 mt-1">
              {supportingDocs.map((f, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                    onClick={() => removeDoc(idx)}
                  >✕</button>
                </li>
              ))}
            </ul>
          )}
          {docsError && <div className="text-sm text-amber-700">{docsError}</div>}
        </div>

        {/* ── Terms Agreement ── */}
        {!isEdit && (
          <label className="relative inline-flex items-center gap-3 cursor-pointer self-start rounded-[12px] border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 max-w-full">
            <input type="checkbox" className="absolute left-3.5 top-2.5 h-5 w-5 cursor-pointer opacity-0" checked={form.agreement.terms}
              onChange={e => setForm(f => ({ ...f, agreement: { terms: e.target.checked } }))}
              required />
            <span className="relative w-5 h-5 rounded-[7px] border-2 border-blue-300 bg-white flex items-center justify-center flex-shrink-0 transition-all" style={{ backgroundColor: form.agreement.terms ? '#2563eb' : 'white', borderColor: form.agreement.terms ? '#2563eb' : '#bfdbfe' }}>
              {form.agreement.terms && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="4" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            <span className="text-sm text-gray-700 leading-snug">
              I confirm this {isHardware ? 'hardware' : 'software'} is ready for sale and agree to the Terms &amp; Conditions.
            </span>
          </label>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button type="submit" className="btn-glow flex-1" disabled={loading}>
            {loading
              ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" />
              : (
                isEdit
                  ? 'Save changes →'
                  : (form.purchaseType === 'AUCTION'
                    ? `${t('commonPay', { defaultValue: 'Pay' })} ${formatPrice(Number(auctionCreationFeeInr || 0))} & ${t('listTechnology', { defaultValue: 'List technology' })} →`
                    : 'List technology →'
                  )
              )}
          </button>
          <button type="button" className="btn-glow" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}



// ─── Buy Technology Modal ── UPGRADED with Deltapreneur opt-in + billing breakdown ─
function BuySoftwareModal({ item, selectedPlan, user, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { currency, formatPrice } = useCurrency();
  const cleanPhone = (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const [form, setForm] = useState({
    buyerFullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim(),
    buyerEmail: user?.email || '',
    buyerPhone: cleanPhone(user?.phoneNumber),
  });

  const enabledPlans = getEnabledPricingPlans(item.pricingPlans || item.pricing_plans || []);
  const hasPlans = enabledPlans.length > 0;
  const multiplePlans = enabledPlans.length > 1;
  const [currentPlanKey, setCurrentPlanKey] = useState(
    selectedPlan?.key || (enabledPlans.length === 1 ? enabledPlans[0].key : null),
  );
  const [planTouched, setPlanTouched] = useState(
    Boolean(selectedPlan?.key) || enabledPlans.length <= 1,
  );

  const handlePlanSelect = (key) => {
    setCurrentPlanKey(key);
    setPlanTouched(true);
  };

  const canAddToCart = !hasPlans || (currentPlanKey && planTouched);

  const [coBrotherOptIn, setHubRegistrarOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activePlan = hasPlans && currentPlanKey
    ? enabledPlans.find((p) => p.key === currentPlanKey)
    : null;
  const basePrice = activePlan
    ? parseFloat(activePlan.price)
    : (hasPlans ? 0 : (item.price || 0));
  const coBrotherFee = coBrotherOptIn ? 1000 : 0;
  const subTotal = basePrice + coBrotherFee;
  const gstAmount = subTotal * 0.18;
  const totalPrice = subTotal + gstAmount;

  const [redeemPoints, setRedeemPoints] = useState(false);
  const [finalPayable, setFinalPayable] = useState(totalPrice);

  useEffect(() => {
    setFinalPayable(totalPrice);
  }, [totalPrice]);

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, buyerPhone: digits }));
  };

  const handlePay = async () => {
    if (hasPlans && !canAddToCart) {
      setError('Please select a pricing plan before checkout.');
      return;
    }
    if (!form.buyerFullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!form.buyerEmail.trim()) {
      setError('Email is required.');
      return;
    }
    if (!/^\d{10}$/.test(form.buyerPhone.trim())) {
      setError('A valid 10-digit phone number is required.');
      return;
    }
    setLoading(true); setError('');
    try {
      // Pass both buyer info AND coBrotherOptIn to backend
      const { data: orderData } = await technologyAPI.createOrder(item.id, {
        ...form,
        coBrotherOptIn,
        services: [],
        selectedPlan: currentPlanKey,
        ...buildOrderCurrencyPayload(currency),
      }, redeemPoints);

      openRazorpayCheckout({
        orderData,
        user,
        description: `${item.name}${coBrotherOptIn ? ' + Deltapreneur Help' : ''}`,
        themeColor: '#a06ec8',
        onSuccess: async (response) => {
          try {
            const { data: verifyData } = await technologyAPI.verifyPayment(item.id, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess({
              ...item,
              softwareStatus: 'SOLD',
              paymentStatus: 'COMPLETED',
              completionStatus: 'PENDING',
              githubLink: verifyData.githubLink,
              coBrotherOptIn,
              coBrotherHelpPaid: coBrotherOptIn,
              _addons: [],
            });
          } catch {
            setError('Payment verification failed. Please contact support.');
            setLoading(false);
          }
        },
        onFailure: async () => {
          await technologyAPI.handleFailure(item.id);
          setError('Payment failed. Please try again.');
          setLoading(false);
        },
        onDismiss: async () => {
          await technologyAPI.handleFailure(item.id);
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || 'Failed to initiate payment.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-fadeIn" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full h-[100dvh] sm:h-auto max-w-[960px] sm:max-h-[90vh] flex flex-col min-h-0 bg-white sm:border sm:border-gray-200 sm:rounded-[24px] shadow-2xl overflow-hidden animate-slideUp">
        {/* Header Gradient */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-indigo-50/90 to-blue-50/50 pointer-events-none" />
        
        <button className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm transition-colors" onClick={onClose}>✕</button>

        <div className="relative z-10 flex-shrink-0 px-6 sm:px-10 pt-8 pb-5 border-b border-indigo-100/50">
          <div className="inline-flex items-center justify-center px-2.5 py-1 bg-indigo-100/60 text-indigo-700 text-xs font-bold rounded-md mb-3 tracking-wide">
            COMPLETE PURCHASE
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight m-0 mb-1 pr-10">{item.name}</h2>
          <p className="text-sm font-medium text-gray-600 m-0">{item.category?.replace(/_/g, ' ')}</p>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-6 sm:px-10 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] gap-8 lg:gap-10 items-start">
            
            {/* Left Column: Form and Selection */}
            <div className="flex flex-col gap-8">
              {/* Buyer details */}
              <div className="flex flex-col gap-5">
                <div className="text-sm font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Buyer Information</div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-900">Full Name</label>
                  <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] shadow-sm" value={form.buyerFullName}
                    onChange={e => setForm(f => ({ ...f, buyerFullName: e.target.value }))}
                    placeholder="Your full name" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-gray-900">Email</label>
                    <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] shadow-sm" type="email" value={form.buyerEmail}
                      onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))}
                      placeholder="your@email.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-gray-900">
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] shadow-sm"
                      value={form.buyerPhone}
                      onChange={handlePhoneChange}
                      placeholder="10-digit number"
                      maxLength={10}
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              {hasPlans && (
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">
                    Pricing Plan
                    {multiplePlans && !planTouched && (
                      <span className="ml-3 text-[11px] font-semibold normal-case text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Select a plan to continue</span>
                    )}
                  </div>
                  <TechnologyPlanPicker
                    plans={enabledPlans}
                    selectedKey={currentPlanKey}
                    onSelect={handlePlanSelect}
                    formatPrice={formatPrice}
                  />
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="text-sm font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Optional Services</div>
                {/* ── Deltapreneur opt-in card only (no VA / Compliance) ── */}
                <div
                  onClick={() => setHubRegistrarOptIn(v => !v)}
                  className={`flex flex-col gap-3 p-5 cursor-pointer rounded-2xl border-2 transition-all duration-200 ${coBrotherOptIn ? 'bg-indigo-50/50 border-indigo-500 shadow-md' : 'bg-white border-gray-200 hover:border-indigo-300 shadow-sm'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${coBrotherOptIn ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                      {coBrotherOptIn && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                    </div>
                    <div>
                      <div className={`font-extrabold text-base mb-1 flex flex-wrap items-center gap-2 ${coBrotherOptIn ? 'text-indigo-950' : 'text-gray-900'}`}>
                        <span>Co-Deltapreneur Assistance</span>
                        <span className={`font-display text-[0.95rem] font-black ${coBrotherOptIn ? 'text-indigo-700' : 'text-gray-500'}`}>
                          +{formatPrice(1000)}
                        </span>
                      </div>
                      <div className="text-gray-500 text-sm font-medium leading-relaxed pr-2">
                        Get a dedicated Deltapreneur to help you set up, deploy, and get the most out of
                        this software. They'll reach out within 24 hours.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Sticky Summary */}
            <div className="lg:sticky lg:top-0">
              <div className="bg-gray-50/80 border border-gray-200 rounded-[20px] p-5 sm:p-7 shadow-sm">
                <div className="text-sm font-extrabold text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-3 mb-5">
                  Order Summary
                </div>

                <div className="flex flex-col gap-3">
                  <BillingLine label={`${item.name}${activePlan ? ` (${activePlan.label})` : ''}`}
                    value={formatPrice(basePrice)} />
                  {coBrotherOptIn && (
                    <BillingLine label="Co-Deltapreneur Assistance" value={formatPrice(1000)} accent />
                  )}
                </div>

                <div className="h-px bg-gray-200 my-5" />

                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-500 text-sm">GST (18%)</span>
                  <span className="font-bold text-gray-700 text-sm">
                    {formatPrice(gstAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-end mb-6 border-t border-gray-200 pt-4">
                  <span className="font-bold text-gray-900 text-base mb-1">Total Amount</span>
                  <span className="font-display text-4xl font-black text-emerald-600 tracking-tight">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <div className="mb-6">
                  <EdgePointsRedeemToggle
                    originalAmount={totalPrice}
                    onChange={(redeem, discount, final) => {
                      setRedeemPoints(redeem);
                      setFinalPayable(final);
                    }}
                  />
                </div>

                {error && <div className="text-sm text-red-600 mb-5 p-3.5 bg-red-50/80 rounded-xl border border-red-200 font-medium">{error}</div>}

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[14px] text-lg font-extrabold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                    onClick={handlePay}
                    disabled={loading || !canAddToCart}
                  >
                    {loading ? (
                      <span className="w-6 h-6 border-2 border-indigo-200 border-t-white rounded-full animate-spin inline-block align-middle" />
                    ) : (
                       `Pay ${formatPrice(finalPayable ?? totalPrice)} Securely →`
                    )}
                  </button>
                  <div className="relative group">
                    <AddToCartButton
                      productType="TECHNOLOGY"
                      productId={item.id}
                      selectedPlan={currentPlanKey}
                      coBrotherOptIn={coBrotherOptIn}
                      size="md"
                      label="Add to Cart"
                      disabled={!canAddToCart}
                      goToCartWhenInCart
                      className="!w-full !justify-center !bg-white !text-gray-700 !border-gray-200 hover:!bg-gray-50 hover:!text-gray-900 hover:!border-gray-300 font-bold transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-200/60 flex items-center justify-center gap-2 text-[0.65rem] text-gray-400 font-bold uppercase tracking-widest">
                  <span>🔒 Secure payment via Razorpay</span>
                </div>
              </div>

              <div className="mt-5 p-4 sm:p-5 bg-amber-50/80 border border-amber-200/80 rounded-[20px] text-[0.8rem] text-amber-900 font-semibold shadow-sm leading-relaxed">
                🔒 GitHub/Resources link will be shared after purchase verification.
                {coBrotherOptIn && ' Your Deltapreneur will reach out within 24 hours.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Billing line helper
function BillingLine({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center py-1 text-[0.84rem]">
      <span className={accent ? 'text-blue-600' : 'text-gray-500'}>{label}</span>
      <span className={`font-medium ${accent ? 'text-blue-700' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}

// ─── Purchase Success Modal ───────────────────────────────────────────────────
function PurchaseSuccessModal({ item, onClose }) {
  const planKey = item.selectedPlan || item.pricingPlan || 'ONE_TIME';
  const isSubscription = planKey !== 'ONE_TIME';
  const planLabel = {
    'ONE_MONTH': '1 Month Subscription',
    'THREE_MONTHS': '3 Months Subscription',
    'SIX_MONTHS': '6 Months Subscription',
    'TWELVE_MONTHS': '12 Months Subscription',
    '1_MONTH': '1 Month Subscription',
    '3_MONTHS': '3 Months Subscription',
    '6_MONTHS': '6 Months Subscription',
    '12_MONTHS': '12 Months Subscription',
  }[planKey] || 'Lifetime Access';
  const navigate = useNavigate();
  
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[480px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 text-center flex flex-col items-center">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-green-100/30 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-5 shadow-inner">
          🎉
        </div>

        <h2 className="font-display text-[1.75rem] font-bold text-gray-900 mb-2">Purchase Successful!</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          You have successfully purchased <span className="font-semibold text-gray-800">{item.name}</span>.
        </p>

        <div className="w-full bg-gray-50 border border-gray-200 rounded-[12px] p-5 text-left text-sm mb-6 shadow-sm">
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <span className="text-gray-500 font-medium">Access Status</span>
              <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded uppercase text-xs tracking-wider">
                {isSubscription ? 'Active Subscription' : 'Lifetime Access'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Order ID</span>
              <span className="text-gray-900 font-semibold">{item.id?.substring(0, 8).toUpperCase() || '—'}</span>
            </div>
          </div>
        </div>

        <div className="w-full text-left text-sm text-gray-600 bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-8">
          <p className="mb-2 font-medium text-blue-900 flex items-center gap-1.5">✉️ A confirmation email has been sent.</p>
          <p className="m-0 leading-relaxed text-blue-800/80">
            🚀 Your GitHub repository and resources are now available in your Purchases dashboard.
          </p>
        </div>

        <button className="btn-glow w-full py-3.5 text-base shadow-md hover:shadow-lg transition-all" onClick={() => {
          onClose();
          navigate('/purchases');
        }}>
          Go to My Purchases →
        </button>
      </div>
    </div>
  );
}

// ─── Software Detail Modal ────────────────────────────────────────────────────
function SoftwareDetailModal({ item, isOwner, onClose, onBuy, onEdit, onAuction, auctionStatus, likeState, onLike, onViewsUpdated }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    technologyAPI.get(item.id)
      .then(({ data }) => {
        const normalized = data?.data ?? data;
        setDetail(normalized);
        onViewsUpdated?.(normalized.id, normalized.views);
      })
      .catch(() => setDetail(item))
      .finally(() => setLoading(false));
  }, [item.id]);

  const d = detail || item;

  const enabledPlans = normalizePricingPlans(d.pricingPlans || d.pricing_plans || []).filter(p => p.enabled);
  const hasPlans = enabledPlans.length > 0;
  const [selectedPlanKey, setSelectedPlanKey] = useState(hasPlans ? enabledPlans[0].key : '');
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    if (hasPlans && !selectedPlanKey) {
      setSelectedPlanKey(enabledPlans[0].key);
    }
  }, [hasPlans, enabledPlans, selectedPlanKey]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-8 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-2 mb-3">
                {showPricing && (
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center p-1.5 mr-1 text-gray-500 hover:text-gray-950 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                    onClick={() => setShowPricing(false)}
                    aria-label="Back to details"
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                  </button>
                )}
                <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-[0.7rem] font-bold text-gray-700 uppercase tracking-widest">{d.category?.replace(/_/g, ' ')}</div>
                {d.technologyType === 'HARDWARE' ? (
                  <div className="inline-flex items-center px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-[0.7rem] font-bold text-orange-700 uppercase tracking-widest">HARDWARE</div>
                ) : (
                  <div className="inline-flex items-center px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-[0.7rem] font-bold text-blue-700 uppercase tracking-widest">SOFTWARE</div>
                )}
                {d.official && (
                  <span className="text-[0.7rem] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    ✦ Official
                  </span>
                )}
              </div>
              <h2 className="font-display text-[2.25rem] leading-tight font-bold text-gray-900 mb-2">{d.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                {d.creatorName && (
                  <div className="flex items-center gap-1.5">
                    <CircleUser className="w-4 h-4" />
                    <span>{d.creatorName}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" />
                  <span>{d.purchaseCount || 0} sales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">•</span>
                  <span>{d.views || 0} views</span>
                </div>
              </div>
            </div>

            {showPricing && (
              <div className="mb-8 p-5 bg-indigo-50/30 border border-indigo-100 rounded-2xl animate-[fadeIn_0.2s_ease-out]">
                {hasPlans ? (
                  <div className="w-full flex flex-col gap-4">
                    <div className="text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider">Select Pricing Plan</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {enabledPlans.map(plan => {
                        const isSub = plan.key !== 'ONE_TIME';
                        const isSelected = selectedPlanKey === plan.key;
                        const subtitle = plan.key === 'ONE_TIME'
                          ? 'Pay once, own forever'
                          : 'Billed securely today';

                        return (
                          <div
                            key={plan.key}
                            onClick={() => setSelectedPlanKey(plan.key)}
                            className={`relative flex flex-col p-5 min-h-[160px] justify-between border-2 rounded-2xl cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
                          >
                            {isSelected && (
                              <div className="absolute -top-2.5 left-4 bg-indigo-600 text-white font-extrabold text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                                Selected
                              </div>
                            )}

                            <div className="flex items-start gap-3 mb-2">
                              <span className={`text-[0.88rem] font-extrabold leading-snug ${isSelected ? 'text-indigo-950' : 'text-gray-800'}`}>
                                {plan.label}
                              </span>
                            </div>

                            <div className="mt-auto">
                              <div className={`text-xl font-black mb-1 ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                                {formatPrice(Number(plan.price) * 1.18)} <span className="text-sm font-medium text-gray-500">(inc. 18% GST)</span>
                              </div>

                              <div className="text-[0.74rem] text-gray-400 font-medium leading-normal mb-3">
                                {subtitle}
                              </div>

                              <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                                {!isSub ? (
                                  <>
                                    <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ Lifetime Access</div>
                                    <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ No Renewal Fees</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ Access until expiry</div>
                                    <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ Product Updates included</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Subscription Info Card */}
                    {selectedPlanKey !== 'ONE_TIME' && (
                      <div className="mt-2 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
                        <div className="text-blue-500 mt-0.5">ℹ️</div>
                        <div className="flex flex-col gap-1">
                          <div className="text-[0.85rem] font-bold text-blue-900">Subscription Information</div>
                          <div className="text-[0.8rem] text-blue-800/80 leading-relaxed">
                            Your subscription becomes active immediately upon payment. You will have full access and receive product updates until the selected term expires. You can renew anytime before expiry.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">One-Time Purchase</div>
                    <div className="text-2xl font-black text-gray-900 mb-2">
                      {formatPrice(Number(d.price) * 1.18)} <span className="text-base font-medium text-gray-500">(inc. 18% GST)</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ Lifetime Access</div>
                      <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ No Renewal Fees</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showPricing && (
              <>
                {d.description && (
                  <Section title={t('technologyPageDescriptionSection')}>
                    <p className="text-gray-600 leading-relaxed text-[0.9rem]">
                      {d.description}
                    </p>
                  </Section>
                )}

                {d.whatItDoes && (
                  <Section title={t('technologyPageWhatItDoes')}>
                    <p className="text-gray-600 leading-relaxed text-[0.9rem]">
                      {d.whatItDoes}
                    </p>
                  </Section>
                )}

                {d.howItHelps && (
                  <Section title={t('technologyPageHowItHelps')}>
                    <p className="text-gray-600 leading-relaxed text-[0.9rem]">
                      {d.howItHelps}
                    </p>
                  </Section>
                )}

                {d.techStack && (
                  <Section title={t('technologyPageTechStack')}>
                    <div className="flex flex-wrap gap-1.5">
                      {d.techStack.split(',').map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {(d.videoLink || d.liveDemoLink) && (
                  <Section title={t('technologyPageLinksSection')}>
                    <div className="flex gap-3 flex-wrap">
                      {d.videoLink && (
                        <a href={d.videoLink} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-gray-500 font-semibold text-xs rounded-lg border border-gray-200 cursor-pointer transition-colors hover:bg-gray-100 hover:text-black focus-visible:text-black no-underline" onClick={e => e.stopPropagation()}>
                          ▶ Demo Video ↗
                        </a>
                      )}
                      {d.liveDemoLink && (
                        <a href={d.liveDemoLink} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-gray-500 font-semibold text-xs rounded-lg border border-gray-200 cursor-pointer transition-colors hover:bg-gray-100 hover:text-black focus-visible:text-black no-underline" onClick={e => e.stopPropagation()}>
                          🌐 Live Demo ↗
                        </a>
                      )}
                    </div>
                  </Section>
                )}

                <Section title={t('technologyPageGithubSection')}>
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-gray-500">
                    {t('technologyPageGithubLocked')}
                  </div>
                </Section>

                {d.listedBy && (
                  <Section title={t('technologyPageListedBySection')}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600">
                        {d.listedBy.firstname?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="font-medium text-gray-800 text-[0.9rem]">
                        {d.listedBy.firstname} {d.listedBy.lastname}
                      </div>
                    </div>
                  </Section>
                )}
              </>
            )}

            <div className="flex gap-3 mt-6 flex-wrap items-center w-full">
              {!showPricing ? (
                <>
                  {isOwner && onEdit && (
                    <button type="button" className="btn-glow btn-glow-sm flex-1 py-3 text-sm font-semibold justify-center cursor-pointer" onClick={onEdit}>
                      Edit listing
                    </button>
                  )}
                  {isOwner && canRequestTechnologyAuction(d, auctionStatus) && onAuction && (
                    <button className="btn-glow btn-glow-sm flex-1 py-3 text-sm font-semibold justify-center cursor-pointer" onClick={onAuction}>
                      🔨 List for auction
                    </button>
                  )}
                  {isOwner && isTechnologyAuctionPending(d, auctionStatus) && (
                    <span className="text-sm font-semibold text-amber-700 px-3 py-3 bg-amber-50 border border-amber-200 rounded-lg flex-1 text-center">
                      ⏳ Auction pending admin review
                    </span>
                  )}
                  {isOwner && (auctionStatus?.approvalStatus === 'APPROVED' || d.auctionApprovalStatus === 'APPROVED')
                    && technologyAuctionId(d, auctionStatus) && (
                      <button
                        className="btn-glow btn-glow-sm flex-1 py-3 text-sm font-semibold justify-center cursor-pointer"
                        onClick={() => window.location.assign(`/technology/auction/${technologyAuctionId(d, auctionStatus)}`)}
                      >
                        {isTechnologyAuctionLive(d, auctionStatus) ? '🟢 On Live Auction' : 'View Auction →'}
                      </button>
                    )}
                  {!isOwner
                    && d.softwareStatus === 'AVAILABLE'
                    && d.purchaseType !== 'AUCTION'
                    && d.auctionApprovalStatus !== 'PENDING_APPROVAL' && (
                      REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !d.verified ? (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-3 rounded-md flex-1 text-center font-semibold">
                          Verification pending — available for purchase after admin approval
                        </span>
                      ) : (
                        <>
                          <button className="btn-glow flex-1 py-3 text-sm font-semibold justify-center cursor-pointer" onClick={() => setShowPricing(true)}>Buy Now →</button>
                          <AddToCartButton productType="TECHNOLOGY" productId={d.id} size="md" />
                        </>
                      )
                    )}
                  {!isOwner && isTechnologyAuctionLive(d, auctionStatus) && (
                    <button
                      className="btn-glow btn-glow-sm flex-1 py-3 text-sm font-semibold justify-center cursor-pointer"
                      onClick={() => window.location.assign(`/technology/auction/${technologyAuctionId(d, auctionStatus)}`)}
                    >
                      🟢 On Live Auction
                    </button>
                  )}
                  <button className="btn-glow btn-glow-sm flex-1 py-3 text-sm font-semibold justify-center bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 focus-visible:bg-gray-200 cursor-pointer" onClick={onClose}>Close</button>
                </>
              ) : (
                <div className="flex gap-3 w-full">
                  <button className="btn-glow flex-1 py-3 text-sm font-semibold justify-center cursor-pointer" onClick={() => {
                    const selPlan = enabledPlans.find(p => p.key === selectedPlanKey);
                    onBuy(selPlan);
                  }}>
                    Confirm Purchase & Pay →
                  </button>
                  <button className="btn-glow btn-glow-sm flex-1 py-3 text-sm font-semibold justify-center bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 focus-visible:bg-gray-200 cursor-pointer" onClick={onClose}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
