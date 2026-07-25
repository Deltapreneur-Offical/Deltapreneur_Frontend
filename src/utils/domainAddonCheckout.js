import { domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from './razorpayCheckout';
import { readApiError } from './apiError';

export const ADDON_PROVISION_RETRY = 'ADDON_PROVISION_RETRY';

function paymentFromRazorpayResponse(response) {
  return {
    razorpayOrderId: response?.razorpay_order_id || response?.razorpayOrderId || '',
    razorpayPaymentId: response?.razorpay_payment_id || response?.razorpayPaymentId || '',
    razorpaySignature: response?.razorpay_signature || response?.razorpaySignature || '',
  };
}

export function getAddonRetryPayment(err) {
  const payment = err?.addonRetryPayment || err?.payment;
  if (
    payment?.razorpayOrderId
    && payment?.razorpayPaymentId
    && payment?.razorpaySignature
  ) {
    return payment;
  }
  return null;
}

export function isAddonProvisionRetryError(err) {
  if (err?.code === ADDON_PROVISION_RETRY || err?.addonProvisionRetry) return true;
  if (getAddonRetryPayment(err)) return true;
  const status = err?.response?.status;
  if (status === 409) return true;
  const msg = String(readApiError(err, '') || '').toLowerCase();
  return msg.includes('still being provisioned') || msg.includes('retry the previous');
}

export function addonRetryUserMessage(err, fallback) {
  const base = readApiError(
    err,
    fallback || 'Payment received, but activation did not finish. You can retry without paying again.',
  );
  if (isAddonProvisionRetryError(err)) {
    return `${base} Your payment was recorded — use Retry activation (no second charge).`;
  }
  return base;
}

/** Re-call verify with stored Razorpay ids (no new Razorpay order / no double charge). */
export async function retryAddonProvision({ orderId, payment, verifyFn }) {
  if (!orderId || !payment || typeof verifyFn !== 'function') {
    throw new Error('Missing payment details for retry.');
  }
  const { data } = await verifyFn(orderId, {
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
    razorpaySignature: payment.razorpaySignature,
  });
  return data?.data ?? data;
}

function completeAddonPayment({
  orderId,
  payData,
  user,
  description,
  verifyFn,
}) {
  return new Promise((resolve, reject) => {
    openRazorpayCheckout({
      orderData: payData,
      user,
      description,
      onSuccess: async (response) => {
        const payment = paymentFromRazorpayResponse(response);
        try {
          const { data } = await verifyFn(orderId, payment);
          resolve(data?.data ?? data);
        } catch (err) {
          const wrapped = err instanceof Error ? err : new Error(String(err));
          wrapped.addonProvisionRetry = true;
          wrapped.code = ADDON_PROVISION_RETRY;
          wrapped.addonRetryPayment = payment;
          wrapped.response = err?.response;
          wrapped.message = readApiError(
            err,
            'Payment succeeded but provisioning failed. Retry activation without paying again.',
          );
          reject(wrapped);
        }
      },
      onFailure: (err) => reject(err),
      onDismiss: () => reject(new Error('Payment cancelled')),
    });
  });
}

export async function payEmailAddon({
  orderId,
  mailbox,
  user,
  description,
}) {
  // Accept string prefix, full address, or { email, size, duration } from forms.
  let mailboxBody = mailbox;
  if (typeof mailbox === 'string') {
    mailboxBody = { email: mailbox.trim() };
  } else if (mailbox && typeof mailbox === 'object') {
    mailboxBody = {
      email: String(mailbox.email || mailbox.mailbox || mailbox.prefix || '').trim(),
      size: mailbox.size,
      duration: mailbox.duration,
    };
  }
  const { data: payPayload } = await domainStorefrontAPI.createEmailAddonPayment(orderId, {
    mailbox: mailboxBody,
  });
  const payData = payPayload?.data ?? payPayload;
  return completeAddonPayment({
    orderId,
    payData,
    user,
    description: description || 'Professional email addon',
    verifyFn: domainStorefrontAPI.verifyEmailAddonPayment,
  });
}

export async function paySslAddon({
  orderId,
  productId,
  period,
  duration,
  certType,
  approverEmail,
  validationMethod,
  user,
  description,
}) {
  const body = {
    productId,
    period: period ?? duration ?? 1,
    approverEmail,
  };
  if (validationMethod) body.validationMethod = validationMethod;
  if (certType) body.certType = certType;
  const { data: payPayload } = await domainStorefrontAPI.createSslAddonPayment(orderId, body);
  const payData = payPayload?.data ?? payPayload;
  return completeAddonPayment({
    orderId,
    payData,
    user,
    description: description || 'SSL certificate addon',
    verifyFn: domainStorefrontAPI.verifySslAddonPayment,
  });
}

export async function payRestoreAddon({ orderId, user, description }) {
  const { data: payPayload } = await domainStorefrontAPI.createRestoreAddonPayment(orderId, {});
  const payData = payPayload?.data ?? payPayload;
  return completeAddonPayment({
    orderId,
    payData,
    user,
    description: description || 'Domain restore',
    verifyFn: domainStorefrontAPI.verifyRestoreAddonPayment,
  });
}

export async function payEasydmarcAddon({ orderId, user, description }) {
  const { data: payPayload } = await domainStorefrontAPI.createEasydmarcAddonPayment(orderId, {});
  const payData = payPayload?.data ?? payPayload;
  return completeAddonPayment({
    orderId,
    payData,
    user,
    description: description || 'EasyDMARC',
    verifyFn: domainStorefrontAPI.verifyEasydmarcAddonPayment,
  });
}

export async function paySpamexpertsAddon({ orderId, destinationHost, user, description }) {
  const { data: payPayload } = await domainStorefrontAPI.createSpamexpertsAddonPayment(orderId, {
    destinationHost: destinationHost || undefined,
  });
  const payData = payPayload?.data ?? payPayload;
  return completeAddonPayment({
    orderId,
    payData,
    user,
    description: description || 'SpamExperts filter',
    verifyFn: domainStorefrontAPI.verifySpamexpertsAddonPayment,
  });
}
