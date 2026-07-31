import api from '../api/axios';
import { openRazorpayCheckout } from './razorpayCheckout';
import { computeCurrencyCommission } from './money';

export async function fetchListingFeesAndCharges() {
  const { data } = await api.get('/api/v1/auction-fees/listing-fees-and-charges');
  return data?.data ?? data;
}

export function payAuctionCreationFee({
  auctionType,
  user,
  referenceId = null,
  description = 'Auction creation fee',
}) {
  return new Promise((resolve, reject) => {
    api.post('/api/v1/auction-fees/creation/create-order', {
      auctionType,
      referenceId,
    }).then(({ data: orderData }) => {
      const order = orderData?.data ?? orderData;
      const orderId = order?.orderId || order?.order_id || order?.id;
      const amount = Number(order?.amount ?? 0);
      if (amount <= 0 || String(orderId || '').startsWith('admin_free_')) {
        resolve(orderId || `admin_free_${auctionType}`);
        return;
      }
      openRazorpayCheckout({
        orderData,
        user,
        description,
        onSuccess: async (response) => {
          try {
            await api.post('/api/v1/auction-fees/creation/verify', {
              auctionType,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            resolve(response.razorpay_order_id);
          } catch (err) {
            reject(err);
          }
        },
        onFailure: (err) => reject(err),
        onDismiss: () => reject(new Error('Payment cancelled')),
      });
    }).catch(reject);
  });
}

export function payBidFee({
  auctionType,
  auctionId,
  bidAmount,
  user,
  description = 'Auction bid fee',
}) {
  return new Promise((resolve, reject) => {
    api.post(`/api/v1/auction-fees/${auctionId}/bid/create-order`, {
      auctionType,
      bidAmount,
    }).then(({ data: orderData }) => {
      const order = orderData?.data ?? orderData;
      const orderId = order?.orderId || order?.order_id || order?.id;
      const amount = Number(order?.amount ?? 0);
      if (amount <= 0 || String(orderId || '').startsWith('admin_free_')) {
        resolve({
          razorpayPaymentId: 'admin_free',
          razorpayOrderId: orderId || `admin_free_bid_${auctionId}`,
          razorpaySignature: 'admin_free',
        });
        return;
      }
      openRazorpayCheckout({
        orderData,
        user,
        description,
        onSuccess: (response) => {
          resolve({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        onFailure: (err) => reject(err),
        onDismiss: () => reject(new Error('Payment cancelled')),
      });
    }).catch(reject);
  });
}

export function computeCommissionBreakdown(sellerAmount, commissionPercent = 15) {
  const breakdown = computeCurrencyCommission(sellerAmount, commissionPercent);
  return {
    listingPrice: breakdown.amount,
    sellerAmount: breakdown.net,
    sellerEarnings: breakdown.net,
    commissionAmount: breakdown.commission,
    finalListingPrice: breakdown.amount,
    commissionPercent: breakdown.percent,
  };
}
