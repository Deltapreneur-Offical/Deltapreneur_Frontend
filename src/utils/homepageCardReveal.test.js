import { describe, expect, it } from 'vitest';
import { HOMEPAGE_PREVIEW_LIMIT } from './homepageListings';
import { initialHomepageReveal, nextHomepageReveal } from './homepageCardReveal';

describe('homepageCardReveal', () => {
  it('shows all items when there are 4 or fewer', () => {
    expect(initialHomepageReveal(0)).toBe(0);
    expect(initialHomepageReveal(3)).toBe(3);
    expect(initialHomepageReveal(4)).toBe(4);
  });

  it('shows 4 first when more than 4 items exist', () => {
    expect(initialHomepageReveal(8)).toBe(4);
    expect(initialHomepageReveal(20)).toBe(4);
  });

  it('reveals the next 4 up to the homepage cap', () => {
    expect(nextHomepageReveal(4, 8)).toBe(8);
    expect(nextHomepageReveal(4, 6)).toBe(6);
    expect(nextHomepageReveal(8, 8)).toBe(8);
    expect(nextHomepageReveal(4, 50)).toBe(HOMEPAGE_PREVIEW_LIMIT);
  });
});
