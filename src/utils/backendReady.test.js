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

  it('skips the /ready probe in production builds', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { checkBackendDatabaseReady } = await import('./backendReady');
    await expect(checkBackendDatabaseReady()).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the local tunnel hint only in Vite dev', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    const { getDatabaseUnavailableMessage, DATABASE_UNAVAILABLE_HINT } = await import('./backendReady');
    expect(getDatabaseUnavailableMessage()).toBe(DATABASE_UNAVAILABLE_HINT);
    expect(DATABASE_UNAVAILABLE_HINT).toMatch(/Deltapreneur_Backend/);
    expect(DATABASE_UNAVAILABLE_HINT).not.toMatch(/CoBrother_Backend|run_rds_tunnel|5433/i);
  });

  it('never returns local tunnel instructions in production builds', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    const {
      getDatabaseUnavailableMessage,
      DATABASE_UNAVAILABLE_PUBLIC,
    } = await import('./backendReady');
    const message = getDatabaseUnavailableMessage();
    expect(message).toBe(DATABASE_UNAVAILABLE_PUBLIC);
    expect(message).not.toMatch(/run_rds_tunnel|CoBrother_Backend|DATABASE_URL|5433/i);
  });
});
