/** Pick the first usable media URL from API payloads (camelCase or snake_case). */
export function pickMediaUrl(source) {
  if (!source) return null;
  if (typeof source === 'string') return source;
  return (
    source.imageUrl
    ?? source.logoUrl
    ?? source.ventureImageUrl
    ?? source.logo
    ?? source.image_url
    ?? source.venture_image_url
    ?? null
  );
}
