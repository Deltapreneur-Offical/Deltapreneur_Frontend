import { afterEach, describe, expect, it, vi } from 'vitest';

describe('checkBackendDatabaseReady', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('aborts a hung /ready probe instead of waiting forever', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    const fetchMock = vi.fn((_url, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { checkBackendDatabaseReady } = await import('./backendReady');
    const result = await checkBackendDatabaseReady({
      retries: 1,
      delayMs: 0,
      timeoutMs: 20,
    });

    expect(result).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
