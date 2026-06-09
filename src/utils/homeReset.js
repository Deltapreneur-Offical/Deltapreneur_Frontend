export const HOME_RESET_EVENT = 'cobrother:home-reset';

/** Scroll to top and notify home-page widgets (search, etc.) to reset. */
export function triggerHomeReset() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.dispatchEvent(new CustomEvent(HOME_RESET_EVENT));
}
