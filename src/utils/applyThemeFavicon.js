/** Chrome ignores href updates on an existing favicon link. Replace the tag. */
function withDevCacheBust(href) {
  if (!href || !import.meta.env.DEV) return href;
  const join = href.includes('?') ? '&' : '?';
  return `${href}${join}v=${Date.now()}`;
}

export function applyThemeFavicon(lightHref, darkHref) {
  if (typeof document === 'undefined') return;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    .forEach((node) => node.remove());

  const link = document.createElement('link');
  link.id = 'dynamic-favicon';
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = withDevCacheBust(isDark ? darkHref : lightHref);
  document.head.appendChild(link);
}
