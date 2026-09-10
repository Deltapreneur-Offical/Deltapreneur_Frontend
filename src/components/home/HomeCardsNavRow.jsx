import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HomePreviewRow from './HomePreviewRow';
import '../../styles/home-cards-nav.css';

/**
 * Homepage card strip with left/right paging — same control as Delta Registrations.
 * Arrows render only when cards overflow the visible row.
 * @param {string} [accent] section theme: domain | venture | coventure | auction | technology | operations | community | assistance
 */
export default function HomeCardsNavRow({
  children,
  accent = 'domain',
  ariaLabel,
  className = '',
  rowClassName = '',
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const wrapRef = useRef(null);
  const scrollTargetRef = useRef(null);

  const getPreviewRow = useCallback(() => (
    wrapRef.current?.querySelector('.home-preview-row') || null
  ), []);

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
    const el = getPreviewRow();
    const wrap = wrapRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setHasOverflow(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    const overflows = max > 2;
    setHasOverflow(overflows);
    setCanScrollLeft(overflows && el.scrollLeft > 2);
    setCanScrollRight(overflows && el.scrollLeft < max - 2);

    if (wrap) {
      const wrapRect = wrap.getBoundingClientRect();
      const card = wrap.querySelector('.home-preview-row__item');
      if (card) {
        const cardRect = card.getBoundingClientRect();
        const center = cardRect.top - wrapRect.top + cardRect.height / 2;
        wrap.style.setProperty('--home-nav-center', `${Math.round(center)}px`);
      }
      wrap.style.removeProperty('--home-nav-inset-left');
      wrap.style.removeProperty('--home-nav-inset-right');
    }
  }, [getPreviewRow]);

  const scrollCards = useCallback((dir) => {
    const el = getPreviewRow();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (maxScroll <= 2) return;
    const from = scrollTargetRef.current == null ? el.scrollLeft : scrollTargetRef.current;
    const next = Math.min(maxScroll, Math.max(0, from + dir * getPageStep(el)));
    scrollTargetRef.current = next;
    el.scrollTo({ left: next, behavior: 'smooth' });
    setCanScrollLeft(next > 2);
    setCanScrollRight(next < maxScroll - 2);
  }, [getPreviewRow, getPageStep]);

  useLayoutEffect(() => {
    const el = getPreviewRow();
    if (!el) return undefined;

    updateNavState();
    const rafId = requestAnimationFrame(updateNavState);
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
        hasOverflow ? '' : 'home-cards-nav-wrap--no-overflow',
        className,
      ].filter(Boolean).join(' ')}
      role="region"
      aria-label={ariaLabel}
    >
      {hasOverflow ? (
        <button
          type="button"
          className="home-cards-nav home-cards-nav--prev"
          onClick={() => scrollCards(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll cards left"
        >
          <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
      <HomePreviewRow className={`home-cards-nav-row${rowClassName ? ` ${rowClassName}` : ''}`}>
        {children}
      </HomePreviewRow>
      {hasOverflow ? (
        <button
          type="button"
          className="home-cards-nav home-cards-nav--next"
          onClick={() => scrollCards(1)}
          disabled={!canScrollRight}
          aria-label="Scroll cards right"
        >
          <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
