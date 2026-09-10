/**
 * Keeps the AppLayout scroll position stable when list content above the fold
 * changes height (e.g. prepend item + remove inline form).
 */
export function getAppLayoutScrollEl() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('[data-app-layout-scroll]');
}

export function scrollAppLayoutToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  getAppLayoutScrollEl()?.scrollTo(0, 0);
}

export function scheduleScrollAppLayoutToTop() {
  scrollAppLayoutToTop();
  if (typeof requestAnimationFrame === 'undefined') return;
  requestAnimationFrame(scrollAppLayoutToTop);
}

export function captureAppLayoutScroll() {
  const el = getAppLayoutScrollEl();
  if (!el) return null;
  return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight };
}

export function restoreAppLayoutScroll(snapshot) {
  if (!snapshot || typeof document === 'undefined') return;
  const el = document.querySelector('[data-app-layout-scroll]');
  if (!el) return;
  const delta = el.scrollHeight - snapshot.scrollHeight;
  el.scrollTop = snapshot.scrollTop + delta;
}

/** Run after DOM commit so scrollHeight reflects layout (helps listing form close + prepend). */
export function scheduleRestoreAppLayoutScroll(snapshot) {
  if (!snapshot) return;
  requestAnimationFrame(() => {
    restoreAppLayoutScroll(snapshot);
  });
}
