import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cartAPI } from '../api/services';
import { useAuth } from './AuthContext';
import { CART_CHANGED, CART_CHANGED_STORAGE_KEY, notifyCartChanged } from '../utils/cartEvents';

function normalizeProductId(id) {
  return String(id || '').toLowerCase();
}

function productKey(productType, productId) {
  return `${productType}::${normalizeProductId(productId)}`;
}

const CartContext = createContext({
  items: [],
  count: 0,
  loading: false,
  addItem: async () => {},
  removeItem: async () => {},
  updateItem: async () => {},
  updateDomainRegistrationPeriod: async () => {},
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
  /** productKey → true when user removed while add API still in flight */
  const cancelledAddsRef = useRef(new Map());
  /** productKey → temp optimistic id */
  const pendingTempIdsRef = useRef(new Map());

  const applyCartSnapshot = useCallback((data) => {
    setCart(data);
    setCount(data?.itemCount || data?.items?.length || 0);
  }, []);

  const fetchCart = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    if (!user) {
      setCart(null);
      setCount(0);
      return null;
    }
    try {
      if (!silent) setLoading(true);
      const { data } = await cartAPI.get();
      applyCartSnapshot(data);
      return data;
    } catch {
      // A failed refresh must not look like an empty cart (optimistic add / last snapshot).
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, applyCartSnapshot]);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart(null);
      setCount(0);
      cancelledAddsRef.current.clear();
      pendingTempIdsRef.current.clear();
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
    const key = productKey(productType, productId);
    const tempId = `temp-${key}-${Date.now()}`;
    cancelledAddsRef.current.delete(key);
    pendingTempIdsRef.current.set(key, tempId);

    // Instant UI: badge + every Add/Remove control (button + corner icon) via isInCart.
    setCart((prev) => {
      const prevItems = [...(prev?.items || [])];
      const pid = normalizeProductId(productId);
      const idx = prevItems.findIndex(
        (it) => it.productType === productType && normalizeProductId(it.productId) === pid,
      );
      const optimistic = {
        id: tempId,
        productType,
        productId,
        quantity: 1,
        selectedPlan: options.selectedPlan,
        addonServices: options.addonServices,
        coBrotherOptIn: options.coBrotherOptIn,
        metadata: options.metadata,
        available: true,
      };
      if (idx >= 0) prevItems[idx] = { ...prevItems[idx], ...optimistic };
      else prevItems.push(optimistic);
      const itemCount = prevItems.length;
      setCount(itemCount);
      return {
        ...(prev || {}),
        items: prevItems,
        itemCount,
      };
    });

    try {
      const body = {
        productType,
        productId,
        ...options,
      };
      const { data } = await cartAPI.addItem(body);
      const newItem = data?.item;

      if (cancelledAddsRef.current.get(key)) {
        cancelledAddsRef.current.delete(key);
        pendingTempIdsRef.current.delete(key);
        if (newItem?.id) {
          try {
            await cartAPI.removeItem(newItem.id);
          } catch {
            /* best-effort */
          }
        }
        await fetchCart({ silent: true });
        notifyCartChanged();
        return data;
      }

      setCart((prev) => {
        const prevItems = [...(prev?.items || [])];
        const pid = normalizeProductId(productId);
        const idx = prevItems.findIndex(
          (it) => it.productType === productType && normalizeProductId(it.productId) === pid,
        );
        if (newItem) {
          if (idx >= 0) prevItems[idx] = newItem;
          else prevItems.push(newItem);
        } else if (idx >= 0 && prevItems[idx]?.id === tempId) {
          prevItems[idx] = {
            ...prevItems[idx],
            id: data?.itemId || prevItems[idx].id,
          };
        }
        const itemCount = prevItems.length;
        setCount(itemCount);
        return {
          ...(prev || {}),
          items: prevItems,
          itemCount,
        };
      });
      pendingTempIdsRef.current.delete(key);
      notifyCartChanged();
      fetchCart({ silent: true }).catch(() => {});
      return data;
    } catch (err) {
      pendingTempIdsRef.current.delete(key);
      setCart((prev) => {
        const prevItems = (prev?.items || []).filter((it) => String(it.id) !== String(tempId));
        setCount(prevItems.length);
        return {
          ...(prev || {}),
          items: prevItems,
          itemCount: prevItems.length,
        };
      });
      throw err;
    }
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    const idStr = String(itemId);
    let removedProductKey = null;

    setCart((prev) => {
      const target = (prev?.items || []).find((it) => String(it.id) === idStr);
      if (target) {
        removedProductKey = productKey(target.productType, target.productId);
      }
      const prevItems = (prev?.items || []).filter((it) => String(it.id) !== idStr);
      setCount(prevItems.length);
      return {
        ...(prev || {}),
        items: prevItems,
        itemCount: prevItems.length,
      };
    });

    // Optimistic remove of an in-flight add — cancel server side when add returns.
    if (idStr.startsWith('temp-') && removedProductKey) {
      cancelledAddsRef.current.set(removedProductKey, true);
      pendingTempIdsRef.current.delete(removedProductKey);
      return;
    }

    try {
      await cartAPI.removeItem(itemId);
      notifyCartChanged();
      fetchCart({ silent: true }).catch(() => {});
    } catch (err) {
      await fetchCart({ silent: true });
      throw err;
    }
  }, [fetchCart]);

  const updateItem = useCallback(async (itemId, body) => {
    const { data } = await cartAPI.updateItem(itemId, body);
    await fetchCart({ silent: true });
    notifyCartChanged();
    return data;
  }, [fetchCart]);

  const updateDomainRegistrationPeriod = useCallback(async (periodYears, itemId) => {
    const { data } = await cartAPI.updateDomainRegistrationPeriod(periodYears, itemId);
    setCart(data);
    setCount(data?.itemCount ?? data?.items?.length ?? 0);
    notifyCartChanged();
    return data;
  }, []);

  const clearCart = useCallback(async () => {
    await cartAPI.clear();
    setCart(null);
    setCount(0);
    cancelledAddsRef.current.clear();
    pendingTempIdsRef.current.clear();
    notifyCartChanged();
  }, []);

  const fetchCartRef = useRef(fetchCart);
  fetchCartRef.current = fetchCart;

  useEffect(() => {
    if (!user) return undefined;

    const refreshFromServer = () => {
      fetchCartRef.current({ silent: true });
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
      updateDomainRegistrationPeriod,
      clearCart,
      fetchCart,
      isInCart,
      getCartItem,
    }),
    [
      cart,
      count,
      loading,
      addItem,
      removeItem,
      updateItem,
      updateDomainRegistrationPeriod,
      clearCart,
      fetchCart,
      isInCart,
      getCartItem,
    ],
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
