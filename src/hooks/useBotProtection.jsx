import { useCallback, useEffect, useRef, useState } from 'react';

import api from '../api/axios';
import { prefetchTurnstileScript } from '../components/common/TurnstileWidget';

// Cloudflare Turnstile test site key — always passes on any hostname (local DEV).
// Production uses VITE_TURNSTILE_SITE_KEY or GET /api/v1/public/bot-protection.
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

function resolveSiteKey() {
  const configured = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
  const useLiveInDev = import.meta.env.VITE_TURNSTILE_USE_LIVE === 'true';
  // Live site keys only work on hostnames listed on the Cloudflare widget.
  // Local DEV uses the always-pass dummy widget unless opted in.
  if (import.meta.env.DEV && !useLiveInDev) return TURNSTILE_TEST_SITE_KEY;
  if (configured) return configured;
  if (import.meta.env.DEV) return TURNSTILE_TEST_SITE_KEY;
  return '';
}

export function useBotProtection({ active = true, action } = {}) {
  const envSiteKey = resolveSiteKey();
  const [siteKey, setSiteKey] = useState(envSiteKey);
  const [enabled, setEnabled] = useState(Boolean(envSiteKey));
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    if (envSiteKey) {
      prefetchTurnstileScript().catch(() => {});
      return undefined;
    }

    let cancelled = false;

    api.get('/api/v1/public/bot-protection')
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.turnstileEnabled && data?.turnstileSiteKey) {
          setSiteKey(data.turnstileSiteKey);
          setEnabled(true);
          prefetchTurnstileScript().catch(() => {});
        } else if (import.meta.env.DEV) {
          setSiteKey(TURNSTILE_TEST_SITE_KEY);
          setEnabled(true);
          prefetchTurnstileScript().catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled && import.meta.env.DEV) {
          setSiteKey(TURNSTILE_TEST_SITE_KEY);
          setEnabled(true);
          prefetchTurnstileScript().catch(() => {});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [envSiteKey, active]);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('');
  }, []);

  const getProtectionPayload = () => ({
    turnstileToken: enabled ? turnstileToken : undefined,
    website: honeypot,
  });

  const resetProtection = () => {
    setTurnstileToken('');
    turnstileRef.current?.reset?.();
  };

  const botProtectionProps = {
    honeypot,
    onHoneypotChange: setHoneypot,
    enabled,
    siteKey,
    turnstileRef,
    onTurnstileToken: setTurnstileToken,
    onTurnstileExpire: handleTurnstileExpire,
    action,
  };

  const requiresTurnstile = enabled && !turnstileToken;

  return {
    enabled,
    turnstileToken,
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  };
}
