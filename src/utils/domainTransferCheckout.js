import { domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from './razorpayCheckout';

export async function fetchDomainTransferQuote(domain) {
  const { data } = await domainStorefrontAPI.getTransferQuote({ domain });
  return data?.data ?? data;
}

export async function payDomainTransfer({ domain, authCode, user, description }) {
  const { data: payPayload } = await domainStorefrontAPI.createTransferPaymentOrder({
    domain,
    authCode,
  });
  const payData = payPayload?.data ?? payPayload;

  return new Promise((resolve, reject) => {
    openRazorpayCheckout({
      orderData: payData,
      user,
      description: description || `Transfer ${domain}`,
      onSuccess: async (response) => {
        try {
          const { data } = await domainStorefrontAPI.verifyTransferPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            registrationOrderId: payData.registrationOrderId,
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
