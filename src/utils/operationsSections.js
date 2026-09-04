/** Public storefront sections on /operations. */
export const OPERATIONS_SECTIONS = [
  {
    id: 'assistance',
    labelKey: 'operationsSectionVirtualAssistance',
    defaultLabel: 'Delta Assistance',
    homeLabel: 'Delta Assistance',
    hintKey: 'operationsSectionVaHint',
    defaultHint: 'Monthly virtual roles & business support',
    serviceType: 'virtual_assistance',
    theme: 'assistance',
  },
  {
    id: 'offices',
    labelKey: 'operationsSectionOffices',
    defaultLabel: 'Delta Registrar Offices',
    homeLabel: 'Delta Registrar Offices',
    hintKey: 'operationsSectionOfficesHint',
    defaultHint: 'Find your nearest Delta Registrar office for in-person support.',
    serviceType: 'offices',
    theme: 'offices',
    isPlaceholder: false,
  },
  {
    id: 'compliance',
    labelKey: 'operationsSectionCompliances',
    defaultLabel: 'Delta Registrar',
    homeLabel: 'Delta Registrars',
    hintKey: 'operationsSectionComplianceHint',
    defaultHint: 'Registration, filings & Delta registrar services',
    serviceType: 'compliance',
    theme: 'compliance',
  },
];

/** Admin Operations → Business Solutions catalog partition. */
export const OPERATIONS_ADMIN_CATALOG_SECTION = OPERATIONS_SECTIONS.find((s) => s.id === 'compliance');

/** Admin Operations → Virtual Assistants profile management partition. */
export const VIRTUAL_ASSISTANTS_ADMIN_PARTITION = {
  id: 'virtual-assistants',
  labelKey: 'adminTabVirtualAssistants',
  defaultLabel: 'Virtual Assistants',
  hintKey: 'adminOperationsVaProfilesHint',
  defaultHint: 'Applications, publishing & direct-add profiles',
  theme: 'assistance',
};

/** Admin Operations tab partitions (order matters). */
export const OPERATIONS_ADMIN_PARTITIONS = [
  VIRTUAL_ASSISTANTS_ADMIN_PARTITION,
  OPERATIONS_ADMIN_CATALOG_SECTION,
];

const SECTION_ALIASES = {
  compliances: 'compliance',
  assistances: 'assistance',
  'virtual-assistant': 'virtual-assistants',
  va: 'virtual-assistants',
};

export function resolveOperationsSection(sectionId) {
  const normalized = SECTION_ALIASES[sectionId] || sectionId;
  return OPERATIONS_SECTIONS.find((s) => s.id === normalized) || OPERATIONS_SECTIONS[0];
}

export function operationsPathForSection(sectionId) {
  const section = resolveOperationsSection(sectionId);
  return `/operations?section=${section.id}`;
}

export function operationsPathForHubRegistrarCategory(categorySlug) {
  const params = new URLSearchParams({ section: 'compliance' });
  if (categorySlug) params.set('category', categorySlug);
  return `/operations?${params.toString()}`;
}

export function operationsPathForHubRegistrarService(categorySlug, serviceSlug) {
  const params = new URLSearchParams({ section: 'compliance' });
  if (categorySlug) params.set('category', categorySlug);
  if (serviceSlug) params.set('service', serviceSlug);
  return `/operations?${params.toString()}`;
}

export const REGISTRATIONS_PAGE_PATH = '/registrations';

const SAFE_CATEGORY_SLUG = /^[a-zA-Z0-9_-]{1,64}$/;

export function registrationsPathForCategory(categorySlug) {
  const slug = String(categorySlug || '').trim();
  if (!SAFE_CATEGORY_SLUG.test(slug)) return REGISTRATIONS_PAGE_PATH;
  return `${REGISTRATIONS_PAGE_PATH}?category=${encodeURIComponent(slug)}`;
}

export function operationsReturnLocation(sectionId) {
  const section = resolveOperationsSection(sectionId);
  return {
    pathname: '/operations',
    search: `?section=${section.id}`,
  };
}
