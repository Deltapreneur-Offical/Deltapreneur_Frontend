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

