import { afterEach, describe, expect, it, vi } from 'vitest';
import { startGoogleOAuth } from './socialOAuth';

describe('socialOAuth return_origin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends allow-listed cobrother origin and cobrother API host', () => {
    const location = {
      origin: 'https://cobrother.com',
      hostname: 'cobrother.com',
      href: 'https://cobrother.com/login',
    };
    vi.stubGlobal('window', {
      ...window,
      location,
    });

    startGoogleOAuth();

    expect(location.href).toBe(
      'https://backend.cobrother.com/oauth2/authorization/google?return_origin=https%3A%2F%2Fcobrother.com',
    );
  });

  it('sends allow-listed hubregistrar origin and hub API host', () => {
    const location = {
      origin: 'https://hubregistrar.com',
      hostname: 'hubregistrar.com',
      href: 'https://hubregistrar.com/login',
    };
    vi.stubGlobal('window', {
      ...window,
      location,
    });

    startGoogleOAuth();

    expect(location.href).toBe(
      'https://backend.hubregistrar.com/oauth2/authorization/google?return_origin=https%3A%2F%2Fhubregistrar.com',
    );
  });
});
