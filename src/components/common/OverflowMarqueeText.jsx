import { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/overflow-marquee.css';

export default function OverflowMarqueeText({
  text,
  className = '',
  minChars = 20,
  title,
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const value = String(text || '');

  useEffect(() => {
    if (value.length <= minChars) {
      setOverflowing(false);
      return undefined;
    }

    const check = () => {
      const root = containerRef.current;
      const inner = textRef.current;
      if (!root || !inner) return;
      setOverflowing(inner.scrollWidth > root.clientWidth + 2);
    };

    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [value, minChars]);

  const duration = useMemo(() => `${Math.max(8, value.length * 0.35)}s`, [value.length]);

  return (
    <span
      ref={containerRef}
      className={`cb-overflow-marquee ${className}`}
      title={title || value}
      style={{ '--cb-marquee-duration': duration }}
    >
      {overflowing ? (
        <span className="cb-overflow-marquee__track">
          <span className="cb-overflow-marquee__item">{value}</span>
          <span className="cb-overflow-marquee__item" aria-hidden>{value}</span>
        </span>
      ) : (
        <span ref={textRef} className="cb-overflow-marquee__plain">{value}</span>
      )}
    </span>
  );
}
