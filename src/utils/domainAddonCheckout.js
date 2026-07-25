import { domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from './razorpayCheckout';

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
        try {
          const { data } = await verifyFn(orderId, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          resolve(data?.data ?? data);
        } catch (err) {
          reject(err);
        }
      },
      onFailure: (err) => reject(err),
      onDismiss: () => reject(new Error('Payment cancelled')),
    });
  });
}
