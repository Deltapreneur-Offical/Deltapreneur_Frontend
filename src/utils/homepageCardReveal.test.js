import { describe, expect, it } from 'vitest';
import { HOMEPAGE_PREVIEW_LIMIT } from './homepageListings';
import {
  DOMAINS_HOME_PREVIEW_LIMIT,
  DOMAINS_HOME_VISIBLE,
  REGISTRATIONS_HOME_PREVIEW_LIMIT,
  REGISTRATIONS_HOME_VISIBLE,
  initialHomepageReveal,
  nextHomepageReveal,
} from './homepageCardReveal';

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

  it('uses 5 then 5 up to 10 for Domains / Delta Domains', () => {
    expect(initialHomepageReveal(4, DOMAINS_HOME_VISIBLE, DOMAINS_HOME_PREVIEW_LIMIT)).toBe(4);
    expect(initialHomepageReveal(10, DOMAINS_HOME_VISIBLE, DOMAINS_HOME_PREVIEW_LIMIT)).toBe(5);
    expect(nextHomepageReveal(5, 10, DOMAINS_HOME_VISIBLE, DOMAINS_HOME_PREVIEW_LIMIT)).toBe(10);
    expect(nextHomepageReveal(5, 50, DOMAINS_HOME_VISIBLE, DOMAINS_HOME_PREVIEW_LIMIT)).toBe(
      DOMAINS_HOME_PREVIEW_LIMIT,
    );
  });

  it('uses 5 then 5 up to 10 for Delta Registrations only', () => {
    expect(initialHomepageReveal(4, REGISTRATIONS_HOME_VISIBLE, REGISTRATIONS_HOME_PREVIEW_LIMIT)).toBe(4);
    expect(initialHomepageReveal(10, REGISTRATIONS_HOME_VISIBLE, REGISTRATIONS_HOME_PREVIEW_LIMIT)).toBe(5);
    expect(nextHomepageReveal(5, 10, REGISTRATIONS_HOME_VISIBLE, REGISTRATIONS_HOME_PREVIEW_LIMIT)).toBe(10);
    expect(nextHomepageReveal(5, 50, REGISTRATIONS_HOME_VISIBLE, REGISTRATIONS_HOME_PREVIEW_LIMIT)).toBe(
      REGISTRATIONS_HOME_PREVIEW_LIMIT,
    );
  });
});
