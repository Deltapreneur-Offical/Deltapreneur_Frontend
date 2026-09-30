import { useCallback, useEffect, useRef, useState } from 'react';

export const SCROLL_IDLE_MS = 300;

/**
 * `true` while the user is scrolling (window or any inner scroll container),
 * flipping back to `false` after `idleMs` without scrolling.
 *
 * Uses one capture-phase listener because scroll events do not bubble, and the
 * logged-in app scrolls inside its own container. State only changes on the
 * start/stop transitions, never per scroll event. Horizontal-only scrolling
 * (card strips) is ignored.
 *
 * `reveal()` forces a show immediately (used by the handle) and suppresses
 * auto-hide until scrolling goes idle, so a tap during scroll does not flicker.
 */
export default function useAutoHideOnScroll({ enabled = true, idleMs = SCROLL_IDLE_MS } = {}) {
  const [scrolling, setScrolling] = useState(false);
  const scrollingRef = useRef(false);
  const suppressRef = useRef(false);
  const timerRef = useRef(null);
  const lastTopRef = useRef(new WeakMap());

  const armIdle = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      suppressRef.current = false;
      scrollingRef.current = false;
      setScrolling(false);
    }, idleMs);
  }, [idleMs]);

  const reveal = useCallback(() => {
    suppressRef.current = true;
    if (scrollingRef.current) {
      scrollingRef.current = false;
      setScrolling(false);
    }
    armIdle();
  }, [armIdle]);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return undefined;
    }

    const getTop = (target) => {
      if (
        target === document ||
        target === window ||
        target === document.documentElement ||
        target === document.body
      ) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      return target?.scrollTop ?? 0;
    };

    const onScroll = (event) => {
      const target = event.target || document;
      const key = target === document ? document.documentElement : target;
      const top = getTop(target);
      const previous = lastTopRef.current.get(key);
      lastTopRef.current.set(key, top);
      // Horizontal-only scroll: vertical offset unchanged since last event.
      if (previous !== undefined && previous === top) return;

      if (suppressRef.current) {
        armIdle();
        return;
      }

      if (!scrollingRef.current) {
        scrollingRef.current = true;
        setScrolling(true);
      }
      armIdle();
    };

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      scrollingRef.current = false;
      suppressRef.current = false;
      setScrolling(false);
    };
  }, [enabled, idleMs, armIdle]);

  return { scrolling, reveal };
}
