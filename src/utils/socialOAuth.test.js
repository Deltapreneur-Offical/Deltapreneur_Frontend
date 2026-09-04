import { afterEach, describe, expect, it, vi } from 'vitest';
import { startGoogleOAuth } from './socialOAuth';

describe('socialOAuth return_origin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends allow-listed deltapreneur origin and api.deltapreneur.com', () => {
    const location = {
      origin: 'https://deltapreneur.com',
      hostname: 'deltapreneur.com',
      href: 'https://deltapreneur.com/login',
    };
    vi.stubGlobal('window', {
      ...window,
      location,
    });

    startGoogleOAuth();

    expect(location.href).toBe(
      'https://api.deltapreneur.com/oauth2/authorization/google?return_origin=https%3A%2F%2Fdeltapreneur.com',
    );
  });
});
