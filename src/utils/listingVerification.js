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
