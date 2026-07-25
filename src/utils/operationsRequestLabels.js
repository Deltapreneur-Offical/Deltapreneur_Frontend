function translate(t, key, defaultValue) {
  if (typeof t === 'function') {
    return t(key, { defaultValue });
  }
  return defaultValue;
}

/** Accepts a request row or a raw requestType string. */
export function getRequestActionLabel(rowOrType, t) {
  const requestType =
    typeof rowOrType === 'string'
      ? rowOrType
      : rowOrType?.requestType;
  const isHire = String(requestType || '').toLowerCase() === 'hire';
  return isHire
    ? translate(t, 'operationsHire', 'Hire')
    : translate(t, 'operationsBookSlot', 'Book Your Slot');
}

export function getRequestStatusLabel(status, t) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PENDING') {
    return translate(t, 'adminOperationsRequestStatusPending', 'Pending');
  }
  if (normalized === 'CONTACTED') {
    return translate(t, 'adminOperationsRequestStatusContacted', 'Contacted');
  }
  if (normalized === 'CLOSED') {
    return translate(t, 'adminOperationsRequestStatusClosed', 'Closed');
  }
  return status || '—';
}
