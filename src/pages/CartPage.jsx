import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import Confetti from '../components/common/Confetti';
import { buildCartItemBreakdown, buildCartOrderViewModel } from '../utils/cartLineBreakdown';
import { useVirtualAssistantCatalog } from '../hooks/useVirtualAssistantCatalog';
import { useOperationsServicesCatalog } from '../hooks/useOperationsServicesCatalog';
import CartEmpty from '../components/cart/CartEmpty';
import CartEdgePoints from '../components/cart/CartEdgePoints';
import CartItemExtras from '../components/cart/CartItemExtras';
import CartPageSkeleton from '../components/cart/CartPageSkeleton';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { cartAPI } from '../api/services';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';

const EMPTY_REDEMPTION = {
  redeem: false,
  discount: 0,
  finalAmount: 0,
  applying: false,
  applied: false,
  pointsUsed: 0,
};

function buildRegistrantFromUser(user) {
  return {
    firstName: user?.firstname || user?.firstName || user?.name?.split?.(' ')?.[0] || '',
    lastName: user?.lastname || user?.lastName || user?.name?.split?.(' ')?.slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phoneNumber || user?.phone || '',
    street: user?.address || user?.street || '',
    city: user?.city || '',
    state: user?.state || '',
    zip: user?.zipCode || user?.zip || user?.pincode || '',
    country: user?.country || 'IN',
  };
}

function registrantComplete(r) {
  return ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'state', 'zip'].every(
    (k) => String(r?.[k] || '').trim(),
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, fetchCart, removeItem, clearCart, updateDomainRegistrationPeriod } = useCart();
  const { currency: selectedCurrency } = useCurrency();
  const [loading, setLoading] = useState(!cart);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [redemption, setRedemption] = useState(EMPTY_REDEMPTION);
  const [registrant, setRegistrant] = useState(() => buildRegistrantFromUser(user));
  const [periodUpdatingId, setPeriodUpdatingId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const pendingCheckoutOrderId = useRef(null);
  const bumpedMinPeriodItems = useRef(new Set());

  useEffect(() => {
    setRegistrant((prev) => ({ ...prev, ...buildRegistrantFromUser(user) }));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const showSkeleton = !cart;
    if (showSkeleton) setLoading(true);
    fetchCart().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRedemptionChange = useCallback((payload) => {
    setRedemption(payload);
  }, []);

  useEffect(() => {
    if (selectedCurrency !== 'INR') {
      setRedemption(EMPTY_REDEMPTION);
    }
  }, [selectedCurrency]);

  const handleCartUpdated = useCallback(() => {
    fetchCart().then(() => setRedemption(EMPTY_REDEMPTION));
  }, [fetchCart]);

  const handleRemove = async (itemId) => {
    setRemovingId(itemId);
    setError('');
    try {
      await removeItem(itemId);
      setRedemption(EMPTY_REDEMPTION);
    } catch {
      setError('Could not remove item. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Remove all items from your cart?')) return;
    setClearing(true);
    setError('');
    try {
      await clearCart();
      setRedemption(EMPTY_REDEMPTION);
    } finally {
      setClearing(false);
    }
  };

  const { services: vaServices } = useVirtualAssistantCatalog();
  const { priceByAddonKey } = useOperationsServicesCatalog();

  const productOrderTotal = useMemo(() => {
    const breakdowns = (cart?.items || []).map((item) =>
      buildCartItemBreakdown(item, vaServices, priceByAddonKey),
    );
    return buildCartOrderViewModel(breakdowns).productTotal;
  }, [cart?.items, vaServices, priceByAddonKey]);

  const items = cart?.items || [];
  const hasItems = items.length > 0;
  const hasDomainRegistration = items.some((it) => it.productType === 'DOMAIN_REGISTRATION');
  const orderTotal = productOrderTotal;

  const finalPayable = useMemo(() => {
    if (redemption.redeem && redemption.discount > 0) {
      return redemption.finalAmount;
    }
    return orderTotal;
  }, [redemption, orderTotal]);

  const updateRegistrant = (field, value) => {
    setRegistrant((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemPeriodChange = async (itemId, nextYears) => {
    setError('');
    setPeriodUpdatingId(itemId);
    try {
      await updateDomainRegistrationPeriod(nextYears, itemId);
      setRedemption(EMPTY_REDEMPTION);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not update registration period pricing. Please try again.',
      );
    } finally {
      setPeriodUpdatingId(null);
    }
  };

  // Ensure each domain is at least its TLD minimum (e.g. .ai → 2) with a live quote.
  useEffect(() => {
    if (!hasDomainRegistration || periodUpdatingId) return;
    const regItems = items.filter((it) => it.productType === 'DOMAIN_REGISTRATION');
    const underMin = regItems.find((it) => {
      const min = Math.max(1, Number(it.metadata?.minPeriodYears || 1));
      const period = Math.max(1, Number(it.metadata?.period || 1));
      return period < min && !bumpedMinPeriodItems.current.has(it.id);
    });
    if (!underMin) return;
    const min = Math.max(1, Number(underMin.metadata?.minPeriodYears || 1));
    bumpedMinPeriodItems.current.add(underMin.id);
    handleItemPeriodChange(underMin.id, min).catch(() => {
      bumpedMinPeriodItems.current.delete(underMin.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.items, periodUpdatingId, hasDomainRegistration]);

  const handleCheckout = async () => {
    setError('');
    if (hasDomainRegistration && !registrantComplete(registrant)) {
      setError('Please complete registrant details before paying for domain registrations.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const buyerName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
      const payload = {
        redeemPoints: redemption.redeem,
        currency: selectedCurrency || 'INR',
        buyerName,
        buyerEmail: user?.email || '',
        buyerPhone: user?.phoneNumber || user?.phone || '',
      };
      if (hasDomainRegistration) {
        payload.registrant = registrant;
        // Periods are per cart item — do not send a global periodYears.
      }

      const { data: orderData } = await cartAPI.checkout(payload);

      const orderId = orderData?.orderId || orderData?.order_id;
      pendingCheckoutOrderId.current = orderId || null;

      const backendCurrency = (orderData?.currency || 'INR').toUpperCase();
      const requestedCurrency = (selectedCurrency || 'INR').toUpperCase();

      if (backendCurrency !== requestedCurrency && requestedCurrency !== 'INR') {
        setError(
          `Payment will be processed in ${backendCurrency} instead of ${requestedCurrency}. ` +
          `This may happen when the selected currency is temporarily unavailable.`
        );
      }

      openRazorpayCheckout({
        orderData,
        user,
        description: `CoBrother Cart (${orderData.itemCount} item${orderData.itemCount > 1 ? 's' : ''})`,
        onSuccess: async (response) => {
          pendingCheckoutOrderId.current = null;
          try {
            const { data: verifyData } = await cartAPI.verifyCheckout({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await fetchCart();
            const purchased = verifyData?.purchasedCount ?? 0;
            const total = verifyData?.totalItems ?? purchased;
            const domains = (verifyData?.results || [])
              .filter((r) => r?.type === 'DOMAIN_REGISTRATION' && r?.success && r?.domain)
              .map((r) => r.domain);
            if (purchased > 0 && purchased < total) {
              setError(`${purchased} of ${total} items purchased. Some items were no longer available — review your cart.`);
            }
            setPaymentSuccess({
              purchased,
              total,
              domains,
              partial: purchased > 0 && purchased < total,
            });
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4500);
          } catch (err) {
            const detail = err?.response?.data?.detail || '';
            if (detail.includes('No cart items found')) {
              setError('This payment session expired. Please checkout again.');
            } else {
              setError(detail || err?.response?.data?.message || 'Payment verification failed.');
            }
          } finally {
            setCheckoutLoading(false);
          }
        },
        onFailure: () => {
          pendingCheckoutOrderId.current = null;
          setError('Payment failed. Please try again.');
          setCheckoutLoading(false);
        },
        onDismiss: async () => {
          const staleOrderId = pendingCheckoutOrderId.current;
          pendingCheckoutOrderId.current = null;
          setCheckoutLoading(false);
          if (staleOrderId) {
            try {
              await cartAPI.cancelCheckout({ razorpayOrderId: staleOrderId });
              if (redemption.redeem) {
                setRedemption(EMPTY_REDEMPTION);
              }
            } catch {
              /* best-effort cleanup */
            }
          }
        },
      });
    } catch (err) {
      const failed = err?.response?.data?.failedDomains;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        'Could not initiate checkout.';
      if (Array.isArray(failed) && failed.length) {
        const names = failed.map((f) => f.domain).filter(Boolean).join(', ');
        setError(`${msg}${names ? ` (${names})` : ''}`);
      } else {
        setError(msg);
      }
      setCheckoutLoading(false);
    }
  };

  const closePaymentSuccess = () => {
    setPaymentSuccess(null);
    setShowConfetti(false);
    navigate('/purchases');
  };

  return (
    <AppLayout>
      <Confetti show={showConfetti} />
      {paymentSuccess && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closePaymentSuccess()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-payment-success-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-[420px] text-center bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8"
          >
            <div className="absolute -top-24 -right-24 w-[280px] h-[280px] rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
            <div className="text-5xl mb-3" aria-hidden>🎉</div>
            <h2 id="cart-payment-success-title" className="font-display text-2xl font-extrabold text-gray-900 mb-2">
              Payment successful
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {paymentSuccess.partial
                ? `${paymentSuccess.purchased} of ${paymentSuccess.total} items were purchased. Review your cart for anything left.`
                : paymentSuccess.purchased > 1
                  ? `${paymentSuccess.purchased} items purchased successfully. You can manage them from Purchases.`
                  : 'Your purchase is confirmed. You can manage it from Purchases.'}
            </p>
            {Array.isArray(paymentSuccess.domains) && paymentSuccess.domains.length > 0 && (
              <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-1.5">
                  Domains registered
                </p>
                <ul className="space-y-1">
                  {paymentSuccess.domains.slice(0, 6).map((domain) => (
                    <li key={domain} className="text-sm font-semibold text-gray-900 truncate">
                      {domain}
                    </li>
                  ))}
                  {paymentSuccess.domains.length > 6 && (
                    <li className="text-xs text-gray-500">
                      +{paymentSuccess.domains.length - 6} more
                    </li>
                  )}
                </ul>
              </div>
            )}
            <button type="button" className="btn-glow w-full" onClick={closePaymentSuccess}>
              View purchases
            </button>
          </motion.div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 pt-5 sm:pt-6 pb-12 sm:pb-14 lg:pb-16">
        <div className="relative mb-8 rounded-2xl border border-gray-200/60 bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/40 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <ShoppingCart size={22} className="shrink-0 text-indigo-600" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold text-gray-900 tracking-tight">Shopping Cart</h1>
                {hasItems && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {items.length} item{items.length !== 1 ? 's' : ''} in your cart
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <ShoppingCart
                size={64}
                strokeWidth={1.15}
                className="shrink-0 text-indigo-200/90 sm:w-[76px] sm:h-[76px]"
                aria-hidden
              />
              {hasItems && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={clearing}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {clearing ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <CartPageSkeleton />
        ) : !hasItems ? (
          <CartEmpty />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-6 xl:gap-8 items-start"
          >
            <div className="space-y-3 min-w-0">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.25 }}
                  className="space-y-0"
                >
                  <CartItem
                    item={item}
                    onRemove={handleRemove}
                    removingId={removingId}
                    onPeriodChange={
                      item.productType === 'DOMAIN_REGISTRATION'
                        ? handleItemPeriodChange
                        : undefined
                    }
                    periodUpdatingId={periodUpdatingId}
                  />
                  {(item.productType === 'TECHNOLOGY' || item.productType === 'DOMAIN_LISTING') && (
                    <CartItemExtras item={item} onUpdated={handleCartUpdated} />
                  )}
                </motion.div>
              ))}

              {hasDomainRegistration && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">
                      Registrant Details
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Required once for all domain registrations in this order. Choose each domain&apos;s
                      registration period on its card above. GST is added at checkout.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['firstName', 'First Name'],
                      ['lastName', 'Last Name'],
                      ['email', 'Email'],
                      ['phone', 'Phone'],
                      ['street', 'Address'],
                      ['city', 'City'],
                      ['state', 'State'],
                      ['zip', 'ZIP Code'],
                    ].map(([field, label]) => (
                      <label key={field} className="space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                        <input
                          type={field === 'email' ? 'email' : 'text'}
                          value={registrant[field] || ''}
                          onChange={(e) => updateRegistrant(field, e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 outline-none"
                          required
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                {selectedCurrency === 'INR' && (
                  <CartEdgePoints
                    orderTotal={orderTotal}
                    onChange={handleRedemptionChange}
                  />
                )}
              </div>
            </div>

            <div className="w-full xl:max-w-[420px] xl:mx-0 mx-auto">
              <div className="sticky top-20 xl:top-24">
                <CartSummary
                  cart={cart}
                  onCheckout={handleCheckout}
                  loading={checkoutLoading}
                  edgePointsDiscount={redemption.discount}
                  edgePointsApplying={redemption.applying}
                  edgePointsUsed={redemption.pointsUsed}
                  finalPayable={finalPayable}
                  redeemActive={redemption.redeem}
                  productTotal={productOrderTotal}
                  checkoutDisabled={
                    hasDomainRegistration
                    && (!registrantComplete(registrant) || Boolean(periodUpdatingId))
                  }
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
