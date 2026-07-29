import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { homeRowReveal, homeViewport } from './motion/homeMotion';
import { IS_IPHONE } from '../../utils/deviceDetection';

/**
 * True for duplicated (aria-hidden) carousel copies. Cards read this to skip
 * expensive per-instance work — image decoding, 1s countdown timers — that
 * otherwise runs 3× per visible card and can crash iOS Safari.
 */
const CarouselCloneContext = createContext(false);

export function useIsCarouselClone() {
  return useContext(CarouselCloneContext);
}

/**
 * Horizontally auto-scrolling row with infinite manual scroll.
 *
 * Strategy:
 *  - Renders 3 identical copies of children: [A][B][C]
 *  - Auto-scroll CSS animation moves by -33.333% (one set width) — seamless loop.
 *  - Manual touch: viewport overflow-x is enabled, initial scrollLeft is set to
 *    oneSetWidth (pointing at copy [B]) so user can swipe LEFT or RIGHT.
 *    A requestAnimationFrame loop silently teleports scrollLeft when it drifts
 *    outside the middle-copy range, creating seamless infinite scroll.
 */
export default function HomeAutoScrollRow({
  children,
  className = '',
  durationSec = 45,
  ariaLabel,
  onlyWhenOverflow = false,
}) {
  const prefersReducedMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(!onlyWhenOverflow);
  const [isPaused, setIsPaused] = useState(false);
  const [isOffscreen, setIsOffscreen] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );

  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const rootRef = useRef(null);

  // Touch drag state
  const touchStartX = useRef(null);
  const touchLastX = useRef(null);
  const isDragging = useRef(false);
  const resumeTimer = useRef(null);
  const rafId = useRef(null);
  const oneSetWidthRef = useRef(0);

  const items = Children.toArray(children).filter(Boolean);

  // ── Reduced-motion listener ──────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // ── Pause auto-scroll when off-screen or tab hidden (iOS Safari) ──────────
  useEffect(() => {
    const onVisibility = () => setIsPageHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsOffscreen(!entry.isIntersecting),
      { root: null, rootMargin: '80px 0px', threshold: 0 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // ── Overflow detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!onlyWhenOverflow) {
      setHasOverflow(true);
      return undefined;
    }
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return undefined;

    const measure = () => {
      setHasOverflow(track.scrollWidth > viewport.clientWidth + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [onlyWhenOverflow, items.length]);

  // ── Measure one-set width (⅓ of total track) for teleport math ───────────
  const measureOneSet = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    // Track holds 3 copies; one set = total / 3
    return Math.round(track.scrollWidth / 3);
  }, []);

  // ── Infinite teleport loop (RAF) ─────────────────────────────────────────
  // Keeps scrollLeft inside [oneSet * 0.5 … oneSet * 1.5] invisibly.
  const startInfiniteLoop = useCallback(() => {
    const loop = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const oneSet = oneSetWidthRef.current;
      if (oneSet === 0) return;

      const sl = viewport.scrollLeft;
      if (sl < oneSet * 0.5) {
        // Teleport: jumped too far left → jump one set to the right
        viewport.scrollLeft = sl + oneSet;
      } else if (sl > oneSet * 1.5) {
        // Teleport: jumped too far right → jump one set to the left
        viewport.scrollLeft = sl - oneSet;
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
  }, []);

  const stopInfiniteLoop = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  // ── Pause / resume helpers ───────────────────────────────────────────────
  const pauseAnim = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    setIsPaused(true);
  }, []);

  const resumeAnim = useCallback((delayMs = 0) => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      setIsPaused(false);
      stopInfiniteLoop();
    }, delayMs);
  }, [stopInfiniteLoop]);

  // When isPaused switches on, initialise viewport scroll position + start loop
  useEffect(() => {
    if (!isPaused) return undefined;
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const oneSet = measureOneSet();
    oneSetWidthRef.current = oneSet;

    // Centre on the middle copy so user can swipe either direction
    viewport.scrollLeft = oneSet;

    startInfiniteLoop();
    return () => stopInfiniteLoop();
  }, [isPaused, measureOneSet, startInfiniteLoop, stopInfiniteLoop]);

  // ── Mouse wheel → horizontal scroll ─────────────────────────────────────
  const handleWheel = useCallback(
    (e) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        pauseAnim();
        viewport.scrollLeft += e.deltaX;
        resumeAnim(1500);
      }
    },
    [pauseAnim, resumeAnim],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Touch events ─────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e) => {
      pauseAnim();
      isDragging.current = true;
      touchStartX.current = e.touches[0].clientX;
      touchLastX.current = e.touches[0].clientX;
    },
    [pauseAnim],
  );

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const dx = touchLastX.current - e.touches[0].clientX;
    touchLastX.current = e.touches[0].clientX;
    viewport.scrollLeft += dx;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    resumeAnim(1200);
  }, [resumeAnim]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => () => {
    stopInfiniteLoop();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, [stopInfiniteLoop]);

  if (items.length === 0) return null;

  // iPhone WebKit kills the tab once several cloned marquee rows are mounted
  // (3x DOM + compositor layers). Render a plain swipeable row there instead;
  // all other platforms keep the animated infinite carousel.
  const shouldAnimate = hasOverflow && !reduceMotion && !IS_IPHONE;
  const fitsInViewport = onlyWhenOverflow && !hasOverflow;

  // Render helper — 3 copies needed for infinite manual scroll.
  // Duplicate sets are aria-hidden; the clone context lets nested cards skip
  // per-instance image decoding and timers (see useIsCarouselClone).
  const renderSet = (prefix = '') =>
    items.map((child, index) => {
      if (!isValidElement(child)) return child;
      const baseKey = child.key ?? `item-${index}`;
      const isClone = Boolean(prefix);
      return cloneElement(child, {
        key: prefix ? `${prefix}-${baseKey}` : baseKey,
        'aria-hidden': isClone ? true : undefined,
      });
    });

  const style = {
    '--home-auto-scroll-duration': `${durationSec}s`,
  };

  const animPaused = isPaused || isOffscreen || isPageHidden;

  const rootClassName = [
    'home-auto-scroll-row',
    fitsInViewport ? 'home-auto-scroll-row--fits' : '',
    IS_IPHONE ? 'home-auto-scroll-row--iphone' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const viewportClassName = [
    'home-auto-scroll-row__viewport',
    isPaused && shouldAnimate ? 'home-auto-scroll-row__viewport--scrollable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const trackClassName = [
    'home-auto-scroll-row__track',
    !shouldAnimate ? 'home-auto-scroll-row__track--static' : '',
    shouldAnimate && animPaused ? 'home-auto-scroll-row__track--paused' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const RootTag = prefersReducedMotion ? 'div' : motion.div;
  const rootMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: homeViewport,
        variants: homeRowReveal,
      };

  return (
    <RootTag
      ref={rootRef}
      className={rootClassName}
      style={style}
      aria-label={ariaLabel}
      {...rootMotionProps}
      onMouseEnter={shouldAnimate ? pauseAnim : undefined}
      onMouseLeave={shouldAnimate ? () => resumeAnim(0) : undefined}
      onTouchStart={shouldAnimate ? handleTouchStart : undefined}
      onTouchMove={shouldAnimate ? handleTouchMove : undefined}
      onTouchEnd={shouldAnimate ? handleTouchEnd : undefined}
      onTouchCancel={shouldAnimate ? handleTouchEnd : undefined}
    >
      <div className={viewportClassName} ref={viewportRef}>
        <div className={trackClassName} ref={trackRef}>
          {/* 3 identical sets: [A][B][C] — manual scroll starts at B.
              Copies [B][C] render under the clone context so their cards skip
              image decoding + timers (iOS Safari memory safety). */}
          <div className="home-auto-scroll-row__set">{renderSet()}</div>
          {shouldAnimate ? (
            <CarouselCloneContext.Provider value={true}>
              <div className="home-auto-scroll-row__set">{renderSet('dup1')}</div>
              <div className="home-auto-scroll-row__set">{renderSet('dup2')}</div>
            </CarouselCloneContext.Provider>
          ) : null}
        </div>
      </div>
    </RootTag>
  );
}

export function HomeAutoScrollRowItem({ children, className = '', ...rest }) {
  return (
    <div className={`home-auto-scroll-row__item${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}
