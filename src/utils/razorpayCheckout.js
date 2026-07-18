/**
 * Razorpay checkout — supports amountSmallest when present; legacy INR (amount in rupees) otherwise.
 * Safe when backend is INR-only: never assumes multi-currency order fields beyond optional currency string.
 */

function looksLikeRazorpayOrder(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return (
    obj.orderId != null ||
    obj.razorpayOrderId != null ||
    obj.razorpay_order_id != null ||
    obj.amountSmallest != null ||
    obj.amount_in_paise != null ||
    obj.amount != null ||
    obj.keyId != null ||
    obj.key_id != null
  );
}

export function normalizeOrderData(payload) {
  if (payload == null) return null;
  let cur = payload?.data !== undefined ? payload.data : payload;
  let guard = 0;
  while (
    cur &&
    typeof cur === 'object' &&
    cur.data &&
    looksLikeRazorpayOrder(cur.data) &&
    !looksLikeRazorpayOrder(cur) &&
    guard < 5
  ) {
    cur = cur.data;
    guard += 1;
  }
  if (looksLikeRazorpayOrder(cur)) return cur;
  if (cur?.data && looksLikeRazorpayOrder(cur.data)) return cur.data;
  return cur;
}

/** Razorpay amount in smallest currency unit (paise for INR, cents for USD, etc). */
export function getRazorpayAmount(order) {
  if (!order) return 0;

  const smallestRaw =
    order.amountSmallest ??
    order.amount_in_paise ??
    order.amountInPaise ??
    order.amountPaise;

  if (smallestRaw != null && smallestRaw !== '') {
    const n = Math.round(Number(smallestRaw));
    if (Number.isFinite(n) && n > 0) return n;
  }

  const amount = Number(order.amount ?? order.amountMajor ?? order.totalAmount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  const currency = (order.currency || 'INR').toString().toUpperCase();
  const factor = getSmallestUnitFactor(currency);
  return Math.round(amount * factor);
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

function getSmallestUnitFactor(currency) {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 1;
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 1000;
  return 100;
}

export function getRazorpayCurrency(order) {
  const c = (order?.currency || 'INR').toString().toUpperCase();
  return c || 'INR';
}

export function getRazorpayKeyId(order) {
  return order?.keyId ?? order?.key_id ?? '';
}

export function getRazorpayOrderId(order) {
  return order?.orderId ?? order?.razorpayOrderId ?? order?.razorpay_order_id ?? '';
}

let razorpayScriptPromise = null;

function loadRazorpayScript() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve();
  }
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
}

export function buildRazorpayPrefill(user, orderData = {}) {
  const email =
    user?.email ||
    orderData.buyerEmail ||
    orderData.email ||
    '';
  const contact =
    user?.phoneNumber ||
    user?.phone ||
    orderData.buyerPhone ||
    '';
  return { email, contact };
}

export async function openRazorpayCheckout({
  orderData,
  user,
  description,
  onSuccess,
  onFailure,
  onDismiss,
  themeColor = '#c8a96e',
}) {
  try {
    const order = normalizeOrderData(orderData);
    const amount = getRazorpayAmount(order);
    const keyId = getRazorpayKeyId(order);
    const orderId = getRazorpayOrderId(order);

    if (keyId && keyId.startsWith('rzp_test_')) {
      console.log('[Razorpay checkout] Test/Demo mode. Blocking payment.');
      setTimeout(() => {
        if (onFailure) {
          onFailure({
            error: { description: 'Razorpay demo: Live payments cannot be processed in demo mode.' },
          });
        }
      }, 500);
      return null;
    }

    await loadRazorpayScript();

    if (!keyId || !orderId) {
      throw new Error('Invalid payment order from server.');
    }
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount from server.');
    }

    const options = {
      key: keyId,
      amount,
      currency: getRazorpayCurrency(order),
      name: 'CoBrother',
      description,
      order_id: orderId,
      handler: onSuccess,
      prefill: buildRazorpayPrefill(user, order),
      modal: { ondismiss: onDismiss },
      theme: { color: themeColor },
    };

    const rzp = new window.Razorpay(options);
    if (onFailure) {
      rzp.on('payment.failed', onFailure);
    }
    rzp.open();
    return rzp;
  } catch (err) {
    console.error('[Razorpay checkout]', err);
    try {
      if (typeof onFailure === 'function') {
        onFailure({
          error: { description: err?.message || 'Failed to open payment.' },
        });
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}
