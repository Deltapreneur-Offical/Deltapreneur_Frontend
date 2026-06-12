import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { resolveRealtimeOrigin } from '../config/urls';
import { normalizeCreatorAuctionSummary } from '../utils/creatorAuctionSummary';

const PROFILE_SYNC_EVENTS = new Set([
  'creator_auction_created',
  'creator_auction_updated',
  'creator_auction_live',
  'creator_auction_ended',
  'new_bid_received',
]);

export function useCreatorAuctionProfileSync({
  communityIds = [],
  onUpdate,
  onReconnect,
}) {
  const onUpdateRef = useRef(onUpdate);
  const onReconnectRef = useRef(onReconnect);
  onUpdateRef.current = onUpdate;
  onReconnectRef.current = onReconnect;

  const handleMessage = useCallback((msg) => {
    const eventName = msg?.event ?? msg?.type;
    if (!PROFILE_SYNC_EVENTS.has(eventName)) return;
    const summary = normalizeCreatorAuctionSummary(msg);
    if (!summary?.communityId) return;
    onUpdateRef.current?.(summary.communityId, summary);
  }, []);

  const communityKey = [...new Set(communityIds.map(String).filter(Boolean))].sort().join('|');

  useEffect(() => {
    const ids = communityKey ? communityKey.split('|').filter(Boolean) : [];
    if (!ids.length) return undefined;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${resolveRealtimeOrigin()}/ws`),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        ids.forEach((communityId) => {
          client.subscribe(`/topic/creator-profile/${communityId}`, (frame) => {
            try {
              const msg = JSON.parse(frame.body);
              handleMessage(msg);
            } catch (error) {
              console.error('Failed to parse creator profile auction message:', error);
            }
          });
        });
        onReconnectRef.current?.();
      },
      onDisconnect: () => {},
      onStompError: (frame) => {
        console.error('Creator profile auction STOMP error:', frame);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [communityKey, handleMessage]);

  return null;
}
