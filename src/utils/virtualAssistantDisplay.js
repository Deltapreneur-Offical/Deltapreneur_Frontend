export function formatVaApplicationNumberDisplay(applicationNumber, applicationNumberDisplay) {
  if (applicationNumberDisplay) return applicationNumberDisplay;
  if (applicationNumber == null || applicationNumber === '') return null;
  return String(applicationNumber).padStart(2, '0');
}

export function formatVaReferenceNumber(referenceNumber) {
  if (!referenceNumber) return '—';
  return referenceNumber;
}

export function vaDisplayReference(item) {
  return item?.referenceNumber || item?.reference_number || '—';
}

export function vaDisplayApplicationNumber(item) {
  return (
    formatVaApplicationNumberDisplay(item?.applicationNumber, item?.applicationNumberDisplay) || '—'
  );
}

/** Resolve a VA profile photo URL from API payload fields (URL or storage key). */
export function resolveVaProfilePhotoUrl(source) {
  if (!source || typeof source !== 'object') return null;
  const direct =
    source.profilePhotoUrl
    || source.profile_photo_url
    || source.photoUrl
    || source.photo_url
    || null;
  if (direct) return direct;

  const key = source.profilePhotoKey || source.profile_photo_key;
  if (!key || typeof key !== 'string') return null;

  // Backend should always resolve keys; keep a safe relative fallback for legacy rows.
  const normalizedKey = key.replace(/^\/+/, '');
  if (normalizedKey.startsWith('http://') || normalizedKey.startsWith('https://')) {
    return normalizedKey;
  }
  return null;
}

/** True when the applicant has an uploaded profile photo (URL or storage key). */
export function hasVaProfilePhoto(source) {
  if (!source || typeof source !== 'object') return false;
  return Boolean(
    resolveVaProfilePhotoUrl(source)
    || source.profilePhotoKey
    || source.profile_photo_key
  );
}
