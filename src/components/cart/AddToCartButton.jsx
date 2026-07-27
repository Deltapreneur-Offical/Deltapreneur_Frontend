import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import CartFlyAnimation from './CartFlyAnimation';
import PremiumCartConflictModal from './PremiumCartConflictModal';

function isPremiumCartAloneError(err) {
  const code = err?.response?.data?.code;
  const msg = String(
    err?.response?.data?.detail
      || err?.response?.data?.message
      || err?.response?.data?.error
      || err?.message
      || '',
  ).toLowerCase();
  return code === 'PREMIUM_CART_ALONE'
    || (msg.includes('premium') && (msg.includes('alone') || msg.includes('clear') || msg.includes('managed')));
}

export default function AddToCartButton({
  productType,
  productId,
  selectedPlan,
  addonServices,
  coBrotherOptIn = false,
  metadata,
  className = '',
  wrapperClassName = '',
  size = 'sm',
  label,
  variant = 'button',
  disabled = false,
  updateWhenInCart = false,
  /** When true on corner variant, an in-cart click removes the item. Ignored for button (uses side remove). */
  allowRemove = false,
  /** Primary tone: default | dark | blue */
  tone = 'default',
  onAdded,
  onRemoved,
}) {
  const { addItem, updateItem, removeItem, isInCart, getCartItem, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [flyRect, setFlyRect] = useState(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const pendingRetryRef = useRef(null);
  const btnRef = useRef(null);

  const inCart = isInCart(productType, productId);
  const showAdded = inCart || justAdded;
  const isDisabled = disabled || loading || removing;
  /** Corner-only: whole control becomes remove. Button variant uses a side remove icon instead. */
  const cornerRemove = variant === 'corner' && inCart && allowRemove;
  const showSideRemove = variant === 'button' && showAdded && !updateWhenInCart && inCart;

  const ensureAuth = () => {
    if (!user) {
      const returnUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return false;
    }
    return true;
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!ensureAuth()) return;
    if (isDisabled) return;
    const existing = getCartItem(productType, productId);
    if (!existing?.id) return;
    setRemoving(true);
    try {
      await removeItem(existing.id);
      setJustAdded(false);
      onRemoved?.();
    } catch (err) {
      console.error('[AddToCart] remove failed', err?.response?.data?.detail || err?.message);
    } finally {
      setRemoving(false);
    }
  };

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!ensureAuth()) return;
    if (isDisabled) return;

    const payload = {
      selectedPlan,
      addonServices,
      coBrotherOptIn,
      metadata,
    };

    // Corner variant only: clicking the control removes when allowRemove.
    if (cornerRemove) {
      await handleRemove(e);
      return;
    }

    if (inCart && updateWhenInCart) {
      const existing = getCartItem(productType, productId);
      if (!existing) return;
      setLoading(true);
      try {
        await updateItem(existing.id, payload);
        setJustAdded(true);
        onAdded?.();
      } catch (err) {
        console.error('[AddToCart]', err?.response?.data?.detail || err?.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (inCart && !updateWhenInCart) {
      navigate('/cart');
      return;
    }

    setJustAdded(true);
    setLoading(true);
    try {
      await addItem(productType, productId, payload);
      onAdded?.();

      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setFlyRect(rect);
    } catch (err) {
      setJustAdded(false);
      if (isPremiumCartAloneError(err)) {
        pendingRetryRef.current = { productType, productId, payload };
        setConflictOpen(true);
      } else {
        console.error('[AddToCart]', err?.response?.data?.detail || err?.response?.data?.message || err?.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnimComplete = useCallback(() => setFlyRect(null), []);

  const handleClearAndRetry = async () => {
    setClearing(true);
    try {
      await clearCart();
      const pending = pendingRetryRef.current;
      if (pending) {
        await addItem(pending.productType, pending.productId, pending.payload);
        setJustAdded(true);
        onAdded?.();
        navigate('/cart');
      }
      setConflictOpen(false);
      pendingRetryRef.current = null;
    } catch (err) {
      if (isPremiumCartAloneError(err)) {
        setConflictOpen(true);
      } else {
        console.error('[AddToCart] retry failed', err?.response?.data?.detail || err?.message);
        setConflictOpen(false);
      }
    } finally {
      setClearing(false);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs gap-1.5'
    : 'px-4 py-2.5 text-sm gap-2';

  const removeBtnSize = size === 'sm'
    ? 'h-[1.875rem] w-[1.875rem]'
    : 'h-[2.625rem] w-[2.625rem]';

  const buttonLabel = label
    || (cornerRemove
      ? 'Remove'
      : inCart && updateWhenInCart
        ? 'Update Cart'
        : showAdded
          ? 'In Cart'
          : 'Add to Cart');

  const conflictModal = (
    <PremiumCartConflictModal
      open={conflictOpen}
      clearing={clearing}
      onClose={() => {
        if (!clearing) {
          setConflictOpen(false);
          pendingRetryRef.current = null;
        }
      }}
      onGoToCart={() => {
        setConflictOpen(false);
        navigate('/cart');
      }}
      onClearAndRetry={handleClearAndRetry}
    />
  );

  if (variant === 'corner') {
    const title = disabled
      ? (label || 'Unavailable')
      : cornerRemove
        ? 'Remove from cart'
        : showAdded
          ? 'In cart — view cart'
          : 'Add to cart';
    return (
      <>
        <button
          ref={btnRef}
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          title={title}
          aria-label={title}
          aria-pressed={showAdded}
          className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all duration-200
            ${cornerRemove
              ? 'border-rose-200 bg-white text-rose-500 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600'
              : showAdded
                ? 'scale-105 border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200 hover:bg-emerald-600'
                : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md'
            }
            ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${className}`}
        >
          {loading || removing ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : cornerRemove ? (
            <Trash2 size={14} strokeWidth={2.25} />
          ) : showAdded ? (
            <Check size={15} strokeWidth={3} />
          ) : (
            <ShoppingCart size={15} />
          )}
        </button>
        {flyRect && <CartFlyAnimation fromRect={flyRect} onComplete={handleAnimComplete} />}
        {conflictModal}
      </>
    );
  }

  if (variant === 'checkbox') {
    return (
      <>
        <label
          ref={btnRef}
          className={`inline-flex select-none items-center gap-2 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
          onClick={handleClick}
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            showAdded
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-gray-300 hover:border-indigo-400'
          }`}>
            {showAdded && <Check size={10} color="#fff" strokeWidth={3} />}
          </span>
          <span className={`text-xs font-medium ${showAdded ? 'text-emerald-600' : 'text-gray-600'}`}>
            {buttonLabel}
          </span>
        </label>
        {flyRect && <CartFlyAnimation fromRect={flyRect} onComplete={handleAnimComplete} />}
        {conflictModal}
      </>
    );
  }

  const darkAdd = tone === 'dark' && !showAdded;
  const blueAdd = tone === 'blue' && !showAdded;
  const isFullWidth = /\bw-full\b/.test(className) || /!w-full/.test(className);
  const isPill = /rounded-full/.test(className);
  const removeRadius = isPill ? 'rounded-full' : 'rounded-lg';

  const primaryToneClasses = darkAdd
    ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
    : blueAdd
      ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
      : showAdded && !updateWhenInCart
        ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
        : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:text-indigo-700';

  return (
    <>
      <div
        className={`inline-flex items-stretch gap-1.5 ${isFullWidth ? 'w-full' : ''} ${wrapperClassName}`.trim()}
      >
        <button
          ref={btnRef}
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          className={`inline-flex flex-1 min-w-0 items-center justify-center rounded-lg border font-medium transition-all duration-200
            ${primaryToneClasses}
            ${sizeClasses} ${className}
            disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : showAdded && !updateWhenInCart ? (
            <Check size={14} />
          ) : (
            <ShoppingCart size={14} />
          )}
          {buttonLabel}
        </button>

        {showSideRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isDisabled}
            title="Remove from cart"
            aria-label="Remove from cart"
            className={`inline-flex shrink-0 items-center justify-center ${removeRadius} border border-rose-200 bg-white text-rose-500
              shadow-sm transition-all duration-200
              hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 hover:shadow-md
              active:scale-95
              disabled:cursor-not-allowed disabled:opacity-50
              ${removeBtnSize}`}
          >
            {removing ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Trash2 size={size === 'sm' ? 13 : 15} strokeWidth={2.25} />
            )}
          </button>
        )}
      </div>
      {flyRect && <CartFlyAnimation fromRect={flyRect} onComplete={handleAnimComplete} />}
      {conflictModal}
    </>
  );
}
