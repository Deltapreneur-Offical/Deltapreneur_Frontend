const envValue = import.meta.env.VITE_REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE;
const normalizedEnvValue =
  typeof envValue === 'string' ? envValue.trim().toLowerCase() : undefined;

export const REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE_RAW = normalizedEnvValue;

export const REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE =
  typeof normalizedEnvValue === 'string'
    ? normalizedEnvValue === 'true'
    : true;

const techEnvValue = import.meta.env.VITE_REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE;
const normalizedTechEnvValue =
  typeof techEnvValue === 'string' ? techEnvValue.trim().toLowerCase() : undefined;

export const REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE =
  typeof normalizedTechEnvValue === 'string'
    ? normalizedTechEnvValue === 'true'
    : true;

// Deltapreneur onboarding rework: master switch for the Deltapreneur auction UI.
// When false, all Deltapreneur auction entry points are hidden (code stays intact).
export const CREATOR_AUCTIONS_ENABLED = false;

// Simplified Deltapreneur profile: render the LinkedIn-style simple form instead
// of the old role-based dynamic form. When false, the original large form and
// the original completion banner logic are restored exactly as before.
// The old form, role logic, fields, and backend behavior remain fully intact.
export const SIMPLIFIED_CREATOR_PROFILE = true;
