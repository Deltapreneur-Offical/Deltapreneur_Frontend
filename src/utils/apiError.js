/** User-safe error messages — hide internal/infra details from the UI. */

const GENERIC = {
  default: 'Something went wrong. Please try again.',
  ai: 'Bro is unavailable right now. Please try again in a moment.',
  network: 'Unable to reach the server. Check your connection and try again.',
  server: "We're having trouble right now. Please try again in a moment.",
};

const INTERNAL_PATTERN =
  /openrouter|sqlalchemy|psycopg|operationalerror|traceback|econnrefused|enotfound|network error|failed to fetch|axioserror|httpx|aiohttp|exception:|\.py["']|line \d+:|api[_ ]?key|secret[_ ]?missing|not configured|database_unavailable|connection refused|could not connect to|postgres|pg_conn|rds tunnel|run_.*\.ps1|port 5433|add credits at|openrouter\.ai|invalid openrouter|internal server error|unexpected error occurred|hostname.*not known|ssl.*certificate|certificate verify failed/i;

const SAFE_MESSAGE_PATTERN =
  /(invalid email or password|invalid email or code|please verify|already exists|not found|required|must be|cannot be|too short|too long|invalid otp|incorrect password|unauthorized|forbidden|payout|bank account|upi|ifsc|pan card|gstin|deal not found|listing not found|sign in|log in|verify your email|email already|password must|account unavailable|verification|incomplete|is required|must be configured|must be selected|must be set|must be approved|positive integer|at least)/i;

/** True when the message is safe to show end users (not infra/config/stack details). */
export function isSafeUserFacingMessage(message) {
  if (message == null) return false;
  const trimmed = String(message).trim();
  if (!trimmed) return false;
  if (trimmed.length > 320) return false;
  if (INTERNAL_PATTERN.test(trimmed)) return false;
  if (/^validation failed$/i.test(trimmed)) return false;
  if (/^[a-zA-Z][\w.[\]*]*:\s+.+/.test(trimmed) && !INTERNAL_PATTERN.test(trimmed)) return true;
  if (SAFE_MESSAGE_PATTERN.test(trimmed)) return true;
  if (/field required|ensure this value|value is not a valid|input should be/i.test(trimmed)) return true;
  if (/[{}[\]<>\\|`]/.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 48) return false;
  return !INTERNAL_PATTERN.test(trimmed);
}

function contextFallback(options = {}) {
  if (options.context === 'ai') return GENERIC.ai;
  if (options.context === 'network') return GENERIC.network;
  if (options.context === 'server') return GENERIC.server;
  return options.fallback || GENERIC.default;
}

/** Extract the raw message from axios / FastAPI error payloads (unsanitized). */
export function extractRawApiError(err) {
  const payload = err?.response?.data;
  if (typeof payload === 'string') return payload;
  if (payload?.message && payload.message !== 'Validation failed') return payload.message;
  if (typeof payload?.error === 'string') return payload.error;
  if (payload?.error?.message) return payload.error.message;
  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((x) => x?.msg || String(x)).join(', ');
  }
  if (Array.isArray(payload?.data)) {
    const first = payload.data[0];
    if (first?.field && first?.message) return `${first.field}: ${first.message}`;
    return payload.data.map((x) => x?.message || x?.field || String(x)).join(', ');
  }
  if (!err?.response && err?.message) return err.message;
  return '';
}

/** Map a raw message to a user-safe string. */
export function sanitizeUserErrorMessage(raw, fallback, options = {}) {
  const status = options.status;
  const baseFallback = fallback || contextFallback(options);

  if (!raw) {
    if (status >= 500 || status === 502 || status === 503 || status === 504) {
      return options.serverFallback || GENERIC.server;
    }
    return baseFallback;
  }

  if (isSafeUserFacingMessage(raw)) return raw;
  if (options.context === 'ai') return GENERIC.ai;
  if (status >= 500 || status === 502 || status === 503 || status === 504) {
    return options.serverFallback || GENERIC.server;
  }
  return baseFallback;
}

/** Extract a user-visible message from axios/FastAPI error responses. */
export function readApiError(err, fallback = GENERIC.default, options = {}) {
  const status = err?.response?.status;

  if (!err?.response) {
    const networkish = String(err?.message || '').toLowerCase();
    if (
      networkish.includes('network')
      || networkish.includes('fetch')
      || networkish.includes('timeout')
      || networkish.includes('aborted')
    ) {
      return options.networkFallback || GENERIC.network;
    }
  }

  if (status === 502 || status === 503 || status === 504) {
    const raw = extractRawApiError(err);
    return sanitizeUserErrorMessage(raw, fallback, {
      ...options,
      status,
      context: options.context || 'server',
    });
  }

  const raw = extractRawApiError(err);
  return sanitizeUserErrorMessage(raw, fallback, { ...options, status });
}

function isAiRequest(config) {
  const url = String(config?.url || '');
  return url.includes('/ai/') || url.includes('/domains/ai');
}

export function isVaPublicRequest(config) {
  const url = String(config?.url || '');
  return url === '/api/v1/virtual-assistant';
}

/** Detect whether a request targets the API layer. */
export function isApiRequest(config) {
  const url = String(config?.url || '');
  return url.includes('/api/');
}

/** Sanitize axios error payload fields in place so existing `response.data.error` reads stay safe. */
export function sanitizeAxiosError(error) {
  if (!error) return error;

  const status = error.response?.status;
  const options = {
    status,
    context: isAiRequest(error.config) ? 'ai' : undefined,
  };
  const safe = readApiError(error, undefined, options);
  error.userFacingMessage = safe;

  const data = error.response?.data;
  if (typeof data === 'string') {
    if (!isSafeUserFacingMessage(data)) {
      error.response.data = safe;
    }
    return error;
  }
  if (!data || typeof data !== 'object') {
    if (!error.response && error.message && !isSafeUserFacingMessage(error.message)) {
      error.message = options.context === 'ai' ? GENERIC.ai : GENERIC.network;
    }
    return error;
  }

  if (typeof data.error === 'string' && !isSafeUserFacingMessage(data.error)) {
    data.error = safe;
  }
  if (typeof data.message === 'string' && !isSafeUserFacingMessage(data.message)) {
    data.message = safe;
  }
  if (typeof data.detail === 'string' && !isSafeUserFacingMessage(data.detail)) {
    data.detail = safe;
  }
  if (Array.isArray(data.detail)) {
    const joined = data.detail.map((x) => x?.msg || String(x)).join(', ');
    if (!isSafeUserFacingMessage(joined)) {
      data.detail = safe;
    }
  }

  if (!error.response && error.message && !isSafeUserFacingMessage(error.message)) {
    error.message = options.context === 'ai' ? GENERIC.ai : GENERIC.network;
  }

  return error;
}
