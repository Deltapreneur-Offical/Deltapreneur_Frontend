import { describe, expect, it } from 'vitest';
import { shouldClearSessionOnVentureApiError } from './NewVenturePage';

describe('shouldClearSessionOnVentureApiError', () => {
  it('never treats 403 as a reason to destroy the session', () => {
    expect(shouldClearSessionOnVentureApiError(403, 'valid-access')).toBe(false);
    expect(shouldClearSessionOnVentureApiError(403, null)).toBe(false);
  });

  it('does not clear a 401 when the current access token is still present', () => {
    expect(shouldClearSessionOnVentureApiError(401, 'valid-access')).toBe(false);
  });

  it('allows login redirect on 401 only when no access token remains', () => {
    expect(shouldClearSessionOnVentureApiError(401, null)).toBe(true);
  });

  it('ignores non-auth errors', () => {
    expect(shouldClearSessionOnVentureApiError(500, 'valid-access')).toBe(false);
    expect(shouldClearSessionOnVentureApiError(undefined, null)).toBe(false);
  });
});
