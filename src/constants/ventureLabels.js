export const VENTURE_EQUITY_TYPE_LABELS = {
  FIFTY_FIFTY: '50:50',
  SIXTY_FORTY: '60:40',
  SEVENTY_THIRTY: '70:30',
  EIGHTY_TWENTY: '80:20',
  NINETY_TEN: '90:10',
  NEGOTIABLE: 'Negotiable',
};

/** Collapse float noise and snap near-whole values (e.g. 9.99 → 10). */
export function normalizeEquityPercent(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const snapped = Math.round(num * 100) / 100;
  const nearest = Math.round(snapped);
  if (Math.abs(snapped - nearest) <= 0.011) {
    return nearest;
  }
  return snapped;
}

function formatEquityPercentCore(value) {
  const normalized = normalizeEquityPercent(value);
  if (normalized == null) return '';
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toFixed(2).replace(/\.?0+$/, '');
}

/** Numeric equity % string without suffix (e.g. "10", "12.5"). */
export function formatEquityPercent(value) {
  return formatEquityPercentCore(value);
}

/** Format equity % offered on a listing for display (e.g. card labels, detail views). */
export function formatEquityOfferedPct(value) {
  const formatted = formatEquityPercentCore(value);
  if (!formatted) return '';
  return `${formatted}%`;
}
