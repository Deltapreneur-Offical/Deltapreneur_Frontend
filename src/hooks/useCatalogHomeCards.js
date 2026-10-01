import { useEffect, useState } from 'react';

const DESKTOP_AND_TABLET = '(min-width: 768px)';

/**
 * Adds `catalog-home-cards` so listing pages can reuse homepage card CSS
 * without the global homepage theme.
 * Default: tablet and desktop only. Pass `{ always: true }` to include phone.
 */
export default function useCatalogHomeCards({ always = false } = {}) {
  const [matches, setMatches] = useState(() => {
    if (always) return true;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(DESKTOP_AND_TABLET).matches;
  });

  useEffect(() => {
    if (always) {
      setMatches(true);
      return undefined;
    }
    const media = window.matchMedia(DESKTOP_AND_TABLET);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [always]);

  useEffect(() => {
    if (!matches) return undefined;
    document.body.classList.add('catalog-home-cards');
    return () => document.body.classList.remove('catalog-home-cards');
  }, [matches]);

  return matches;
}
