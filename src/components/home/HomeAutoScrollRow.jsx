import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { homeRowReveal, homeViewport } from './motion/homeMotion';

/**
 * Horizontally auto-scrolling row. Duplicates children for a seamless infinite loop.
 * Pauses on hover; respects prefers-reduced-motion.
 * When onlyWhenOverflow is true, stays static until the track is wider than the viewport.
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
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const items = Children.toArray(children).filter(Boolean);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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

  if (items.length === 0) return null;

  const shouldAnimate = hasOverflow && !reduceMotion;
  const fitsInViewport = onlyWhenOverflow && !hasOverflow;

  const renderTrack = (duplicatePrefix = '') =>
    items.map((child, index) => {
      if (!isValidElement(child)) return child;
      const baseKey = child.key ?? `item-${index}`;
      return cloneElement(child, {
        key: duplicatePrefix ? `${duplicatePrefix}-${baseKey}` : baseKey,
        'aria-hidden': duplicatePrefix ? true : undefined,
      });
    });

  const style = {
    '--home-auto-scroll-duration': `${durationSec}s`,
  };

  const rootClassName = [
    'home-auto-scroll-row',
    fitsInViewport ? 'home-auto-scroll-row--fits' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const trackClassName = [
    'home-auto-scroll-row__track',
    !shouldAnimate ? 'home-auto-scroll-row__track--static' : '',
  ]
    .filter(Boolean)
    .join('');

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
    <RootTag className={rootClassName} style={style} aria-label={ariaLabel} {...rootMotionProps}>
      <div className="home-auto-scroll-row__viewport" ref={viewportRef}>
        <div className={trackClassName} ref={trackRef}>
          {renderTrack()}
          {shouldAnimate ? renderTrack('dup') : null}
        </div>
      </div>
    </RootTag>
  );
}

export function HomeAutoScrollRowItem({ children, className = '' }) {
  return (
    <div className={`home-auto-scroll-row__item${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
