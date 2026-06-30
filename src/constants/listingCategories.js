/** Shared category / filter options — keep listing forms and browse FilterBar in sync. */

export const VENTURE_INDUSTRIES = [
  'SAAS',
  'ECOMMERCE',
  'SERVICES',
  'AI_AUTOMATION',
  'FINTECH',
  'OTHER',
];

export const TECHNOLOGY_CATEGORIES = [
  'SAAS',
  'MOBILE_APP',
  'DESKTOP',
  'API_TOOL',
  'AUTOMATION',
  'ECOMMERCE',
  'EDUCATION',
  'OTHER',
];

/** @deprecated Use TECHNOLOGY_CATEGORIES */
export const COCREATION_CATEGORIES = TECHNOLOGY_CATEGORIES;

export const HARDWARE_CATEGORIES = [
  'IOT_DEVICE',
  'CONSUMER_ELECTRONICS',
  'INDUSTRIAL_EQUIPMENT',
  'MEDICAL_DEVICE',
  'NETWORKING_EQUIPMENT',
  'ROBOTICS',
  'EMBEDDED_SYSTEM',
  'AUTOMATION',
  'SECURITY_DEVICE',
  'SMART_HOME',
  'COMPONENTS',
  'MANUFACTURING_EQUIPMENT',
  'OTHER',
];

export const HARDWARE_CATEGORY_OPTIONS = toCategoryOptions(HARDWARE_CATEGORIES, {
  IOT_DEVICE: 'IOT DEVICE',
  CONSUMER_ELECTRONICS: 'CONSUMER ELECTRONICS',
  INDUSTRIAL_EQUIPMENT: 'INDUSTRIAL EQUIPMENT',
  MEDICAL_DEVICE: 'MEDICAL DEVICE',
  NETWORKING_EQUIPMENT: 'NETWORKING EQUIPMENT',
  ROBOTICS: 'ROBOTICS',
  EMBEDDED_SYSTEM: 'EMBEDDED SYSTEM',
  AUTOMATION: 'AUTOMATION',
  SECURITY_DEVICE: 'SECURITY DEVICE',
  SMART_HOME: 'SMART HOME',
  COMPONENTS: 'COMPONENTS',
  MANUFACTURING_EQUIPMENT: 'MANUFACTURING EQUIPMENT',
  OTHER: 'OTHER',
});

export const COMMUNITY_INDUSTRIES = [
  'TECH',
  'FINANCE',
  'HEALTHCARE',
  'EDUCATION',
  'FOOD_AND_BEVERAGE',
  'RETAIL',
  'REAL_ESTATE',
  'MEDIA',
  'MANUFACTURING',
  'LOGISTICS',
  'AGRICULTURE',
  'OTHER',
];

export const DOMAIN_PRICING_TYPES = ['FIXED', 'NEGOTIABLE'];

export function toCategoryOptions(values, labelMap = {}) {
  return values.map((value) => ({
    value,
    label: labelMap[value] ?? value.replace(/_/g, ' '),
  }));
}

export const DOMAIN_PRICING_OPTIONS = toCategoryOptions(DOMAIN_PRICING_TYPES, {
  FIXED: 'Fixed Price',
  NEGOTIABLE: 'Negotiable',
});

export const VENTURE_INDUSTRY_OPTIONS = toCategoryOptions(VENTURE_INDUSTRIES);

export const TECHNOLOGY_CATEGORY_OPTIONS = toCategoryOptions(TECHNOLOGY_CATEGORIES);

export const TECHNOLOGY_CATEGORY_LABELS = {
  SAAS: 'SaaS',
  MOBILE_APP: 'Mobile App',
  DESKTOP: 'Desktop',
  API_TOOL: 'API Tool',
  AUTOMATION: 'Automation',
  ECOMMERCE: 'Ecommerce',
  EDUCATION: 'Education',
  OTHER: 'Other',
  WEB_APP: 'Web App',
  API: 'API',
  PLUGIN: 'Plugin',
  TEMPLATE: 'Template',
};

export function formatTechnologyCategoryLabel(raw) {
  if (raw == null || raw === '') return '—';
  const key = String(typeof raw === 'object' && raw?.value != null ? raw.value : raw).trim();
  if (!key) return '—';
  return TECHNOLOGY_CATEGORY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** @deprecated Use TECHNOLOGY_CATEGORY_OPTIONS */
export const COCREATION_CATEGORY_OPTIONS = TECHNOLOGY_CATEGORY_OPTIONS;


