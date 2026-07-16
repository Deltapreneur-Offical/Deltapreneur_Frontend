import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
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

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, fetchCart, removeItem, clearCart } = useCart();
  const { currency: selectedCurrency } = useCurrency();
  const [loading, setLoading] = useState(!cart);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [redemption, setRedemption] = useState(EMPTY_REDEMPTION);
  const pendingCheckoutOrderId = useRef(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const showSkeleton = !cart;
    if (showSkeleton) setLoading(true);
    fetchCart().finally(() => setLoading(false));
    // Refresh once when entering the cart page
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
  const orderTotal = productOrderTotal;

  const finalPayable = useMemo(() => {
    if (redemption.redeem && redemption.discount > 0) {
      return redemption.finalAmount;
    }
    return orderTotal;
  }, [redemption, orderTotal]);

  const handleCheckout = async () => {
    setError('');
    setCheckoutLoading(true);
    try {
      const buyerName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
      const { data: orderData } = await cartAPI.checkout({
        redeemPoints: redemption.redeem,
        currency: selectedCurrency || 'INR',
        buyerName,
        buyerEmail: user?.email || '',
        buyerPhone: user?.phoneNumber || user?.phone || '',
      });

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
            if (purchased > 0 && purchased < total) {
              setError(`${purchased} of ${total} items purchased. Some items were no longer available — review your cart.`);
            }
            navigate('/purchases');
          } catch (err) {
            const detail = err?.response?.data?.detail || '';
            if (detail.includes('No cart items found')) {
              setError('This payment session expired. Please checkout again.');
            } else {
              setError(detail || 'Payment verification failed.');
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
      setError(err?.response?.data?.detail || 'Could not initiate checkout.');
      setCheckoutLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 pb-8 lg:pb-10 -mt-4 sm:-mt-5 lg:-mt-6 xl:-mt-8">
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
                  />
                  {(item.productType === 'TECHNOLOGY' || item.productType === 'DOMAIN_LISTING') && (
                    <CartItemExtras item={item} onUpdated={handleCartUpdated} />
                  )}
                </motion.div>
              ))}

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
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
