import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Above AppLayout header/footer, WhatsApp, and the site gradient frame. */
export const APP_OVERLAY_Z_INDEX = 11000;

const OPEN_CLASS = 'app-overlay-open';

let lockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

function acquireOverlayLock() {
  if (typeof document === 'undefined') return () => {};
  const html = document.documentElement;
  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = html.style.overflow;
    document.body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    document.body.classList.add(OPEN_CLASS);
  }
  lockCount += 1;
  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
      document.body.classList.remove(OPEN_CLASS);
    }
  };
}

export function useOverlayScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    return acquireOverlayLock();
  }, [active]);
}

/**
 * Renders children on document.body so AppLayout isolation cannot trap
 * `position:fixed` dialogs under the sticky navbar, footer, or WhatsApp.
 */
export default function AppOverlay({ children, lockScroll = true }) {
  useOverlayScrollLock(lockScroll);
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
