import { describe, expect, it } from 'vitest';
import {
  HOMEPAGE_FEATURE_MAX,
  HOMEPAGE_FEATURE_MAX_MESSAGE,
  canAddHomepageFeature,
  remainingHomepageFeatureSlots,
} from './homepageFeatureLimit';

describe('homepageFeatureLimit', () => {
  it('allows featuring when count is 0–7', () => {
    expect(canAddHomepageFeature(0)).toBe(true);
    expect(canAddHomepageFeature(7)).toBe(true);
  });

  it('blocks featuring a 9th item when count is 8', () => {
    expect(canAddHomepageFeature(8)).toBe(false);
    expect(canAddHomepageFeature(9)).toBe(false);
  });

  it('reports remaining slots per section independently', () => {
    expect(remainingHomepageFeatureSlots(0)).toBe(HOMEPAGE_FEATURE_MAX);
    expect(remainingHomepageFeatureSlots(7)).toBe(1);
    expect(remainingHomepageFeatureSlots(8)).toBe(0);
  });

  it('uses the required admin warning copy', () => {
    expect(HOMEPAGE_FEATURE_MAX_MESSAGE).toBe(
      'Maximum 8 featured items allowed. Please unfeature one item before featuring another.',
    );
  });
});
