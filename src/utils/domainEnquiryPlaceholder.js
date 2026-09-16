export const LISTING_PIPELINE_FULL_NAME = 'No buyer enquiry yet';
export const LISTING_PIPELINE_MESSAGE = 'Listed premium domain (Pending buyer enquiry)';

/** True when the admin row is a listed premium domain, not a buyer enquiry. */
export function isDomainEnquiryPlaceholder(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.isPlaceholder === true || item.isVirtual === true) return true;
  return (
    String(item.fullName ?? item.full_name ?? '').trim() === LISTING_PIPELINE_FULL_NAME
    && String(item.message ?? '').trim() === LISTING_PIPELINE_MESSAGE
  );
}
