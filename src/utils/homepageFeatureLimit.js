/** Max featured listings per Admin → Homepage Features section (not global). */
export const HOMEPAGE_FEATURE_MAX = 8;

export const HOMEPAGE_FEATURE_MAX_MESSAGE =
  'Maximum 8 featured items allowed. Please unfeature one item before featuring another.';

export function canAddHomepageFeature(currentCount) {
  return Number(currentCount) < HOMEPAGE_FEATURE_MAX;
}

export function remainingHomepageFeatureSlots(currentCount) {
  return Math.max(0, HOMEPAGE_FEATURE_MAX - Math.max(0, Number(currentCount) || 0));
}
