const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function isComplianceService(service) {
  return (service?.serviceType || 'virtual_assistance') === 'compliance';
}

export function getBillingPeriod(service) {
  return isComplianceService(service) ? 'one_time' : 'monthly';
}

function formatFallbackPrice(price) {
  return INR.format(price);
}

export function formatOperationsPrice(service, { t, formatPrice } = {}) {
  const price = Number(service?.price ?? service?.quotedPrice) || 0;
  const compliance = isComplianceService(service)
    || service?.billingPeriod === 'one_time'
    || service?.serviceType === 'compliance';
  const formattedPrice = typeof formatPrice === 'function' ? formatPrice(price) : formatFallbackPrice(price);

  if (compliance) {
    if (price <= 0) {
      return {
        showPrice: false,
        label: t?.('operationsContactForPricing', { defaultValue: 'Contact for pricing' }) || 'Contact for pricing',
        billingKey: 'operationsBillingOneTime',
        billingDefault: 'One-time',
      };
    }
    return {
      showPrice: true,
      amount: formattedPrice,
      suffix: '',
      label: formattedPrice,
      billingKey: 'operationsBillingOneTime',
      billingDefault: 'One-time',
    };
  }

  return {
    showPrice: true,
    amount: formattedPrice,
    suffix: '/mo',
    label: `${formattedPrice}/mo`,
    billingKey: 'operationsBillingMonthly',
    billingDefault: 'Monthly',
  };
}

export function formatRequestAdminPrice(row, formatPrice) {
  const price = Number(row?.quotedPrice) || 0;
  const compliance = row?.billingPeriod === 'one_time' || row?.requestType === 'booking';
  const formattedPrice = typeof formatPrice === 'function' ? formatPrice(price) : formatFallbackPrice(price);

  if (compliance) {
    if (price <= 0) return '—';
    return formattedPrice;
  }
  return `${formattedPrice}/mo`;
}
