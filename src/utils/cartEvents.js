export const CART_CHANGED = 'cobrother:cart-changed';
export const CART_CHANGED_STORAGE_KEY = 'cobrother:cart-changed';

export function notifyCartChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CART_CHANGED));
  try {
    localStorage.setItem(CART_CHANGED_STORAGE_KEY, String(Date.now()));
  } catch {
    /* private mode / quota */
  }
}
