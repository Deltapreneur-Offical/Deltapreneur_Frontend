import { useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import CurrencyPriceInput from '../common/CurrencyPriceInput';
import { DEFAULT_LISTING_CURRENCY } from '../../constants/currencies';
import { VENTURE_INDUSTRIES } from '../../constants/listingCategories';
const VENTURE_TYPES = [
  { value: 'FIFTY_FIFTY', label: '50:50 — Equal Synergy' },
  { value: 'SIXTY_FORTY', label: '60:40 — Majority Founder' },
  { value: 'SEVENTY_THIRTY', label: '70:30 — Strategic Growth' },
  { value: 'EIGHTY_TWENTY', label: '80:20 — Advisor / Investor Stake' },
  { value: 'NINETY_TEN', label: '90:10 — Minor Equity Placement' },
  { value: 'NEGOTIABLE', label: 'Negotiable — Custom Structure' },
];

const STAGES = [
  { value: 'IDEA',               label: '💡 Idea — Concept stage, not yet built' },
  { value: 'MVP',                label: '🛠 MVP — Built, testing with early users' },
  { value: 'REVENUE_GENERATING', label: '💰 Revenue Generating — Paying customers' },
  { value: 'SCALING',            label: '🚀 Scaling — Growing fast, need fuel' },
];

const AUCTION_DURATIONS = [
  { value: 'ONE_DAY',      label: '1 Day'   },
  { value: 'SEVEN_DAYS',   label: '7 Days'  },
  { value: 'FIFTEEN_DAYS', label: '15 Days' },
  { value: 'THIRTY_DAYS',  label: '30 Days' },
];

const AUCTION_ELIGIBLE_STAGES = ['REVENUE_GENERATING', 'SCALING'];

const EMPTY = {
  brandDetails: {
    brandName: '', description: '', website: '', videoUrl: '',
    industry: '', dealValue: '', referenceImageUrl: '', ventureType: '',
  },
  contactInfo: { email: '', phoneNumber: '' },
  agreement: { terms: false },
  status: true,
  stage: '',
  lookingFor: '',
  currentProblem: '',
  saleType: 'REGULAR',
  auctionMinBidPrice: '',
  auctionDuration: '',
  currency: DEFAULT_LISTING_CURRENCY,
};


const ventureInputCls =
  'w-full min-w-0 flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';
const ventureSelectCls =
  'shrink-0 w-[7.25rem] px-2.5 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none transition-all duration-200 cursor-pointer focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';
const ventureLabelCls = 'text-sm font-medium text-gray-700';

export default function VentureForm({ initialData, onSubmit, loading, error, submitLabel = 'Submit' }) {
  const { currency: navCurrency } = useCurrency();
  const [form, setForm] = useState(() => initialData ? {
    ...EMPTY,
    ...initialData,
    saleType: initialData.saleType || 'REGULAR',
    auctionMinBidPrice: initialData.auctionMinBidPrice || '',
    auctionDuration: initialData.auctionDuration || '',
    currency: initialData.currency || navCurrency || DEFAULT_LISTING_CURRENCY,
  } : { ...EMPTY, currency: navCurrency || DEFAULT_LISTING_CURRENCY });
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(form.brandDetails?.ventureImageUrl || null);
  const [imageUploading, setImageUploading] = useState(false);

  const setBrand = (key, value) =>
    setForm((f) => ({ ...f, brandDetails: { ...f.brandDetails, [key]: value } }));

  const setContact = (key, value) =>
    setForm((f) => ({ ...f, contactInfo: { ...f.contactInfo, [key]: value } }));

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const isAuction = form.saleType === 'AUCTION';
  const isAuctionEligible = AUCTION_ELIGIBLE_STAGES.includes(form.stage);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isAuction && !isAuctionEligible) {
      alert('Auction listings require a Revenue Generating or Scaling stage venture.');
      return;
    }
    if (isAuction && !form.auctionMinBidPrice) {
      alert('Please enter a minimum bid price for the auction.');
      return;
    }
    if (isAuction && !form.auctionDuration) {
      alert('Please select an auction duration.');
      return;
    }

    const payload = {
      ...form,
      saleType: form.saleType,
      currency: form.currency || DEFAULT_LISTING_CURRENCY,
      auctionMinBidPrice: isAuction && form.auctionMinBidPrice !== ''
        ? Number(form.auctionMinBidPrice) : null,
      auctionDuration: isAuction ? form.auctionDuration : null,
      brandDetails: {
        ...form.brandDetails,
        industry:    form.brandDetails.industry    || null,
        ventureType: form.brandDetails.ventureType || null,
        dealValue: !isAuction && form.brandDetails.dealValue !== ''
          ? Number(form.brandDetails.dealValue) : null,
      },
    };

    onSubmit(payload, imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">

      {/* ── Listing Type (REGULAR / AUCTION) ── */}
      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Listing Type</h3>
        <p className="text-sm text-gray-500 mb-2">Choose how you want to list your venture before filling in the details.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { value: 'REGULAR', icon: '🤝', title: 'Regular Listing', desc: 'Standard co-venture listing — people apply to collaborate.', selectedBorder: 'border-blue-400', selectedBg: 'bg-blue-50', selectedText: 'text-blue-600' },
            { value: 'AUCTION', icon: '🔨', title: 'Equity Auction', desc: 'Auction equity/stake to the highest bidder. Requires GSTIN verification.', selectedBorder: 'border-purple-400', selectedBg: 'bg-purple-50', selectedText: 'text-purple-600', badge: 'Revenue Generating / Scaling only' },
          ].map(opt => {
            const selected = form.saleType === opt.value;
            return (
              <div key={opt.value}
                onClick={() => setField('saleType', opt.value)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                  selected ? `${opt.selectedBorder} ${opt.selectedBg}` : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className={`font-bold text-sm ${selected ? opt.selectedText : 'text-gray-700'}`}>{opt.title}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.desc}</div>
                {opt.badge && (
                  <span className={`inline-block mt-2 text-[0.67rem] font-bold px-2 py-0.5 rounded ${
                    selected ? 'text-purple-600 bg-purple-100 border border-purple-200' : 'text-gray-500 bg-gray-100 border border-gray-200'
                  }`}>{opt.badge}</span>
                )}
              </div>
            );
          })}
        </div>

        {isAuction && (
          <div className="mt-3 p-5 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="text-sm font-bold text-purple-600 mb-3 flex items-center gap-1.5">
              🔨 Auction Configuration
            </div>

            {form.stage && !isAuctionEligible && (
              <div className="p-3 rounded-lg mb-3 bg-red-50 border border-red-200 text-sm text-red-600">
                ⚠ Auction requires <strong>Revenue Generating</strong> or <strong>Scaling</strong> stage. Update your stage below to proceed.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyPriceInput
                id="venture-auction-min-bid"
                label="Minimum Bid Price"
                value={form.auctionMinBidPrice}
                onChange={(v) => setField('auctionMinBidPrice', v)}
                currency={form.currency}
                onCurrencyChange={(code) => setField('currency', code)}
                required={isAuction}
                placeholder="e.g. 500000"
                inputClassName={ventureInputCls}
                labelClassName={ventureLabelCls}
                selectClassName={ventureSelectCls}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Auction Duration <span className="text-red-400">*</span></label>
                <select
                  value={form.auctionDuration}
                  onChange={e => setField('auctionDuration', e.target.value)}
                  required={isAuction}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none transition-all duration-200 cursor-pointer focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                >
                  <option value="">Select duration</option>
                  {AUCTION_DURATIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 leading-relaxed">
              <strong className="text-purple-600">📋 How it works:</strong><br />
              1. Submit this form to create your auction listing (status: Draft)<br />
              2. Go to <strong>Venture Dashboard → My Listings</strong><br />
              3. Click <strong>🔍 Verify GSTIN</strong> — your venture name must match the GSTIN trade name<br />
              4. Once verified, your auction goes <strong>Live</strong> immediately
            </div>
          </div>
        )}
      </section>

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Brand Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Brand Name <span className="text-red-400">*</span></label>
            <input value={form.brandDetails.brandName} onChange={(e) => setBrand('brandName', e.target.value)} placeholder="e.g. LaunchPad" required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" />
            {isAuction && (
              <p className="text-xs text-yellow-600 mt-1">⚠ For auction listings, this name must exactly match your GSTIN trade name (case-insensitive).</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Industry <span className="text-red-400">*</span></label>
            <select value={form.brandDetails.industry} onChange={(e) => setBrand('industry', e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none transition-all duration-200 cursor-pointer focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]">
              <option value="">Select industry</option>
              {VENTURE_INDUSTRIES.map((i) => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Description <span className="text-red-400">*</span></label>
          <textarea
            value={form.brandDetails.description}
            onChange={(e) => setBrand('description', e.target.value)}
            placeholder="Describe your venture..."
            rows={4}
            required
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 resize-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Website <span className="text-red-400">*</span></label>
            <input value={form.brandDetails.website} onChange={(e) => setBrand('website', e.target.value)} placeholder="https://..." type="url" required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0-0_0_3px_rgba(99,102,241,0.12)]" />
          </div>
          {!isAuction && (
            <CurrencyPriceInput
              id="venture-deal-value"
              label="Deal Value"
              value={form.brandDetails.dealValue}
              onChange={(v) => setBrand('dealValue', v)}
              currency={form.currency}
              onCurrencyChange={(code) => setField('currency', code)}
              placeholder="e.g. 500000"
              inputClassName={ventureInputCls}
              labelClassName={ventureLabelCls}
              selectClassName={ventureSelectCls}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Venture Type <span className="text-red-400">*</span></label>
            <select value={form.brandDetails.ventureType} onChange={(e) => setBrand('ventureType', e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none transition-all duration-200 cursor-pointer focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]">
              <option value="">Select type</option>
              {VENTURE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Venture Reference Image</label>
            <div className="flex items-center gap-4 flex-wrap">
                {imagePreview && (
                    <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-14 h-14 rounded-[10px] object-cover border border-gray-200"
                    />
                )}
                <label className="btn-glow btn-glow-sm cursor-pointer">
                    📷 {imagePreview ? 'Change Image' : 'Upload Image'}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                    />
                </label>
                {imagePreview && (
                    <button type="button" className="px-3 py-1.5 bg-transparent border border-gray-400 text-gray-600 rounded-full text-sm cursor-pointer transition-all duration-200 hover:bg-gray-100" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                        Remove
                    </button>
                )}
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
                JPG, PNG or WebP. Max 5MB. Uploaded on save.
            </p>
        </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Video URL</label>
          <input value={form.brandDetails.videoUrl} onChange={(e) => setBrand('videoUrl', e.target.value)} placeholder="YouTube / Loom link" className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" />
        </div>
      </section>

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Contact Email <span className="text-red-400">*</span></label>
            <input type="email" value={form.contactInfo.email} onChange={(e) => setContact('email', e.target.value)} placeholder="contact@venture.com" required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <input value={form.contactInfo.phoneNumber} onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setContact('phoneNumber', value);
            }} type="tel" placeholder="10-digit number" maxLength={10} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" />
          </div>
        </div>
      </section>

      

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Venture Status</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Current Stage <span className="text-red-400">*</span></label>
          <select value={form.stage} onChange={e => setField('stage', e.target.value)} required className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none transition-all duration-200 cursor-pointer focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]">
            <option value="">Select stage</option>
            {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {isAuction && form.stage && !isAuctionEligible && (
            <p className="text-xs text-red-500 mt-1">⚠ Auction mode requires Revenue Generating or Scaling stage.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Looking For <span className="text-red-400">*</span></label>
          <input
            value={form.lookingFor}
            onChange={e => setField('lookingFor', e.target.value)}
            placeholder="e.g. Marketing co-founder, Angel investor, Tech lead"
            required
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Current Challenge <span className="text-gray-400 text-xs">(optional)</span></label>
          <textarea
            value={form.currentProblem}
            onChange={e => setField('currentProblem', e.target.value)}
            placeholder="What's the biggest problem you're facing right now? e.g. Struggling with user acquisition, need help with GTM strategy..."
            rows={3}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 resize-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
          />
        </div>
      </section>

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Agreement</h3>
        <label className="inline-flex items-center gap-3 text-sm text-gray-600 cursor-pointer max-w-full self-start rounded-[12px] border border-purple-100 bg-purple-50/60 px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={form.agreement.terms}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                agreement: { ...f.agreement, terms: e.target.checked }
              }))
            }
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
          <span className="leading-snug">I agree to the Terms & Conditions and confirm the information provided is accurate.</span>
        </label>
      </section>

      {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-400 text-sm mb-4">{error}</div>}

      <button type="submit" className="btn-glow" disabled={loading}>
        {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" /> : submitLabel}
      </button>
    </form>
  );
}
