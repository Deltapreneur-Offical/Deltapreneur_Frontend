import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollAllContainersToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelector('[data-app-layout-scroll]')?.scrollTo(0, 0);
}

/** Reset scroll when route changes (e.g. Home → Operations dashboard). */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    scrollAllContainersToTop();
    // AppLayout may mount after lazy route load — run again next frame.
    const id = requestAnimationFrame(scrollAllContainersToTop);
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
