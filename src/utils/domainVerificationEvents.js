export const DOMAIN_VERIFICATION_CHANGED = 'cobrother:domain-verification-changed';

export function notifyDomainVerificationChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DOMAIN_VERIFICATION_CHANGED));
  }
}
