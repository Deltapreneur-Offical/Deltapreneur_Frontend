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
    defaultLabel: 'Services',
    hintKey: 'operationsSectionComplianceHint',
    defaultHint: 'Registration, filings & business services',
    serviceType: 'compliance',
    theme: 'compliance',
  },
];

const SECTION_ALIASES = {
  compliances: 'compliance',
  assistances: 'assistance',
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
