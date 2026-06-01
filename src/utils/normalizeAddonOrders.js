/**
 * Normalize addon admin API rows for AddonOrdersTable (supports legacy + current backend shapes).
 */
export function normalizeAddonOrder(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const buyer = raw.buyer || {};
  const buyerName =
    raw.buyerName
    || raw.buyerFullName
    || [buyer.firstname, buyer.lastname].filter(Boolean).join(' ').trim()
    || '—';

  const buyerPhone =
    raw.buyerPhone
    || raw.buyer_phone
    || buyer.phoneNumber
    || buyer.phone_number
    || '';

  const purchaseType =
    raw.purchaseType
    || (raw.software ? 'TECHNOLOGY' : 'DOMAIN');

  const paymentStatus = raw.paymentStatus || raw.payment_status || 'CREATED';

  let selectedServices = raw.selectedServices || raw.selected_services || '';
  if (!selectedServices && Array.isArray(raw.services)) {
    selectedServices = raw.services.join(',');
  }
  if (!selectedServices && raw.software?.name) {
    selectedServices = '';
  }

  const totalAmount =
    raw.totalAmount
    ?? raw.total_amount
    ?? raw.amount
    ?? 0;

  return {
    ...raw,
    id: raw.id ?? raw.purchaseId ?? raw.purchase_id,
    buyerName,
    buyerEmail: raw.buyerEmail || raw.buyer_email || buyer.email || '',
    buyerPhone,
    purchaseType,
    purchaseId: raw.purchaseId ?? raw.purchase_id ?? raw.id,
    paymentStatus,
    selectedServices,
    totalAmount,
    createdAt: raw.createdAt || raw.created_at,
  };
}

export function normalizeAddonOrders(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeAddonOrder);
}
