import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';
import CurrencyPriceInput from '../common/CurrencyPriceInput';
import FormSelect from '../common/FormSelect';
import { DEFAULT_LISTING_CURRENCY } from '../../constants/currencies';
import { VENTURE_INDUSTRIES } from '../../constants/listingCategories';
import { normalizeEquityPercent } from '../../constants/ventureLabels';
import { fetchListingFeesAndCharges } from '../../utils/auctionFees';
import CompanyProfileSections, {
  isCompanyProfileComplete,
  EMPTY_COMPANY_PROFILE,
} from './CompanyProfileSections';
import {
  applyPrivateContactToProfile,
  buildCompanyProfileFromBrand,
  contactsAreSynced,
  normalizeCompanyProfile,
  normalizeContactInfo,
  sanitizeCompanyProfileForApi,
  syncBrandToProfile,
} from '../../utils/ventureProfileUtils';

const STAGES = [
  { value: 'IDEA', label: '💡 Idea — Concept stage, not yet built' },
  { value: 'MVP', label: '🛠 MVP — Built, testing with early users' },
  { value: 'REVENUE_GENERATING', label: '💰 Revenue Generating — Paying customers' },
  { value: 'SCALING', label: '🚀 Scaling — Growing fast, need fuel' },
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
  dealType: 'FULL_ACQUISITION',
  equityPercentOffered: '',
  companyProfile: null,
  auctionMinBidPrice: '',
  auctionDuration: '',
  currency: DEFAULT_LISTING_CURRENCY,
};

const ventureInputCls =
  'w-full min-w-0 flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';
const ventureSelectCls =
  'shrink-0 w-[7.25rem] px-2.5 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none transition-all duration-200 cursor-pointer focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';
const ventureFieldSelectCls =
  'w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm outline-none transition-all duration-200 cursor-pointer focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';
const ventureLabelCls = 'text-sm font-medium text-gray-700';

export default function VentureForm({
  initialData,
  onSubmit,
  loading,
  error,
  submitLabel,
  coVentureMode = false,
  showListingTypePicker = false,
  defaultListingType = 'VENTURE',
}) {
  const { t } = useTranslation();
  const { currency: navCurrency, convertToInr, formatPrice } = useCurrency();
  const [listingType, setListingType] = useState(
    coVentureMode ? 'CO_VENTURE' : defaultListingType,
  );
  const isCoVenture = showListingTypePicker && !initialData
    ? listingType === 'CO_VENTURE'
    : (
      coVentureMode
      || initialData?.listingMode === 'CO_VENTURE'
      || initialData?.listing_mode === 'CO_VENTURE'
    );
  const [commissionPercent, setCommissionPercent] = useState(15);
  const [acquisitionCommissionPercent, setAcquisitionCommissionPercent] = useState(3);

  const [form, setForm] = useState(() => {
    if (!initialData) {
      return { ...EMPTY, currency: navCurrency || DEFAULT_LISTING_CURRENCY };
    }
    const contactInfo = normalizeContactInfo(
      initialData.contactInfo,
      initialData.contact_info,
    );
    const companyProfile = normalizeCompanyProfile(
      initialData.companyProfile || initialData.company_profile,
    );
    const base = {
      ...EMPTY,
      ...initialData,
      contactInfo,
      saleType: initialData.saleType || 'REGULAR',
      companyProfile: companyProfile || buildCompanyProfileFromBrand({
        brandDetails: initialData.brandDetails || initialData.brand_details,
        companyProfile: null,
      }),
      roleTitle: initialData.roles?.[0]?.title || initialData.roleTitle || '',
      equityPercentOffered: (() => {
        const raw = initialData.equityPercentOffered ?? initialData.equity_percent_offered ?? '';
        if (raw === '' || raw == null) return '';
        return normalizeEquityPercent(raw) ?? '';
      })(),
      auctionMinBidPrice: initialData.auctionMinBidPrice || '',
      auctionDuration: initialData.auctionDuration || '',
      currency: initialData.currency || navCurrency || DEFAULT_LISTING_CURRENCY,
    };
    return base;
  });

  const [syncPublicContact, setSyncPublicContact] = useState(() => {
    if (!initialData) return true;
    const contactInfo = normalizeContactInfo(
      initialData.contactInfo,
      initialData.contact_info,
    );
    const companyProfile = normalizeCompanyProfile(
      initialData.companyProfile || initialData.company_profile,
    );
    return contactsAreSynced(companyProfile, contactInfo);
  });

  const resolvedSubmitLabel = submitLabel ?? t('submit');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(form.brandDetails?.ventureImageUrl || null);

  const setBrand = useCallback((key, value) => {
    setForm((f) => {
      const brandDetails = { ...f.brandDetails, [key]: value };
      const companyProfile = syncBrandToProfile(
        brandDetails,
        f.companyProfile || EMPTY_COMPANY_PROFILE,
        f.brandDetails,
      );
      return { ...f, brandDetails, companyProfile };
    });
  }, []);

  const setContact = (key, value) =>
    setForm((f) => {
      const contactInfo = { ...f.contactInfo, [key]: value };
      const companyProfile = syncPublicContact
        ? applyPrivateContactToProfile(f.companyProfile, contactInfo)
        : f.companyProfile;
      return { ...f, contactInfo, companyProfile };
    });

  const handleSyncToggle = (checked) => {
    setSyncPublicContact(checked);
    if (checked) {
      setForm((f) => ({
        ...f,
        companyProfile: applyPrivateContactToProfile(f.companyProfile, f.contactInfo),
      }));
    }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setCompanyProfile = (profile) => setForm((f) => ({ ...f, companyProfile: profile }));

  const isAuction = false;
  const isAuctionEligible = AUCTION_ELIGIBLE_STAGES.includes(form.stage);
  const listingApprovalStatus = initialData?.listingApprovalStatus
    ?? initialData?.listing_approval_status
    ?? null;
  const isPendingApproval = listingApprovalStatus === 'PENDING_APPROVAL';
  const profileComplete = isCompanyProfileComplete(form.companyProfile);

  useEffect(() => {
    fetchListingFeesAndCharges()
      .then((fees) => {
        setCommissionPercent(Number(fees?.listingCommissionPercent ?? 15));
        setAcquisitionCommissionPercent(Number(fees?.ventureAcquisitionCommissionPercent ?? 3));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!syncPublicContact) return;
    setForm((f) => ({
      ...f,
      companyProfile: applyPrivateContactToProfile(f.companyProfile, f.contactInfo),
    }));
  }, [syncPublicContact, form.contactInfo.email, form.contactInfo.phoneNumber]);

  const sellerDealAmount = parseFloat(form.brandDetails.dealValue) || 0;
  const acquisitionBreakdown = !isAuction && sellerDealAmount > 0
    ? (() => {
        const commission = Math.round(sellerDealAmount * acquisitionCommissionPercent) / 100;
        return {
          askingPrice: sellerDealAmount,
          commissionAmount: commission,
          sellerReceives: Math.round((sellerDealAmount - commission) * 100) / 100,
          commissionPercent: acquisitionCommissionPercent,
        };
      })()
    : null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isAuction && !isAuctionEligible) {
      alert(t('ventureFormAuctionStageAlert'));
      return;
    }
    if (!isCoVenture && !form.dealType) {
      alert('Please select a deal type (full acquisition or equity sale).');
      return;
    }
    if (!isCoVenture && form.dealType === 'EQUITY_SALE' && !form.equityPercentOffered) {
      alert('Please enter the equity percentage offered for sale.');
      return;
    }
    if (isCoVenture) {
      if (!form.roleTitle?.trim()) {
        alert('Please enter the partnership role you are looking for.');
        return;
      }
      const eq = Number(form.equityPercentOffered);
      if (!Number.isFinite(eq) || eq < 0 || eq > 100) {
        alert('Please enter equity offered (%) between 0 and 100.');
        return;
      }
    }
    if (!isCompanyProfileComplete(form.companyProfile)) {
      alert('Please complete all required company profile fields before publishing.');
      return;
    }

    const listingCurrency = form.currency || DEFAULT_LISTING_CURRENCY;
    const toStoredInr = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      const inr = listingCurrency === 'INR' ? n : convertToInr(n, listingCurrency);
      return Math.round(inr);
    };

    const mergedProfile = syncPublicContact
      ? applyPrivateContactToProfile(buildCompanyProfileFromBrand(form), form.contactInfo)
      : buildCompanyProfileFromBrand(form);
    const sanitizedProfile = sanitizeCompanyProfileForApi(mergedProfile);

    const payload = {
      ...form,
      listingMode: isCoVenture ? 'CO_VENTURE' : 'VENTURE',
      saleType: 'REGULAR',
      dealType: isCoVenture ? null : form.dealType,
      acquisitionFlow: (
        !isCoVenture && form.dealType === 'FULL_ACQUISITION'
          ? 'SELLER_SELECTS'
          : null
      ),
      companyProfile: sanitizedProfile,
      lookingFor: form.lookingFor?.trim() || null,
      equityPercentOffered: isCoVenture
        ? normalizeEquityPercent(parseFloat(form.equityPercentOffered))
        : (
          form.dealType === 'EQUITY_SALE'
            ? normalizeEquityPercent(parseFloat(form.equityPercentOffered))
            : (form.dealType === 'FULL_ACQUISITION' ? 100 : null)
        ),
      roles: isCoVenture
        ? (form.roles?.length ? form.roles : [{ title: form.roleTitle || 'Partner', type: 'CO_FOUNDER' }])
        : [],
      brandDetails: {
        ...form.brandDetails,
        industry: form.brandDetails.industry || null,
        ventureType: null,
        dealValue:
          !isCoVenture && form.brandDetails.dealValue !== ''
            ? toStoredInr(form.brandDetails.dealValue)
            : null,
      },
    };

    onSubmit(payload, imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">

      {showListingTypePicker && !initialData && (
        <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
          <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Listing Type</h3>
          <p className="text-sm text-gray-500 mb-2">
            Choose whether you are listing for sale or seeking a co-founder / partner to build together.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { value: 'VENTURE', label: 'Venture', desc: 'List for acquisition or equity sale. Buyers submit offers.', accent: 'blue' },
              { value: 'CO_VENTURE', label: 'Co-Venture', desc: 'Find a co-founder or partner. Partners apply to join.', accent: 'teal' },
            ].map((opt) => {
              const selected = listingType === opt.value;
              const borderCls = opt.accent === 'teal'
                ? (selected ? 'border-teal-400 bg-teal-50/40' : 'border-gray-200')
                : (selected ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200');
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setListingType(opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${borderCls}`}
                >
                  <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!isCoVenture && (
        <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
          <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Deal Type</h3>
          <p className="text-sm text-gray-500 mb-2">
            Full acquisition listings accept buyer offers — you select the preferred buyer after admin review.
            Equity sale listings accept investment pitches.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { value: 'FULL_ACQUISITION', label: 'Full Acquisition', desc: 'Sell 100% of the company' },
              { value: 'EQUITY_SALE', label: 'Equity Sale', desc: 'Sell a partial stake — buyers submit investment pitches' },
            ].map((opt) => {
              const selected = form.dealType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField('dealType', opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {form.dealType === 'EQUITY_SALE' && (
            <div className="flex flex-col gap-1.5 max-w-xs">
              <label className={ventureLabelCls}>Equity offered for sale (%) <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={form.equityPercentOffered}
                onChange={(e) => setField('equityPercentOffered', e.target.value)}
                className={ventureInputCls}
                placeholder="e.g. 25"
              />
            </div>
          )}
        </section>
      )}

      {isCoVenture && (
        <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
          <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Partnership Role</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Role title <span className="text-red-400">*</span></label>
            <input
              value={form.roleTitle || ''}
              onChange={(e) => setField('roleTitle', e.target.value)}
              placeholder="e.g. Technical Co-founder, Growth Lead"
              required
              className={ventureInputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5 max-w-xs">
            <label className={ventureLabelCls}>Equity Offered (%) <span className="text-red-400">*</span></label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.equityPercentOffered}
              onChange={(e) => setField('equityPercentOffered', e.target.value)}
              className={ventureInputCls}
              placeholder="e.g. 25"
              required
            />
            <span className="text-xs text-gray-500">Exact percentage you are willing to offer a partner (0–100).</span>
          </div>
        </section>
      )}

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Brand Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Brand / Company Name <span className="text-red-400">*</span></label>
            <input value={form.brandDetails.brandName} onChange={(e) => setBrand('brandName', e.target.value)} placeholder="e.g. LaunchPad" required className={ventureInputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Industry <span className="text-red-400">*</span></label>
            <FormSelect value={form.brandDetails.industry} onChange={(e) => setBrand('industry', e.target.value)} required className={ventureFieldSelectCls}>
              <option value="">Select industry</option>
              {VENTURE_INDUSTRIES.map((i) => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}
            </FormSelect>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Short Description <span className="text-red-400">*</span></label>
          <textarea
            value={form.brandDetails.description}
            onChange={(e) => setBrand('description', e.target.value)}
            placeholder="Marketplace pitch — one paragraph about your venture"
            rows={3}
            required
            className={`${ventureInputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Website <span className="text-red-400">*</span></label>
            <input value={form.brandDetails.website} onChange={(e) => setBrand('website', e.target.value)} placeholder="https://..." type="url" required className={ventureInputCls} />
          </div>
          {!isAuction && !isCoVenture && (
            <CurrencyPriceInput
              id="venture-deal-value"
              label="Asking Price (buyer pays)"
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

        {acquisitionBreakdown && !isCoVenture && (
          <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3 text-sm text-gray-700 space-y-1">
            <div className="flex justify-between"><span>Asking price (listing)</span><span>{formatPrice(acquisitionBreakdown.askingPrice)}</span></div>
            <div className="flex justify-between"><span>Platform commission ({acquisitionBreakdown.commissionPercent}%)</span><span>{formatPrice(acquisitionBreakdown.commissionAmount)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900"><span>You receive (after commission)</span><span>{formatPrice(acquisitionBreakdown.sellerReceives)}</span></div>
          </div>
        )}

        {isPendingApproval && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            Your venture listing is pending admin approval and is not visible publicly yet.
          </div>
        )}
      </section>

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Private Contact</h3>
        <p className="text-sm text-gray-500 m-0">
          Used by CoBrother for listing verification. Enable sync in Company Profile to copy these into your public contact fields.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Private Email <span className="text-red-400">*</span></label>
            <input value={form.contactInfo.email} onChange={(e) => setContact('email', e.target.value)} type="email" required className={ventureInputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Private Phone</label>
            <input value={form.contactInfo.phoneNumber} onChange={(e) => setContact('phoneNumber', e.target.value)} className={ventureInputCls} />
          </div>
        </div>
      </section>

      <section id="company-profile" className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4 scroll-mt-24">
        <div>
          <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Company Profile</h3>
          <p className="text-sm text-gray-500 m-0">
            Required public fields must be complete before admin can approve your listing.
          </p>
        </div>
        <CompanyProfileSections
          profile={form.companyProfile || EMPTY_COMPANY_PROFILE}
          onChange={setCompanyProfile}
          syncPublicContact={syncPublicContact}
          onSyncPublicContactChange={handleSyncToggle}
        />
        <div className={`p-3 rounded-lg text-sm border ${
          profileComplete
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {profileComplete
            ? `✓ Company profile complete — ${form.companyProfile?.companyName || 'Ready for review'}`
            : 'Complete all required company profile fields above before publishing.'}
        </div>
      </section>

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Venture Status</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Current Stage <span className="text-red-400">*</span></label>
          <FormSelect value={form.stage} onChange={(e) => setField('stage', e.target.value)} required className={ventureFieldSelectCls}>
            <option value="">Select stage</option>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            {isCoVenture ? 'Partnership opportunity' : 'Looking For'} <span className="text-red-400">*</span>
          </label>
          <input
            value={form.lookingFor}
            onChange={(e) => setField('lookingFor', e.target.value)}
            placeholder={isCoVenture
              ? 'e.g. Technical co-founder, growth partner, domain expert'
              : 'e.g. Strategic buyer, angel investor, acquirer'}
            required
            className={ventureInputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Current Challenge <span className="text-gray-400 text-xs">(optional)</span></label>
          <textarea
            value={form.currentProblem}
            onChange={(e) => setField('currentProblem', e.target.value)}
            placeholder="What's the biggest problem you're facing right now?"
            rows={3}
            className={`${ventureInputCls} resize-none`}
          />
        </div>
      </section>

      <section className="p-7 bg-white border border-gray-200 rounded-[14px] shadow-sm mb-5 flex flex-col gap-4">
        <h3 className="font-display text-xl font-medium text-gray-900 mb-1">Agreement</h3>
        <label className="inline-flex items-center gap-3 text-sm text-gray-600 cursor-pointer max-w-full self-start rounded-[12px] border border-purple-100 bg-purple-50/60 px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={form.agreement.terms}
            onChange={(e) => setForm((f) => ({ ...f, agreement: { ...f.agreement, terms: e.target.checked } }))}
            required
            className="peer sr-only"
          />
          <span className="relative w-5 h-5 rounded-[7px] border-2 border-purple-300 bg-white flex items-center justify-center flex-shrink-0" style={{ backgroundColor: form.agreement.terms ? '#9333ea' : 'white', borderColor: form.agreement.terms ? '#9333ea' : '#d8b4fe' }}>
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
        {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : resolvedSubmitLabel}
      </button>
    </form>
  );
}