import { useEffect, useRef, useState } from 'react';

const DEFAULT_ROOT_MARGIN = '1000px 0px';

/**
 * Mount children once the placeholder is within rootMargin of the viewport.
 * Used to defer below-the-fold homepage section DOM without changing APIs.
 */
export default function NearViewport({
  children,
  fallback,
  rootMargin = DEFAULT_ROOT_MARGIN,
}) {
  const ref = useRef(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (entered) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setEntered(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [entered, rootMargin]);

  return <div ref={ref}>{entered ? children : fallback}</div>;
}
