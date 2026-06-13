import { Children, cloneElement, isValidElement, useEffect, useState } from 'react';

/**
 * Horizontally auto-scrolling row. Duplicates children for a seamless infinite loop.
 * Pauses on hover; respects prefers-reduced-motion.
 */
export default function HomeAutoScrollRow({
  children,
  className = '',
  durationSec = 45,
  ariaLabel,
  minItemsToScroll = 6,
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const items = Children.toArray(children).filter(Boolean);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (items.length === 0) return null;

  // Only animate when card count exceeds 5 (6+). Otherwise render a static row.
  const shouldLoop = !reduceMotion && items.length >= minItemsToScroll;

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

  return (
    <div
      className={`home-auto-scroll-row${className ? ` ${className}` : ''}`}
      style={style}
      aria-label={ariaLabel}
    >
      <div className="home-auto-scroll-row__viewport">
        <div
          className={`home-auto-scroll-row__track${shouldLoop ? '' : ' home-auto-scroll-row__track--static'}`}
        >
          {renderTrack()}
          {shouldLoop ? renderTrack('dup') : null}
        </div>
      </div>
    </div>
  );
}

export function HomeAutoScrollRowItem({ children, className = '' }) {
  return (
    <div className={`home-auto-scroll-row__item${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
