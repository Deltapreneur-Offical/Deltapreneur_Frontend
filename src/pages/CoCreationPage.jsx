import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Plus, CircleUser, ShoppingCart } from 'lucide-react';
import PayoutSettingsButton from '../components/payout/PayoutSettingsButton';
import { technologyAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { buildOrderCurrencyPayload } from '../utils/currencyDisplay';
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
import AddonSections from '../components/addon/AddonSections';
import { addonTotal, ADDON_SERVICES } from '../components/addon/AddonSelector';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import { DEFAULT_LISTING_CURRENCY } from '../constants/currencies';
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
import { computeCommissionBreakdown, fetchListingFeesAndCharges } from '../utils/auctionFees';
import { useVirtualAssistantCatalog, vaLabel } from '../hooks/useVirtualAssistantCatalog';

export default function CoCreationPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { currency, getSymbol, formatPrice } = useCurrency();
  const { services: vaServices, loading: vaLoading } = useVirtualAssistantCatalog();
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

  const [auctionTarget, setAuctionTarget] = useState(null);  // software to auction
  const [auctionStatuses, setAuctionStatuses] = useState({});    // softwareId → auction info



  const { toggle: toggleLike, get: getLike } = useLikes('SOFTWARE', allSoftware);

  const {
    paginated, totalCount,
    search, category, minPrice, maxPrice, sortBy,
    handleSearch, handleCategory, handleMinPrice, handleMaxPrice, handleSort,
    clearAll, activeFilterCount,
    page, totalPages, setPage,
  } = useFilterSort(
    resolveMarketplaceListingRows(allSoftware, {
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

  useEffect(() => {
    if (location.state?.openListTechnologyForm) {
      setFilterTab('all');
      setShowForm(true);
      navigate('/technology', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

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
                {user && (
                  <button className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" onClick={() => { setEditTarget(null); setShowForm(true); }}>
                    <Plus size={14} className="md:w-4 md:h-4" /> <span className="truncate">{t('listTechnology')}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'all' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
                onClick={() => { setFilterTab('all'); setShowForm(false); setEditTarget(null); }}>{t('allTechnology')}</button>
              <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'mine' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
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
              categoryOptions={TECHNOLOGY_CATEGORY_OPTIONS}
              minPrice={minPrice} onMinPrice={handleMinPrice}
              maxPrice={maxPrice} onMaxPrice={handleMaxPrice}
              sortBy={sortBy} onSort={handleSort}
              onClear={clearAll} activeFilterCount={activeFilterCount}
              placeholder={t('technologyPageSearchPlaceholder')}
              priceSymbol={getSymbol(currency)}
              theme="light"
            />

            {!loading && totalCount > 0 && (
              <div className="text-sm text-gray-600 mb-4">
                {totalCount} software listing{totalCount !== 1 ? 's' : ''} found
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
                    : 'Check back soon for new software listings.'}
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
                        onBuy={() => setBuyTarget(s)}
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
          </>
        )}
      </div>

      {buyTarget && (
        <BuySoftwareModal
          item={buyTarget}
          selectedPlan={buyTargetPlan}
          user={user}
          vaServices={vaServices}
          vaLoading={vaLoading}
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
          onBuy={(plan) => { setBuyTarget(detailTarget); setBuyTargetPlan(plan); closeListingDetail(); }}
          onEdit={user ? () => {
            setEditTarget(detailTarget);
            setShowForm(false);
            closeListingDetail();
          } : undefined}
          onAuction={() => { setAuctionTarget(detailTarget); closeListingDetail(); }}
          auctionStatus={auctionStatuses[detailTarget.id]}
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
const PRICING_PLAN_DEFS = [
  { key: 'ONE_TIME', label: 'One-Time Purchase' },
  { key: '1_MONTH', label: '1 Month Subscription' },
  { key: '3_MONTHS', label: '3 Months Subscription' },
  { key: '6_MONTHS', label: '6 Months Subscription' },
  { key: '12_MONTHS', label: '12 Months Subscription' },
];

function normalizePricingPlans(savedPlans) {
  // Normalize saved pricingPlans (from API) back into the local state shape
  const savedMap = {};
  if (Array.isArray(savedPlans)) {
    savedPlans.forEach((p) => { savedMap[p.key] = p; });
  }
  return PRICING_PLAN_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    enabled: Boolean(savedMap[def.key]?.enabled),
    price: savedMap[def.key]?.price != null ? String(savedMap[def.key].price) : '',
  }));
}

function softwareToFormFields(item, navCurrency) {
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
    price: item?.price != null && item?.price !== '' ? String(item.price) : '',
    currency: item?.currency || navCurrency || DEFAULT_LISTING_CURRENCY,
    technologyType: item?.technologyType || item?.technology_type || 'SOFTWARE',
    pricingPlans: normalizePricingPlans(item?.pricingPlans || item?.pricing_plans),
    supportingDocuments: [],
    agreement: { terms: Boolean(item?.id) },
  };
}


// ─── Software / Hardware Listing Form (create + edit) ─────────────────────────
function SoftwareForm({ initial, onSaved, onCancel }) {
  const { currency: navCurrency } = useCurrency();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(() => softwareToFormFields(initial, navCurrency));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(15);

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
      setForm(softwareToFormFields(initial, navCurrency));
      setImagePreview(initial.imageUrl || initial.image_url || null);
      setImageFile(null);
      setImageError('');
      setError('');
    }
  }, [initial?.id, navCurrency]);

  useEffect(() => {
    fetchListingFeesAndCharges()
      .then((fees) => setCommissionPercent(Number(fees?.listingCommissionPercent ?? 15)))
      .catch(() => { });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      // Build payload: keep all legacy fields, append new pricingPlans and technologyType
      const payload = {
        ...form,
        currency: form.currency || DEFAULT_LISTING_CURRENCY,
        technologyType: form.technologyType,
        // Legacy price auto-set from first enabled plan for backward compat
        price: legacyPriceFromPlans > 0 ? legacyPriceFromPlans : (parseFloat(form.price) || 0),
        // pricingDemand kept from form state (legacy compat)
        pricingDemand: form.pricingDemand || 'FIXED',
        // Dedicated pricingPlans field — only enabled plans with a price
        pricingPlans: form.pricingPlans.map(p => ({
          key: p.key,
          label: p.label,
          enabled: p.enabled,
          price: p.enabled && p.price !== '' ? parseFloat(p.price) || null : null,
        })),
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
          setImageError(
            uploadErr.response?.data?.error
            || uploadErr.response?.data?.message
            || 'Listing saved but logo upload failed. You can update it again later.',
          );
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

        {/* ── Pricing Plans ── */}
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>Pricing Plans <span className="text-red-500">*</span></label>
            <p className="text-xs text-gray-400 mt-0.5">Enable one or more plans and set a price for each.</p>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {form.pricingPlans.map((plan) => (
              <div key={plan.key} className="flex items-center gap-4 px-4 py-3 bg-white">
                {/* Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 min-w-[180px]">
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
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-500 flex-shrink-0">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={`${inputCls} max-w-[180px]`}
                      placeholder="Enter price"
                      value={plan.price}
                      onChange={e => setPlanField(plan.key, 'price', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-gray-300 italic">Not offered</div>
                )}
              </div>
            ))}
          </div>
          {/* Commission breakdown for One-Time Purchase */}
          {form.pricingPlans.find(p => p.key === 'ONE_TIME')?.enabled && commissionBreakdown && (
            <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3 text-sm text-gray-700 space-y-1">
              <div className="text-xs text-purple-500 font-semibold mb-1 uppercase tracking-wide">
                Commission preview · One-Time Purchase
              </div>
              <div className="flex justify-between"><span>Seller amount</span><span>{commissionBreakdown.sellerAmount}</span></div>
              <div className="flex justify-between"><span>Platform commission ({commissionBreakdown.commissionPercent}%)</span><span>{commissionBreakdown.commissionAmount}</span></div>
              <div className="flex justify-between font-semibold text-gray-900"><span>Final listing price</span><span>{commissionBreakdown.finalListingPrice}</span></div>
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
                <li>CoBrother retains <strong>100%</strong> of the first subscription payment when a customer initially subscribes.</li>
                <li>CoBrother charges <strong>no commission</strong> on renewal payments.</li>
                <li>The seller receives <strong>100%</strong> of all future subscription renewals.</li>
              </ul>
            </div>
          )}
        </div>

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
          <label className="inline-flex items-center gap-3 cursor-pointer self-start rounded-[12px] border border-purple-100 bg-purple-50/60 px-3.5 py-2.5 max-w-full">
            <input type="checkbox" className="peer sr-only" checked={form.agreement.terms}
              onChange={e => setForm(f => ({ ...f, agreement: { terms: e.target.checked } }))}
              required />
            <span className="relative w-5 h-5 rounded-[7px] border-2 border-purple-300 bg-white flex items-center justify-center flex-shrink-0 transition-all" style={{ backgroundColor: form.agreement.terms ? '#9333ea' : 'white', borderColor: form.agreement.terms ? '#9333ea' : '#d8b4fe' }}>
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
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : (isEdit ? 'Save changes →' : 'List technology →')}
          </button>
          <button type="button" className="btn-glow" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}



// ─── Buy Technology Modal ── UPGRADED with CoBrother opt-in + billing breakdown ─
function BuySoftwareModal({ item, selectedPlan, user, onClose, onSuccess, vaServices = [], vaLoading = false }) {
  const { t } = useTranslation();
  const { currency, formatPrice } = useCurrency();
  const [form, setForm] = useState({
    buyerFullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim(),
    buyerEmail: user?.email || '',
    buyerPhone: user?.phoneNumber || '',
  });

  const enabledPlans = item.pricingPlans?.filter(p => p.enabled) || [];
  const hasPlans = enabledPlans.length > 0;
  const [currentPlanKey, setCurrentPlanKey] = useState(
    selectedPlan?.key || (hasPlans ? enabledPlans[0].key : null)
  );

  const [coBrotherOptIn, setCoBrotherOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addons, setAddons] = useState([]);
  const [vaAddons, setVaAddons] = useState([]);

  const activePlan = hasPlans ? enabledPlans.find(p => p.key === currentPlanKey) : null;
  const basePrice = activePlan ? parseFloat(activePlan.price) : (item.price || 0);
  const coBrotherFee = coBrotherOptIn ? 1000 : 0;
  const addonExtra = addonTotal(addons);
  const totalPrice = basePrice + coBrotherFee + addonExtra;

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, buyerPhone: digits }));
  };

  const handlePay = async () => {
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
        services: [...addons, ...vaAddons],
        pricingPlan: currentPlanKey,
        ...buildOrderCurrencyPayload(currency),
      });

      openRazorpayCheckout({
        orderData,
        user,
        description: `${item.name}${coBrotherOptIn ? ' + CoBrother Help' : ''}`,
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
              _addons: [...addons, ...vaAddons],
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[900px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 md:p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>

        <div className="mb-8 border-b border-gray-100 pb-5">
          <div className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-md text-[0.7rem] font-bold text-indigo-700 uppercase tracking-widest mb-3">Complete Your Purchase</div>
          <h2 className="font-display text-[2rem] leading-tight font-bold text-gray-900 mb-1">{item.name}</h2>
          <p className="text-sm text-gray-500 font-medium">{item.category?.replace(/_/g, ' ')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
          {/* Left Column: Form and Selection */}
          <div className="flex flex-col gap-6">

            {/* Buyer details */}
            <div className="flex flex-col gap-4">
              <div className="text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider">Buyer Information</div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 font-semibold">Full Name</label>
                <input className="px-3.5 py-2.5 border border-gray-200 rounded-[10px] text-gray-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm" value={form.buyerFullName}
                  onChange={e => setForm(f => ({ ...f, buyerFullName: e.target.value }))}
                  placeholder="Your full name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 font-semibold">Email</label>
                  <input className="px-3.5 py-2.5 border border-gray-200 rounded-[10px] text-gray-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm" type="email" value={form.buyerEmail}
                    onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))}
                    placeholder="your@email.com" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 font-semibold">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="px-3.5 py-2.5 border border-gray-200 rounded-[10px] text-gray-900 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
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
            {hasPlans && enabledPlans.length > 1 && (
              <div className="flex flex-col gap-4">
                <div className="text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider">Pricing Plan</div>
                <div className="flex flex-col gap-3">
                  {enabledPlans.map(plan => (
                    <label key={plan.key} className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${currentPlanKey === plan.key ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${currentPlanKey === plan.key ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'}`}>
                          {currentPlanKey === plan.key && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={`text-[0.95rem] font-bold ${currentPlanKey === plan.key ? 'text-indigo-900' : 'text-gray-800'}`}>{plan.label}</span>
                      </div>
                      <div className={`text-[1.05rem] font-black ${currentPlanKey === plan.key ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {formatPrice(plan.price)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider">Optional Services</div>
              {/* ── CoBrother opt-in card ── */}
              <div
                onClick={() => setCoBrotherOptIn(v => !v)}
                className={`flex flex-col gap-3 p-4 cursor-pointer rounded-xl border-2 transition-all shadow-sm ${coBrotherOptIn ? 'bg-purple-50/50 border-purple-400 shadow-md' : 'bg-white border-gray-200 hover:border-purple-300'}`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${coBrotherOptIn ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>
                    {coBrotherOptIn && (
                      <span className="text-white text-[0.65rem] font-bold">✓</span>
                    )}
                  </div>
                  <div>
                    <div className={`font-semibold text-[0.95rem] mb-1 flex items-center gap-2 ${coBrotherOptIn ? 'text-purple-900' : 'text-gray-800'}`}>
                      <span>◆ Co-Creator Assistance</span>
                      <span className={`font-display text-[0.9rem] font-bold ${coBrotherOptIn ? 'text-purple-700' : 'text-gray-500'}`}>
                        +{formatPrice(1000)}
                      </span>
                    </div>
                    <div className="text-gray-500 text-[0.8rem] leading-relaxed pr-2">
                      Get a dedicated CoBrother to help you set up, deploy, and get the most out of
                      this software. They'll reach out within 24 hours.
                    </div>
                  </div>
                </div>
              </div>

              <AddonSections
                businessSelected={addons}
                onBusinessChange={setAddons}
                vaSelected={vaAddons}
                onVaChange={setVaAddons}
                vaServices={vaServices}
                vaLoading={vaLoading}
              />
            </div>

          </div>

          {/* Right Column: Sticky Summary */}
          <div className="sticky top-0">
            <div className="bg-gray-50 border border-gray-200 rounded-[14px] p-5 shadow-sm">
              <div className="text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider mb-4">
                Order Summary
              </div>

              <div className="flex flex-col gap-2">
                <BillingLine label={`${item.name}${activePlan ? ` (${activePlan.label})` : ''}`}
                  value={formatPrice(basePrice)} />
                {coBrotherOptIn && (
                  <BillingLine label="◆ Co-Creator Assistance" value={formatPrice(1000)} accent />
                )}
                {addons.filter(k => !ADDON_SERVICES.find(s => s.key === k)?.contactOnly).map(k => {
                  const svc = ADDON_SERVICES.find(s => s.key === k);
                  return svc ? (
                    <BillingLine key={k} label={svc.label}
                      value={formatPrice(svc.price)} accent />
                  ) : null;
                })}
                {vaAddons.map((k) => {
                  return vaServices.some((s) => String(s.id) === String(k)) ? (
                    <div key={k} className="flex justify-between items-center py-1.5 text-[0.85rem]">
                      <span className="truncate mr-2 text-[#7c6fe0]">{vaLabel(k, vaServices)}</span>
                      <span className="text-xs font-semibold text-amber-700">admin follow-up</span>
                    </div>
                  ) : null;
                })}

                {addons.some(k => ADDON_SERVICES.find(s => s.key === k)?.contactOnly) && (
                  <div className="text-xs text-amber-600 py-1.5 font-medium">+ contact-based services (no charge now)</div>
                )}
                {vaAddons.length > 0 && (
                  <div className="text-xs text-amber-600 py-1.5 font-medium">
                    Virtual assistant selection will be shared with the admin team for hiring follow-up.
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-200 my-4" />

              <div className="flex justify-between items-center mb-5">
                <span className="font-semibold text-gray-900 text-[1rem]">Total</span>
                <span className="font-display text-[1.75rem] font-black text-green-600">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              {error && <div className="text-sm text-red-500 mb-4 p-3 bg-red-50 rounded-lg border border-red-100">{error}</div>}

              <div className="flex flex-col gap-3">
                <button className="btn-glow w-full py-3.5 text-base shadow-md hover:shadow-lg transition-all" onClick={handlePay} disabled={loading}>
                  {loading ? <span className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin inline-block" /> :
                    `Pay Securely →`}
                </button>
                <button className="w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors" onClick={onClose}>Cancel</button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[0.7rem] text-gray-400 font-medium uppercase tracking-wider">
                🔒 Secure payment via Razorpay
              </div>
            </div>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-[14px] text-xs text-amber-800 font-medium shadow-sm leading-relaxed">
              🔒 GitHub/Resources link will be shared after purchase verification.
              {coBrotherOptIn && ' Your CoBrother will reach out within 24 hours.'}
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
      <span className={accent ? 'text-purple-600' : 'text-gray-500'}>{label}</span>
      <span className={`font-medium ${accent ? 'text-purple-700' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}

// ─── Purchase Success Modal ───────────────────────────────────────────────────
function PurchaseSuccessModal({ item, onClose }) {
  const isSubscription = item.pricingPlan && item.pricingPlan !== 'ONE_TIME';

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
            🔒 Once you verify everything works, mark it as complete from your Purchases dashboard to unlock the repository and resources.
          </p>
        </div>

        <button className="btn-glow w-full py-3.5 text-base shadow-md hover:shadow-lg transition-all" onClick={onClose}>
          Go to My Purchases →
        </button>
      </div>
    </div>
  );
}

// ─── Software Detail Modal ────────────────────────────────────────────────────
function SoftwareDetailModal({ item, isOwner, onClose, onBuy, onEdit, onAuction, auctionStatus, likeState, onLike }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    technologyAPI.get(item.id)
      .then(({ data }) => setDetail(data?.data ?? data))
      .catch(() => setDetail(item))
      .finally(() => setLoading(false));
  }, [item.id]);

  const d = detail || item;

  const enabledPlans = d.pricingPlans?.filter(p => p.enabled) || [];
  const hasPlans = enabledPlans.length > 0;
  const [selectedPlanKey, setSelectedPlanKey] = useState(hasPlans ? enabledPlans[0].key : '');

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
                <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-[0.7rem] font-bold text-gray-700 uppercase tracking-widest">{d.category?.replace(/_/g, ' ')}</div>
                {d.technologyType === 'HARDWARE' ? (
                  <div className="inline-flex items-center px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-md text-[0.7rem] font-bold text-white uppercase tracking-widest">HARDWARE</div>
                ) : (
                  <div className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-md text-[0.7rem] font-bold text-indigo-700 uppercase tracking-widest">SOFTWARE</div>
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

            <div className="mb-8">
              {hasPlans ? (
                <div className="w-full flex flex-col gap-4">
                  <div className="text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider">Select Pricing Plan</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {enabledPlans.map(plan => {
                      const isSub = plan.key !== 'ONE_TIME';
                      const isSelected = selectedPlanKey === plan.key;
                      return (
                        <label key={plan.key} className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-md transform scale-[1.02]' : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className={`text-[0.95rem] font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>{plan.label}</span>
                            </div>
                          </div>
                          <div className={`text-xl font-black mb-3 ml-8 ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                            {formatPrice(plan.price)}
                          </div>
                          <div className="ml-8 flex flex-col gap-1.5 mt-auto">
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
                        </label>
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
                    {formatPrice(d.price)}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ Lifetime Access</div>
                    <div className="text-[0.8rem] text-gray-600 flex items-center gap-1.5">✓ No Renewal Fees</div>
                  </div>
                </div>
              )}
            </div>

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

            <div className="flex gap-3 mt-6 flex-wrap items-center">
              {isOwner && onEdit && (
                <button type="button" className="btn-glow btn-glow-sm" onClick={onEdit}>
                  Edit listing
                </button>
              )}
              {isOwner && canRequestTechnologyAuction(d, auctionStatus) && onAuction && (
                <button className="btn-glow btn-glow-sm" onClick={onAuction}>
                  🔨 List for auction
                </button>
              )}
              {isOwner && isTechnologyAuctionPending(d, auctionStatus) && (
                <span className="text-sm font-semibold text-amber-700 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                  ⏳ Auction pending admin review
                </span>
              )}
              {isOwner && (auctionStatus?.approvalStatus === 'APPROVED' || d.auctionApprovalStatus === 'APPROVED')
                && technologyAuctionId(d, auctionStatus) && (
                  <button
                    className="btn-glow btn-glow-sm"
                    onClick={() => window.location.assign(`/technology/auction/${technologyAuctionId(d, auctionStatus)}`)}
                  >
                    View Auction →
                  </button>
                )}
              {!isOwner
                && d.softwareStatus === 'AVAILABLE'
                && d.purchaseType !== 'AUCTION'
                && d.auctionApprovalStatus !== 'PENDING_APPROVAL' && (
                  REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !d.verified ? (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                      Verification pending — available for purchase after admin approval
                    </span>
                  ) : (
                    <button className="btn-glow btn-glow-sm" onClick={() => {
                      const selPlan = enabledPlans.find(p => p.key === selectedPlanKey);
                      onBuy(selPlan);
                    }}>Buy Now →</button>
                  )
                )}
              {!isOwner && isTechnologyAuctionLive(d, auctionStatus) && (
                <button
                  className="btn-glow btn-glow-sm"
                  onClick={() => window.location.assign(`/technology/auction/${technologyAuctionId(d, auctionStatus)}`)}
                >
                  Place Bid →
                </button>
              )}
              <LikeButton liked={likeState?.liked} count={likeState?.count}
                onToggle={onLike} size="md" />
              <button className="btn-glow btn-glow-sm" onClick={onClose}>Close</button>
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
