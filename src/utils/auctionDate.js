/** Parse auction timestamps from API (ISO, with/without timezone). */
export function parseAuctionDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const hasTimezone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(trimmed);
    const normalized = hasTimezone ? trimmed : `${trimmed}Z`;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const DURATION_HOURS = {
  ONE_HOUR: 1,
  SIX_HOURS: 6,
  TWELVE_HOURS: 12,
};

const DURATION_DAYS = {
  ONE_DAY: 1,
  THREE_DAYS: 3,
  FIVE_DAYS: 5,
  SEVEN_DAYS: 7,
  FOURTEEN_DAYS: 14,
  FIFTEEN_DAYS: 15,
  THIRTY_DAYS: 30,
};

/** Infer end time when API omits endTime but start + duration exist. */
export function addDurationToDate(startDate, duration) {
  if (!startDate || !(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return null;
  }
  const key = String(duration || '').toUpperCase();
  if (DURATION_HOURS[key]) {
    return new Date(startDate.getTime() + DURATION_HOURS[key] * 60 * 60 * 1000);
  }
  if (DURATION_DAYS[key]) {
    return new Date(startDate.getTime() + DURATION_DAYS[key] * 24 * 60 * 60 * 1000);
  }
  return null;
}

export function resolveAuctionEndTime(auction, ventureDuration) {
  if (!auction || typeof auction !== 'object') return null;
  const direct = parseAuctionDate(auction.endTime ?? auction.end_time);
  if (direct) return direct.toISOString();
  const start = parseAuctionDate(auction.startTime ?? auction.start_time);
  const duration = auction.duration ?? ventureDuration;
  const inferred = addDurationToDate(start, duration);
  return inferred ? inferred.toISOString() : null;
}

export function formatCountdown(endTime) {
  const end = parseAuctionDate(endTime);
  if (!end) return { timeLeft: 'Awaiting schedule', isUrgent: false };
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return { timeLeft: 'Ended', isUrgent: false };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const isUrgent = diff < 300000;
  if (d > 0) return { timeLeft: `${d}d ${h}h ${m}m`, isUrgent };
  if (h > 0) return { timeLeft: `${h}h ${m}m ${s}s`, isUrgent };
  return { timeLeft: `${m}m ${s}s`, isUrgent };
}
