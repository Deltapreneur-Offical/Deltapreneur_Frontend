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

export function formatOperationsPrice(service, { t } = {}) {
  const price = Number(service?.price ?? service?.quotedPrice) || 0;
  const compliance = isComplianceService(service)
    || service?.billingPeriod === 'one_time'
    || service?.serviceType === 'compliance';

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
      amount: INR.format(price),
      suffix: '',
      label: INR.format(price),
      billingKey: 'operationsBillingOneTime',
      billingDefault: 'One-time',
    };
  }

  return {
    showPrice: true,
    amount: INR.format(price),
    suffix: '/mo',
    label: `${INR.format(price)}/mo`,
    billingKey: 'operationsBillingMonthly',
    billingDefault: 'Monthly',
  };
}

export function formatRequestAdminPrice(row) {
  const price = Number(row?.quotedPrice) || 0;
  const compliance = row?.billingPeriod === 'one_time' || row?.requestType === 'booking';
  if (compliance) {
    if (price <= 0) return '—';
    return INR.format(price);
  }
  return `${INR.format(price)}/mo`;
}
