import { Children, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HomePreviewRow from './HomePreviewRow';
import '../../styles/home-cards-nav.css';

function readRowOverflow(el) {
  const max = el.scrollWidth - el.clientWidth;
  return { overflows: max > 2, max: Math.max(0, max) };
}

/**
 * Homepage card strip with left/right paging — same control as Delta Registrations.
 * Left/right arrows scroll the visible cards; at the right edge the arrow
 * reveals more cards when a section supplies hasMore/onRevealMore.
 * @param {string} [accent] section theme: domain | venture | coventure | auction | technology | operations | community | assistance
 */
export default function HomeCardsNavRow({
  children,
  accent = 'domain',
  ariaLabel,
  className = '',
  rowClassName = '',
  hasMore = false,
  onRevealMore,
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const itemCount = Children.toArray(children).length;
  const showPrev = itemCount > 1 || hasMore;
  const prevItemCountRef = useRef(itemCount);
  const didInitScrollRef = useRef(false);
  const wrapRef = useRef(null);
  const scrollTargetRef = useRef(null);
  const navRafRef = useRef(0);
  const navFlagsRef = useRef({ left: false, right: false, overflow: false });

  const getPreviewRow = useCallback(() => (
    wrapRef.current?.querySelector('.home-preview-row') || null
  ), []);

  // Native `behavior: 'smooth'` is unreliable in some environments (embedded
  // Chromium, reduced-motion settings): the call resolves but the row never
  // moves. Animate the scroll with rAF ourselves so arrow paging always works.
  const smoothAnimRef = useRef(0);
  const animateScrollTo = useCallback((el, target) => {
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const clamped = Math.min(max, Math.max(0, target));
    const startPos = el.scrollLeft;
    const distance = Math.abs(clamped - startPos);
    if (smoothAnimRef.current) {
      window.cancelAnimationFrame(smoothAnimRef.current);
      smoothAnimRef.current = 0;
    }
    if (distance <= 2) {
      el.scrollLeft = clamped;
      scrollTargetRef.current = clamped;
      return;
    }
    const startTime = performance.now();
    const duration = Math.min(550, Math.max(240, distance * 0.45));
    const step = (now) => {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      el.scrollLeft = startPos + (clamped - startPos) * eased;
      scrollTargetRef.current = el.scrollLeft;
      if (p < 1) {
        smoothAnimRef.current = window.requestAnimationFrame(step);
      } else {
        smoothAnimRef.current = 0;
        scrollTargetRef.current = clamped;
      }
    };
    smoothAnimRef.current = window.requestAnimationFrame(step);
    // Occluded/hidden windows freeze requestAnimationFrame entirely. If the
    // row has not started moving shortly after the click, snap instantly so
    // the cards always move.
    window.setTimeout(() => {
      if (smoothAnimRef.current && Math.abs(el.scrollLeft - startPos) <= 1) {
        window.cancelAnimationFrame(smoothAnimRef.current);
        smoothAnimRef.current = 0;
        el.scrollLeft = clamped;
        scrollTargetRef.current = clamped;
      }
    }, 120);
  }, []);

  const getPageStep = useCallback((el) => {
    const item = el.querySelector('.home-preview-row__item');
    if (!item) return Math.max(1, Math.round(el.clientWidth * 0.8));
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || styles.gap) || 16;
    const pad = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const cardWidth = item.getBoundingClientRect().width;
    const stride = cardWidth + gap;
    if (stride <= 0) return Math.max(1, Math.round(el.clientWidth * 0.8));
    const usable = Math.max(0, el.clientWidth - pad);
    const visibleCount = Math.max(1, Math.floor((usable + gap) / stride));
    return visibleCount * stride;
  }, []);

  const updateNavState = useCallback(() => {
    if (navRafRef.current) return;
    navRafRef.current = window.requestAnimationFrame(() => {
      navRafRef.current = 0;
      const el = getPreviewRow();
      const wrap = wrapRef.current;
      if (!el) {
        if (navFlagsRef.current.overflow || navFlagsRef.current.left || navFlagsRef.current.right) {
          navFlagsRef.current = { left: false, right: false, overflow: false };
          setCanScrollLeft(false);
          setCanScrollRight(false);
        }
        return;
      }
      const { overflows, max } = readRowOverflow(el);
      const left = overflows && el.scrollLeft > 2;
      const right = overflows && el.scrollLeft < max - 2;
      const prev = navFlagsRef.current;
      if (prev.left !== left || prev.right !== right || prev.overflow !== overflows) {
        navFlagsRef.current = { left, right, overflow: overflows };
        setCanScrollLeft(left);
        setCanScrollRight(right);
      }

      if (wrap) {
        const wrapRect = wrap.getBoundingClientRect();
        const card = wrap.querySelector('.home-preview-row__item');
        if (card) {
          // Center the arrows on the VISIBLE card, not the item wrapper: some
          // sections (Delta Ventures) stretch wrappers taller than the card
          // (hidden shells below), which pushed the arrows too low.
          let target = card;
          let best = Number.POSITIVE_INFINITY;
          for (const child of card.querySelectorAll(':scope > *')) {
            const r = child.getBoundingClientRect();
            if (r.height > 10 && r.height < best) {
              best = r.height;
              target = child;
            }
          }
          const cardRect = target.getBoundingClientRect();
          const center = cardRect.top - wrapRect.top + cardRect.height / 2;
          wrap.style.setProperty('--home-nav-center', `${Math.round(center)}px`);
        }
        wrap.style.removeProperty('--home-nav-inset-left');
        wrap.style.removeProperty('--home-nav-inset-right');
      }
    });
  }, [getPreviewRow]);

  const shakeViewAll = useCallback(() => {
    // Arrow can't scroll further: jiggle the section's View All button so the
    // user knows where to go instead.
    const section = wrapRef.current?.closest('section');
    const target = section?.querySelector(
      '.home-section-header__view-all, .home-deltaos-services__view-all'
    );
    if (!target) return;
    target.classList.remove('home-view-all-shake');
    void target.offsetWidth; // restart the animation on rapid re-clicks
    target.classList.add('home-view-all-shake');
    window.setTimeout(() => target.classList.remove('home-view-all-shake'), 900);
  }, []);

  const scrollCards = useCallback((dir) => {    const el = getPreviewRow();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (maxScroll <= 2) {
      shakeViewAll();
      return;
    }
    const from = scrollTargetRef.current == null ? el.scrollLeft : scrollTargetRef.current;
    const next = Math.min(maxScroll, Math.max(0, from + dir * getPageStep(el)));
    animateScrollTo(el, next);
    setCanScrollLeft(next > 2);
    setCanScrollRight(next < maxScroll - 2);
  }, [animateScrollTo, getPageStep, getPreviewRow, shakeViewAll]);

  const handlePrev = useCallback(() => {
    const el = getPreviewRow();
    const maxScroll = el ? Math.max(0, el.scrollWidth - el.clientWidth) : 0;
    const atStart = !el || maxScroll <= 2 || el.scrollLeft <= 2;
    if (atStart) {
      shakeViewAll();
      return;
    }
    scrollCards(-1);
  }, [getPreviewRow, scrollCards, shakeViewAll]);

  const handleNext = useCallback(() => {    const el = getPreviewRow();
    const maxScroll = el ? Math.max(0, el.scrollWidth - el.clientWidth) : 0;
    const atEnd = !el || maxScroll <= 2 || el.scrollLeft >= maxScroll - 2;
    if (atEnd && hasMore) {
      // Reveal the next page of cards; the itemCount effect below pulls the
      // row onto the newly committed cards once they are in the DOM.
      onRevealMore?.();
      return;
    }
    if (atEnd) {
      // End of the row (or nothing to scroll): point the user at View All.
      shakeViewAll();
      return;
    }
    scrollCards(1);
  }, [getPreviewRow, hasMore, onRevealMore, scrollCards, shakeViewAll]);

  useEffect(() => {
    if (itemCount > prevItemCountRef.current) {
      // Cards were just revealed: jump to the end of the row so the new cards
      // are visible immediately. Runs after React commits the new children.
      const frame = window.setTimeout(() => {
        const el = getPreviewRow();
        if (!el) return;
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        if (max > 2) {
          el.scrollLeft = max;
          scrollTargetRef.current = max;
          setCanScrollLeft(true);
          setCanScrollRight(el.scrollLeft < max - 2);
        } else {
          // The revealed cards still fit without overflowing (wide screens /
          // mobile layouts): nothing moved visually, so point the user at
          // View All right away.
          shakeViewAll();
        }
        window.requestAnimationFrame(() => updateNavState());
      }, 60);
      prevItemCountRef.current = itemCount;
      return () => window.clearTimeout(frame);
    }
    prevItemCountRef.current = itemCount;
    return undefined;
  }, [itemCount, getPreviewRow, shakeViewAll, updateNavState]);

  useEffect(() => {
    const el = getPreviewRow();
    if (!el) return undefined;

    const rafId = requestAnimationFrame(() => {
      // DeltaOs services: ensure the track starts at the first card (no left
      // clip) — mount-time only, so reveal updates are not reset to 0.
      if (!didInitScrollRef.current) {
        didInitScrollRef.current = true;
        if (wrapRef.current?.classList.contains('home-deltaos-services-nav') && el.scrollLeft !== 0) {
          el.scrollLeft = 0;
          scrollTargetRef.current = 0;
        }
      }
      updateNavState();
    });
    scrollTargetRef.current = null;

    const onScroll = () => updateNavState();
    const onScrollEnd = () => {
      scrollTargetRef.current = el.scrollLeft;
      updateNavState();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateNavState)
      : null;
    resizeObserver?.observe(el);
    const firstCard = el.querySelector('.home-preview-row__item');
    if (firstCard) resizeObserver?.observe(firstCard);
    window.addEventListener('resize', updateNavState);

    let pointerId = null;
    let startX = 0;
    let startScroll = 0;
    let dragged = false;
    let capturing = false;

    const onPointerDown = (e) => {
      if (e.pointerType === 'touch') return;
      if (e.target.closest('.home-cards-nav')) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      dragged = false;
      capturing = false;
    };

    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) < 8) return;
      dragged = true;
      if (!capturing) {
        capturing = true;
        el.classList.add('home-cards-nav-row--dragging');
        try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      el.scrollLeft = startScroll - dx;
      scrollTargetRef.current = el.scrollLeft;
    };

    const onPointerUp = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      pointerId = null;
      el.classList.remove('home-cards-nav-row--dragging');
      if (capturing) {
        try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      capturing = false;
      if (!dragged) return;
      const blockClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        el.removeEventListener('click', blockClick, true);
      };
      el.addEventListener('click', blockClick, true);
      window.setTimeout(() => {
        el.removeEventListener('click', blockClick, true);
      }, 0);
    };

    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaX;
      scrollTargetRef.current = el.scrollLeft;
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(navRafRef.current);
      navRafRef.current = 0;
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateNavState);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.classList.remove('home-cards-nav-row--dragging');
    };
  }, [children, getPreviewRow, updateNavState]);

  return (
    <div
      ref={wrapRef}
      className={[
        'home-cards-nav-wrap',
        `home-cards-nav-wrap--${accent}`,
        showPrev ? '' : 'home-cards-nav-wrap--no-overflow',
        className,
      ].filter(Boolean).join(' ')}
      role="region"
      aria-label={ariaLabel}
    >
      {showPrev ? (
        <button
          type="button"
          className="home-cards-nav home-cards-nav--prev"
          onClick={handlePrev}
          aria-label="Scroll cards left"
        >
          <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
      <HomePreviewRow className={`home-cards-nav-row${rowClassName ? ` ${rowClassName}` : ''}`}>
        {children}
      </HomePreviewRow>
      {showPrev ? (
        <button
          type="button"
          className="home-cards-nav home-cards-nav--next"
          onClick={handleNext}
          aria-label="Scroll cards right"
        >
          <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
