export function getRequestActionLabel(row, t) {
  const isHire = row?.requestType === 'hire';
  return isHire
    ? t('operationsHire', { defaultValue: 'Hire' })
    : t('operationsBookSlot', { defaultValue: 'Book Your Slot' });
}

export function getRequestStatusLabel(status, t) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PENDING') {
    return t('adminOperationsRequestStatusPending', { defaultValue: 'Pending' });
  }
  if (normalized === 'CONTACTED') {
    return t('adminOperationsRequestStatusContacted', { defaultValue: 'Contacted' });
  }
  if (normalized === 'CLOSED') {
    return t('adminOperationsRequestStatusClosed', { defaultValue: 'Closed' });
  }
  return status || '—';
}
