/** Link to order detail DNS management section or external panel. */
export function domainManagementHref(order) {
  if (order?.customerPanelUrl) {
    return order.customerPanelUrl;
  }
  if (order?.domainManagement?.customerPanelUrl) {
    return order.domainManagement.customerPanelUrl;
  }
  return null;
}

export function canManageRegisteredDomain(order) {
  if (!order) return false;
  if (order.canManageDomain) return true;
  return Boolean(order.domainManagement?.available);
}

export function isExternalManagementLink(order) {
  return Boolean(domainManagementHref(order));
}
