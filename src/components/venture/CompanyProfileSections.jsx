import FormCheckbox from '../common/FormCheckbox';

export const COMPANY_PROFILE_REQUIRED_FIELDS = [
  'companyName',
  'industry',
  'website',
  'businessDescription',
  'productsServices',
  'targetMarket',
  'businessModel',
  'publicContactPerson',
  'publicEmail',
];

export function isCompanyProfileComplete(profile) {
  if (!profile) return false;
  return COMPANY_PROFILE_REQUIRED_FIELDS.every((f) => String(profile[f] || '').trim());
}

export const EMPTY_COMPANY_PROFILE = {
  companyName: '',
  legalEntityName: '',
  registrationNumber: '',
  incorporationDate: '',
  companyType: '',
  industry: '',
  website: '',
  businessDescription: '',
  productsServices: '',
  targetMarket: '',
  businessModel: '',
  currentYearRevenueInr: '',
  previousYearRevenueInr: '',
  twoYearsAgoRevenueInr: '',
  profitabilityStatus: '',
  fundingRaisedSummary: '',
  valuationInr: '',
  founderName: '',
  teamSize: '',
  keyTeamMembers: '',
  userBase: '',
  growthMetrics: '',
  marketReach: '',
  publicContactPerson: '',
  publicEmail: '',
  publicPhoneNumber: '',
};

const COMPANY_TYPES = [
  { value: 'PRIVATE_LIMITED', label: 'Private Limited' },
  { value: 'LLP', label: 'LLP' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
  { value: 'PUBLIC_LIMITED', label: 'Public Limited' },
  { value: 'OTHER', label: 'Other' },
];

const DEFAULT_INPUT_CLS =
  'w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';
const labelCls = 'text-sm font-medium text-gray-700';

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

function SectionTitle({ children, badge }) {
  return (
    <div className="flex items-center justify-between mt-2">
      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide m-0">{children}</h4>
      {badge && (
        <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
          {badge}
        </span>
      )}
    </div>
  );
}

/**
 * Owner-facing Company Profile form sections (no modal wrapper).
 * Required (Public-tier) fields must be complete before an admin can approve the listing.
 */
export default function CompanyProfileSections({
  profile,
  onChange,
  inputCls = DEFAULT_INPUT_CLS,
  syncPublicContact = false,
  onSyncPublicContactChange,
  showCompany = true,
  showFinancials = true,
  showLegal = true,
  listingCurrency = 'INR',
  onCurrencyChange,
  convertToInr,
}) {
  const draft = { ...EMPTY_COMPANY_PROFILE, ...(profile || {}) };
  const textareaCls = `${inputCls} resize-none`;
  const set = (key) => (e) => onChange({ ...draft, [key]: e.target.value });

  return (
    <div className="flex flex-col gap-4">
      {showCompany && (
        <>
      <SectionTitle badge="Public">Company</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Company Name" required>
          <input value={draft.companyName} onChange={set('companyName')} className={inputCls} placeholder="e.g. LaunchPad Pvt Ltd" />
        </Field>
        <Field label="Industry" required>
          <input value={draft.industry} onChange={set('industry')} className={inputCls} placeholder="e.g. SaaS" />
        </Field>
        <Field label="Website" required>
          <input value={draft.website} onChange={set('website')} type="url" className={inputCls} placeholder="https://..." />
        </Field>
      </div>

      <SectionTitle badge="Public">Business</SectionTitle>
      <Field label="Business Description" required>
        <textarea value={draft.businessDescription} onChange={set('businessDescription')} rows={3} className={textareaCls} placeholder="What does the company do?" />
      </Field>
      <Field label="Products & Services" required>
        <textarea value={draft.productsServices} onChange={set('productsServices')} rows={2} className={textareaCls} placeholder="Main products or services" />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Target Market" required>
          <textarea value={draft.targetMarket} onChange={set('targetMarket')} rows={2} className={textareaCls} placeholder="Who are the customers?" />
        </Field>
        <Field label="Business Model" required>
          <textarea value={draft.businessModel} onChange={set('businessModel')} rows={2} className={textareaCls} placeholder="How does it make money?" />
        </Field>
      </div>

      <SectionTitle badge="Public">Public Contact</SectionTitle>
      <p className="text-xs text-gray-500 m-0 -mt-2">
        Shown to interested buyers on your approved listing. Required fields must be complete before admin approval.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Contact Person" required>
          <input value={draft.publicContactPerson} onChange={set('publicContactPerson')} className={inputCls} placeholder="Name shown publicly" />
        </Field>
        <Field label="Public Email" required>
          <input
            value={draft.publicEmail}
            onChange={set('publicEmail')}
            type="email"
            className={inputCls}
            placeholder="contact@company.com"
            disabled={syncPublicContact}
            readOnly={syncPublicContact}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Public Phone" hint={syncPublicContact ? 'Synced from private contact above' : 'Optional — shown on your listing when filled'}>
            <input
              value={draft.publicPhoneNumber}
              onChange={set('publicPhoneNumber')}
              className={inputCls}
              placeholder="Optional"
              disabled={syncPublicContact}
              readOnly={syncPublicContact}
            />
          </Field>
        </div>
      </div>
      {typeof onSyncPublicContactChange === 'function' && (
        <FormCheckbox
          checked={syncPublicContact}
          onChange={(e) => onSyncPublicContactChange(e.target.checked)}
        >
          Use the same email and phone from my private listing contact (above) for these public fields
        </FormCheckbox>
      )}
        </>
      )}

      {showFinancials && (
        <>
      <SectionTitle badge="Optional Public">Revenue History</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Current Year Revenue (INR)">
          <input value={draft.currentYearRevenueInr} onChange={set('currentYearRevenueInr')} type="number" min="0" className={inputCls} />
        </Field>
        <Field label="Previous Year Revenue (INR)">
          <input value={draft.previousYearRevenueInr} onChange={set('previousYearRevenueInr')} type="number" min="0" className={inputCls} />
        </Field>
        <Field label="Two Years Ago Revenue (INR)">
          <input value={draft.twoYearsAgoRevenueInr} onChange={set('twoYearsAgoRevenueInr')} type="number" min="0" className={inputCls} />
        </Field>
      </div>

      <SectionTitle badge="Optional Public">Financials & Traction</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Profitability Status">
          <input value={draft.profitabilityStatus} onChange={set('profitabilityStatus')} className={inputCls} placeholder="e.g. Profitable, Break-even" />
        </Field>
        <Field label="Funding Raised">
          <input value={draft.fundingRaisedSummary} onChange={set('fundingRaisedSummary')} className={inputCls} placeholder="e.g. ₹50L seed (2024)" />
        </Field>
        <Field label="Valuation (INR)">
          <input value={draft.valuationInr} onChange={set('valuationInr')} type="number" min="0" className={inputCls} />
        </Field>
        <Field label="User Base">
          <input value={draft.userBase} onChange={set('userBase')} className={inputCls} placeholder="e.g. 10k MAU" />
        </Field>
      </div>
      <Field label="Growth Metrics">
        <textarea value={draft.growthMetrics} onChange={set('growthMetrics')} rows={2} className={textareaCls} placeholder="Growth rate, retention, etc." />
      </Field>
      <Field label="Market Reach">
        <textarea value={draft.marketReach} onChange={set('marketReach')} rows={2} className={textareaCls} placeholder="Geographies, channels, partnerships" />
      </Field>
        </>
      )}

      {showLegal && (
        <>
      <SectionTitle badge="Private">Legal (visible to you and CoɃrother only)</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Legal Entity Name">
          <input value={draft.legalEntityName} onChange={set('legalEntityName')} className={inputCls} />
        </Field>
        <Field label="Registration Number">
          <input value={draft.registrationNumber} onChange={set('registrationNumber')} className={inputCls} />
        </Field>
        <Field label="Incorporation Date">
          <input value={draft.incorporationDate} onChange={set('incorporationDate')} type="date" className={inputCls} />
        </Field>
        <Field label="Company Type">
          <select value={draft.companyType} onChange={set('companyType')} className={inputCls}>
            <option value="">Select type</option>
            {COMPANY_TYPES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
      </div>
        </>
      )}
    </div>
  );
}
