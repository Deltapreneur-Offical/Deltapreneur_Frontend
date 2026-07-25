/** Public storefront sections on /operations (legacy monthly roles catalog + business solutions). */
export const OPERATIONS_SECTIONS = [
  {
    id: 'assistance',
    labelKey: 'operationsSectionVirtualAssistance',
    defaultLabel: 'Virtual Assistance',
    hintKey: 'operationsSectionVaHint',
    defaultHint: 'Monthly virtual roles & business support',
    serviceType: 'virtual_assistance',
    theme: 'assistance',
  },
  {
    id: 'compliance',
    labelKey: 'operationsSectionCompliances',
    defaultLabel: 'Business Solutions',
    hintKey: 'operationsSectionComplianceHint',
    defaultHint: 'Registration, filings & business services',
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

export function operationsReturnLocation(sectionId) {
  const section = resolveOperationsSection(sectionId);
  return {
    pathname: '/operations',
    search: `?section=${section.id}`,
  };
}
