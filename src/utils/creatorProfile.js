/** Creator (community) profile helpers — LinkedIn import fields. */

import { getVisibleCreatorFields } from './creatorRoleFields';

const INVALID_LINKEDIN_PROFILE_RE =
  /linkedin\.com\/(?:oauth|login|uas|checkpoint|legal|help|authwall|sharing)(?:\/|$|\?)/i;

const CREATOR_FIELD_REQUIREMENTS = {
  name: { key: 'name', aliases: ['name'], label: 'Creator name' },
  about: { key: 'about', aliases: ['about', 'aboutMe', 'about_me'], label: 'About' },
  headline: { key: 'headline', aliases: ['headline'], label: 'Professional Headline' },
  role: { key: 'role', aliases: ['role'], label: 'Role' },
  industry: { key: 'industry', aliases: ['industry'], label: 'Industry' },
  education: { key: 'education', aliases: ['education'], label: 'Education' },
  graduationYear: { key: 'graduation_year', aliases: ['graduationYear', 'graduation_year'], label: 'Graduation Year' },
  experience: { key: 'experience', aliases: ['experience', 'yearsExperience', 'years_experience'], label: 'Experience' },
  currentCompany: { key: 'current_company', aliases: ['currentCompany', 'current_company'], label: 'Current Company' },
  designation: { key: 'designation', aliases: ['designation'], label: 'Designation' },
  companyName: { key: 'company_name', aliases: ['companyName', 'company_name'], label: 'Company / Organization Name' },
  companyWebsite: { key: 'company_website', aliases: ['companyWebsite', 'company_website'], label: 'Company Website' },
  availability: { key: 'availability', aliases: ['availability'], label: 'Availability' },
  hiringFor: { key: 'hiring_for', aliases: ['hiringFor', 'hiring_for'], label: 'Hiring / Collaboration Need' },
  mentorshipTopics: { key: 'mentorship_topics', aliases: ['mentorshipTopics', 'mentorship_topics'], label: 'Mentorship Topics' },
  investmentFocus: { key: 'investment_focus', aliases: ['investmentFocus', 'investment_focus'], label: 'Investment Focus' },
  investmentStage: { key: 'investment_stage', aliases: ['investmentStage', 'investment_stage'], label: 'Preferred Investment Stage' },
  ticketSize: { key: 'ticket_size', aliases: ['ticketSize', 'ticket_size'], label: 'Typical Ticket Size' },
  startupStage: { key: 'startup_stage', aliases: ['startupStage', 'startup_stage'], label: 'Startup Stage' },
  coFounderNeeds: { key: 'co_founder_needs', aliases: ['coFounderNeeds', 'co_founder_needs'], label: 'Co-founder / Team Need' },
  incubationPrograms: { key: 'incubation_programs', aliases: ['incubationPrograms', 'incubation_programs'], label: 'Incubation Programs' },
  supportOffered: { key: 'support_offered', aliases: ['supportOffered', 'support_offered'], label: 'Support Offered' },
  skills: { key: 'skills', aliases: ['skills'], label: 'Skills' },
  location: { key: 'location', aliases: ['location'], label: 'Location' },
  linkedInProfileUrl: {
    key: 'linked_in_profile_url',
    aliases: ['linkedInProfileUrl', 'linked_in_profile_url', 'linkedInUrl', 'linked_in_url'],
    label: 'LinkedIn profile link',
  },
  whyImHere: { key: 'why_im_here', aliases: ['whyImHere', 'why_im_here'], label: 'Bio' },
  expectedRateAmount: {
    key: 'expected_rate',
    aliases: ['expectedRate', 'expected_rate'],
    label: 'Expected Rate',
  },
  introductionVideoLink: {
    key: 'introduction_video_link',
    aliases: ['introductionVideoLink', 'introduction_video_link'],
    label: 'Introduction Video',
  },
  resumeDriveLink: {
    key: 'resume_drive_link',
    aliases: ['resumeDriveLink', 'resume_drive_link'],
    label: 'Resume Drive Link',
  },
  portfolioWebsiteLink: {
    key: 'portfolio_website_link',
    aliases: ['portfolioWebsiteLink', 'portfolio_website_link'],
    label: 'Portfolio Website',
  },
  preferredWorkType: {
    key: 'preferred_work_type',
    aliases: ['preferredWorkType', 'preferred_work_type'],
    label: 'Preferred Work Type',
  },
  industryExpertise: {
    key: 'industry_expertise',
    aliases: ['industryExpertise', 'industry_expertise'],
    label: 'Industry Expertise',
  },
  languagesKnown: {
    key: 'languages_known',
    aliases: ['languagesKnown', 'languages_known'],
    label: 'Languages Known',
  },
};

function readProfileField(profile, field) {
  if (!profile) return '';
  const values = [profile[field.key], ...field.aliases.map((alias) => profile[alias])];
  const raw = values.find((value) => value != null && value !== '');
  return typeof raw === 'string' ? raw.trim() : raw;
}

function isCreatorFieldComplete(profile, field) {
  if (field.key === 'linked_in_profile_url') {
    return Boolean(getLinkedInProfileUrl(profile));
  }
  const value = readProfileField(profile, field);
  if (field.key === 'skills') {
    if (!value || typeof value !== 'string') return false;
    return value.split(',').some((part) => part.trim());
  }
  return Boolean(value);
}

function getRoleRequiredFields(profile) {
  const role = readProfileField(profile, CREATOR_FIELD_REQUIREMENTS.role);
  const fields = getVisibleCreatorFields(role)
    .filter((field) => field !== 'expectedRatePeriod')
    .map((field) => CREATOR_FIELD_REQUIREMENTS[field])
    .filter(Boolean);

  return [CREATOR_FIELD_REQUIREMENTS.name, ...fields];
}

export function getLinkedInProfileUrl(profile) {
  if (!profile) return '';
  const url = (
    profile.linkedInProfileUrl
    || profile.linked_in_profile_url
    || profile.linkedInUrl
    || profile.linked_in_url
    || ''
  ).trim();
  if (!url || INVALID_LINKEDIN_PROFILE_RE.test(url)) return '';
  return url;
}

export function hasLinkedInAccount(profile) {
  if (!profile) return false;
  return Boolean(
    profile.linkedInId
    || profile.linked_in_id
    || getLinkedInProfileUrl(profile)
  );
}

/** Mirrors backend profile completeness — used when API metadata is absent. */
export function evaluateCreatorProfileCompletion(profile) {
  const requiredFields = getRoleRequiredFields(profile);
  if (!profile) {
    return {
      isComplete: false,
      percent: 0,
      status: 'INCOMPLETE',
      missingFields: requiredFields.map((field) => ({
        field: field.key,
        label: field.label,
      })),
    };
  }

  const missingFields = [];
  let completed = 0;

  requiredFields.forEach((field) => {
    if (isCreatorFieldComplete(profile, field)) {
      completed += 1;
    } else {
      missingFields.push({ field: field.key, label: field.label });
    }
  });

  const total = requiredFields.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed === total;

  return {
    isComplete,
    percent,
    status: isComplete ? 'COMPLETE' : 'INCOMPLETE',
    missingFields,
  };
}

export function isCreatorProfileVisible(profile) {
  if (!profile) return false;
  return getRoleRequiredFields(profile).every((field) => isCreatorFieldComplete(profile, field));
}

export function isCreatorProfileComplete(profile) {
  if (!profile) return false;
  return getRoleRequiredFields(profile).every((field) => isCreatorFieldComplete(profile, field));
}
