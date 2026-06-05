import { useState, useEffect, useRef } from 'react';
import { pickMediaUrl } from '../utils/mediaUrl';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Plus, CheckCircle } from 'lucide-react';
import EditActionLabel from '../components/common/EditActionLabel';
import '../styles/domain-listing-cards.css';
import DomainListingCard from '../components/listings/DomainListingCard';
import ListingCardShell from '../components/listings/ListingCardShell';
import { normalizeDomainExtension, resolveDomainDisplay } from '../utils/domainDisplay';
import { domainAPI, domainEnquiryAPI, auctionAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { buildOrderCurrencyPayload } from '../utils/currencyDisplay';
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
import AddonSelector, {addonTotal, ADDON_SERVICES} from '../components/addon/AddonSelector';
import CurrencyPriceInput from '../components/common/CurrencyPriceInput';
import { DEFAULT_LISTING_CURRENCY } from '../constants/currencies';
import { captureAppLayoutScroll, scheduleRestoreAppLayoutScroll } from '../utils/preserveAppLayoutScroll';
import { asArray } from '../utils/asArray';
import { APP_BASE_URL } from '../config/urls';
import { useOpenListingDetailFromUrl } from '../hooks/useOpenListingDetailFromUrl';
import { DOMAIN_PRICING_OPTIONS } from '../constants/listingCategories';
import { extractDomainList, normalizeDomainRecord } from '../utils/domainApiAdapter';
import { fetchAllListPages } from '../utils/listPagination';
import { REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE } from '../config/featureFlags';

const STATUS_COLORS = {
  AVAILABLE: { color: '#6ec896', bg: 'rgba(110,200,150,0.1)', border: 'rgba(110,200,150,0.3)' },
  PENDING:   { color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', border: 'rgba(200,169,110,0.3)' },
  SOLD:      { color: '#c86e6e', bg: 'rgba(200,110,110,0.1)', border: 'rgba(200,110,110,0.3)' },
};

const readApiError = (err, fallback) => {
  const payload = err?.response?.data;
  if (typeof payload === 'string') return payload;
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;
  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.detail)) return payload.detail.map(x => x?.msg || String(x)).join(', ');
  return fallback;
};

function buildDomainFormState(domain, navCurrency) {
  const display = domain ? resolveDomainDisplay(domain) : { name: '', ext: null, fullDomain: '' };
  return {
    domainName: ['—', 'Unnamed', 'domain'].includes(display.name) ? '' : display.name,
    domainExtension: display.ext?.full ?? (domain ? '' : '.com'),
    askingPrice: domain?.askingPrice != null ? String(domain.askingPrice) : '',
    pricingDemand: domain?.pricingDemand ?? '',
    currency: domain?.currency || navCurrency || DEFAULT_LISTING_CURRENCY,
    saleType: domain?.saleType ?? 'ONE_TIME',
    minBidPrice: '',
    auctionDuration: 'SEVEN_DAYS',
    contactInfo: {
      email: domain?.contactInfo?.email ?? '',
      phoneNumber: domain?.contactInfo?.phoneNumber ?? '',
    },
    agreement: { terms: true },
  };
}

export default function DomainsPage() {
  const { t } = useTranslation();
  const { user }  = useAuth();
  const { currency, getSymbol } = useCurrency();
  const navigate  = useNavigate();

  const [allDomains, setAllDomains]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [editTarget, setEditTarget]         = useState(null);
  const [buyTarget, setBuyTarget]           = useState(null);
  const [successDomain, setSuccessDomain]   = useState(null);
  const [detailTarget, setDetailTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [enquireTarget, setEnquireTarget]   = useState(null);
  const [enquireSuccess, setEnquireSuccess] = useState(false);
  const [filterTab, setFilterTab]           = useState('all');
  const [showConfetti, setShowConfetti]     = useState(false);
  const [globalNotice, setGlobalNotice]     = useState('');

  const { toggle: toggleLike, get: getLike } = useLikes('DOMAIN', allDomains);

  const domainRows = asArray(allDomains);
  const visibleDomains = filterTab === 'mine'
    ? domainRows.filter(d => (d.listedBy?.id ?? d.listedByUserId) === user?.id)
    : domainRows.filter(d => !d.takenDown && d.status !== false);

  const {
    paginated, totalCount,
    search, category, minPrice, maxPrice, sortBy,
    handleSearch, handleCategory, handleMinPrice, handleMaxPrice, handleSort,
    clearAll, activeFilterCount,
    page, totalPages, setPage,
  } = useFilterSort(visibleDomains, {
    searchFields:  ['domainName', 'domainExtension'],
    priceField:    'askingPrice',
    categoryField: 'pricingDemand',
    dateField:     'createdAt',
  }, 20, {
    getLikeCount: (item) => getLike(item.id).count,
    resetPageWhen: filterTab,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadAll = filterTab === 'mine'
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
  }, [filterTab]);

  const { closeListingDetail } = useOpenListingDetailFromUrl({
    items: domainRows,
    loading,
    setDetail: setDetailTarget,
    fetchById: async (id) => {
      const { data } = await domainAPI.get(id);
      return normalizeDomainRecord(data?.data ?? data);
    },
  });

  const handleDelete = async () => {
    try {
      await domainAPI.delete(deleteTarget);
      setAllDomains(d => asArray(d).filter(x => x.id !== deleteTarget));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to remove listing.');
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
            <h2 className="font-display text-2xl font-extrabold text-gray-900 mb-1">Domain Listed!</h2>
            <p className="text-sm text-gray-500">Your domain is now live on the marketplace.</p>
          </div>
        </div>
      )}
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{t('domains')}</h1>
            <p className="text-gray-600 mt-1">{t('buyAndSellDomains')}</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" onClick={() => navigate('/domains/dashboard')}>
              <LayoutDashboard size={14} className="md:w-4 md:h-4" /> <span className="truncate">{t('dashboard')}</span>
            </button>
            <button className="btn-glow btn-glow-sm flex items-center gap-1.5 md:gap-2 text-xs md:text-sm py-2 px-2 md:py-2 md:px-3" onClick={() => { setShowForm(true); setEditTarget(null); }}>
              <Plus size={14} className="md:w-4 md:h-4" /> <span className="truncate">{t('listDomain')}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'all' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => { setFilterTab('all'); setShowForm(false); setEditTarget(null); }}>{t('allDomains')}</button>
          <button className={`btn-glow btn-glow-sm text-xs md:text-sm py-2 px-2 md:py-2 md:px-3 ${filterTab === 'mine' ? 'bg-gray-900 text-white border-gray-900' : ''}`}
            onClick={() => { setFilterTab('mine'); setShowForm(false); setEditTarget(null); }}>{t('myListings')}</button>
        </div>

        {globalNotice && (
          <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {globalNotice}
          </div>
        )}

        {(showForm || editTarget) && (
          <div className="mb-6">
            <DomainForm
              editDomain={editTarget}
              onSaved={d => {
                const normalizedSaved = normalizeDomainRecord(d);
                const snap = captureAppLayoutScroll();
                flushSync(() => {
                  if (editTarget) {
                    setAllDomains(prev => prev.map(x => (x.id === normalizedSaved.id ? { ...x, ...normalizedSaved } : x)));
                    setEditTarget(null);
                  } else {
                    setAllDomains(prev => [normalizedSaved, ...prev]);
                    setShowForm(false);
                    setShowConfetti(true);
                    setFilterTab('mine');
                    setGlobalNotice(
                      d?._warning
                        || '',
                    );
                  }
                });
                scheduleRestoreAppLayoutScroll(snap);
                if (!editTarget) setTimeout(() => setShowConfetti(false), 4000);
              }}
              onCancel={() => { setShowForm(false); setEditTarget(null); }}
            />
          </div>
        )}

        <FilterBar
          search={search}           onSearch={handleSearch}
          category={category}       onCategory={handleCategory}
          categoryOptions={DOMAIN_PRICING_OPTIONS}
          minPrice={minPrice}       onMinPrice={handleMinPrice}
          maxPrice={maxPrice}       onMaxPrice={handleMaxPrice}
          sortBy={sortBy}           onSort={handleSort}
          onClear={clearAll}        activeFilterCount={activeFilterCount}
          placeholder="Search domains by name or extension…"
          priceSymbol={getSymbol(currency)}
          theme="light"
        />

        {!loading && totalCount > 0 && (
          <div className="text-sm text-gray-600 mb-4">
            {totalCount} domain{totalCount !== 1 ? 's' : ''} found
          </div>
        )}

        {loading ? (
          <PageContentSkeleton variant="cards" rows={8} />
        ) : paginated.length === 0 ? (
          <div className="text-center py-20">
            <img src={DomainsIcon} alt="Domain" className="mx-auto mb-4 w-16 h-16 object-contain" />
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {activeFilterCount > 0 ? 'No domains match your filters' :
               filterTab === 'mine' ? 'You have no active listings' :
               'No domains listed yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeFilterCount > 0
                ? 'Try adjusting your search or filters.'
                : 'Be the first to list a domain for sale.'}
            </p>
            {activeFilterCount > 0
              ? <button className="btn-glow btn-glow-sm" onClick={clearAll}>Clear Filters</button>
              : <button className="btn-glow btn-glow-sm" onClick={() => setShowForm(true)}>
                  List a Domain
                </button>
            }
          </div>
        ) : (
          <>
            <div className="listing-card-glow-grid domain-listing-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginated.map(d => (
                <ListingCardShell key={d.id}>
                <DomainListingCard
                  domain={d}
                  isOwner={(d.listedBy?.id ?? d.listedByUserId) === user?.id}
                  likeState={getLike(d.id)}
                  onLike={() => toggleLike(d.id)}
                  onView={() => setDetailTarget(d)}
                  onEdit={() => { setEditTarget(d); setShowForm(false); }}
                  onBuy={() => setBuyTarget(d)}
                  onEnquire={() => setEnquireTarget(d)}
                  onViewAuction={() => navigate(d.auction?.id ? `/auction/${d.auction.id}` : '/auctions')}
                  onDelete={() => setDeleteTarget(d.id)}
                />
                </ListingCardShell>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages}
              onPage={setPage} totalCount={totalCount} pageSize={20} />
          </>
        )}
      </div>

      {buyTarget && (
        <BuyDomainModal
          domain={buyTarget}
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
          isOwner={(detailTarget.listedBy?.id ?? detailTarget.listedByUserId) === user?.id}
          likeState={getLike(detailTarget.id)}
          onLike={() => toggleLike(detailTarget.id)}
          onClose={() => { closeListingDetail(); refreshDomains(); }}
          onBuy={() => { setBuyTarget(detailTarget); closeListingDetail(); }}
          onEnquire={() => { setEnquireTarget(detailTarget); closeListingDetail(); }}
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

      {enquireTarget && (
        <DomainEnquiryModal
          domain={enquireTarget}
          user={user}
          onClose={() => setEnquireTarget(null)}
          onSuccess={() => { setEnquireTarget(null); setEnquireSuccess(true); }}
        />
      )}

      {enquireSuccess && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEnquireSuccess(false)}>
          <div className="relative w-full max-w-[420px] text-center bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(17,24,39,0.16)] p-8">
            <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
            <div className="text-green-600 flex justify-center mb-4"><CheckCircle size={46} /></div>
            <h2 className="font-display text-[1.75rem] text-gray-900 mb-2">Enquiry Submitted!</h2>
            <p className="text-gray-500 mb-6">
              Our team will review your request and get back to you shortly.
            </p>
            <button className="btn-glow w-full" onClick={() => setEnquireSuccess(false)}>Done</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Domain Listing?"
        message="This will remove your domain from the marketplace. You can re-list it later."
        confirmLabel="Remove"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}

// ─── Domain Form ──────────────────────────────────────────────────────────────
function DomainForm({ editDomain, onSaved, onCancel }) {
  const { currency: navCurrency } = useCurrency();
  const isEdit = Boolean(editDomain?.id);
  const [form, setForm] = useState(() => buildDomainFormState(editDomain, navCurrency));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [warning, setWarning] = useState('');

  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(() => editDomain?.logo ?? null);
  const [imageError, setImageError]     = useState('');
  const fileInputRef                    = useRef(null);

  useEffect(() => {
    setForm(buildDomainFormState(editDomain, navCurrency));
    setError('');
    setWarning('');
    setImageFile(null);
    setImagePreview(editDomain?.logo ?? null);
    setImageError('');
  }, [editDomain?.id, navCurrency]);

  const setContact = (k, v) =>
    setForm(f => ({ ...f, contactInfo: { ...f.contactInfo, [k]: v } }));

  const setExtension = (ext) => {
    const full = ext.startsWith('.') ? ext : `.${ext}`;
    setForm(f => ({ ...f, domainExtension: full }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const extNorm = normalizeDomainExtension(form.domainExtension);
    if (!extNorm) {
      setError('Please select or enter a domain extension (.com, .in, etc.).');
      return;
    }
    if (!isEdit && form.saleType === 'AUCTION' && (!form.minBidPrice || parseFloat(form.minBidPrice) <= 0)) {
      setError('Please enter a valid minimum bid price.');
      return;
    }
    setLoading(true); setError(''); setWarning('');
    try {
      const payload = {
        domainName:      form.domainName.trim(),
        domainExtension: extNorm.full,
        askingPrice:     form.saleType === 'AUCTION' ? 0 : parseFloat(form.askingPrice),
        pricingDemand:   form.pricingDemand,
        contactInfo:     form.contactInfo,
      };
      let saved = null;
      if (isEdit) {
        const { data: updated } = await domainAPI.update(editDomain.id, payload);
        saved = updated?.data ?? updated;
      } else {
        const createPayload = {
          ...payload,
          saleType: form.saleType,
          agreement: form.agreement,
        };
        const { data: domain } = await domainAPI.create(createPayload);
        saved = domain?.data ?? domain;
        if (form.saleType === 'AUCTION' && saved?.id) {
          try {
            await auctionAPI.create(saved.id, {
              domain_id: saved.id,
              minBidPrice: parseFloat(form.minBidPrice),
              duration:    form.auctionDuration,
            });
          } catch (auctionErr) {
            const msg = readApiError(
              auctionErr,
              'Listing created, but auction setup failed. Please edit this listing and create auction again.',
            );
            setWarning(msg);
            saved = { ...saved, _warning: msg };
          }
        }
      }
      let uploadWarning = '';
      if (imageFile && saved?.id) {
        try {
          const formData = new FormData();
          formData.append('file', imageFile);
          const { data } = await domainAPI.uploadImage(saved.id, formData);
          saved = { ...saved, logo: pickMediaUrl(data) };
        } catch {
          uploadWarning = 'Domain listed successfully, but logo upload is not available right now.';
          setWarning(uploadWarning);
        }
      }
      onSaved(uploadWarning ? { ...saved, _warning: uploadWarning } : saved);
    } catch (err) {
      setError(readApiError(err, isEdit ? 'Failed to update domain.' : 'Failed to list domain.'));
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

  const isAuction = form.saleType === 'AUCTION';
  const selectedExt = normalizeDomainExtension(form.domainExtension);

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white outline-none focus:border-purple-500 transition-all w-full placeholder:text-gray-400';
  const labelCls = 'text-sm font-medium text-gray-700';

  const extPreview = normalizeDomainExtension(form.domainExtension);
  const previewFull = extPreview
    ? `${form.domainName}${extPreview.full}`
    : form.domainName;

  return (
    <div className="p-8 bg-white border border-gray-200 rounded-[18px] shadow-sm">
      <h3 className="font-display text-2xl text-gray-900 font-semibold">
        {isEdit ? 'Edit Domain Listing' : 'List Your Domain'}
      </h3>
      <p className="text-gray-500 text-sm mt-1">
        {isEdit
          ? 'Update your listing details. Sale type cannot be changed after listing.'
          : 'Fill in the details to list your domain for sale.'}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Domain name <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              value={form.domainName}
              onChange={e => setForm(f => ({ ...f, domainName: e.target.value.replace(/\s/g, '').toLowerCase() }))}
              placeholder="e.g. mybrand"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Extension <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['.com', '.in', '.io', '.net', '.org', '.co', '.ai'].map((ext) => (
                <button
                  key={ext}
                  type="button"
                  onClick={() => setExtension(ext)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${
                    selectedExt?.full === ext
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {ext.toUpperCase()}
                </button>
              ))}
            </div>
            <input
              className={inputCls}
              value={form.domainExtension}
              onChange={e => setExtension(e.target.value)}
              placeholder=".com"
              required
            />
          </div>
        </div>
        {form.domainName && extPreview && (
          <p className="text-sm text-slate-600 -mt-2 flex items-center gap-2 flex-wrap">
            <span>Preview:</span>
            <span className={`domain-listing-card__ext-badge domain-listing-card__ext-badge--${extPreview.cssKey}`}>
              {extPreview.label}
            </span>
            <strong>{previewFull}</strong>
          </p>
        )}

        {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Sale Type <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            {[
              { value: 'ONE_TIME', label: '🛒 One-Time Sale', desc: 'Set a fixed price. Buyer pays and gets the domain.' },
              { value: 'AUCTION',  label: '🔨 Auction',       desc: 'Bidders compete. Highest bid wins after your chosen duration.' },
            ].map(opt => (
              <div key={opt.value}
                onClick={() => setForm(f => ({ ...f, saleType: opt.value }))}
                className={`p-3.5 rounded-lg cursor-pointer border-2 transition-all duration-150 ${
                  form.saleType === opt.value 
                    ? 'border-purple-600 bg-purple-50' 
                    : 'border-gray-200 bg-white'
                }`}>
                <div className={`font-semibold text-sm mb-1 ${
                  form.saleType === opt.value ? 'text-purple-600' : 'text-gray-600'
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
              label="Asking Price"
              value={form.askingPrice}
              onChange={(v) => setForm((f) => ({ ...f, askingPrice: v }))}
              currency={form.currency}
              onCurrencyChange={(code) => setForm((f) => ({ ...f, currency: code }))}
              required={!isAuction}
              inputClassName={inputCls}
              labelClassName={labelCls}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Pricing Type <span className="text-red-500">*</span></label>
            <select className={inputCls} value={form.pricingDemand}
              onChange={e => setForm(f => ({ ...f, pricingDemand: e.target.value }))} required>
              <option value="">Select pricing type</option>
              <option value="FIXED">Fixed Price</option>
              <option value="NEGOTIABLE">Negotiable</option>
            </select>
          </div>
        </div>

        {!isEdit && isAuction && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CurrencyPriceInput
                  id="domain-min-bid"
                  label="Minimum Bid"
                  value={form.minBidPrice}
                  onChange={(v) => setForm((f) => ({ ...f, minBidPrice: v }))}
                  currency={form.currency}
                  onCurrencyChange={(code) => setForm((f) => ({ ...f, currency: code }))}
                  required
                  placeholder="e.g. 5000"
                  inputClassName={inputCls}
                  labelClassName={labelCls}
                />
                <span className="text-[0.72rem] text-gray-500 mt-1 block">
                  Each subsequent bid must be at least 5% higher.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Auction Duration <span className="text-red-500">*</span></label>
                <select className={inputCls} value={form.auctionDuration}
                  onChange={e => setForm(f => ({ ...f, auctionDuration: e.target.value }))}>
                  <option value="ONE_HOUR">1 Hour</option>
                  <option value="SIX_HOURS">6 Hours</option>
                  <option value="TWELVE_HOURS">12 Hours</option>
                  <option value="ONE_DAY">1 Day</option>
                  <option value="THREE_DAYS">3 Days</option>
                  <option value="SEVEN_DAYS">7 Days</option>
                </select>
              </div>
            </div>
            <div className="p-3.5 bg-amber-100 border border-amber-400 rounded-lg text-[0.82rem] text-amber-900 leading-relaxed">
              ⚡ Auction domains go live only after domain verification (≈15 mins). Your listing
              stays in <strong>Draft</strong> until verification is complete, then the auction
              timer starts automatically.
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Contact Email <span className="text-red-500">*</span></label>
            <input className={inputCls} type="email" value={form.contactInfo.email}
              onChange={e => setContact('email', e.target.value)}
              placeholder="your@email.com" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={form.contactInfo.phoneNumber}
              onChange={e => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setContact('phoneNumber', value);
              }}
              type="tel"
              placeholder="10-digit number" maxLength={10} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            Logo <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              imagePreview ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-gray-50 hover:border-gray-400'
            }`}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Logo preview" className="max-h-[100px] max-w-full rounded-lg object-contain mx-auto" />
            ) : (
              <>
                <div className="text-3xl mb-1.5">🖼</div>
                <div className="text-sm text-gray-500">Click to upload a logo</div>
                <div className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {imagePreview && (
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-red-500 self-start"
              onClick={() => {
                setImageFile(null);
                setImagePreview(isEdit && editDomain?.logo ? editDomain.logo : null);
              }}
            >
              ✕ Remove
            </button>
          )}
          {imageError && <div className="text-sm text-red-500">{imageError}</div>}
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
          <span className="text-sm text-gray-700 leading-snug">I confirm I own this domain and agree to the Terms & Conditions.</span>
        </label>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}
        {warning && <div className="text-sm text-amber-600">{warning}</div>}

        <div className="flex gap-3 mt-2">
          <button type="submit" className="btn-glow flex-1" disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> :
              isEdit ? 'Save changes' : isAuction ? 'List for auction' : 'List domain'}
          </button>
          <button type="button" className="btn-glow" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Buy Domain Modal ─────────────────────────────────────────────────────────
function BuyDomainModal({ domain, onClose, onSuccess }) {
  const { user } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [addons, setAddons]   = useState([]);
  const [buyer, setBuyer] = useState({
    buyerFullName: `${user?.firstname || user?.firstName || ''} ${user?.lastname || user?.lastName || ''}`.trim(),
    buyerEmail: user?.email || '',
    buyerPhone: (user?.phoneNumber || user?.phone || '').replace(/\D/g, '').slice(-10),
  });

  const addonExtra  = addonTotal(addons);
  const domainPrice = Number(domain.askingPrice);
  const totalPrice  = domainPrice + addonExtra;

  const handlePhoneChange = (e) => {
    setBuyer(b => ({ ...b, buyerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }));
  };

  const handleBuy = async () => {
    if (!/^\d{10}$/.test(buyer.buyerPhone.trim())) {
      setError('A valid 10-digit phone number is required.');
      return;
    }
    setLoading(true); setError('');
    try {
      const { data: orderData } = await domainAPI.createOrder(domain.id, {
        services: addons,
        ...buyer,
        ...buildOrderCurrencyPayload(currency),
      });
      if (orderData?.contactOnly) {
        onSuccess({
          ...domain,
          domainStatus: 'SOLD',
          paymentStatus: orderData.paymentStatus || 'CONTACT_PENDING',
          _addons: addons,
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
            await domainAPI.verifyPayment(domain.id, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId:   response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess({
              ...domain,
              domainStatus:  'SOLD',
              paymentStatus: 'COMPLETED',
              _addons:       addons,
            });
          } catch {
            setError('Payment verification failed. Contact support.');
            setLoading(false);
          }
        },
        onFailure: async () => {
          await domainAPI.handleFailure(domain.id);
          setError('Payment failed. Please try again.');
          setLoading(false);
        },
        onDismiss: async () => {
          await domainAPI.handleFailure(domain.id);
          setLoading(false);
        },
      });
    } catch (err) {
      setError(readApiError(err, 'Failed to initiate payment.'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 overflow-x-hidden">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>

        <div className="mb-5">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide mb-2">Domain Purchase</div>
          <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">{domain.domainName}{domain.domainExtension}</h2>
          <p className="text-sm text-gray-500">{domain.pricingDemand}</p>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[0.82rem] text-amber-800 leading-relaxed mb-4">
          ⏳ After payment, you will be updated within <strong>24 hours</strong> with transfer details.
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Full Name</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
              value={buyer.buyerFullName}
              onChange={e => setBuyer(b => ({ ...b, buyerFullName: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">Email</label>
              <input
                type="email"
                className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
                value={buyer.buyerEmail}
                onChange={e => setBuyer(b => ({ ...b, buyerEmail: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all"
                value={buyer.buyerPhone}
                onChange={handlePhoneChange}
                placeholder="10-digit number"
                maxLength={10}
                inputMode="numeric"
                required
              />
            </div>
          </div>
        </div>

        {/* ── Add-on selector ── */}
        <AddonSelector selected={addons} onChange={setAddons} />

        {/* ── Billing breakdown ── */}
        <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
          <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">Billing Breakdown</div>
          <div className="flex justify-between text-gray-600 mb-1">
            <span>{domain.domainName}{domain.domainExtension}</span>
            <span>{formatPrice(domainPrice)}</span>
          </div>
          {addons.filter(k => !ADDON_SERVICES.find(s => s.key === k)?.contactOnly).map(k => {
            const svc = ADDON_SERVICES.find(s => s.key === k);
            return svc ? (
              <div key={k} className="flex justify-between text-indigo-600 mb-1">
                <span className="truncate mr-2">{svc.label}</span>
                <span>{formatPrice(svc.price)}</span>
              </div>
            ) : null;
          })}
          {addons.some(k => ADDON_SERVICES.find(s => s.key === k)?.contactOnly) && (
            <div className="text-xs text-amber-600 mb-1">+ contact-based services (no extra charge)</div>
          )}
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {error && <div className="text-sm text-red-500 mt-4 mb-2">{error}</div>}

        <div className="flex gap-3 mt-5">
          <button type="button" className="btn-glow flex-1" onClick={handleBuy} disabled={loading}>
            {loading
              ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" />
              : `Pay ${formatPrice(totalPrice)} →`}
          </button>
          <button type="button" className="btn-glow" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}


// ─── Purchase Success Modal ───────────────────────────────────────────────────
function PurchaseSuccessModal({ domain, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] text-center bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-2">Purchase Successful!</h2>
        <p className="text-gray-500 mb-5">
          You've successfully purchased{' '}
          <strong className="text-gray-900">{domain.domainName}{domain.domainExtension}</strong>
        </p>
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[0.82rem] text-amber-800 leading-relaxed mb-6">
          ⏳ A confirmation email has been sent. The seller will initiate the domain transfer
          within <strong>24 hours</strong>.
        </div>
        <button className="btn-glow w-full" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ─── Domain Detail Modal ──────────────────────────────────────────────────────
function DomainDetailModal({ domain, isOwner, onClose, onBuy, onEnquire,
                              onViewAuction, onEdit, likeState, onLike }) {
  const { formatPrice } = useCurrency();
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched            = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    domainAPI.get(domain.id)
      .then(({ data }) => setDetail(normalizeDomainRecord(data?.data ?? data)))
      .catch(() => setDetail(domain))
      .finally(() => setLoading(false));
  }, [domain.id]);

  const d           = detail || domain;
  const display     = resolveDomainDisplay(d);
  const c           = d.contactInfo || {};
  const s           = STATUS_COLORS[d.domainStatus] || STATUS_COLORS.AVAILABLE;
  const isAuction   = d.saleType === 'AUCTION';
  const auction     = d.auction;
  const auctionLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(17,24,39,0.16)] p-8">
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
                <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide">{isAuction ? '🔨 Auction' : 'Domain'}</div>
                {d.verified && (
                  <span className="px-2 py-0.5 rounded text-[0.68rem] font-bold text-green-600 bg-green-50 border border-green-300">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {display.ext && (
                  <span className={`domain-listing-card__ext-badge domain-listing-card__ext-badge--${display.ext.cssKey}`}>
                    {display.ext.label}
                  </span>
                )}
                <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 m-0">{display.name}</h2>
              </div>
              {display.ext && (
                <p className="text-sm text-slate-500 mb-1">{display.fullDomain}</p>
              )}
              <p className="text-sm text-gray-500">{d.pricingDemand === 'NEGOTIABLE' ? 'Negotiable' : 'Fixed price'}</p>
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {isAuction && auction ? (
                <>
                  <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[0.82rem] text-green-800">
                    {auction.currentHighestBid > 0
                      ? `🏆 ${formatPrice(auction.currentHighestBid)}`
                      : `🔨 Min ${formatPrice(auction.minBidPrice)}`}
                  </div>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[0.82rem] text-gray-600">
                    📋 {auction.totalBids} bid{auction.totalBids !== 1 ? 's' : ''}
                  </div>
                </>
              ) : (
                <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[0.82rem] text-green-800">
                  💰 {formatPrice(d.askingPrice)}
                </div>
              )}
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[0.82rem] text-gray-600">
                👁 {d.views || 0} views
              </div>
              {!isAuction && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                  {d.domainStatus}
                </span>
              )}
            </div>

            {isAuction && auction && (
              <Section title="Auction Info">
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem label="Status"
                    value={auction.status === 'ACTIVE'   ? '🟢 Live' :
                           auction.status === 'EXTENDED' ? '⚡ Extended' :
                           auction.status === 'DRAFT'    ? '⏳ Pending Verification' :
                           auction.status} />
                  <DetailItem label="Duration" value={auction.duration?.replace(/_/g, ' ')} />
                  {auction.endTime && (
                    <DetailItem label="Ends"
                      value={formatAuctionDateTime(auction.endTime, {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })} />
                  )}
                  {auction.currentHighestBid > 0 && (
                    <DetailItem label="Next Min Bid"
                      value={formatPrice(auction.currentHighestBid * 1.05)} />
                  )}
                </div>
              </Section>
            )}

            {(c.email || c.phoneNumber) && (
              <Section title="Contact">
                <div className="grid grid-cols-2 gap-3">
                  {c.email       && <DetailItem label="Email" value={c.email} />}
                  {c.phoneNumber && <DetailItem label="Phone" value={c.phoneNumber} />}
                </div>
              </Section>
            )}

            {d.listedBy && (
              <Section title="Listed By">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600">
                    {d.listedBy.firstname?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="font-semibold text-gray-900 text-[0.9rem]">
                    {d.listedBy.firstname} {d.listedBy.lastname}
                  </div>
                </div>
              </Section>
            )}

            <div className="flex gap-3 mt-6 flex-wrap items-center">
              {isOwner && onEdit && (
                <button type="button" className="btn-glow btn-glow-sm inline-flex items-center gap-1.5" onClick={onEdit}>
                  <EditActionLabel iconSize={16}>Edit listing</EditActionLabel>
                </button>
              )}
              {!isOwner && (
                isAuction ? (
                  REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE && !d.verified ? (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                      Verification pending
                    </span>
                  ) : (
                  <button
                    onClick={onViewAuction}
                    className="btn-glow btn-glow-sm">
                    🔨 {auctionLive ? 'Go to Auction' : 'View Auction'} →
                  </button>
                  )
                ) : d.domainStatus === 'AVAILABLE' ? (
                  REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE && !d.verified ? (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                      Verification pending
                    </span>
                  ) : (
                    <button className="btn-glow btn-glow-sm" onClick={onBuy}>Buy Now →</button>
                  )
                ) : null
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

// ─── Domain Enquiry Modal ─────────────────────────────────────────────────────
function DomainEnquiryModal({ domain, user, onClose, onSuccess }) {
  const { formatPrice } = useCurrency();
  const [form, setForm] = useState({
    fullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim(),
    email:    user?.email || '',
    phone:    user?.phoneNumber || '',
    message:  '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // Correct signature: (domainId, { fullName, email, phone, message })
      await domainEnquiryAPI.submit(domain.id, {
        fullName: form.fullName,
        email:    form.email,
        phone:    form.phone,
        message:  form.message,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit enquiry.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[500px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>
        <div className="mb-6">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide mb-2">Domain Enquiry</div>
          <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">{domain.domainName}{domain.domainExtension}</h2>
          <p className="text-sm text-gray-500">{formatPrice(domain.askingPrice)} · {domain.pricingDemand}</p>
        </div>
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-[0.83rem] text-amber-800">
          ⚡ For high-value domains, our team will facilitate the transaction.
          Fill in your details and we'll be in touch shortly.
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
            <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-purple-500 transition-all" value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="Your full name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
              <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-purple-500 transition-all" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
              <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-purple-500 transition-all" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit number" maxLength={10} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Message / Reason for Enquiry <span className="text-red-500">*</span></label>
            <textarea className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-purple-500 transition-all resize-vertical" value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tell us why you're interested and any specific requirements…"
              rows={4} required />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="flex gap-3 mt-1">
            <button type="submit" className="btn-glow flex-1" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : 'Submit Enquiry →'}
            </button>
            <button type="button" className="btn-glow" onClick={onClose}>Cancel</button>
          </div>
        </form>
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

function DetailItem({ label, value }) {
  return (
    <div className="border border-gray-200 bg-white rounded-[10px] p-2.5">
      <div className="text-[0.72rem] text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[0.95rem] text-gray-900 font-semibold">{value}</div>
    </div>
  );
}