/** Creator (community) profile helpers — LinkedIn import fields. */

const INVALID_LINKEDIN_PROFILE_RE =
  /linkedin\.com\/(?:oauth|login|uas|checkpoint|legal|help|authwall|sharing)(?:\/|$|\?)/i;

export function getLinkedInProfileUrl(profile) {
  if (!profile) return '';
  const url = (profile.linkedInProfileUrl || profile.linked_in_profile_url || '').trim();
  if (!url || INVALID_LINKEDIN_PROFILE_RE.test(url)) return '';
  return url;
}

export function hasLinkedInAccount(profile) {
  if (!profile) return false;
  return Boolean(profile.linkedInId || profile.linked_in_id);
}
