/** Unwrap HubRegistrar API bodies: `{ success, data }` or plain payloads. */
export function unwrapApiData(response) {
  const body = response?.data ?? response;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data;
  }
  return body;
}

export function unwrapApiList(response) {
  const payload = unwrapApiData(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}
