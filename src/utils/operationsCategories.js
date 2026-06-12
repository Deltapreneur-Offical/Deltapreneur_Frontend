export const OPERATIONS_CATEGORY_OPTIONS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'technology', label: 'Developers' },
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'people', label: 'People & HR' },
  { value: 'support', label: 'Support' },
  { value: 'creative', label: 'Creative' },
  { value: 'growth', label: 'Growth' },
  { value: 'operations', label: 'Operations' },
  { value: 'compliance', label: 'Compliance' },
];

export const OPERATIONS_CATEGORY_LABELS = Object.fromEntries(
  OPERATIONS_CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
);
