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
import { PREMIUM_DOMAIN_MIN_PRICE } from '../utils/domainPricing';

const EMPTY_REDEMPTION = {
  redeem: false,
  discount: 0,
  finalAmount: 0,
  applying: false,
  applied: false,
  pointsUsed: 0,
};

function isPremiumMarketplaceCartItem(item) {
  if (!item || item.productType !== 'DOMAIN_LISTING') return false;
  if (item.metadata?.isPremiumMarketplace === true) return true;
  return Number(item.basePrice || item.lineTotal || 0) > PREMIUM_DOMAIN_MIN_PRICE;
}

function isOpManagedAcquisitionCartItem(item) {
  if (!item || item.productType !== 'DOMAIN_REGISTRATION') return false;
  return item.metadata?.isManagedAcquisition === true;
}

function isManagedAcquisitionCartItem(item) {
  return isPremiumMarketplaceCartItem(item) || isOpManagedAcquisitionCartItem(item);
}

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
  const [confirmPremiumOpen, setConfirmPremiumOpen] = useState(false);
  const [premiumConfirmSuccess, setPremiumConfirmSuccess] = useState(null);
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
  const premiumMarketplaceItems = items.filter(isPremiumMarketplaceCartItem);
  const opManagedItems = items.filter(isOpManagedAcquisitionCartItem);
  const managedAcquisitionItems = items.filter(isManagedAcquisitionCartItem);
  const isPremiumMarketplaceOnly =
    premiumMarketplaceItems.length === 1
    && items.length === 1
    && isPremiumMarketplaceCartItem(items[0]);
  const isOpManagedOnly =
    opManagedItems.length === 1
    && items.length === 1
    && isOpManagedAcquisitionCartItem(items[0]);
  const isManagedAcquisitionOnly = isPremiumMarketplaceOnly || isOpManagedOnly;
  const needsRegistrantDetails = hasDomainRegistration && !isOpManagedOnly;
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
    if (isManagedAcquisitionOnly) {
      setConfirmPremiumOpen(true);
      return;
    }
    if (managedAcquisitionItems.length > 0) {
      setError(
        'Managed acquisition domains must be confirmed alone. Remove other items first.',
      );
      return;
    }
    if (needsRegistrantDetails && !registrantComplete(registrant)) {
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
      if (needsRegistrantDetails) {
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
      const code = err?.response?.data?.code;
      if (code === 'MANAGED_ACQUISITION_CONFIRM' || code === 'PREMIUM_CART_ALONE') {
        setConfirmPremiumOpen(true);
        setCheckoutLoading(false);
        return;
      }
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

  const handlePremiumConfirm = async () => {
    setError('');
    setCheckoutLoading(true);
    try {
      const buyerName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
      let data;
      if (isOpManagedOnly) {
        const item = opManagedItems[0];
        ({ data } = await cartAPI.confirmOpenProviderManaged({
          fullName: buyerName,
          email: user?.email || '',
          phone: user?.phoneNumber || user?.phone || '',
          itemId: item?.id,
          message: `Managed domain acquisition request for ${item?.productName || 'domain'}.`,
        }));
      } else {
        const item = premiumMarketplaceItems[0];
        ({ data } = await cartAPI.confirmPremiumMarketplace({
          fullName: buyerName,
          email: user?.email || '',
          phone: user?.phoneNumber || user?.phone || '',
          listingId: item?.productId,
          message: `Managed domain acquisition request for ${item?.productName || 'domain'}.`,
        }));
      }
      setConfirmPremiumOpen(false);
      await fetchCart();
      setPremiumConfirmSuccess({
        domain: data?.domain || managedAcquisitionItems[0]?.productName,
        enquiryId: data?.enquiryId || data?.acquisitionId,
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4500);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Could not submit acquisition request.';
      setError(msg);
      setConfirmPremiumOpen(false);
    } finally {
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
      {confirmPremiumOpen && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !checkoutLoading) setConfirmPremiumOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.3)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-700" />
            <div className="px-6 pt-7 pb-6 sm:px-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                CoBrother Priority Managed Acquisition
              </div>
              <h2 className="font-display text-[1.65rem] font-extrabold leading-tight text-slate-900">
                Confirm your Priority Managed Acquisition
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Thank you for trusting CoBrother with your premium acquisition of{' '}
                <strong className="text-slate-900">
                  {managedAcquisitionItems[0]?.productName || 'this domain'}
                </strong>
                . Because this is a high-value transaction, it qualifies for our Priority Managed
                Service. Rather than a standard instant checkout, you have been assigned a dedicated
                specialist who will personally oversee this transaction, secure payment, and transfer
                to ensure a seamless handover.
              </p>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/90 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                  What Happens Next
                </p>
                <ol className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex gap-2.5">
                    <span className="font-bold text-emerald-700">1</span>
                    <span>
                      <strong>Priority Escalation:</strong> We instantly open your managed
                      acquisition file and alert your dedicated specialist.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-bold text-emerald-700">2</span>
                    <span>
                      <strong>White-Glove Coordination:</strong> We contact the current owner on
                      your behalf to verify readiness and secure the best possible terms.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="font-bold text-emerald-700">3</span>
                    <span>
                      <strong>Guided Secure Transfer:</strong> We provide 1-on-1 support through
                      the payment process and oversee the transfer until complete ownership is in
                      your hands.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Zero upfront payment</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Dedicated VIP specialist</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Encrypted secure transfer</span>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  disabled={checkoutLoading}
                  onClick={() => setConfirmPremiumOpen(false)}
                >
                  Not now
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  disabled={checkoutLoading}
                  onClick={handlePremiumConfirm}
                >
                  {checkoutLoading ? 'Submitting your request…' : 'Submit Priority Acquisition Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {premiumConfirmSuccess && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setPremiumConfirmSuccess(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-emerald-100 bg-white text-center shadow-[0_28px_90px_rgba(15,23,42,0.3)] p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-2xl" aria-hidden>✓</div>
            <h2 className="font-display text-2xl font-extrabold text-slate-900 mb-2">
              Request received — we&apos;ve got this
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-2">
              Your acquisition request for{' '}
              <strong className="text-slate-900">{premiumConfirmSuccess.domain}</strong> is with our team.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              A confirmation email is on its way. CoBrother will personally manage this acquisition
              and contact you with clear next steps — no payment is due right now.
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700"
              onClick={() => {
                setPremiumConfirmSuccess(null);
                navigate('/domains/dashboard?tab=acquisitions');
              }}
            >
              View My Acquisition Orders
            </button>
          </div>
        </div>
      )}
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

        {isManagedAcquisitionOnly && (
          <div className="mb-5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800 mb-1.5">
              Managed Domain Acquisition
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              This domain requires a personalized acquisition process. Our team will guide you through
              every step, including verification, coordination, payment guidance, and secure transfer
              of ownership.
            </p>
          </div>
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

              {needsRegistrantDetails && (
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
                    (needsRegistrantDetails
                      && (!registrantComplete(registrant) || Boolean(periodUpdatingId)))
                    || (managedAcquisitionItems.length > 0 && !isManagedAcquisitionOnly)
                  }
                  checkoutLabel={
                    isManagedAcquisitionOnly
                      ? 'Reserve Order & Pay Later'
                      : undefined
                  }
                  secureNote={
                    isManagedAcquisitionOnly
                      ? 'Managed by CoBrother — no payment charged now'
                      : undefined
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
