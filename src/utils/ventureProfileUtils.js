import { EMPTY_COMPANY_PROFILE } from '../components/venture/CompanyProfileSections';
import { normalizeEquityPercent } from '../constants/ventureLabels';
import { isCoVentureListing, resolveEditableListingAmount } from './ventureListingHelpers';

const NUMERIC_PROFILE_FIELDS = [
  'currentYearRevenueInr',
  'previousYearRevenueInr',
  'twoYearsAgoRevenueInr',
  'valuationInr',
  'teamSize',
];

const normalizeIndustry = (value) => String(value ?? '').replace(/_/g, ' ').trim();

/** Normalize API brand details (camelCase or snake_case) into form shape. */
export function normalizeBrandDetails(brand, ventureOrMode = null) {
  const raw = brand || {};
  const isCoVenture = typeof ventureOrMode === 'boolean'
    ? ventureOrMode
    : isCoVentureListing(ventureOrMode);
  const dealValue = resolveEditableListingAmount(raw, isCoVenture);

  return {
    brandName: raw.brandName ?? raw.brand_name ?? '',
    description: raw.description ?? '',
    website: raw.website ?? '',
    videoUrl: raw.videoUrl ?? raw.video_url ?? '',
    industry: raw.industry ?? '',
    dealValue,
    referenceImageUrl: raw.referenceImageUrl ?? raw.reference_image_url ?? '',
    ventureType: raw.ventureType ?? raw.venture_type ?? '',
    ventureImageUrl: raw.ventureImageUrl ?? raw.venture_image_url ?? '',
  };
}

/** Normalize API company profile (camelCase or snake_case) into form shape. */
export function normalizeCompanyProfile(profile) {
  if (!profile) return null;
  return {
    ...EMPTY_COMPANY_PROFILE,
    ...profile,
    companyName: profile.companyName ?? profile.company_name ?? '',
    legalEntityName: profile.legalEntityName ?? profile.legal_entity_name ?? '',
    registrationNumber: profile.registrationNumber ?? profile.registration_number ?? '',
    incorporationDate: profile.incorporationDate ?? profile.incorporation_date ?? '',
    companyType: profile.companyType ?? profile.company_type ?? '',
    industry: profile.industry ?? '',
    website: profile.website ?? '',
    businessDescription: profile.businessDescription ?? profile.business_description ?? '',
    productsServices: profile.productsServices ?? profile.products_services ?? '',
    targetMarket: profile.targetMarket ?? profile.target_market ?? '',
    businessModel: profile.businessModel ?? profile.business_model ?? '',
    currentYearRevenueInr: profile.currentYearRevenueInr ?? profile.current_year_revenue_inr ?? profile.annualRevenueInr ?? profile.annual_revenue_inr ?? '',
    previousYearRevenueInr: profile.previousYearRevenueInr ?? profile.previous_year_revenue_inr ?? '',
    twoYearsAgoRevenueInr: profile.twoYearsAgoRevenueInr ?? profile.two_years_ago_revenue_inr ?? '',
    profitabilityStatus: profile.profitabilityStatus ?? profile.profitability_status ?? '',
    fundingRaisedSummary: profile.fundingRaisedSummary ?? profile.funding_raised_summary ?? '',
    valuationInr: profile.valuationInr ?? profile.valuation_inr ?? '',
    founderName: profile.founderName ?? profile.founder_name ?? '',
    teamSize: profile.teamSize ?? profile.team_size ?? '',
    keyTeamMembers: profile.keyTeamMembers ?? profile.key_team_members ?? '',
    teamMembers: profile.teamMembers ?? profile.team_members ?? [],
    userBase: profile.userBase ?? profile.user_base ?? '',
    growthMetrics: profile.growthMetrics ?? profile.growth_metrics ?? '',
    marketReach: profile.marketReach ?? profile.market_reach ?? '',
    publicContactPerson: profile.publicContactPerson ?? profile.public_contact_person ?? '',
    publicEmail: profile.publicEmail ?? profile.public_email ?? '',
    publicPhoneNumber: profile.publicPhoneNumber ?? profile.public_phone_number ?? '',
  };
}

export function normalizeContactInfo(contactInfo, fallback) {
  const ci = contactInfo || fallback || {};
  return {
    email: ci.email ?? '',
    phoneNumber: ci.phoneNumber ?? ci.phone_number ?? '',
  };
}

/** Copy private listing contact into public company profile fields. */
export function applyPrivateContactToProfile(companyProfile, contactInfo) {
  const contact = normalizeContactInfo(contactInfo);
  return {
    ...(companyProfile || EMPTY_COMPANY_PROFILE),
    publicEmail: contact.email || '',
    publicPhoneNumber: contact.phoneNumber || '',
  };
}

export function contactsAreSynced(companyProfile, contactInfo) {
  const contact = normalizeContactInfo(contactInfo);
  const profile = normalizeCompanyProfile(companyProfile) || EMPTY_COMPANY_PROFILE;
  return (
    String(profile.publicEmail || '').trim() === String(contact.email || '').trim()
    && String(profile.publicPhoneNumber || '').trim() === String(contact.phoneNumber || '').trim()
  );
}

/** Convert empty strings on numeric company profile fields to null for API payloads. */
export function sanitizeCompanyProfileForApi(profile) {
  if (!profile) return null;

  const out = { ...profile };
  for (const key of NUMERIC_PROFILE_FIELDS) {
    const raw = out[key];
    if (raw === '' || raw == null) {
      out[key] = null;
      continue;
    }
    const num = Number(raw);
    out[key] = Number.isNaN(num) ? null : num;
  }
  if (Array.isArray(out.teamMembers)) {
    out.teamMembers = out.teamMembers
      .filter((member) => String(member?.name || '').trim() && String(member?.role || '').trim())
      .map((member) => ({
        name: String(member.name).trim(),
        role: String(member.role).trim(),
        equityPercent: Number(member.equityPercent ?? member.equity_percent),
        linkedinUrl: String((member.linkedinUrl ?? member.linkedin_url) || '').trim() || null,
      }))
      .filter((member) => Number.isFinite(member.equityPercent) && member.equityPercent > 0);
  }
  if (out.currentYearRevenueInr != null) {
    out.annualRevenueInr = out.currentYearRevenueInr;
  }
  return out;
}

/**
 * Keep company profile fields in sync with brand details while the user is still
 * editing the listing form. Updates a profile field when it is empty or still
 * mirrors the previous brand value (not manually overridden).
 */
export function syncBrandToProfile(brandDetails, companyProfile, previousBrandDetails) {
  const brand = brandDetails || {};
  const prev = previousBrandDetails || {};
  const next = { ...EMPTY_COMPANY_PROFILE, ...(companyProfile || {}) };

  const maybeSync = (brandKey, profileKey, transform = (v) => String(v ?? '').trim()) => {
    const brandVal = transform(brand[brandKey]);
    if (!brandVal) return;
    const prevBrandVal = transform(prev[brandKey]);
    const profileVal = String(next[profileKey] ?? '').trim();
    if (!profileVal || profileVal === prevBrandVal) {
      next[profileKey] = brandVal;
    }
  };

  maybeSync('brandName', 'companyName');
  maybeSync('industry', 'industry', normalizeIndustry);
  maybeSync('website', 'website');
  maybeSync('description', 'businessDescription');

  return next;
}

/** Prefill empty company profile fields from venture brand details. */
export function buildCompanyProfileFromBrand(form) {
  const brand = form?.brandDetails || form?.brand_details || {};
  const existing = form?.companyProfile || form?.company_profile || {};
  return syncBrandToProfile(brand, existing, {});
}

/** Resolve contact info for detail views — public fields for visitors, full for owners. */
export function resolveVenturePublicContact(venture, isOwner = false) {
  const cp = venture?.companyProfile || venture?.company_profile || {};
  const ci = venture?.contactInfo || venture?.contact_info || {};

  const publicEmail = cp.publicEmail ?? cp.public_email ?? '';
  const publicPhone = cp.publicPhoneNumber ?? cp.public_phone_number ?? '';
  const publicContactPerson = cp.publicContactPerson ?? cp.public_contact_person ?? '';

  if (isOwner) {
    return {
      email: ci.email || publicEmail,
      phone: ci.phoneNumber ?? ci.phone_number ?? publicPhone,
      contactPerson: publicContactPerson,
    };
  }

  return {
    email: publicEmail,
    phone: publicPhone,
    contactPerson: publicContactPerson,
  };
}

/** Whether a venture's company profile is complete (client-side mirror of backend flag). */
export function isVentureProfileComplete(venture) {
  if (!venture) return false;
  if (typeof venture.companyProfileComplete === 'boolean') {
    return venture.companyProfileComplete;
  }
  const cp = venture.companyProfile || venture.company_profile;
  if (typeof cp?.isComplete === 'boolean') return cp.isComplete;
  if (typeof cp?.is_complete === 'boolean') return cp.is_complete;
  return false;
}

/** Build a venture create/update payload that matches backend request schemas. */
export function buildVentureSubmitPayload(form, {
  isCoVenture,
  sanitizedProfile,
  toStoredInr,
}) {
  const imageUrl = (
    form.brandDetails?.ventureImageUrl
    || form.brandDetails?.referenceImageUrl
    || ''
  ).trim() || null;

  const brandDetails = {
    brandName: form.brandDetails?.brandName?.trim() || undefined,
    description: form.brandDetails?.description?.trim() || null,
    website: form.brandDetails?.website?.trim() || null,
    videoUrl: form.brandDetails?.videoUrl?.trim() || null,
    industry: form.brandDetails?.industry || null,
    ventureType: null,
    dealValue:
      form.brandDetails?.dealValue !== ''
        ? toStoredInr(form.brandDetails.dealValue)
        : null,
  };
  if (imageUrl) {
    brandDetails.ventureImageUrl = imageUrl;
  }

  const resolveStoredInvestment = (raw) => {
    if (raw === '' || raw == null) return 0;
    const stored = toStoredInr(raw);
    if (stored != null) return stored;
    const num = Number(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  const payload = {
    listingMode: isCoVenture ? 'CO_VENTURE' : 'VENTURE',
    brandDetails,
    contactInfo: {
      email: form.contactInfo?.email?.trim() || null,
      phoneNumber: form.contactInfo?.phoneNumber?.trim() || null,
    },
    agreement: { terms: Boolean(form.agreement?.terms) },
    status: form.status,
    stage: form.stage || null,
    currentProblem: form.currentProblem?.trim() || null,
    lookingFor: form.lookingFor?.trim() || null,
    saleType: 'REGULAR',
    equityPercentOffered: !isCoVenture
      ? normalizeEquityPercent(parseFloat(form.ownershipLiquidationPercent))
      : normalizeEquityPercent(parseFloat(form.equityOffer)),
    companyProfile: sanitizedProfile,
    verificationRequested: Boolean(form.verificationRequested),
    verificationVideoUrl: form.verificationVideoUrl?.trim() || null,
    roles: isCoVenture
      ? [{
        title: form.roleOffer?.trim(),
        equityOffer: Number(form.equityOffer),
        investmentSeeking: resolveStoredInvestment(form.investmentSeeking),
        type: 'CO_FOUNDER',
      }]
      : [],
  };

  if (!isCoVenture) {
    payload.dealType = null;
    payload.acquisitionFlow = 'SELLER_SELECTS';
  }

  if (form.auctionMinBidPrice !== '' && form.auctionMinBidPrice != null) {
    payload.auctionMinBidPrice = Number(form.auctionMinBidPrice);
  }
  if (form.auctionDuration) {
    payload.auctionDuration = form.auctionDuration;
  }

  return payload;
}
