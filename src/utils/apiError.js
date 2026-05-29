/** Extract a user-visible message from axios/FastAPI error responses. */
export function readApiError(err, fallback = 'Something went wrong. Please try again.') {
  const payload = err?.response?.data;
  if (typeof payload === 'string') return payload;
  if (payload?.message && payload.message !== 'Validation failed') return payload.message;
  if (payload?.error) return payload.error;
  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((x) => x?.msg || String(x)).join(', ');
  }
  if (Array.isArray(payload?.data)) {
    return payload.data.map((x) => x?.message || x?.field || String(x)).join(', ');
  }
  if (!err?.response && err?.message) return err.message;
  return fallback;
}
