const MAX_BID_ACTIVE_RATIO = 1.5;
const MIN_BID_UNIT_INCREMENT = 1;

export function toBidNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function roundMoney(value) {
  return Math.round(toBidNumber(value) * 100) / 100;
}

export function activeBidReference(currentHighestBid, minBidPrice) {
  const current = toBidNumber(currentHighestBid);
  const minimum = toBidNumber(minBidPrice);
  return current > 0 ? current : minimum;
}

export function computeBidLimits(currentHighestBid, minBidPrice) {
  const reference = activeBidReference(currentHighestBid, minBidPrice);
  if (reference <= 0) {
    return { activeBidReference: 0, minNextBid: 0, maxBidPrice: 0 };
  }
  return {
    activeBidReference: reference,
    minNextBid: roundMoney(reference + MIN_BID_UNIT_INCREMENT),
    maxBidPrice: roundMoney(reference * MAX_BID_ACTIVE_RATIO),
  };
}

/** Merge API-provided limits with computed fallbacks. */
export function resolveAuctionBidLimits({
  currentHighestBid,
  minBidPrice,
  minNextBid,
  maxBidPrice,
}) {
  const computed = computeBidLimits(currentHighestBid, minBidPrice);
  return {
    activeBidReference: computed.activeBidReference,
    minNextBid: toBidNumber(minNextBid, computed.minNextBid) || computed.minNextBid,
    maxBidPrice: toBidNumber(maxBidPrice, computed.maxBidPrice) || computed.maxBidPrice,
  };
}

export function validateBidAmount(amount, limits) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return 'Enter a valid bid amount.';
  }
  if (limits.minNextBid > 0 && value < limits.minNextBid) {
    return `Minimum bid is ₹${Number(limits.minNextBid).toLocaleString('en-IN')}.`;
  }
  if (limits.maxBidPrice > 0 && value > limits.maxBidPrice) {
    return `Bid cannot exceed ₹${Number(limits.maxBidPrice).toLocaleString('en-IN')} (150% of the current active bid).`;
  }
  return null;
}

export function formatBidRangeLabel(limits) {
  if (!limits?.minNextBid || !limits?.maxBidPrice) return '';
  return `₹${Number(limits.minNextBid).toLocaleString('en-IN')} – ₹${Number(limits.maxBidPrice).toLocaleString('en-IN')}`;
}
