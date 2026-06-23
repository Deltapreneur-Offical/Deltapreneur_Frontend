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
});
