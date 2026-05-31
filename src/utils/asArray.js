/**
 * Coerce API payloads to an array (handles raw arrays, { data: [] }, Spring { content: [] }).
 */
export function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload == null || typeof payload !== 'object') return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.data != null && typeof payload.data === 'object') {
    return asArray(payload.data);
  }
  return [];
}

/** Admin list endpoints: array, { data }, or axios body nested under .data */
export function extractAdminList(responseData) {
  return asArray(responseData);
}
