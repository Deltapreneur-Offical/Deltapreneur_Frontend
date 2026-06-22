import { describe, expect, it } from 'vitest';
import { getAppBackTarget, shouldShowAppLayoutBack } from './appNavigation';

describe('appNavigation', () => {
  it('hides back button on hub routes', () => {
    expect(getAppBackTarget('/dashboard')).toBeNull();
  });

  it('maps technology auction routes back to auctions', () => {
    expect(getAppBackTarget('/technology/roadmap')).toEqual({
      to: '/technology',
      label: 'Back to Technology',
    });
  });

  it('knows when the back button should be shown', () => {
    expect(shouldShowAppLayoutBack('/ventures/new')).toBe(false);
    expect(shouldShowAppLayoutBack('/technology/roadmap')).toBe(true);
  });
});
