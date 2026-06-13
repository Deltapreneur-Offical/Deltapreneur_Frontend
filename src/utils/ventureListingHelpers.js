/** Venture listing mode and display helpers (unified marketplace). */

import { formatEquityOfferedPct } from '../constants/ventureLabels';

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

export function isFullAcquisitionListing(venture) {
  return resolveVentureListingMode(venture) === 'VENTURE'
    && resolveVentureDealType(venture) === 'FULL_ACQUISITION';
}

export function isEquitySaleListing(venture) {
  return resolveVentureListingMode(venture) === 'VENTURE'
    && resolveVentureDealType(venture) === 'EQUITY_SALE';
}

export function resolveAcquisitionFlow(venture) {
  return venture?.acquisitionFlow ?? venture?.acquisition_flow ?? null;
}

/** Whole INR rupees for stored venture asking prices (avoids float truncation in display). */
export function normalizeInrWholeAmount(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num);
}

/** Public asking price shown on cards and detail modals (whole INR rupees). */
export function resolvePublicAskingPrice(venture) {
  const brand = venture?.brandDetails || venture?.brand_details || {};
  return normalizeInrWholeAmount(brand.dealValue ?? brand.deal_value);
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
    return {
      price: null,
      equityLabel: formatEquityOfferedPct(equityRaw),
      dealTypeLabel: 'Partnership',
    };
  }
  if (isFullAcquisitionListing(venture)) {
    return {
      price,
      equityLabel: '100%',
      dealTypeLabel: 'Full Acquisition',
    };
  }
  if (isEquitySaleListing(venture)) {
    return {
      price,
      equityLabel: formatEquityOfferedPct(equityRaw),
      dealTypeLabel: 'Equity Sale',
    };
  }
  return {
    price,
    equityLabel: formatEquityOfferedPct(equityRaw),
    dealTypeLabel: '',
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
    ?? venture.pitchCount
    ?? 0;
}
