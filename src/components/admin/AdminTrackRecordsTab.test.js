import { beforeEach, describe, expect, it } from 'vitest';
import { isTrackRecordsCurrentSessionLost } from './AdminTrackRecordsTab';
import { setStoredAccessToken } from '../../utils/authSession';

describe('isTrackRecordsCurrentSessionLost', () => {
  beforeEach(() => {
    setStoredAccessToken(null);
  });

  it('is false for a 401 while a live access token still exists', () => {
    setStoredAccessToken('fresh-access');
    expect(
      isTrackRecordsCurrentSessionLost({
        response: { status: 401, data: { detail: 'Session expired. Please sign in again.' } },
      }),
    ).toBe(false);
  });

  it('is true for a 401 only after the live token is gone', () => {
    expect(
      isTrackRecordsCurrentSessionLost({
        response: { status: 401, data: { detail: 'Session expired. Please sign in again.' } },
      }),
    ).toBe(true);
  });

  it('is false for non-401 errors', () => {
    expect(
      isTrackRecordsCurrentSessionLost({
        response: { status: 500, data: { detail: 'sync failed' } },
      }),
    ).toBe(false);
  });
});
