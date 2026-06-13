/** Listed domain that still needs ownership verification before public marketplace visibility. */
export function isDomainPendingVerification(domain) {
  if (!domain || domain.verified) return false;
  const status = (domain.domainStatus ?? 'AVAILABLE').toString().toUpperCase();
  return status === 'AVAILABLE' || status === 'PENDING';
}

export function countDomainsPendingVerification(domains) {
  if (!Array.isArray(domains)) return 0;
  return domains.filter(isDomainPendingVerification).length;
}
