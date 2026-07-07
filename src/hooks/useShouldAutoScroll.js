import { useState, useEffect } from 'react';

export function useShouldAutoScroll(itemCount) {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (width >= 1200) {
    return itemCount > 4;
  }
  if (width >= 1024) {
    return itemCount > 3;
  }
  if (width >= 768) {
    return itemCount > 2;
  }
  return itemCount > 1;
}
