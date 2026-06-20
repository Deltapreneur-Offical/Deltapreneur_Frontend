/**
 * Probe backend DB readiness in dev (via Vite proxy to /ready).
 * Returns true when the database is reachable; false on 503 or network failure.
 */
export async function checkBackendDatabaseReady() {
  if (!import.meta.env.DEV) {
    return true;
  }

  try {
    const response = await fetch('/ready', {
      credentials: 'include',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const DATABASE_UNAVAILABLE_HINT =
  'Database connection failed. For local development: open CoBrother_Backend, run .\\run_rds_tunnel.ps1 (keep that window open), then run .\\run_dev.ps1 — or use .\\run_local.ps1 to start both automatically.';
