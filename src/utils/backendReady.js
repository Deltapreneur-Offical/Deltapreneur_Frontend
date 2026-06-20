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

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch('/api/v1/domain/all?page=1&page_size=1', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // retry
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
  'Local database is offline. From the project root run .\\start_both.ps1 (starts the RDS tunnel and dev servers). Cards and sign-in use production data automatically if the tunnel cannot connect.';
