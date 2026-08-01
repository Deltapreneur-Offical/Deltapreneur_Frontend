import { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/overflow-marquee.css';

export default function OverflowMarqueeText({
  text,
  className = '',
  minChars = 0,
  title,
  loopStyle = 'continuous',
  plainOverflow = 'ellipsis',
  alignPlain = 'start',
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);
  const value = String(text || '');

  useEffect(() => {
    if (value.length <= minChars) {
      setOverflowing(false);
      setScrollDistance(0);
      return undefined;
    }

    const check = () => {
      const root = containerRef.current;
      const inner = textRef.current;
      if (!root || !inner) return;
      const distance = Math.max(0, inner.scrollWidth - root.clientWidth);
      const overflow = distance > 2;
      setOverflowing(overflow);
      setScrollDistance(overflow ? distance : 0);
    };

    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [value, minChars]);

  const duration = useMemo(() => {
    if (loopStyle === 'pause') {
      const scrollSeconds = Math.max(6, scrollDistance / 22);
      const pauseSeconds = 1.5;
      return `${scrollSeconds * 2 + pauseSeconds * 2}s`;
    }
    return `${Math.max(8, value.length * 0.35)}s`;
  }, [loopStyle, scrollDistance, value.length]);

  const marqueeStyle = useMemo(() => {
    const style = { '--cb-marquee-duration': duration };
    if (loopStyle === 'pause' && scrollDistance > 0) {
      style['--cb-marquee-distance'] = `-${scrollDistance}px`;
    }
    return style;
  }, [duration, loopStyle, scrollDistance]);

  const rootClassName = [
    'cb-overflow-marquee',
    loopStyle === 'pause' ? 'cb-overflow-marquee--pause-loop' : '',
    plainOverflow === 'clip' ? 'cb-overflow-marquee--plain-clip' : '',
    alignPlain === 'center' ? 'cb-overflow-marquee--plain-center' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      ref={containerRef}
      className={rootClassName}
      title={title || value}
      style={marqueeStyle}
    >
      <span ref={textRef} className="cb-overflow-marquee__measure" aria-hidden>
        {value}
      </span>
      {overflowing ? (
        loopStyle === 'pause' ? (
          <span className="cb-overflow-marquee__track cb-overflow-marquee__track--pause">
            <span className="cb-overflow-marquee__item">{value}</span>
          </span>
        ) : (
          <span className="cb-overflow-marquee__track">
            <span className="cb-overflow-marquee__item">{value}</span>
            <span className="cb-overflow-marquee__item" aria-hidden>{value}</span>
          </span>
        )
      ) : (
        <span className="cb-overflow-marquee__plain">{value}</span>
      )}
    </span>
  );
}
