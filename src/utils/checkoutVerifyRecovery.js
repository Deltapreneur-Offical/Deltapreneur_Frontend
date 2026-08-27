const SUCCESS_STATUSES = new Set(['ACTIVE', 'REGISTRATION_PENDING']);
const PROCESSING_STATUSES = new Set(['PAYMENT_COMPLETED']);

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function isVerifyNetworkFailure(err) {
  if (!err) return true;
  if (!err.response) return true;
  const status = Number(err.response.status || 0);
  return status === 0 || status >= 500;
}

function orderMatchesPayment(order, { razorpayPaymentId, razorpayOrderId }) {
  if (!order || typeof order !== 'object') return false;
  const payId = String(order.razorpayPaymentId || order.razorpay_payment_id || '').trim();
  const orderId = String(order.razorpayOrderId || order.razorpay_order_id || '').trim();
  if (razorpayPaymentId && payId && payId === String(razorpayPaymentId).trim()) return true;
  if (razorpayOrderId && orderId && orderId === String(razorpayOrderId).trim()) return true;
  return false;
}

export function classifyRecoveredOrders(orders, { razorpayPaymentId, razorpayOrderId } = {}) {
  const list = Array.isArray(orders) ? orders : [];
  const matched = list.filter((order) =>
    orderMatchesPayment(order, { razorpayPaymentId, razorpayOrderId }),
  );
  const domains = matched
    .map((order) => order.domain || `${order.domainName || ''}${order.domainExtension || ''}`)
    .filter(Boolean);
  const statuses = matched.map((order) => String(order.status || '').toUpperCase());

  if (statuses.some((status) => SUCCESS_STATUSES.has(status))) {
    return { outcome: 'success', domains, matched };
  }
  if (statuses.some((status) => PROCESSING_STATUSES.has(status))) {
    return { outcome: 'processing', domains, matched };
  }
  if (matched.length) {
    return { outcome: 'unknown', domains, matched };
  }
  return { outcome: 'unknown', domains: [], matched: [] };
}

export function messageForVerifyFailure({ err, recovered } = {}) {
  const outcome = recovered?.outcome;
  if (outcome === 'success') return null;
  if (outcome === 'processing') {
    return 'Payment received. Domain registration is completing — do not pay again.';
  }
  if (isVerifyNetworkFailure(err) || outcome === 'unknown') {
    return 'Payment was received. Do not pay again — we are confirming your domain. Check Orders and your email.';
  }
  const detail = err?.response?.data?.detail || '';
  if (String(detail).includes('No cart items found')) {
    return 'This payment session expired. Please checkout again.';
  }
  return detail || err?.response?.data?.message || 'Payment verification failed.';
}

export async function recoverCheckoutAfterVerifyFailure({
  listOrders,
  razorpayPaymentId,
  razorpayOrderId,
  attempts = 3,
  delayMs = 1500,
  wait = sleep,
} = {}) {
  if (typeof listOrders !== 'function') {
    return { outcome: 'unknown', domains: [], matched: [] };
  }
  let last = { outcome: 'unknown', domains: [], matched: [] };
  for (let i = 0; i < attempts; i += 1) {
    try {
      const result = await listOrders();
      const orders = result?.data ?? result;
      last = classifyRecoveredOrders(orders, { razorpayPaymentId, razorpayOrderId });
      if (last.outcome === 'success' || last.outcome === 'processing') {
        return last;
      }
    } catch {
      last = { outcome: 'unknown', domains: [], matched: [] };
    }
    if (i < attempts - 1) {
      await wait(delayMs);
    }
  }
  return last;
}
