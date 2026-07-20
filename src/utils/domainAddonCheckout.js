import { domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from './razorpayCheckout';

export async function payEmailAddon({
  orderId,
  mailbox,
  user,
  description,
}) {
  const { data: payPayload } = await domainStorefrontAPI.createEmailAddonPayment(orderId, { mailbox });
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
  certType,
  duration,
  user,
  description,
}) {
  const { data: payPayload } = await domainStorefrontAPI.createSslAddonPayment(orderId, {
    certType,
    duration,
  });
  const payData = payPayload?.data ?? payPayload;
  return completeAddonPayment({
    orderId,
    payData,
    user,
    description: description || 'SSL certificate addon',
    verifyFn: domainStorefrontAPI.verifySslAddonPayment,
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
