export const VA_ADMIN_SUB_TABS = ['applications', 'published', 'direct-add'];

export function buildVaAdminModuleSearch(vaSubTab = 'applications') {
  const params = new URLSearchParams();
  params.set('tab', 'operations');
  params.set('section', 'virtual-assistants');
  params.set('vaSubTab', VA_ADMIN_SUB_TABS.includes(vaSubTab) ? vaSubTab : 'applications');
  return params.toString();
}

export function vaAdminModulePath(vaSubTab = 'applications') {
  return `/admin?${buildVaAdminModuleSearch(vaSubTab)}`;
}

export function vaAdminApplicationsPath() {
  return vaAdminModulePath('applications');
}
