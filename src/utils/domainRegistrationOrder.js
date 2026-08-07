/** Helpers for domain registration storefront orders (new-domain purchases). */

export { readApiError } from './apiError';

export function registrationStatusBadgeClass(status, lifecycleStatus, message) {
  const life = (lifecycleStatus || '').toLowerCase();
  const s = (status || '').toUpperCase();
  const msg = String(message || '').toLowerCase();
  const isCancelledMessage = msg.includes('checkout cancelled before payment') || msg.includes('pending registration order expired');
  if (life === 'registration_confirmed' || s === 'ACTIVE') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (life === 'checkout_cancelled' || s === 'EXPIRED' || (s === 'CREATED' && isCancelledMessage)) return 'bg-gray-100 text-gray-700';
  if (
    life === 'payment_success' ||
    life === 'registration_pending' ||
    ['CREATED', 'PAYMENT_COMPLETED', 'REGISTRATION_PENDING'].includes(s)
  ) {
    return 'bg-amber-100 text-amber-800';
  }
  if (life === 'registration_failed' || (status || '').toUpperCase().includes('FAIL')) {
    return 'bg-red-100 text-red-700';
  }
  if (life === 'refunded') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-700';
}

export function registrationStatusLabel(status, lifecycleStatus, t, message) {
  const life = lifecycleStatus || '';
  const s = (status || '').toUpperCase();
  const msg = String(message || '').toLowerCase();
  const isCancelledMessage = msg.includes('checkout cancelled before payment') || msg.includes('pending registration order expired');
  if (life === 'checkout_cancelled' || s === 'EXPIRED' || (s === 'CREATED' && isCancelledMessage)) return t('regOrderCheckoutCancelled', { defaultValue: 'Checkout cancelled — no payment was debited' });
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
  if (s === 'EXPIRED') return true;
  if (order.razorpayPaymentId || order.razorpay_payment_id) return true;
  return [
    'CREATED',
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
