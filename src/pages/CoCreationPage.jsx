import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Plus } from 'lucide-react';
import { cocreationAPI } from '../api/services';
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
import Pagination from '../components/common/Pagination';
import SkeletonCard from '../components/common/Skeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SoftwareAuctionRequestModal from './SoftwareAuctionRequestModal';
import { softwareAuctionAPI } from '../api/services';
import AddonSelector, { addonTotal, ADDON_SERVICES } from '../components/addon/AddonSelector';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import { DEFAULT_LISTING_CURRENCY } from '../constants/currencies';
import { captureAppLayoutScroll, scheduleRestoreAppLayoutScroll } from '../utils/preserveAppLayoutScroll';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import TechnologyListingCard from '../components/listings/TechnologyListingCard';
import ListingCardShell from '../components/listings/ListingCardShell';
import { COCREATION_CATEGORIES, COCREATION_CATEGORY_OPTIONS } from '../constants/listingCategories';

export default function CoCreationPage() {
  const { t } = useTranslation();
  const { user }  = useAuth();
  const { currency, getSymbol, formatPrice } = useCurrency();
  const navigate  = useNavigate();

  const [allSoftware, setAllSoftware]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [buyTarget, setBuyTarget]           = useState(null);
  const [successItem, setSuccessItem]       = useState(null);
  const [detailTarget, setDetailTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [filterTab, setFilterTab]           = useState('all');
  
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
    filterTab === 'mine'
      ? allSoftware.filter(s => s.listedBy?.id === user?.id)
      : allSoftware,
    {
      searchFields:  ['name', 'description', 'techStack'],
      priceField:    'price',
      categoryField: 'category',
      dateField:     'createdAt',
    },
    20
  );

  useEffect(() => {
    setLoading(true);
    const req = filterTab === 'mine' ? cocreationAPI.getMyListings() : cocreationAPI.getAll();
    req
      .then(({ data }) => setAllSoftware(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setAllSoftware([]))
      .finally(() => setLoading(false));
  }, [filterTab]);

  const { closeListingDetail } = useOpenListingDetailFromUrl({
    items: allSoftware,
    loading,
    setDetail: setDetailTarget,
    fetchById: async (id) => {
      const { data } = await cocreationAPI.get(id);
      return data?.data ?? data;
    },
  });

  useEffect(() => {
    if (!user || allSoftware.length === 0) return;
    const myListings = allSoftware.filter(s => s.listedBy?.id === user.id);
    myListings.forEach(s => {
      softwareAuctionAPI.getBySoftware(s.id)
        .then(({ data }) => {
          setAuctionStatuses(prev => ({ ...prev, [s.id]: data.auction }));
        })
        .catch(() => {});
    });
  }, [allSoftware, user]);


  const handleDelete = async () => {
    try {
      await cocreationAPI.delete(deleteTarget);
      setAllSoftware(s => s.filter(x => x.id !== deleteTarget));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to remove listing.');
    } finally { setDeleteTarget(null); }
  };

  const handleAuctionSubmitted = () => {
    setAuctionTarget(null);
    alert('Auction request submitted! Admin will review it shortly.');
    // Reload auction statuses
    if (auctionTarget) {
      softwareAuctionAPI.getBySoftware(auctionTarget.id)
        .then(({ data }) => {
          setAuctionStatuses(prev => ({ ...prev, [auctionTarget.id]: data.auction }));
        })
        .catch(() => {});
    }
  };


  const refreshSoftware = () =>
    cocreationAPI.getAll()
      .then(({ data }) => setAllSoftware(Array.isArray(data) ? data : (data?.data ?? [])));

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {/* <img src={''} alt="Technology" className="w-10 h-10 object-contain" /> */}
              <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{t('technology')}</h1>
            </div>
            <p className="text-gray-600">{t('buyAndSellSoftware')}</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" onClick={() => navigate('/cocreation/dashboard')}>
              <LayoutDashboard size={14} className="md:w-4 md:h-4" /> <span className="truncate">{t('dashboard')}</span>
            </button>
            {user && (
              <button className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" onClick={() => setShowForm(true)}>
                <Plus size={14} className="md:w-4 md:h-4" /> <span className="truncate">{t('listTechnology')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'all' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => { setFilterTab('all'); setShowForm(false); }}>{t('allTechnology')}</button>
          <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'mine' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => { setFilterTab('mine'); setShowForm(false); }}>{t('myListings')}</button>
        </div>

        {showForm && user && (
          <div className="mb-6">
            <SoftwareForm
              onSaved={s => {
                const snap = captureAppLayoutScroll();
                flushSync(() => {
                  setAllSoftware(prev => [s, ...prev]);
                  setShowForm(false);
                });
                scheduleRestoreAppLayoutScroll(snap);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <FilterBar
          search={search}           onSearch={handleSearch}
          category={category}       onCategory={handleCategory}
          categoryOptions={COCREATION_CATEGORY_OPTIONS}
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
          isOwner={s.listedBy?.id === user?.id}
          likeState={getLike(s.id)}
          onLike={() => toggleLike(s.id)}
          onView={() => setDetailTarget(s)}
          onBuy={() => setBuyTarget(s)}
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
          isOwner={detailTarget.listedBy?.id === user?.id}
          likeState={getLike(detailTarget.id)}
          onLike={() => toggleLike(detailTarget.id)}
          onClose={() => { closeListingDetail(); refreshSoftware(); }}
          onBuy={() => { setBuyTarget(detailTarget); closeListingDetail(); }}
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
    </AppLayout>
  );
}

// ─── Software Form (admin only) ───────────────────────────────────────────────
function SoftwareForm({ onSaved, onCancel }) {
  const { currency: navCurrency } = useCurrency();
  const [form, setForm] = useState({
    name: '', description: '', videoLink: '', whatItDoes: '', howItHelps: '',
    githubLink: '', liveDemoLink: '', techStack: '',
    category: '', pricingDemand: '', price: '',
    currency: navCurrency || DEFAULT_LISTING_CURRENCY,
    agreement: { terms: false },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [savedSoftware, setSavedSoftware]   = useState(null);
  const [imageFile, setImageFile]           = useState(null);
  const [imagePreview, setImagePreview]     = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError]         = useState('');
  const fileInputRef                        = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // GitHub URL validation
  const isValidGithubUrl = (url) => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?\/?$/;
    return githubRegex.test(url);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');

    // Validate GitHub URL
    if (!isValidGithubUrl(form.githubLink)) {
      setError('Please enter a valid GitHub URL (e.g., https://github.com/username/repo)');
      setLoading(false);
      return;
    }

    try {
      const { data } = await cocreationAPI.create({
        ...form,
        currency: form.currency || DEFAULT_LISTING_CURRENCY,
      });
      setSavedSoftware(data);
    } catch (err) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message;
      if (status === 401) {
        setError(msg || 'Please sign in again to list Technology.');
      } else {
        setError(msg || 'Failed to list Technology.');
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

  const handleImageUpload = async () => {
    if (!imageFile || !savedSoftware) return;
    setImageUploading(true); setImageError('');
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      const { data } = await cocreationAPI.uploadImage(savedSoftware.id, formData);
      onSaved({ ...savedSoftware, imageUrl: data.imageUrl });
    } catch (err) {
      setImageError(err.response?.data?.error || 'Upload failed. You can add an image later.');
      setImageUploading(false);
    }
  };

  const handleSkip = () => onSaved(savedSoftware);

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white outline-none focus:border-indigo-500 transition-all w-full placeholder:text-gray-400';
  const labelCls = 'text-sm font-medium text-gray-700';

  if (savedSoftware) {
    return (
      <div className="p-8 bg-white border border-gray-200 rounded-[18px] shadow-sm">
        <h3 className="font-display text-2xl text-gray-900 font-semibold">
          Add an Image <span className="text-sm text-gray-400 font-normal">(optional)</span>
        </h3>
        <p className="text-gray-500 text-sm mt-1">
          Upload a cover image or logo for <strong className="text-indigo-600">{savedSoftware.name}</strong>. You can also do this later.
        </p>
        <div className="mt-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-3 ${
              imagePreview ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
            }`}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-[140px] max-w-full rounded-lg object-contain mx-auto" />
            ) : (
              <>
                <div className="text-4xl mb-2">🖼</div>
                <div className="text-sm text-gray-500">Click to choose an image</div>
                <div className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {imagePreview && (
            <button type="button" className="text-xs text-gray-500 hover:text-red-500 mb-3"
              onClick={() => { setImageFile(null); setImagePreview(null); }}>✕ Remove</button>
          )}
          {imageError && <div className="text-sm text-red-500 mb-3">{imageError}</div>}
          <div className="flex gap-3">
            <button type="button" className="btn-glow flex-1"
              disabled={!imageFile || imageUploading} onClick={handleImageUpload}>
              {imageUploading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : 'Upload Image →'}
            </button>
            <button type="button" className="btn-glow" onClick={handleSkip}>Skip</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white border border-gray-200 rounded-[18px] shadow-sm">
      <h3 className="font-display text-2xl text-gray-900 font-semibold">List Technology</h3>
      <p className="text-gray-500 text-sm mt-1">Add a new technology product to the CoCreation marketplace.</p>

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
              {COCREATION_CATEGORIES.map(c => (
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

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Demo Video Link</label>
            <input className={inputCls} value={form.videoLink} onChange={e => set('videoLink', e.target.value)}
              placeholder="YouTube / Loom URL" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Live Demo Link</label>
            <input className={inputCls} value={form.liveDemoLink} onChange={e => set('liveDemoLink', e.target.value)}
              placeholder="https://yourdemo.com" />
          </div>
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

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button type="submit" className="btn-glow flex-1" disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : 'List Technology →'}
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

  const basePrice    = item.price;
  const coBrotherFee = coBrotherOptIn ? 1000 : 0;
  const addonExtra     = addonTotal(addons);
  const totalPrice   = basePrice + coBrotherFee + addonExtra;

  const handlePay = async () => {
    setLoading(true); setError('');
    try {
      // Pass both buyer info AND coBrotherOptIn to backend
      const { data: orderData } = await cocreationAPI.createOrder(item.id, {
        ...form,
        coBrotherOptIn,
        services: addons,
        ...buildOrderCurrencyPayload(currency),
      });

      openRazorpayCheckout({
        orderData,
        user,
        description: `${item.name}${coBrotherOptIn ? ' + CoBrother Help' : ''}`,
        themeColor: '#a06ec8',
        onSuccess: async (response) => {
          try {
            const { data: verifyData } = await cocreationAPI.verifyPayment(item.id, {
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
              _addons:           addons,
            });
          } catch {
            setError('Payment verification failed. Contact support.');
            setLoading(false);
          }
        },
        onFailure: async () => {
          await cocreationAPI.handleFailure(item.id);
          setError('Payment failed. Please try again.');
          setLoading(false);
        },
        onDismiss: async () => {
          await cocreationAPI.handleFailure(item.id);
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
              <label className="text-xs text-gray-500 font-medium">Phone</label>
              <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" value={form.buyerPhone}
                onChange={e => setForm(f => ({ ...f, buyerPhone: e.target.value }))}
                placeholder="10-digit number" maxLength={10} />
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
                this software. They'll reach out within 24 hours.
              </div>
            </div>
          </div>
        </div>
        
        <AddonSelector selected={addons} onChange={setAddons} />

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
function SoftwareDetailModal({ item, isOwner, onClose, onBuy, likeState, onLike }) {
  const { formatPrice } = useCurrency();
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched            = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    cocreationAPI.get(item.id)
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
              {!isOwner
                && d.softwareStatus === 'AVAILABLE'
                && d.purchaseType !== 'AUCTION'
                && d.auctionApprovalStatus !== 'PENDING_APPROVAL' && (
                <button className="btn-glow btn-glow-sm" onClick={onBuy}>Buy Now →</button>
              )}
              {!isOwner
                && d.purchaseType === 'AUCTION'
                && d.auctionApprovalStatus === 'APPROVED'
                && d.auctionId && (
                <button
                  className="btn-glow btn-glow-sm"
                  onClick={() => window.location.assign(`/cocreation/auction/${d.auctionId}`)}
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
