import { describe, expect, it } from 'vitest';
import {
  allowedReturnOrigin,
  productionApiOriginForHost,
} from './urls';

describe('production host mapping', () => {
  it('maps CoBrother SPA hosts to backend.cobrother.com', () => {
    expect(productionApiOriginForHost('cobrother.com')).toBe(
      'https://backend.cobrother.com',
    );
    expect(productionApiOriginForHost('www.cobrother.com')).toBe(
      'https://backend.cobrother.com',
    );
  });

  it('maps Deltapreneur SPA hosts to backend.hubregistrar.com', () => {
    expect(productionApiOriginForHost('hubregistrar.com')).toBe(
      'https://backend.hubregistrar.com',
    );
    expect(productionApiOriginForHost('www.hubregistrar.com')).toBe(
      'https://backend.hubregistrar.com',
    );
  });

  it('does not map API hosts or unknown domains', () => {
    expect(productionApiOriginForHost('backend.cobrother.com')).toBeNull();
    expect(productionApiOriginForHost('localhost')).toBeNull();
    expect(productionApiOriginForHost('evil.example')).toBeNull();
  });
});

describe('allowedReturnOrigin', () => {
  it('allows cobrother and hubregistrar HTTPS origins', () => {
    expect(allowedReturnOrigin('https://cobrother.com')).toBe(
      'https://cobrother.com',
    );
    expect(allowedReturnOrigin('https://www.hubregistrar.com/')).toBe(
      'https://www.hubregistrar.com',
    );
  });

  it('rejects open redirects', () => {
    expect(allowedReturnOrigin('https://evil.example')).toBeNull();
    expect(allowedReturnOrigin('javascript:alert(1)')).toBeNull();
    expect(allowedReturnOrigin('https://backend.cobrother.com')).toBeNull();
  });
});
