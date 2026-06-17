import { useRef, useState, useEffect } from 'react';

/**
 * Renders children only when the placeholder enters (or nears) the viewport.
 * Keeps below-fold homepage sections from firing API calls on initial load.
 */
export default function LazyWhenVisible({ children, fallback = null, rootMargin = '240px' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className="min-w-0">
      {visible ? children : fallback}
    </div>
  );
}
