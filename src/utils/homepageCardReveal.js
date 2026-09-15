import { useEffect, useState } from 'react';
import { asArray } from './asArray';
import { HOMEPAGE_PREVIEW_LIMIT } from './homepageListings';

/** First page of homepage carousel cards. */
export const HOMEPAGE_VISIBLE_INITIAL = 4;

export function initialHomepageReveal(itemCount) {
  const total = Math.max(0, Math.min(HOMEPAGE_PREVIEW_LIMIT, Number(itemCount) || 0));
  return Math.min(total, HOMEPAGE_VISIBLE_INITIAL);
}

export function nextHomepageReveal(currentRevealed, itemCount) {
  const total = Math.max(0, Math.min(HOMEPAGE_PREVIEW_LIMIT, Number(itemCount) || 0));
  const shown = Math.max(0, Number(currentRevealed) || 0);
  return Math.min(total, shown + HOMEPAGE_VISIBLE_INITIAL);
}

/** Show 4 homepage cards first; reveal the next 4 on demand. Fetched list stays unchanged. */
export function useHomepageCardReveal(items) {
  const list = asArray(items);
  const total = Math.min(list.length, HOMEPAGE_PREVIEW_LIMIT);
  const [revealed, setRevealed] = useState(() => initialHomepageReveal(total));

  useEffect(() => {
    setRevealed(initialHomepageReveal(total));
  }, [total]);

  const shown = Math.min(revealed, total);
  return {
    visible: list.slice(0, shown),
    hasMore: shown < total,
    revealMore: () => setRevealed((current) => nextHomepageReveal(current, total)),
  };
}
