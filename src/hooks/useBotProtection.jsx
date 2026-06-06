import { useEffect, useRef, useState } from 'react';

import api from '../api/axios';
import HoneypotField from '../components/common/HoneypotField';
import TurnstileWidget from '../components/common/TurnstileWidget';

export function useBotProtection() {
  const envSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const [siteKey, setSiteKey] = useState(envSiteKey);
  const [enabled, setEnabled] = useState(Boolean(envSiteKey));
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (envSiteKey) return undefined;

    let cancelled = false;

    api.get('/api/v1/public/bot-protection')
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.turnstileEnabled && data?.turnstileSiteKey) {
          setSiteKey(data.turnstileSiteKey);
          setEnabled(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [envSiteKey]);

  const getProtectionPayload = () => ({
    turnstileToken: enabled ? turnstileToken : undefined,
    website: honeypot,
  });

  const resetProtection = () => {
    setTurnstileToken('');
    turnstileRef.current?.reset?.();
  };

  const BotProtectionFields = ({ className = '' }) => (
    <div className={className}>
      <HoneypotField value={honeypot} onChange={setHoneypot} />
      {enabled && siteKey ? (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={siteKey}
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken('')}
        />
      ) : null}
    </div>
  );

  const requiresTurnstile = enabled && !turnstileToken;

  return {
    enabled,
    turnstileToken,
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    BotProtectionFields,
  };
}
