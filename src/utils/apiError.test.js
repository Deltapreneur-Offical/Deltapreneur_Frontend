import { describe, expect, it } from 'vitest';
import {
  extractRawApiError,
  isSafeUserFacingMessage,
  readApiError,
  sanitizeAxiosError,
  sanitizeUserErrorMessage,
} from './apiError';

describe('apiError', () => {
  it('keeps safe user-facing messages', () => {
    expect(isSafeUserFacingMessage('Invalid email or password')).toBe(true);
    expect(isSafeUserFacingMessage('Traceback (most recent call last)')).toBe(false);
  });

  it('reads nested FastAPI validation payloads', () => {
    const err = {
      response: {
        data: {
          detail: [
            { msg: 'field required' },
            { msg: 'must be positive' },
          ],
        },
      },
    };

    expect(extractRawApiError(err)).toBe('field required, must be positive');
    expect(readApiError(err, 'fallback')).toBe('field required, must be positive');
  });

  it('sanitizes internal server details', () => {
    const err = {
      config: { url: '/api/v1/ai/chat' },
      response: {
        status: 500,
        data: {
          message: 'Traceback (most recent call last)',
          error: 'sqlalchemy error',
        },
      },
    };

    const sanitized = sanitizeAxiosError(err);
    expect(sanitized.userFacingMessage).toBe('Bro is unavailable right now. Please try again in a moment.');
    expect(sanitized.response.data.message).toBe('Bro is unavailable right now. Please try again in a moment.');
    expect(sanitized.response.data.error).toBe('Bro is unavailable right now. Please try again in a moment.');
  });

  it('falls back to a network message without a response', () => {
    const err = { message: 'Network Error' };
    expect(readApiError(err)).toContain('Unable to reach the server');
  });

  it('uses AI fallback when requested', () => {
    expect(
      sanitizeUserErrorMessage('', undefined, { context: 'ai' }),
    ).toContain('Bro is unavailable');
  });

  it('does not surface local database tunnel hints', () => {
    const hint =
      'Database is not reachable. For local dev, ensure PostgreSQL is running and DATABASE_URL in CoBrother_Backend/.env is correct, then restart the backend (run_dev.ps1). For production data, run .\\run_rds_tunnel.ps1 and point DATABASE_URL at 127.0.0.1:5433.';
    expect(isSafeUserFacingMessage(hint)).toBe(false);
    expect(readApiError({
      response: { status: 503, data: { error: hint, message: hint } },
    })).toBe("We're having trouble right now. Please try again in a moment.");
  });
});
