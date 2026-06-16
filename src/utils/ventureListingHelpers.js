/** Venture listing mode and display helpers (unified marketplace). */

import { normalizeEquityPercent, formatEquityOfferedPct } from '../constants/ventureLabels';
import { roundInr } from './money';

export function resolveVentureListingMode(venture) {
  if (!venture) return 'VENTURE';
  return venture.listingMode ?? venture.listing_mode ?? 'VENTURE';
}

export function isCoVentureListing(venture) {
  return resolveVentureListingMode(venture) === 'CO_VENTURE';
}

export function resolveVentureApprovalStatus(venture) {
  const status = venture?.listingApprovalStatus ?? venture?.listing_approval_status;
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  return 'pending';
}

export function isVentureGstinVerified(venture) {
  return Boolean(venture?.gstinVerified ?? venture?.gstin_verified ?? venture?.verified);
}

export function resolveVentureDealType(venture) {
  return venture?.dealType ?? venture?.deal_type ?? null;
}

/** Numeric ownership liquidation % for validation and input limits. */
export function resolveOwnershipLiquidationPercent(venture) {
  const raw = venture?.ownershipLiquidationPercent
    ?? venture?.ownership_liquidation_percent
    ?? venture?.equityPercentOffered
    ?? venture?.equity_percent_offered;
  if (raw == null || raw === '') return null;
  return normalizeEquityPercent(raw);
}

/** Display label for ownership liquidation % (includes trailing %). */
export function formatOwnershipLiquidationPercent(venture) {
  const value = resolveOwnershipLiquidationPercent(venture);
  if (value == null) return '';
  return formatEquityOfferedPct(value);
}

export function isLegacyFullAcquisitionListing(venture) {
  return resolveVentureListingMode(venture) === 'VENTURE'
    && resolveVentureDealType(venture) === 'FULL_ACQUISITION';
}

export function isLegacyEquitySaleListing(venture) {
  return resolveVentureListingMode(venture) === 'VENTURE'
    && resolveVentureDealType(venture) === 'EQUITY_SALE';
}

export function isVentureBidListing(venture) {
  return resolveVentureListingMode(venture) === 'VENTURE';
}

export function isFullAcquisitionListing(venture) {
  return isLegacyFullAcquisitionListing(venture);
}

export function isEquitySaleListing(venture) {
  return isLegacyEquitySaleListing(venture);
}

export function resolveAcquisitionFlow(venture) {
  return venture?.acquisitionFlow ?? venture?.acquisition_flow ?? null;
}

/** Whole INR rupees for stored venture asking prices. */
export function normalizeInrWholeAmount(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return roundInr(num);
}

/** Co-venture investment seeking from role rows (whole INR rupees; 0 is valid). */
export function resolveCoVentureInvestmentSeeking(venture) {
  const topLevel = venture?.investmentSeeking ?? venture?.investment_seeking;
  if (topLevel !== '' && topLevel != null) {
    const num = Number(topLevel);
    if (Number.isFinite(num) && num >= 0) return roundInr(num);
  }

  const roles = Array.isArray(venture?.roles) ? venture.roles : [];
  for (const role of roles) {
    const raw = role.investmentSeeking
      ?? role.investment_seeking
      ?? role.investmentMin
      ?? role.investment_min
      ?? role.investmentMax
      ?? role.investment_max;
    if (raw === '' || raw == null) continue;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) continue;
    return roundInr(num);
  }

  const brand = venture?.brandDetails || venture?.brand_details || {};
  const fromSeller = normalizeInrWholeAmount(brand.sellerDealValue ?? brand.seller_deal_value);
  if (fromSeller != null) return fromSeller;
  const fromDeal = normalizeInrWholeAmount(brand.dealValue ?? brand.deal_value);
  if (fromDeal != null) return fromDeal;

  const cp = venture?.companyProfile || venture?.company_profile || {};
  const valuation = cp.valuationInr ?? cp.valuation_inr;
  if (valuation !== '' && valuation != null) {
    const valNum = Number(valuation);
    if (Number.isFinite(valNum) && valNum >= 0) return roundInr(valNum);
  }

  return null;
}

/** Public asking price shown on cards and detail modals (whole INR rupees). */
export function resolvePublicAskingPrice(venture) {
  if (isCoVentureListing(venture)) {
    const investment = resolveCoVentureInvestmentSeeking(venture);
    if (investment != null) return investment;
  }

  const brand = venture?.brandDetails || venture?.brand_details || {};
  const fromDeal = normalizeInrWholeAmount(brand.dealValue ?? brand.deal_value);
  if (fromDeal != null) return fromDeal;

  if (isCoVentureListing(venture)) {
    const fromSeller = normalizeInrWholeAmount(brand.sellerDealValue ?? brand.seller_deal_value);
    if (fromSeller != null) return fromSeller;
  }

  return null;
}

/**
 * INR amount the lister originally entered — for edit forms (whole rupees).
 * Co-venture updates store lister input in seller_deal_value; creates use deal_value.
 */
export function resolveEditableListingAmount(brand, isCoVenture = false) {
  if (!brand) return '';
  const dealRaw = brand.dealValue ?? brand.deal_value;
  const sellerRaw = brand.sellerDealValue ?? brand.seller_deal_value;
  const dealNum = dealRaw != null && dealRaw !== '' ? Number(dealRaw) : null;
  const sellerNum = sellerRaw != null && sellerRaw !== '' ? Number(sellerRaw) : null;

  if (dealNum == null && sellerNum == null) return '';
  if (dealNum == null || !Number.isFinite(dealNum)) {
    return Number.isFinite(sellerNum) ? String(roundInr(sellerNum)) : '';
  }
  if (sellerNum == null || !Number.isFinite(sellerNum)) {
    return String(roundInr(dealNum));
  }

  if (isCoVenture && sellerNum > 0 && dealNum / sellerNum > 1.05) {
    return String(roundInr(sellerNum));
  }
  return String(roundInr(dealNum));
}

/** Co-venture role investment seeking amount for edit forms (whole INR rupees as string). */
export function resolveRoleInvestmentSeeking(role, venture = null) {
  const fromRole = (() => {
    if (!role) return '';
    const raw = role.investmentSeeking
      ?? role.investment_seeking
      ?? role.investmentMin
      ?? role.investment_min
      ?? role.investmentMax
      ?? role.investment_max;
    if (raw === '' || raw == null) return '';
    const num = Number(raw);
    if (!Number.isFinite(num)) return '';
    return String(roundInr(num));
  })();
  if (fromRole !== '') return fromRole;

  const topLevel = venture?.investmentSeeking ?? venture?.investment_seeking;
  if (topLevel !== '' && topLevel != null) {
    const num = Number(topLevel);
    if (Number.isFinite(num) && num >= 0) return String(roundInr(num));
  }

  const cp = venture?.companyProfile || venture?.company_profile || {};
  const valuation = cp.valuationInr ?? cp.valuation_inr;
  if (valuation !== '' && valuation != null) {
    const num = Number(valuation);
    if (Number.isFinite(num) && num >= 0) return String(roundInr(num));
  }

  return '';
}

/** Co-venture role equity offer for edit forms. */
export function resolveRoleEquityOffer(role, venture = null) {
  const raw = role?.equityOffer
    ?? role?.equity_offer
    ?? role?.equityMin
    ?? role?.equity_min
    ?? role?.equityMax
    ?? role?.equity_max
    ?? venture?.equityPercentOffered
    ?? venture?.equity_percent_offered;
  if (raw === '' || raw == null) return '';
  const normalized = normalizeEquityPercent(raw);
  return normalized == null ? '' : String(normalized);
}

/** Format co-venture investment seeking for cards (0 is valid). */
export function formatCoVentureInvestmentDisplay(inrAmount, formatPrice) {
  if (inrAmount == null) return '';
  const num = Number(inrAmount);
  if (!Number.isFinite(num) || num < 0) return '';
  return formatPrice(roundInr(num));
}

/** Format venture asking price — always rounds to whole rupees before FX display. */
export function formatVentureAskingPrice(inrAmount, formatPrice) {
  const whole = normalizeInrWholeAmount(inrAmount);
  if (whole == null) return '';
  return formatPrice(whole);
}

/** Format seller asking price + equity for cards and modals. */
export function resolveSellerAskSummary(venture) {
  if (!venture) return { price: null, equityLabel: '', dealTypeLabel: '' };
  const price = resolvePublicAskingPrice(venture);
  const equityRaw = venture.equityPercentOffered ?? venture.equity_percent_offered;

  if (isCoVentureListing(venture)) {
    const investment = resolveCoVentureInvestmentSeeking(venture);
    return {
      price: investment,
      equityLabel: formatEquityOfferedPct(equityRaw),
      dealTypeLabel: investment != null ? 'Investment Seeking' : 'Partnership',
    };
  }
  if (isLegacyFullAcquisitionListing(venture)) {
    return {
      price,
      equityLabel: '100%',
      dealTypeLabel: 'Full Acquisition',
    };
  }
  if (isLegacyEquitySaleListing(venture)) {
    return {
      price,
      equityLabel: formatEquityOfferedPct(equityRaw),
      dealTypeLabel: 'Equity Sale',
    };
  }
  return {
    price,
    equityLabel: formatOwnershipLiquidationPercent(venture),
    dealTypeLabel: 'Ownership Liquidation',
  };
}

/** Interest count label for marketplace cards/detail (pitches vs partnership apps). */
export function resolveVentureInterestCount(venture) {
  if (!venture) return 0;
  if (isCoVentureListing(venture)) {
    return venture.coVentureApplicationCount ?? venture.co_venture_application_count ?? 0;
  }
  return venture.pitchApplicationCount
    ?? venture.pitch_application_count
    ?? venture.bidCount
    ?? venture.bid_count
    ?? venture.pitchCount
    ?? 0;
}
