export const DOMAIN_STATUSES = {
  ALL: 'ALL',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  APPROVED: 'APPROVED',
  TAKEN_DOWN: 'TAKEN_DOWN',
};

export const DOMAIN_STATUS_CONFIG = [
  { id: DOMAIN_STATUSES.ALL, label: 'All', color: 'indigo' },
  { id: DOMAIN_STATUSES.PENDING, label: 'Pending', color: 'amber' },
  { id: DOMAIN_STATUSES.VERIFIED, label: 'Verified', color: 'emerald' },
  { id: DOMAIN_STATUSES.APPROVED, label: 'Approved', color: 'blue' },
  { id: DOMAIN_STATUSES.TAKEN_DOWN, label: 'Taken Down', color: 'red' },
];

export const resolveDomainStatus = (domain) => {
  if (!domain) return DOMAIN_STATUSES.PENDING;
  
  if (domain.takenDown) {
    return DOMAIN_STATUSES.TAKEN_DOWN;
  }
  
  if (domain.forwarded) {
    return DOMAIN_STATUSES.APPROVED;
  }
  
  if (domain.verified || (domain.verificationStatus && String(domain.verificationStatus).toUpperCase() === 'VERIFIED')) {
    return DOMAIN_STATUSES.VERIFIED;
  }
  
  return DOMAIN_STATUSES.PENDING;
};
