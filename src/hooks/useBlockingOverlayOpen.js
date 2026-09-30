import { useEffect, useState } from 'react';

const BODY_OVERLAY_CLASSES = ['app-overlay-open', 'home-menu-open'];

/** A modal element that is actually shown (not display:none / hidden / aria-hidden / inert). */
function isElementVisible(el) {
  if (!el || !el.isConnected) return false;
  if (el.hidden || el.hasAttribute('inert')) return false;
  if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  // Also reject ancestors hidden through CSS (computed visibility inherits; display does not).
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    if (window.getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

export function detectBlockingOverlay() {
  if (typeof document === 'undefined') return false;
  const { body } = document;
  if (BODY_OVERLAY_CLASSES.some((cls) => body.classList.contains(cls))) return true;
  const modals = document.querySelectorAll('[aria-modal="true"]');
  for (let i = 0; i < modals.length; i += 1) {
    if (isElementVisible(modals[i])) return true;
  }
  return false;
}

/**
 * True while a mobile menu, drawer or blocking modal is open.
 * Only visible `[aria-modal="true"]` elements count, so a hidden modal left in
 * the DOM never hides the navigation permanently.
 */
export default function useBlockingOverlayOpen() {
  const [open, setOpen] = useState(() => detectBlockingOverlay());

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return undefined;
    }
    let frame = 0;
    const evaluate = () => {
      frame = 0;
      setOpen(detectBlockingOverlay());
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(evaluate);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style', 'aria-hidden', 'aria-modal', 'inert'],
      childList: true,
      subtree: true,
    });
    evaluate();
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return open;
}
