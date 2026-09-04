import { describe, expect, it } from 'vitest';
import {
  allowedReturnOrigin,
  productionApiOriginForHost,
} from './urls';

describe('production host mapping', () => {
  it('maps Deltapreneur SPA hosts to api.deltapreneur.com', () => {
    expect(productionApiOriginForHost('deltapreneur.com')).toBe(
      'https://api.deltapreneur.com',
    );
    expect(productionApiOriginForHost('www.deltapreneur.com')).toBe(
      'https://api.deltapreneur.com',
    );
  });

  it('does not map CoBrother or HubRegistrar hosts', () => {
    expect(productionApiOriginForHost('cobrother.com')).toBeNull();
    expect(productionApiOriginForHost('hubregistrar.com')).toBeNull();
  });

  it('does not map API hosts or unknown domains', () => {
    expect(productionApiOriginForHost('api.deltapreneur.com')).toBeNull();
    expect(productionApiOriginForHost('backend.cobrother.com')).toBeNull();
    expect(productionApiOriginForHost('localhost')).toBeNull();
    expect(productionApiOriginForHost('evil.example')).toBeNull();
  });
});

describe('allowedReturnOrigin', () => {
  it('allows deltapreneur HTTPS origins', () => {
    expect(allowedReturnOrigin('https://deltapreneur.com')).toBe(
      'https://deltapreneur.com',
    );
    expect(allowedReturnOrigin('https://www.deltapreneur.com/')).toBe(
      'https://www.deltapreneur.com',
    );
  });

  it('rejects open redirects and other brands', () => {
    expect(allowedReturnOrigin('https://evil.example')).toBeNull();
    expect(allowedReturnOrigin('javascript:alert(1)')).toBeNull();
    expect(allowedReturnOrigin('https://api.deltapreneur.com')).toBeNull();
    expect(allowedReturnOrigin('https://backend.cobrother.com')).toBeNull();
    expect(allowedReturnOrigin('https://cobrother.com')).toBeNull();
  });
});
