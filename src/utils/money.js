/** Shared money helpers.
 *
 * - roundInr / parseInrInput: intentional whole-rupee storage (listings, bid forms).
 * - roundMoney / formatInr: preserve paisa (2 dp) for calculated domain / checkout money.
 */

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Round to whole INR rupees (form storage / marketplace asking prices). */
export function roundInr(value) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return 0;
  const nearest = Math.round(n);
  // Snap float noise from FX / percentage math (e.g. 9999.999999 → 10000).
  if (Math.abs(n - nearest) < 0.01) return nearest;
  return nearest;
}

/** Parse user-entered INR from form inputs. */
export function parseInrInput(value) {
  if (value == null || value === '') return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundInr(n);
}

/** Round to 2 decimal places (paisa) — use for domain registration & checkout math. */
export function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

/**
 * Normalize INR for display.
 * Preserves calculated paisa; only snaps exact whole amounts (float noise).
 */
export function normalizeInrDisplay(value) {
  const n = roundMoney(value);
  const nearest = Math.round(n);
  if (Math.abs(n - nearest) < 0.0000001) return nearest;
  return n;
}

/** Commission on an INR amount (whole-rupee result — marketplace). */
export function computeInrCommission(amount, percent) {
  const base = roundInr(amount);
  const pct = toNumber(percent, 0);
  const commission = roundInr((base * pct) / 100);
  return {
    amount: base,
    commission,
    net: base - commission,
    percent: pct,
  };
}

/** Commission on an amount that preserves 2 decimal places (cents/paisa). */
export function computeCurrencyCommission(amount, percent) {
  const base = roundMoney(amount);
  const pct = toNumber(percent, 0);
  const commission = roundMoney((base * pct) / 100);
  return {
    amount: base,
    commission,
    net: roundMoney(base - commission),
    percent: pct,
  };
}

/**
 * Format INR with grouping.
 * Shows 2 decimal places when the amount has paisa; whole rupees stay without ".00"
 * unless `forceDecimals` is set (domain registration / OpenProvider style).
 */
export function formatInr(value, { symbol = '₹', forceDecimals = false } = {}) {
  const amount = normalizeInrDisplay(value);
  const fractionDigits = forceDecimals || !Number.isInteger(amount) ? 2 : 0;
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${symbol}${formatted}`;
}
