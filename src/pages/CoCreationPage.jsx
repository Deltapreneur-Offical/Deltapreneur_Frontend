import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Plus } from 'lucide-react';
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
import { vaLabel, vaTotal, VA_SERVICES } from '../components/addon/VirtualAssistantSelector';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import { DEFAULT_LISTING_CURRENCY } from '../constants/currencies';
import { captureAppLayoutScroll, scheduleRestoreAppLayoutScroll } from '../utils/preserveAppLayoutScroll';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import TechnologyListingCard from '../components/listings/TechnologyListingCard';
import ListingCardShell from '../components/listings/ListingCardShell';
import { TECHNOLOGY_CATEGORIES, TECHNOLOGY_CATEGORY_OPTIONS } from '../constants/listingCategories';
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

export default function CoCreationPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading }  = useAuth();
  const { currency, getSymbol, formatPrice } = useCurrency();
  const navigate  = useNavigate();
  const location = useLocation();

  const [allSoftware, setAllSoftware]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [buyTarget, setBuyTarget]           = useState(null);
  const [successItem, setSuccessItem]       = useState(null);
  const [detailTarget, setDetailTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [editTarget, setEditTarget]         = useState(null);
  const [filterTab, setFilterTab]           = useState('all');
  const [showConfetti, setShowConfetti]     = useState(false);
  const [accessNotice, setAccessNotice]     = useState('');

  const [auctionTarget, setAuctionTarget]     = useState(null);  // software to auction
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
      searchFields:  ['name', 'description', 'techStack'],
      priceField:    'price',
      categoryField: 'category',
      dateField:     'createdAt',
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
        .catch(() => {});
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
    alert('Auction request submitted! Admin will review it shortly.');
    if (targetId) {
      softwareAuctionAPI.getBySoftware(targetId)
        .then(({ data }) => {
          setAuctionStatuses(prev => ({ ...prev, [targetId]: data?.auction ?? data?.data?.auction ?? null }));
        })
        .catch(() => {});
      const refreshListings = filterTab === 'mine'
        ? technologyAPI.getMyListings().then(({ data }) => asArray(data))
        : fetchAllListPages((params) => technologyAPI.getAll(params));
      refreshListings
        .then((rows) => setAllSoftware(rows))
        .catch(() => {});
    }
  };


  const refreshSoftware = () =>
    fetchAllListPages((params) => technologyAPI.getAll(params))
      .then((rows) => setAllSoftware(rows));

  return (
    <AppLayout>
      <div>
        {(showForm || editTarget) && user ? (
          <>
            <ListingBackLink
              label="Back to Technology"
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
          <div className="flex gap-2 md:gap-3">
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
          search={search}           onSearch={handleSearch}
          category={category}       onCategory={handleCategory}
          categoryOptions={TECHNOLOGY_CATEGORY_OPTIONS}
          minPrice={minPrice}       onMinPrice={handleMinPrice}
          maxPrice={maxPrice}       onMaxPrice={handleMaxPrice}
          sortBy={sortBy}           onSort={handleSort}
          onClear={clearAll}        activeFilterCount={activeFilterCount}
          placeholder="Search software by name, description or tech stack…"
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
               'No Technology listed yet'}
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
  <div className="listing-card-glow-grid technology-listing-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
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
          user={user}
          onClose={() => setBuyTarget(null)}
          onSuccess={item => {
            setSuccessItem(item);
            setBuyTarget(null);
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
          onBuy={() => { setBuyTarget(detailTarget); closeListingDetail(); }}
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
        title="Remove Software Listing?"
        message="This will remove your software from the marketplace."
        confirmLabel="Remove"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfettiBurst active={showConfetti} onDone={() => setShowConfetti(false)} />
    </AppLayout>
  );
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
    techStack: item?.techStack || item?.tech_stack || '',
    category: item?.category || '',
    pricingDemand: item?.pricingDemand || item?.pricing_demand || '',
    price: item?.price != null && item?.price !== '' ? String(item.price) : '',
    currency: item?.currency || navCurrency || DEFAULT_LISTING_CURRENCY,
    agreement: { terms: Boolean(item?.id) },
  };
}

// ─── Software Form (create + edit) ────────────────────────────────────────────
function SoftwareForm({ initial, onSaved, onCancel }) {
  const { currency: navCurrency } = useCurrency();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(() => softwareToFormFields(initial, navCurrency));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [commissionPercent, setCommissionPercent] = useState(15);

  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError]     = useState('');
  const fileInputRef                    = useRef(null);

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
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // GitHub URL validation
  const isValidGithubUrl = (url) => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?\/?$/;
    return githubRegex.test(url);
  };

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

    // Validate GitHub URL
    if (!isValidGithubUrl(form.githubLink)) {
      setError('Please enter a valid GitHub URL (e.g., https://github.com/username/repo)');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...form,
        currency: form.currency || DEFAULT_LISTING_CURRENCY,
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
        setError(msg || (isEdit ? 'Failed to update Technology.' : 'Failed to list Technology.'));
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

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white outline-none focus:border-indigo-500 transition-all w-full placeholder:text-gray-400';
  const labelCls = 'text-sm font-medium text-gray-700';
  const sellerAmount = parseFloat(form.price) || 0;
  const commissionBreakdown = sellerAmount > 0
    ? computeCommissionBreakdown(sellerAmount, commissionPercent)
    : null;

  return (
    <div className="p-8 bg-white border border-gray-200 rounded-[18px] shadow-sm">
      <h3 className="font-display text-2xl text-gray-900 font-semibold">
        {isEdit ? 'Edit Technology' : 'List Technology'}
      </h3>
      <p className="text-gray-500 text-sm mt-1">
        {isEdit
          ? 'Update your technology listing details.'
          : 'Add a new technology product to the Technology marketplace.'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Software Name <span className="text-red-500">*</span></label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. InvoiceFlow" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Description <span className="text-red-500">*</span></label>
          <textarea className={`${inputCls} resize-vertical`} value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Brief overview of your software" rows={3} required />
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Category <span className="text-red-500">*</span></label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} required>
              <option value="">Select category</option>
              {TECHNOLOGY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Tech Stack</label>
            <input className={inputCls} value={form.techStack} onChange={e => set('techStack', e.target.value)}
              placeholder="React, Spring Boot, PostgreSQL" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CurrencyPriceInput
            id="software-price"
            label="Price"
            value={form.price}
            onChange={(v) => set('price', v)}
            currency={form.currency}
            onCurrencyChange={(code) => set('currency', code)}
            required
            placeholder="e.g. 25000"
            inputClassName={inputCls}
            labelClassName={labelCls}
          />
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Pricing Type <span className="text-red-500">*</span></label>
            <select className={inputCls} value={form.pricingDemand}
              onChange={e => set('pricingDemand', e.target.value)} required>
              <option value="">Select type</option>
              <option value="FIXED">Fixed Price</option>
              <option value="NEGOTIABLE">Negotiable</option>
            </select>
          </div>
        </div>
        {commissionBreakdown && (
          <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3 text-sm text-gray-700 space-y-1">
            <div className="flex justify-between"><span>Seller amount</span><span>{commissionBreakdown.sellerAmount}</span></div>
            <div className="flex justify-between"><span>Platform commission ({commissionBreakdown.commissionPercent}%)</span><span>{commissionBreakdown.commissionAmount}</span></div>
            <div className="flex justify-between font-semibold text-gray-900"><span>Final listing price</span><span>{commissionBreakdown.finalListingPrice}</span></div>
          </div>
        )}

        <TechnologyDemoVideoSection
          value={form.videoLink}
          onChange={(v) => set('videoLink', v)}
          inputClassName={inputCls}
          labelClassName={labelCls}
        />

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Live Demo Link</label>
          <input className={inputCls} value={form.liveDemoLink} onChange={e => set('liveDemoLink', e.target.value)}
            placeholder="https://yourdemo.com" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            GitHub Link <span className="text-red-500">*</span>
            <span className="text-[0.72rem] text-gray-400 ml-2 font-normal">
              🔒 Not shared until buyer confirms purchase
            </span>
          </label>
          <input className={inputCls} value={form.githubLink} onChange={e => set('githubLink', e.target.value)}
            placeholder="https://github.com/you/repo" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            Logo / cover image <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              imagePreview ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
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
            <span className="text-sm text-gray-700 leading-snug">I confirm this software is ready for sale and agree to the Terms & Conditions.</span>
          </label>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button type="submit" className="btn-glow flex-1" disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : (isEdit ? 'Save Changes →' : 'List Technology →')}
          </button>
          <button type="button" className="btn-glow" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Buy Technology Modal ── UPGRADED with CoBrother opt-in + billing breakdown ─
function BuySoftwareModal({ item, user, onClose, onSuccess }) {
  const { currency, formatPrice } = useCurrency();
  const [form, setForm] = useState({
    buyerFullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim(),
    buyerEmail:    user?.email || '',
    buyerPhone:    user?.phoneNumber || '',
  });
  const [coBrotherOptIn, setCoBrotherOptIn] = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [addons, setAddons]                 = useState([]);
  const [vaAddons, setVaAddons]             = useState([]);

  const basePrice    = item.price;
  const coBrotherFee = coBrotherOptIn ? 1000 : 0;
  const addonExtra     = addonTotal(addons);
  const vaExtra        = vaTotal(vaAddons);
  const totalPrice   = basePrice + coBrotherFee + addonExtra + vaExtra;

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
              razorpayOrderId:   response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess({
              ...item,
              softwareStatus:   'SOLD',
              paymentStatus:    'COMPLETED',
              completionStatus: 'PENDING',
              githubLink:       verifyData.githubLink,
              coBrotherOptIn,
              coBrotherHelpPaid: coBrotherOptIn,
              _addons:           [...addons, ...vaAddons],
            });
          } catch {
            setError('Payment verification failed. Contact support.');
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
      <div className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>

        <div className="mb-6">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide mb-2">Software Purchase</div>
          <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">{item.name}</h2>
          <p className="text-sm text-gray-500">{item.category?.replace(/_/g, ' ')} · {item.pricingDemand}</p>
        </div>

        {/* Buyer details */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Full Name</label>
            <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" value={form.buyerFullName}
              onChange={e => setForm(f => ({ ...f, buyerFullName: e.target.value }))}
              placeholder="Your full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">Email</label>
              <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" type="email" value={form.buyerEmail}
                onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))}
                placeholder="your@email.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
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

        {/* ── CoBrother opt-in card ── */}
        <div
          onClick={() => setCoBrotherOptIn(v => !v)}
          className={`flex flex-col gap-3 p-4 mb-5 cursor-pointer rounded-[10px] border transition-all ${coBrotherOptIn ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
        >
          <div className="flex items-start gap-3.5">
            <div className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${coBrotherOptIn ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
              {coBrotherOptIn && (
                <span className="text-white text-[0.65rem] font-bold">✓</span>
              )}
            </div>
            <div>
              <div className={`font-semibold text-[0.9rem] mb-1 ${coBrotherOptIn ? 'text-purple-700' : 'text-gray-700'}`}>
                ◆ Add CoBrother Helper{' '}
                <span className={`font-display text-[1rem] font-bold ${coBrotherOptIn ? 'text-purple-600' : 'text-indigo-600'}`}>
                  +{formatPrice(1000)}
                </span>
              </div>
              <div className="text-gray-500 text-[0.78rem] leading-relaxed">
                Get a dedicated CoBrother to help you set up, deploy, and get the most out of
                this software. They'll reach out within 24 hours.{' '}
                <LearnMoreTooltip>
                  Your ₹1,000 support request helps us connect, verify, and personally assist your collaboration opportunity through the CoBrother ecosystem
                </LearnMoreTooltip>
              </div>
            </div>
          </div>
        </div>
        
        <AddonSections
          businessSelected={addons}
          onBusinessChange={setAddons}
          vaSelected={vaAddons}
          onVaChange={setVaAddons}
        />

        {/* ── Billing breakdown ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-[10px] p-4 mb-5">
          <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Billing Breakdown
          </div>
          <BillingLine label={item.name}
                       value={formatPrice(basePrice)} />
          {coBrotherOptIn && (
            <BillingLine label="◆ CoBrother Helper" value={formatPrice(1000)} accent />
          )}
          {addons.filter(k => !ADDON_SERVICES.find(s => s.key === k)?.contactOnly).map(k => {
            const svc = ADDON_SERVICES.find(s => s.key === k);
            return svc ? (
              <BillingLine key={k} label={svc.label}
                value={formatPrice(svc.price)} accent />
            ) : null;
          })}
          {vaAddons.map((k) => {
            const svc = VA_SERVICES.find((s) => s.key === k);
            return svc ? (
              <BillingLine key={k} label={vaLabel(k)} value={formatPrice(svc.price)} accent />
            ) : null;
          })}
          {addons.some(k => ADDON_SERVICES.find(s => s.key === k)?.contactOnly) && (
            <div className="text-xs text-amber-600 py-1">+ contact-based services (no charge now)</div>
          )}
          <div className="h-px bg-gray-200 my-2.5" />
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700 text-[0.9rem]">Total</span>
            <span className="font-display text-[1.5rem] font-bold text-green-600">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-sm text-amber-700">
          🔒 GitHub link will be shared after you confirm everything works.
          {coBrotherOptIn && ' Your CoBrother will reach out within 24 hours.'}
        </div>

        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

        <div className="flex gap-3">
          <button className="btn-glow flex-1" onClick={handlePay} disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> :
              `Pay ${formatPrice(totalPrice)} →`}
          </button>
          <button className="btn-glow" onClick={onClose}>Cancel</button>
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
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] text-center bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-2">
          Purchase Successful!
        </h2>
        <p className="text-gray-500 mb-6">
          You've purchased <strong className="text-gray-900">{item.name}</strong>
        </p>

        {item.githubLink && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-5 text-left">
            <div className="text-xs text-gray-500 mb-2">
              🔓 GitHub Repository
            </div>
            <a href={item.githubLink} target="_blank" rel="noreferrer"
               className="text-green-600 font-semibold break-all text-sm no-underline hover:underline">
              {item.githubLink}
            </a>
          </div>
        )}

        {item.coBrotherOptIn && (
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl mb-5 text-left text-sm text-purple-700">
            ◆ CoBrother Helper activated — expect an introduction within 24 hours.
          </div>
        )}

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 text-sm text-amber-700 text-left">
          <p className="mb-2">✉️ A confirmation email has been sent to you.</p>
          <p className="m-0">
            🔒 Once you verify everything works, mark it as complete from your dashboard.
          </p>
        </div>

        <button className="btn-glow w-full" onClick={onClose}>
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}

// ─── Software Detail Modal ────────────────────────────────────────────────────
function SoftwareDetailModal({ item, isOwner, onClose, onBuy, onEdit, onAuction, auctionStatus, likeState, onLike }) {
  const { formatPrice } = useCurrency();
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched            = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    technologyAPI.get(item.id)
      .then(({ data }) => setDetail(data?.data ?? data))
      .catch(() => setDetail(item))
      .finally(() => setLoading(false));
  }, [item.id]);

  const d = detail || item;

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
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide">{d.category?.replace(/_/g, ' ')}</div>
                {d.official && (
                  <span className="text-[0.72rem] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ✦ Official
                  </span>
                )}
              </div>
              <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">{d.name}</h2>
              <p className="text-sm text-gray-500">{d.pricingDemand}</p>
            </div>

            <div className="flex gap-3 mb-6 flex-wrap">
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                💰 {formatPrice(d.price)}
              </div>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                👁 {d.views || 0} views
              </div>
            </div>

            {d.description && (
              <Section title="Description">
                <p className="text-gray-600 leading-relaxed text-[0.9rem]">
                  {d.description}
                </p>
              </Section>
            )}

            {d.whatItDoes && (
              <Section title="What It Does">
                <p className="text-gray-600 leading-relaxed text-[0.9rem]">
                  {d.whatItDoes}
                </p>
              </Section>
            )}

            {d.howItHelps && (
              <Section title="How It Helps">
                <p className="text-gray-600 leading-relaxed text-[0.9rem]">
                  {d.howItHelps}
                </p>
              </Section>
            )}

            {d.techStack && (
              <Section title="Tech Stack">
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
              <Section title="Links">
                <div className="flex gap-3 flex-wrap">
                  {d.videoLink && (
                    <a href={d.videoLink} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-gray-500 font-semibold text-xs rounded-lg border border-gray-200 cursor-pointer transition-colors hover:bg-gray-100 no-underline" onClick={e => e.stopPropagation()}>
                      � Demo Video ↗
                    </a>
                  )}
                  {d.liveDemoLink && (
                    <a href={d.liveDemoLink} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-gray-500 font-semibold text-xs rounded-lg border border-gray-200 cursor-pointer transition-colors hover:bg-gray-100 no-underline" onClick={e => e.stopPropagation()}>
                      🌐 Live Demo ↗
                    </a>
                  )}
                </div>
              </Section>
            )}

            <Section title="GitHub">
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-gray-500">
                🔒 GitHub link is shared after purchase is confirmed.
              </div>
            </Section>

            {d.listedBy && (
              <Section title="Listed By">
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
                  🔨 Put to Auction
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
                    Verification pending — available to buy after admin approval
                  </span>
                ) : (
                <button className="btn-glow btn-glow-sm" onClick={onBuy}>Buy Now →</button>
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
