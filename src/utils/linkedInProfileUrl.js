const INVALID_LINKEDIN_PROFILE_RE =
  /linkedin\.com\/(?:oauth|login|uas|checkpoint|legal|help|authwall|sharing)(?:\/|$|\?)/i;

export const LINKEDIN_PROFILE_URL_REQUIRED = 'LinkedIn Profile URL is required.';
export const LINKEDIN_PROFILE_URL_INVALID = 'Please enter a valid LinkedIn profile URL.';

export function isValidLinkedInProfileUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed || INVALID_LINKEDIN_PROFILE_RE.test(trimmed)) return false;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, '')}`;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'linkedin.com') return false;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2 || segments[0].toLowerCase() !== 'in') return false;

    const slug = segments[1];
    if (!slug || !/^[\w%-]+$/i.test(slug)) return false;
    if (segments.length > 2) return false;

    return true;
  } catch {
    return false;
  }
}

export function validateLinkedInProfileUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return LINKEDIN_PROFILE_URL_REQUIRED;
  if (!isValidLinkedInProfileUrl(trimmed)) return LINKEDIN_PROFILE_URL_INVALID;
  return null;
}
