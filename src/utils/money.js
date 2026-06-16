/** Shared money helpers — INR uses whole rupees; other amounts use 2 dp max. */

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Round to whole INR rupees (storage and display). */
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

/** Round to 2 decimal places. */
export function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

/** Normalize INR for display — always whole rupees, no float tails like 9999.99. */
export function normalizeInrDisplay(value) {
  return roundInr(value);
}

/** Commission on an INR amount (whole-rupee result). */
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

/** Format INR with grouping; never shows decimal paisa. */
export function formatInr(value, { symbol = '₹' } = {}) {
  const amount = normalizeInrDisplay(value);
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${symbol}${formatted}`;
}
