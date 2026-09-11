import { API_ORIGIN } from '../config/urls';

/**
 * Normalizes an image URL from the backend.
 * If the URL is relative (starts with /), it prefixes it with the API_ORIGIN.
 * If the URL is absolute but points to localhost/127.0.0.1 in production, it can also be normalized if needed.
 */
export function normalizePublicImageUrl(url) {
  if (!url || typeof url !== 'string') return url;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Absolute URLs (http:// or https://)
  if (/^https?:\/\//i.test(trimmed)) {
    // Optional: fix leaked localhost URLs in production if they appear
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      if (trimmed.includes('://127.0.0.1') || trimmed.includes('://localhost')) {
         // Replace with production API origin
         try {
           const parsed = new URL(trimmed);
           return `${API_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
         } catch {
           return trimmed;
         }
      }
    }
    return trimmed;
  }

  // Relative URLs
  if (trimmed.startsWith('/') || (!trimmed.startsWith('http') && !trimmed.startsWith('data:'))) {
    const prefix = API_ORIGIN.replace(/\/$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${prefix}${path}`;
  }

  return trimmed;
}
