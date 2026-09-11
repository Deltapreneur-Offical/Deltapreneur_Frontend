import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scheduleScrollAppLayoutToTop } from '../../utils/preserveAppLayoutScroll';

/** Reset scroll when route changes (e.g. Home → Operations dashboard). */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    scheduleScrollAppLayoutToTop();
  }, [pathname]);

  return null;
}

/** Scroll the dashboard shell to top when an inline form/page replaces the list. */
export function useScrollAppLayoutToTopWhen(active) {
  useLayoutEffect(() => {
    if (!active) return;
    scheduleScrollAppLayoutToTop();
  }, [active]);
}
