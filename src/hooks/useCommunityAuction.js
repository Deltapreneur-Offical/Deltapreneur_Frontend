import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { communityAuctionAPI } from '../api/services';
import { resolveRealtimeOrigin } from '../config/urls';
import { resolveAuctionEndTime } from '../utils/auctionDate';
import { resolveAuctionBidLimits } from '../utils/auctionBidLimits';

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const withUtcIfNeeded = (value) => {
  if (!value || typeof value !== 'string') return value ?? null;
  return value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
};

const normalizeBid = (bid) => ({
  ...bid,
  amount: toNum(bid?.amount, 0),
  bidderName: bid?.bidderName ?? bid?.bidder_name ?? '',
  bidTime: withUtcIfNeeded(bid?.bidTime ?? bid?.bid_time ?? null),
  isWinningBid: Boolean(bid?.isWinningBid ?? bid?.is_winning_bid ?? false),
});

const normalizeAuction = (a) => {
  if (!a || typeof a !== 'object') return null;
  const normalized = {
    ...a,
    minBidPrice: toNum(a.minBidPrice ?? a.min_bid_price, 0),
    currentHighestBid: toNum(a.currentHighestBid ?? a.current_highest_bid, 0),
    totalBids: toNum(a.totalBids ?? a.total_bids, 0),
    startTime: withUtcIfNeeded(a.startTime ?? a.start_time ?? null),
    endTime: withUtcIfNeeded(a.endTime ?? a.end_time ?? null),
    originalEndTime: withUtcIfNeeded(a.originalEndTime ?? a.original_end_time ?? null),
    expectedRate: a.expectedRate ?? a.expected_rate ?? null,
    availableFrom: a.availableFrom ?? a.available_from ?? null,
    currentWinnerName: a.currentWinnerName ?? a.current_winner_name ?? '',
    currentWinnerId: a.currentWinnerId ?? a.current_winner_id ?? null,
    winnerPaymentPaid: Boolean(a.winnerPaymentPaid ?? a.winner_payment_paid ?? false),
    createdBy: a.createdBy ?? a.created_by ?? null,
    community: a.community ?? null,
  };
  const resolvedEnd = resolveAuctionEndTime(normalized);
  if (resolvedEnd) normalized.endTime = resolvedEnd;
  return normalized;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCreatorAuctionId(value) {
  return Boolean(value && UUID_RE.test(String(value)));
}

export function useCommunityAuction(auctionId) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [minNextBid, setMinNextBid] = useState(0);
  const [maxBidPrice, setMaxBidPrice] = useState(0);
  const [bidFee, setBidFee] = useState(0);
  const [connected, setConnected] = useState(false);
  const [wsState, setWsState] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const clientRef = useRef(null);
  const handleUpdateRef = useRef(null);

  const fetchAuctionDetail = useCallback(async () => {
    if (!auctionId || !isCreatorAuctionId(auctionId)) {
      setAuction(null);
      setBids([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await communityAuctionAPI.get(auctionId);
      const normalizedAuction = normalizeAuction({
        ...data?.auction,
        community: data?.auction?.community ?? data?.community ?? null,
      });
      const normalizedBids = Array.isArray(data?.bids) ? data.bids.map(normalizeBid) : [];
      const limits = resolveAuctionBidLimits({
        minNextBid: data?.minNextBid ?? data?.min_next_bid,
        maxBidPrice: data?.maxBidPrice ?? data?.max_bid_price,
        currentHighestBid: normalizedAuction?.currentHighestBid,
        minBidPrice: normalizedAuction?.minBidPrice,
      });
      setAuction(normalizedAuction ? { ...normalizedAuction, ...limits } : normalizedAuction);
      setBids(normalizedBids);
      setMinNextBid(limits.minNextBid);
      setMaxBidPrice(limits.maxBidPrice);
      if (data?.auctionBidFeeInr) {
        setBidFee(data.auctionBidFeeInr);
      }
    } catch (error) {
      console.error('Failed to load creator auction:', error);
      setAuction(null);
      setBids([]);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  const handleUpdate = useCallback((msg) => {
    setLastUpdate(msg);

    if (msg.type === 'BID_PLACED') {
      setAuction(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          currentHighestBid: toNum(msg.currentHighestBid, prev.currentHighestBid),
          totalBids: toNum(msg.totalBids, prev.totalBids),
          endTime: msg.endTime
            ? (msg.endTime.endsWith('Z') ? msg.endTime : msg.endTime + 'Z')
            : prev.endTime,
          status: msg.status,
          currentWinnerName: msg.currentWinnerName,
        };
        const limits = resolveAuctionBidLimits({
          currentHighestBid: next.currentHighestBid,
          minBidPrice: next.minBidPrice,
        });
        setMinNextBid(limits.minNextBid);
        setMaxBidPrice(limits.maxBidPrice);
        return { ...next, ...limits };
      });
      if (msg.latestBid) setBids(prev => [normalizeBid(msg.latestBid), ...prev]);
    } else if (
      msg.type === 'AUCTION_ENDED'
      || msg.type === 'AUCTION_UNSOLD'
      || msg.type === 'AUCTION_CLOSED'
    ) {
      setAuction(prev => prev ? {
        ...prev,
        status: msg.status,
        currentHighestBid: toNum(msg.currentHighestBid, prev.currentHighestBid),
        currentWinnerName: msg.currentWinnerName ?? prev.currentWinnerName,
        winnerPaymentPaid: Boolean(msg.winnerPaymentPaid ?? prev.winnerPaymentPaid),
      } : prev);
      fetchAuctionDetail().catch(() => {});
    } else if (msg.type === 'PAYMENT_COMPLETED') {
      setAuction(prev => prev ? {
        ...prev,
        status: msg.status ?? 'COMPLETED',
        winnerPaymentPaid: true,
      } : prev);
      fetchAuctionDetail().catch(() => {});
    } else if (msg.type === 'AUCTION_EXTENDED') {
      if (msg.endTime) {
        setAuction(prev => prev ? {
          ...prev,
          endTime: msg.endTime.endsWith('Z') ? msg.endTime : msg.endTime + 'Z',
          status: msg.status,
        } : prev);
      }
    } else if (msg.type === 'AUCTION_STARTED') {
      setAuction(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
    }
  }, [fetchAuctionDetail]);

  handleUpdateRef.current = handleUpdate;

  useEffect(() => {
    if (!auctionId) return;
    setLoading(true);
    fetchAuctionDetail()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auctionId, fetchAuctionDetail]);

  useEffect(() => {
    if (!auctionId) return undefined;

    setWsState('connecting');
    setConnected(false);

    const client = new Client({
      webSocketFactory: () => new SockJS(`${resolveRealtimeOrigin()}/ws`),
      reconnectDelay: 3000,
      connectionTimeout: 10000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        setWsState('live');
        client.subscribe(`/topic/community-auction/${auctionId}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            handleUpdateRef.current(msg);
          } catch (e) {
            console.error('Failed to parse community auction message:', e);
          }
        });
      },
      onDisconnect: () => {
        setConnected(false);
        setWsState('reconnecting');
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setConnected(false);
        setWsState('reconnecting');
      },
      onWebSocketClose: () => {
        setConnected(false);
        setWsState((prev) => (prev === 'live' ? 'reconnecting' : prev));
      },
      onWebSocketError: () => {
        setConnected(false);
        setWsState('reconnecting');
      },
    });

    client.activate();
    clientRef.current = client;

    const connectTimeout = window.setTimeout(() => {
      setWsState((prev) => (prev === 'connecting' ? 'reconnecting' : prev));
    }, 12000);

    return () => {
      window.clearTimeout(connectTimeout);
      client.deactivate();
      setConnected(false);
      setWsState('connecting');
    };
  }, [auctionId]);

  useEffect(() => {
    const isLiveAuction = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
    if (!auctionId || wsState === 'live' || !isLiveAuction) return undefined;

    const pollId = window.setInterval(() => {
      fetchAuctionDetail().catch(() => {});
    }, 15000);

    return () => window.clearInterval(pollId);
  }, [auctionId, wsState, auction?.status, fetchAuctionDetail]);

  const placeBid = useCallback(async (payload) => {
    const body = typeof payload === 'object' && payload !== null ? payload : { amount: payload };
    const res = await communityAuctionAPI.placeBid(auctionId, body);
    await fetchAuctionDetail();
    return res;
  }, [auctionId, fetchAuctionDetail]);

  return { auction, bids, minNextBid, maxBidPrice, bidFee, connected, wsState, loading, lastUpdate, placeBid, refresh: fetchAuctionDetail };
}
