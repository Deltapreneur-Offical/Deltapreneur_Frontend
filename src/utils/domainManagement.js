/** Internal path to order detail DNS section. */
export function domainManagementHref(order) {
  if (order?.id) {
    return `/storefront/orders/${order.id}#dns`;
  }
  return null;
}

export function canManageRegisteredDomain(order) {
  if (!order) return false;
  if (order.canManageDomain) return true;
  return Boolean(order.domainManagement?.available);
}

export function isExternalManagementLink(order) {
  return false;
}
