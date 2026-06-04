import { useEffect } from 'react';
import { API_ORIGIN } from '../config/urls';

function wsOrigin() {
  // Dev: connect via Vite (5173) so /ws proxies to the API on :8080.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  const base = (API_ORIGIN || '').replace(/\/$/, '');
  if (base.startsWith('https://')) return base.replace('https://', 'wss://');
  if (base.startsWith('http://')) return base.replace('http://', 'ws://');
  return 'ws://localhost:8080';
}

function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
}

/**
 * Live notification stream for the logged-in user.
 * Calls `onNotification` with frontend-shaped notification objects.
 */
export function useNotificationSocket(userId, onNotification) {
  useEffect(() => {
    if (!userId || !onNotification) return undefined;

    const token = getAccessToken();
    if (!token) return undefined;

    let ws;
    let cancelled = false;
    let reconnectTimer;

    const connect = () => {
      if (cancelled) return;

      const url = `${wsOrigin()}/ws/notifications/${encodeURIComponent(
        String(userId),
      )}?token=${encodeURIComponent(token)}`;

      ws = new WebSocket(url);

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

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 5000);
        }
      };
    };

    connect();

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
