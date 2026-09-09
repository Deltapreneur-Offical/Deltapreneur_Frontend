/**
 * Probe backend DB readiness in dev (via Vite proxy to /ready).
 * Retries so a slow tunnel/backend startup does not flash a false error.
 */
export async function checkBackendDatabaseReady(options = {}) {
  if (!import.meta.env.DEV) {
    return true;
  }

  const retries = Number(options.retries ?? 10);
  const delayMs = Number(options.delayMs ?? 1500);
  const timeoutMs = Number(options.timeoutMs ?? 3000);

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;
    try {
      const response = await fetch('/ready', {
        credentials: 'include',
        cache: 'no-store',
        signal: controller?.signal,
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // retry (including abort/timeout)
    } finally {
      if (timer) window.clearTimeout(timer);
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
    }
  }

  return false;
}

export const DATABASE_UNAVAILABLE_HINT =
  'Database is not reachable. For local dev, ensure PostgreSQL is running and DATABASE_URL in CoBrother_Backend/.env is correct, then restart the backend (run_dev.ps1). For production data, run .\\run_rds_tunnel.ps1 and point DATABASE_URL at 127.0.0.1:5433.';
