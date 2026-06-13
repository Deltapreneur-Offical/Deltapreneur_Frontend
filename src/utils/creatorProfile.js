/** Creator (community) profile helpers — LinkedIn import fields. */

const INVALID_LINKEDIN_PROFILE_RE =
  /linkedin\.com\/(?:oauth|login|uas|checkpoint|legal|help|authwall|sharing)(?:\/|$|\?)/i;

const REQUIRED_CREATOR_FIELDS = [
  { key: 'name', aliases: ['name'], label: 'Creator name' },
  { key: 'role', aliases: ['role'], label: 'Role' },
  { key: 'industry', aliases: ['industry'], label: 'Industry' },
  { key: 'skills', aliases: ['skills'], label: 'Skills' },
  { key: 'location', aliases: ['location'], label: 'Location' },
  { key: 'linked_in_id', aliases: ['linkedInId'], label: 'LinkedIn account' },
  { key: 'why_im_here', aliases: ['whyImHere'], label: 'Bio' },
  { key: 'expected_rate', aliases: ['expectedRate'], label: 'Expected Rate' },
];

function readProfileField(profile, field) {
  if (!profile) return '';
  const values = [profile[field.key], ...field.aliases.map((alias) => profile[alias])];
  const raw = values.find((value) => value != null && value !== '');
  return typeof raw === 'string' ? raw.trim() : raw;
}

function isCreatorFieldComplete(profile, field) {
  const value = readProfileField(profile, field);
  if (field.key === 'skills') {
    if (!value || typeof value !== 'string') return false;
    return value.split(',').some((part) => part.trim());
  }
  return Boolean(value);
}

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

/** Mirrors backend profile completeness — used when API metadata is absent. */
export function evaluateCreatorProfileCompletion(profile) {
  if (!profile) {
    return {
      isComplete: false,
      percent: 0,
      status: 'INCOMPLETE',
      missingFields: REQUIRED_CREATOR_FIELDS.map((field) => ({
        field: field.key,
        label: field.label,
      })),
    };
  }

  if (typeof profile.profileComplete === 'boolean' || typeof profile.profile_complete === 'boolean') {
    const isComplete = Boolean(profile.profileComplete ?? profile.profile_complete);
    const percent = Number(profile.profileCompletionPercent ?? profile.profile_completion_percent ?? (isComplete ? 100 : 0));
    const status = profile.profileStatus ?? profile.profile_status ?? (isComplete ? 'COMPLETE' : 'INCOMPLETE');
    const missingFields = profile.profileMissingFields ?? profile.profile_missing_fields ?? [];
    return { isComplete, percent, status, missingFields };
  }

  const missingFields = [];
  let completed = 0;

  REQUIRED_CREATOR_FIELDS.forEach((field) => {
    if (isCreatorFieldComplete(profile, field)) {
      completed += 1;
    } else {
      missingFields.push({ field: field.key, label: field.label });
    }
  });

  const total = REQUIRED_CREATOR_FIELDS.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed === total;

  return {
    isComplete,
    percent,
    status: isComplete ? 'COMPLETE' : 'INCOMPLETE',
    missingFields,
  };
}

export function isCreatorProfileComplete(profile) {
  return evaluateCreatorProfileCompletion(profile).isComplete;
}
