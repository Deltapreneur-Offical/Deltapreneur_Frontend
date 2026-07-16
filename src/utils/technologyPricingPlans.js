export const PRICING_PLAN_DEFS = [
  { key: 'ONE_TIME', label: 'One-Time Purchase' },
  { key: '1_MONTH', label: '1 Month Subscription' },
  { key: '3_MONTHS', label: '3 Months Subscription' },
  { key: '6_MONTHS', label: '6 Months Subscription' },
  { key: '12_MONTHS', label: '12 Months Subscription' },
];

const API_TO_UI_KEY = {
  ONE_MONTH: '1_MONTH',
  THREE_MONTHS: '3_MONTHS',
  SIX_MONTHS: '6_MONTHS',
  TWELVE_MONTHS: '12_MONTHS',
};

export function normalizePricingPlans(savedPlans) {
  const savedMap = {};
  if (Array.isArray(savedPlans)) {
    savedPlans.forEach((p) => {
      const raw = p.key || p.planDuration || p.plan_duration;
      const normalizedKey = API_TO_UI_KEY[raw] || raw;
      savedMap[normalizedKey] = p;
    });
  }
  return PRICING_PLAN_DEFS.map((def) => {
    const matched = savedMap[def.key];
    const isPlanEnabled = matched
      ? (matched.enabled ?? matched.isActive ?? matched.is_active ?? false)
      : false;
    return {
      key: def.key,
      label: def.label,
      enabled: Boolean(isPlanEnabled),
      price: matched?.price != null ? String(matched.price) : '',
    };
  });
}

export function getEnabledPricingPlans(savedPlans) {
  return normalizePricingPlans(savedPlans).filter((p) => p.enabled);
}

export function planLabelForKey(key) {
  return PRICING_PLAN_DEFS.find((p) => p.key === key)?.label || key;
}
