import { useCallback, useEffect, useRef, useState } from 'react';

import api from '../api/axios';
import { prefetchTurnstileScript } from '../components/common/TurnstileWidget';

// Cloudflare Turnstile test site key — always passes on any hostname (local dev).
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

function resolveSiteKey() {
  const configured = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  if (configured) return configured;
  if (import.meta.env.DEV) return TURNSTILE_TEST_SITE_KEY;
  return '';
}

export function useBotProtection({ active = true } = {}) {
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
