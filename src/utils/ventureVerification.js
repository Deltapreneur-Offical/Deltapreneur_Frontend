/** Optional venture listing verification helpers (documents + video, admin review). */

export function resolveVentureVerificationStatus(venture) {
  return venture?.verificationStatus ?? venture?.verification_status ?? 'NONE';
}

export function isVentureVerificationApproved(venture) {
  return resolveVentureVerificationStatus(venture) === 'APPROVED';
}

export function isVentureVerificationPendingReview(venture) {
  const requested = Boolean(
    venture?.verificationRequested ?? venture?.verification_requested,
  );
  const status = resolveVentureVerificationStatus(venture);
  return requested && status === 'PENDING';
}

export function canOpenVentureVerification(venture) {
  const status = resolveVentureVerificationStatus(venture);
  return status !== 'APPROVED';
}

export function resolveVentureListingMode(venture) {
  return venture?.listingMode ?? venture?.listing_mode ?? 'VENTURE';
}

export function filterVenturesForSection(ventures, section) {
  const mode = section === 'coventure' ? 'CO_VENTURE' : 'VENTURE';
  return (ventures || []).filter(
    (venture) => resolveVentureListingMode(venture) === mode,
  );
}

export function countVenturesPendingVerification(ventures) {
  return (ventures || []).filter(isVentureVerificationPendingReview).length;
}

export function ventureVerificationStatusLabel(venture) {
  const status = resolveVentureVerificationStatus(venture);
  if (status === 'APPROVED') return 'Verified';
  if (status === 'PENDING') return 'Pending review';
  if (status === 'REJECTED') return 'Rejected';
  return 'Not verified';
}
