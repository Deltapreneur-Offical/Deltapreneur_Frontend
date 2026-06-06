import { useSyncExternalStore } from 'react';

const MOBILE_PREVIEW_QUERY = '(max-width: 1023px)';

function subscribe(onChange) {
  const mq = window.matchMedia(MOBILE_PREVIEW_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_PREVIEW_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** True below the homepage desktop grid breakpoint (lg). */
export function useHomepageMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
