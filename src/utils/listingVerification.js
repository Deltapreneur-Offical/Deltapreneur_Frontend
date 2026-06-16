/** Resolve technology listing verification state from backend fields only. */
export function resolveTechnologyVerificationStatus(item) {
  if (!item) return 'pending';
  return item.verified ? 'verified' : 'pending';
}

export function getTechnologyVerificationLabelKey(status) {
  if (status === 'verified') return 'listingCardVerified';
  return 'listingCardVerificationPending';
}

export function getTechnologyVerificationBadgeVariant(status) {
  return status === 'verified' ? 'verified' : 'pending';
}

/** GST trust badge only — optional display when gstin is verified. */
export function resolveVentureGstinStatus(item) {
  if (!item) return 'unverified';
  const verified = Boolean(item.gstinVerified ?? item.gstin_verified ?? item.verified);
  return verified ? 'verified' : 'unverified';
}

export function resolveVentureApprovalStatus(item) {
  const status = item?.listingApprovalStatus ?? item?.listing_approval_status;
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  return 'pending';
}
