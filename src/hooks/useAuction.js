import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { auctionAPI } from '../api/services';
import { resolveRealtimeOrigin } from '../config/urls';
import { normalizeAuctionTimestamp, resolveAuctionEndTime } from '../utils/auctionDate';
import { resolveAuctionBidLimits } from '../utils/auctionBidLimits';

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAuctionPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const domainRaw = payload.domain || {};
  return {
    ...payload,
    id: payload.id ?? null,
    status: payload.status ?? null,
    domainDisplayName:
      payload.domainDisplayName
      ?? payload.domain_display_name
      ?? domainRaw.fullDomain
      ?? null,
    domain: domainRaw.domainName || domainRaw.domain_name || domainRaw.fullDomain
      ? {
          ...domainRaw,
          fullDomain: domainRaw.fullDomain ?? domainRaw.full_domain ?? '',
          domainName: domainRaw.domainName ?? domainRaw.domain_name ?? '',
          domainExtension: domainRaw.domainExtension ?? domainRaw.domain_extension ?? '',
          verified: Boolean(domainRaw.verified ?? domainRaw.is_verified ?? false),
          listedBy: domainRaw.listedBy ?? domainRaw.listed_by ?? null,
        }
      : null,
    minBidPrice: toNum(payload.minBidPrice ?? payload.min_bid_price, 0),
    currentHighestBid: toNum(payload.currentHighestBid ?? payload.current_highest_bid, 0),
    totalBids: toNum(payload.totalBids ?? payload.total_bids, 0),
    duration: payload.duration ?? null,
    startTime: normalizeAuctionTimestamp(payload.startTime ?? payload.start_time),
    endTime: resolveAuctionEndTime(payload) ?? normalizeAuctionTimestamp(payload.endTime ?? payload.end_time),
    currentWinnerName:
      payload.currentWinnerName ?? payload.current_winner_name ?? payload.winner?.name ?? null,
  };
}

function normalizeBidPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    bidTime: raw.bidTime ?? raw.created_at ?? raw.createdAt ?? null,
    bidderName: raw.bidderName ?? raw.bidder_name ?? null,
    isWinningBid: Boolean(raw.isWinningBid ?? raw.is_winning_bid ?? raw.winningBid ?? false),
    amount: toNum(raw.amount, 0),
  };
}

export function useAuction(auctionId) {
  const [auction, setAuction]       = useState(null);
  const [bids, setBids]             = useState([]);
  const [minNextBid, setMinNextBid] = useState(0);
  const [maxBidPrice, setMaxBidPrice] = useState(0);
  const [connected, setConnected]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const clientRef                   = useRef(null);

  // FIX #11: define handleUpdate BEFORE the WebSocket useEffect
  // so the subscription callback always captures the latest version via ref
  const handleUpdateRef = useRef(null);

  const handleUpdate = useCallback((msg) => {
    setLastUpdate(msg);

    if (msg.type === 'BID_PLACED') {
      setAuction(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          currentHighestBid: msg.currentHighestBid,
          totalBids:         msg.totalBids,
          endTime: normalizeAuctionTimestamp(msg.endTime ?? msg.end_time) ?? prev.endTime,
          status:            msg.status,
          currentWinnerName: msg.currentWinnerName,
        };
        const limits = resolveAuctionBidLimits({
          maxBidPrice: prev.maxBidPrice,
          minNextBid: prev.minNextBid,
          currentHighestBid: next.currentHighestBid,
          minBidPrice: next.minBidPrice,
        });
        setMinNextBid(limits.minNextBid);
        setMaxBidPrice(limits.maxBidPrice);
        return { ...next, ...limits };
      });
      if (msg.latestBid) {
        setBids(prev => [normalizeBidPayload(msg.latestBid), ...prev]);
      }
    } else if (msg.type === 'AUCTION_ENDED' || msg.type === 'AUCTION_UNSOLD') {
      setAuction(prev => prev ? { ...prev, status: msg.status } : prev);
    } else if (msg.type === 'AUCTION_EXTENDED' || msg.type === 'BID_PLACED') {
      // endTime update already handled above — also handle standalone EXTENDED message
      if (msg.endTime || msg.end_time) {
        setAuction(prev => prev ? {
          ...prev,
          endTime: normalizeAuctionTimestamp(msg.endTime ?? msg.end_time) ?? prev.endTime,
          status: msg.status,
        } : prev);
      }
    } else if (msg.type === 'AUCTION_STARTED') {
      setAuction(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
    }
  }, []);

  // Keep ref in sync so WebSocket callback is never stale
  handleUpdateRef.current = handleUpdate;

  // Initial data load
  useEffect(() => {
    if (!auctionId) return;
    setLoading(true);
    auctionAPI.get(auctionId)
      .then(({ data }) => {
        const root = data?.auction && typeof data.auction === 'object' ? data.auction : data;
        const a = normalizeAuctionPayload(root);
        const limits = resolveAuctionBidLimits({
          maxBidPrice: data?.maxBidPrice ?? data?.max_bid_price,
          minNextBid: data?.minNextBid ?? data?.min_next_bid,
          currentHighestBid: a?.currentHighestBid,
          minBidPrice: a?.minBidPrice,
        });
        setMinNextBid(limits.minNextBid);
        setMaxBidPrice(limits.maxBidPrice);
        if (a) {
          setAuction({ ...a, ...limits });
        } else {
          setAuction(a);
        }

        const bidList = Array.isArray(data?.bids)
          ? data.bids
          : Array.isArray(data?.recent_bids)
            ? data.recent_bids
            : Array.isArray(root?.recent_bids)
              ? root.recent_bids
              : [];
        setBids(bidList.map(normalizeBidPayload));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auctionId]);

  // WebSocket connection — uses ref so callback is never stale
  useEffect(() => {
    if (!auctionId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${resolveRealtimeOrigin()}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/auction/${auctionId}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            // Use ref so we always call the latest version of handleUpdate
            handleUpdateRef.current(msg);
          } catch (e) {
            console.error('Failed to parse auction message:', e);
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      setConnected(false);
    };
  }, [auctionId]);

  const placeBid = useCallback(async (amount) => {
    return auctionAPI.placeBid(auctionId, amount);
  }, [auctionId]);

  return { auction, bids, minNextBid, maxBidPrice, connected, loading, lastUpdate, placeBid };
}