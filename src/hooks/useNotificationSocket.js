import { useEffect } from 'react';
import { resolveWebSocketOrigin } from '../config/urls';
import { ensureAccessTokenFromRefresh } from '../api/axios';
import { getStoredAccessToken, hasCookieAuthSession } from '../utils/authSession';

function getAccessToken() {
  return getStoredAccessToken();
}

const MAX_RECONNECT_ATTEMPTS = 6;
const BASE_RECONNECT_MS = 5000;

/**
 * Live notification stream for the logged-in user.
 * Calls `onNotification` with frontend-shaped notification objects.
 */
export function useNotificationSocket(userId, onNotification) {
  useEffect(() => {
    if (!userId || !onNotification) return undefined;

    let ws;
    let cancelled = false;
    let reconnectTimer;
    let reconnectAttempt = 0;

    const connect = (token) => {
      if (cancelled || !token) return;

      const url = `${resolveWebSocketOrigin()}/ws/notifications/${encodeURIComponent(
        String(userId),
      )}?token=${encodeURIComponent(token)}`;

      ws = new WebSocket(url);

      ws.onopen = () => {
        reconnectAttempt = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const payload = msg?.data ?? msg;
          if (payload?.id) {
            onNotification(payload);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = (event) => {
        if (cancelled) return;

        // Auth / permission failures — do not retry with the same token.
        if (event.code === 4401 || event.code === 4403) return;

        reconnectAttempt += 1;
        if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return;

        const delay = Math.min(30000, BASE_RECONNECT_MS * reconnectAttempt);
        reconnectTimer = window.setTimeout(() => {
          void start();
        }, delay);
      };

      ws.onerror = () => {
        // Browser logs the connection failure; onclose handles reconnect/backoff.
      };
    };

    const start = async () => {
      if (cancelled) return;
      let token = getAccessToken();
      if (!token && hasCookieAuthSession()) {
        try {
          token = await ensureAccessTokenFromRefresh();
        } catch {
          token = getAccessToken();
        }
      }
      if (!token) return;
      connect(token);
    };

    void start();

    return () => {
      cancelled = true;
      window.clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [userId, onNotification]);
}
