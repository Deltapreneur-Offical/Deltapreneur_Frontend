import { domainStorefrontAPI } from '../api/services';
import { openRazorpayCheckout } from './razorpayCheckout';

export async function payDomainRenewal({
  orderId,
  period = 1,
  user,
  description,
}) {
  const { data: payPayload } = await domainStorefrontAPI.renewDomainPaymentOrder(orderId, period);
  const payData = payPayload?.data ?? payPayload;

  return new Promise((resolve, reject) => {
    openRazorpayCheckout({
      orderData: payData,
      user,
      description: description || `Renew domain for ${period} year(s)`,
      onSuccess: async (response) => {
        try {
          const { data } = await domainStorefrontAPI.verifyRenewDomainPayment(orderId, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            period,
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

export async function fetchDomainRenewalQuote(orderId, period = 1) {
  const { data } = await domainStorefrontAPI.getRenewDomainQuote(orderId, period);
  return data?.data ?? data;
}
