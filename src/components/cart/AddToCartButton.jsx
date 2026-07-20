import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import CartFlyAnimation from './CartFlyAnimation';

export default function AddToCartButton({
  productType,
  productId,
  selectedPlan,
  addonServices,
  coBrotherOptIn = false,
  metadata,
  className = '',
  size = 'sm',
  label,
  variant = 'button',
  disabled = false,
  updateWhenInCart = false,
  onAdded,
}) {
  const { addItem, updateItem, isInCart, getCartItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [flyRect, setFlyRect] = useState(null);
  const btnRef = useRef(null);

  const inCart = isInCart(productType, productId);
  const showAdded = inCart || justAdded;
  const isDisabled = disabled || loading;

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      const returnUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (isDisabled) return;

    const payload = {
      selectedPlan,
      addonServices,
      coBrotherOptIn,
      metadata,
    };

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

    setLoading(true);
    try {
      await addItem(productType, productId, payload);
      setJustAdded(true);
      onAdded?.();

      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setFlyRect(rect);
    } catch (err) {
      console.error('[AddToCart]', err?.response?.data?.detail || err?.response?.data?.message || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimComplete = useCallback(() => setFlyRect(null), []);

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs gap-1.5'
    : 'px-4 py-2.5 text-sm gap-2';

  const buttonLabel = label || (inCart && updateWhenInCart ? 'Update Cart' : showAdded ? 'In Cart' : 'Add to Cart');

  if (variant === 'corner') {
    return (
      <>
        <button
          ref={btnRef}
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          title={disabled ? (label || 'Unavailable') : showAdded ? 'In cart — view cart' : 'Add to cart'}
          aria-label={disabled ? (label || 'Unavailable') : showAdded ? 'In cart — view cart' : 'Add to cart'}
          aria-pressed={showAdded}
          className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-all duration-300
            ${showAdded
              ? 'scale-105 border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200 hover:bg-emerald-600'
              : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md'
            }
            ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${className}`}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : showAdded ? (
            <Check size={17} strokeWidth={3} />
          ) : (
            <ShoppingCart size={17} />
          )}
        </button>
        {flyRect && <CartFlyAnimation fromRect={flyRect} onComplete={handleAnimComplete} />}
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
      </>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-200
          ${showAdded && !updateWhenInCart
            ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
            : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:text-indigo-700'
          }
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
      {flyRect && <CartFlyAnimation fromRect={flyRect} onComplete={handleAnimComplete} />}
    </>
  );
}
