/** Helpers for domain registration storefront orders (new-domain purchases). */

export { readApiError } from './apiError';

export function registrationStatusBadgeClass(status, lifecycleStatus) {
  const life = (lifecycleStatus || '').toLowerCase();
  if (life === 'registration_confirmed' || (status || '').toUpperCase() === 'ACTIVE') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (
    life === 'payment_success' ||
    life === 'registration_pending' ||
    ['CREATED', 'PAYMENT_COMPLETED', 'REGISTRATION_PENDING'].includes((status || '').toUpperCase())
  ) {
    return 'bg-amber-100 text-amber-800';
  }
  if (life === 'registration_failed' || (status || '').toUpperCase().includes('FAIL')) {
    return 'bg-red-100 text-red-700';
  }
  if (life === 'refunded') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-700';
}

export function registrationStatusLabel(status, lifecycleStatus, t) {
  const life = lifecycleStatus || '';
  if (life === 'registration_confirmed') return t('storefrontStatusConfirmed', { defaultValue: 'Storefront Status Confirmed' });
  if (life === 'registration_pending') return t('storefrontStatusPending', { defaultValue: 'Storefront Status Pending' });
  if (life === 'payment_success') return t('storefrontStatusPaid', { defaultValue: 'Storefront Status Paid' });
  if (life === 'registration_failed') return t('storefrontStatusFailed', { defaultValue: 'Storefront Status Failed' });
  if (life === 'refunded') return t('regOrderRefunded', { defaultValue: 'Refunded' });
  if (life === 'awaiting_payment') return t('regOrderAwaitingPayment', { defaultValue: 'Awaiting payment' });
  return status || life;
}

/** Orders that count as a purchase (paid or post-payment lifecycle). */
export function isRegistrationPurchase(order) {
  if (!order) return false;
  const s = (order.status || '').toUpperCase();
  if (s === 'CREATED' || s === 'EXPIRED') return false;
  if (order.razorpayPaymentId || order.razorpay_payment_id) return true;
  return [
    'PAYMENT_COMPLETED',
    'REGISTRATION_PENDING',
    'ACTIVE',
    'PROVISION_FAILED',
    'FAILED',
    'REFUNDED',
  ].includes(s);
}

export function registrationOrderDetailPath(orderId) {
  return `/storefront/orders/${orderId}`;
}
