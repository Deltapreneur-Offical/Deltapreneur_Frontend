/** Creator profile expected rate (amount + period, e.g. 4000/day). */

export const CREATOR_RATE_PERIODS = [
  { value: '/day', label: '/ Day' },
  { value: '/month', label: '/ Month' },
  { value: '/project', label: '/ Project' },
];

const PERIOD_VALUES = new Set(CREATOR_RATE_PERIODS.map((option) => option.value));

export function readCreatorExpectedRate(profile) {
  const raw = profile?.expectedRate ?? profile?.expected_rate;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed || null;
}

export function parseCreatorExpectedRate(raw) {
  if (!raw || typeof raw !== 'string') {
    return { amount: '', period: '/month' };
  }

  const trimmed = raw.trim();
  const match = trimmed.match(/^[\s₹Rs.]*([\d,]+(?:\.\d+)?)\s*(\/\w+)?\s*$/i);
  if (!match) {
    return { amount: '', period: '/month' };
  }

  const amount = match[1].replace(/,/g, '');
  const suffix = (match[2] || '').toLowerCase();
  const period = PERIOD_VALUES.has(suffix) ? suffix : '/month';

  return { amount, period };
}

export function buildCreatorExpectedRate(amount, period) {
  const normalizedAmount = String(amount ?? '').trim().replace(/,/g, '');
  const normalizedPeriod = String(period ?? '').trim().toLowerCase();

  if (!normalizedAmount || !PERIOD_VALUES.has(normalizedPeriod)) {
    return '';
  }

  const numeric = Number(normalizedAmount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }

  return `${Math.trunc(numeric)}${normalizedPeriod}`;
}

/**
 * Format expected rate for cards — numeric part uses formatPrice (₹ + locale),
 * suffix preserved (e.g. 4000/day → ₹4,000/day).
 */
export function formatCreatorExpectedRate(profile, formatPrice) {
  const raw = readCreatorExpectedRate(profile);
  if (!raw) return null;

  if (typeof formatPrice !== 'function') {
    return raw;
  }

  const match = raw.match(/^[\s₹Rs.]*([\d,]+(?:\.\d+)?)([\s\S]*)$/i);
  if (!match) {
    return raw;
  }

  const amount = Number(match[1].replace(/,/g, ''));
  const suffix = (match[2] || '').trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return raw;
  }

  const formattedAmount = formatPrice(amount);
  if (!suffix) return formattedAmount;

  if (suffix.startsWith('/')) {
    return `${formattedAmount}${suffix}`;
  }

  return `${formattedAmount} ${suffix}`;
}
