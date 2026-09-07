import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptLoadPromise = null;

export function prefetchTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }
      reject(new Error('Turnstile failed to initialize.'));
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        finish();
        return;
      }
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      finish();
    };
    script.onerror = () => reject(new Error('Turnstile script failed to load.'));
    document.head.appendChild(script);
  }).catch((error) => {
    scriptLoadPromise = null;
    throw error;
  });

  return scriptLoadPromise;
}

const TurnstileWidget = forwardRef(function TurnstileWidget(
  { siteKey, onToken, onExpire, theme = 'light', action },
  ref,
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const [loadError, setLoadError] = useState(false);

  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;

    let cancelled = false;
    setLoadError(false);

    prefetchTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size: 'normal',
          ...(action ? { action } : {}),
          callback: (token) => {
            setLoadError(false);
            onTokenRef.current?.(token);
          },
          'expired-callback': () => {
            onTokenRef.current?.('');
            onExpireRef.current?.();
          },
          'error-callback': () => {
            setLoadError(true);
            onTokenRef.current?.('');
            onExpireRef.current?.();
          },
        });
      })
      .catch(() => {
        setLoadError(true);
        onTokenRef.current?.('');
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, action]);

  if (!siteKey) return null;

  return (
    <div className="flex flex-col items-center gap-2 min-h-[65px]">
      <div ref={containerRef} className="flex justify-center" />
      {loadError ? (
        <p className="text-sm text-center text-red-600 max-w-sm">
          Security check could not load. Refresh, or add localhost and 127.0.0.1 to the Turnstile widget hostnames.
        </p>
      ) : null}
    </div>
  );
});

export default TurnstileWidget;
