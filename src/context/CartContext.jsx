import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cartAPI } from '../api/services';
import { useAuth } from './AuthContext';
import { CART_CHANGED, CART_CHANGED_STORAGE_KEY, notifyCartChanged } from '../utils/cartEvents';

function normalizeProductId(id) {
  return String(id || '').toLowerCase();
}

const CartContext = createContext({
  items: [],
  count: 0,
  loading: false,
  addItem: async () => {},
  removeItem: async () => {},
  updateItem: async () => {},
  clearCart: async () => {},
  fetchCart: async () => {},
  isInCart: () => false,
  getCartItem: () => null,
  cart: null,
});

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      setCount(0);
      return null;
    }
    try {
      setLoading(true);
      const { data } = await cartAPI.get();
      setCart(data);
      setCount(data?.itemCount || data?.items?.length || 0);
      return data;
    } catch {
      setCart(null);
      setCount(0);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart(null);
      setCount(0);
    }
  }, [user, fetchCart]);

  const isInCart = useCallback(
    (productType, productId) => {
      const pid = normalizeProductId(productId);
      return (cart?.items || []).some(
        (item) => item.productType === productType && normalizeProductId(item.productId) === pid,
      );
    },
    [cart],
  );

  const getCartItem = useCallback(
    (productType, productId) => {
      const pid = normalizeProductId(productId);
      return (cart?.items || []).find(
        (item) => item.productType === productType && normalizeProductId(item.productId) === pid,
      ) || null;
    },
    [cart],
  );

  const addItem = useCallback(async (productType, productId, options = {}) => {
    const body = {
      productType,
      productId,
      ...options,
    };
    const { data } = await cartAPI.addItem(body);
    await fetchCart();
    notifyCartChanged();
    return data;
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    await cartAPI.removeItem(itemId);
    await fetchCart();
    notifyCartChanged();
  }, [fetchCart]);

  const updateItem = useCallback(async (itemId, body) => {
    const { data } = await cartAPI.updateItem(itemId, body);
    await fetchCart();
    notifyCartChanged();
    return data;
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    await cartAPI.clear();
    setCart(null);
    setCount(0);
    notifyCartChanged();
  }, []);

  const fetchCartRef = useRef(fetchCart);
  fetchCartRef.current = fetchCart;

  useEffect(() => {
    if (!user) return undefined;

    const refreshFromServer = () => {
      fetchCartRef.current();
    };

    const onStorage = (event) => {
      if (event.key === CART_CHANGED_STORAGE_KEY) {
        refreshFromServer();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromServer();
      }
    };

    window.addEventListener(CART_CHANGED, refreshFromServer);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener(CART_CHANGED, refreshFromServer);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  const value = useMemo(
    () => ({
      items: cart?.items || [],
      count,
      loading,
      cart,
      addItem,
      removeItem,
      updateItem,
      clearCart,
      fetchCart,
      isInCart,
      getCartItem,
    }),
    [cart, count, loading, addItem, removeItem, updateItem, clearCart, fetchCart, isInCart, getCartItem],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

export default useCart;
