/** Parse auction timestamps from API (ISO, SQL format, millisecond numbers, or auction objects). */
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
    const isoString = trimmed.replace(' ', 'T');
    const normalized = hasTimezone ? isoString : `${isoString}Z`;
    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) return d;
    const d2 = new Date(trimmed);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  if (typeof value === 'object') {
    const directTarget = value.endTime ?? value.end_time ?? value.originalEndTime ?? value.original_end_time;
    if (directTarget && typeof directTarget !== 'object') {
      const parsed = parseAuctionDate(directTarget);
      if (parsed) return parsed;
    }
    const start = parseAuctionDate(value.startTime ?? value.start_time ?? value.createdAt ?? value.created_at);
    const duration = value.duration;
    if (start && duration) {
      return addDurationToDate(start, duration);
    }
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
  SEVEN_DAYS: 7,
  THIRTY_DAYS: 30,
  SIXTY_DAYS: 60,
  NINETY_DAYS: 90,
};

/** Infer end time when API omits endTime but start + duration exist. */
export function addDurationToDate(startDate, duration) {
  if (!startDate || !(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return null;
  }
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
  }
  const key = String(duration || '').toUpperCase().trim();
  if (DURATION_HOURS[key]) {
    return new Date(startDate.getTime() + DURATION_HOURS[key] * 60 * 60 * 1000);
  }
  if (DURATION_DAYS[key]) {
    return new Date(startDate.getTime() + DURATION_DAYS[key] * 24 * 60 * 60 * 1000);
  }
  const numMatch = key.match(/^(\d+)/);
  if (numMatch) {
    const days = parseInt(numMatch[1], 10);
    if (days > 0) {
      return new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }
  return null;
}

/** Normalize API timestamps to a stable ISO string for countdown/UI. */
export function normalizeAuctionTimestamp(value) {
  const parsed = parseAuctionDate(value);
  return parsed ? parsed.toISOString() : null;
}

function toISOStringSafe(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function resolveAuctionEndTime(auction, ventureDuration) {
  if (!auction) return null;
  if (typeof auction === 'string' || typeof auction === 'number' || auction instanceof Date) {
    const parsed = parseAuctionDate(auction);
    return parsed ? toISOStringSafe(parsed) : null;
  }
  if (typeof auction === 'object') {
    const direct = parseAuctionDate(auction.endTime ?? auction.end_time);
    if (direct) return toISOStringSafe(direct);
    const original = parseAuctionDate(auction.originalEndTime ?? auction.original_end_time);
    if (original) return toISOStringSafe(original);
    const start = parseAuctionDate(auction.startTime ?? auction.start_time);
    const duration = auction.duration ?? ventureDuration;
    const fromDuration = addDurationToDate(start, duration);
    if (fromDuration) return toISOStringSafe(fromDuration);
    const created = parseAuctionDate(auction.createdAt ?? auction.created_at);
    const fromCreated = addDurationToDate(created, duration);
    if (fromCreated) return toISOStringSafe(fromCreated);
  }
  return null;
}

/** Show parsed date, or raw text when API sends free-form strings (e.g. "Immediately"). */
export function formatDateOrText(value, options, fallback = '—') {
  const d = parseAuctionDate(value);
  if (d) return d.toLocaleDateString('en-IN', options);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

/** Safe display date — never throws RangeError on bad API values. */
export function formatAuctionDate(value, options, fallback = '—') {
  const d = parseAuctionDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-IN', options);
}

/** Safe display date + time. */
export function formatAuctionDateTime(value, options, fallback = '—') {
  const d = parseAuctionDate(value);
  if (!d) return fallback;
  return d.toLocaleString('en-IN', options);
}

/** Safe display time only. */
export function formatAuctionTime(value, options, fallback = '—') {
  const d = parseAuctionDate(value);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-IN', options);
}

/** Value for `<input type="datetime-local" />` min/max — must use local wall time, not UTC ISO slice. */
export function toDatetimeLocalInput(value) {
  const d = parseAuctionDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Display expected rate — supports numeric INR values and free-form strings (e.g. "500/hr"). */
export function formatExpectedRate(value, formatInr, fallback = '—') {
  if (value == null || value === '') return fallback;
  const str = String(value).trim();
  const n = Number(str);
  if (Number.isFinite(n)) {
    return typeof formatInr === 'function'
      ? formatInr(n)
      : `₹${n.toLocaleString('en-IN')}`;
  }
  if (/^\d/.test(str)) return str;
  return str;
}

export function buildCountdownText(diff) {
  if (diff <= 0) return 'Ended';
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    const parts = [`${days}d`];
    if (hours > 0) parts.push(`${hours}h`);
    if (days < 3 && minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ');
  }
  if (hours > 0) {
    const parts = [`${hours}h`];
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ');
  }
  if (minutes > 0) {
    const parts = [`${minutes}m`];
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.join(' ');
  }
  return `${Math.max(0, seconds)}s`;
}

export function formatCountdown(endTime) {
  const end = parseAuctionDate(endTime);
  if (!end) return { timeLeft: '—', isUrgent: false };
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return { timeLeft: 'Ended', isUrgent: false };
  const isUrgent = diff < 86400000;
  return { timeLeft: buildCountdownText(diff), isUrgent };
}

/** Homepage auction cards — same compact format as listing cards. */
export function formatCompactCountdown(endTime) {
  return formatCountdown(endTime);
}
