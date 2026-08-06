import { registrationOrderDetailPath } from './domainRegistrationOrder';

function orderIdFrom(order) {
  return order?.id || order?.orderId || null;
}

/** True if URL points at a vendor registrar control panel (never use for customers). */
export function isVendorRegistrarPanelUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('openprovider') ||
    lower.includes('resellerclub') ||
    lower.includes('onlyfordemo')
  );
}

/**
 * Customer-facing DNS management link — always CoBrother order DNS tab.
 * Never returns OpenProvider / ResellerClub control-panel URLs.
 */
export function domainManagementHref(order) {
  const id = orderIdFrom(order);
  if (id) {
    return `${registrationOrderDetailPath(id)}#dns`;
  }
  const candidates = [
    order?.cobrotherDnsUrl,
    order?.domainManagement?.cobrotherDnsUrl,
    order?.customerPanelUrl,
    order?.domainManagement?.customerPanelUrl,
  ];
  for (const url of candidates) {
    if (url && !isVendorRegistrarPanelUrl(url)) {
      return url;
    }
  }
  return null;
}

export function canManageRegisteredDomain(order) {
  if (!order) return false;
  if (order.canManageDomain) return true;
  return Boolean(order.domainManagement?.available);
}

export function isExternalManagementLink(order) {
  const href = domainManagementHref(order);
  if (!href) return false;
  return /^https?:\/\//i.test(href) && !href.includes('/storefront/orders/');
}
