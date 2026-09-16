import { useEffect, useState } from 'react';
import { asArray } from './asArray';
import { HOMEPAGE_PREVIEW_LIMIT } from './homepageListings';

/** First page of homepage carousel cards. */
export const HOMEPAGE_VISIBLE_INITIAL = 4;

/** Domains + Delta Domains: show 5 across on desktop (same idea as registrations). */
export const DOMAINS_HOME_VISIBLE = 5;
export const DOMAINS_HOME_PREVIEW_LIMIT = 10;

/** Delta Registrations cards are smaller, so this section uses 5+5. */
export const REGISTRATIONS_HOME_VISIBLE = 5;
export const REGISTRATIONS_HOME_PREVIEW_LIMIT = 10;

export function initialHomepageReveal(
  itemCount,
  pageSize = HOMEPAGE_VISIBLE_INITIAL,
  previewLimit = HOMEPAGE_PREVIEW_LIMIT,
) {
  const total = Math.max(0, Math.min(previewLimit, Number(itemCount) || 0));
  return Math.min(total, pageSize);
}

export function nextHomepageReveal(
  currentRevealed,
  itemCount,
  pageSize = HOMEPAGE_VISIBLE_INITIAL,
  previewLimit = HOMEPAGE_PREVIEW_LIMIT,
) {
  const total = Math.max(0, Math.min(previewLimit, Number(itemCount) || 0));
  const shown = Math.max(0, Number(currentRevealed) || 0);
  return Math.min(total, shown + pageSize);
}

/** Show a page of homepage cards first; reveal the next page on demand. Fetched list stays unchanged. */
export function useHomepageCardReveal(items, options = {}) {
  const pageSize = options.pageSize ?? HOMEPAGE_VISIBLE_INITIAL;
  const previewLimit = options.previewLimit ?? HOMEPAGE_PREVIEW_LIMIT;
  const list = asArray(items);
  const total = Math.min(list.length, previewLimit);
  const [revealed, setRevealed] = useState(() => initialHomepageReveal(total, pageSize, previewLimit));

  useEffect(() => {
    setRevealed(initialHomepageReveal(total, pageSize, previewLimit));
  }, [total, pageSize, previewLimit]);

  const shown = Math.min(revealed, total);
  return {
    visible: list.slice(0, shown),
    hasMore: shown < total,
    revealMore: () => setRevealed((current) => nextHomepageReveal(current, total, pageSize, previewLimit)),
  };
}
