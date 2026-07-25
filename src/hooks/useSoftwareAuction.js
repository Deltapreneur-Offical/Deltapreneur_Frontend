import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { softwareAuctionAPI } from '../api/services';
import { createAuctionStompSocket } from '../config/urls';
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
    currentWinnerName: a.currentWinnerName ?? a.current_winner_name ?? '',
    winnerPaymentPaid: Boolean(a.winnerPaymentPaid ?? a.winner_payment_paid ?? false),
    software: a.software ?? null,
  };
  const resolvedEnd = resolveAuctionEndTime(normalized);
  if (resolvedEnd) normalized.endTime = resolvedEnd;
  return normalized;
};

const extractDetailPayload = (data) => {
  if (!data || typeof data !== 'object') return null;
  if (data.auction != null) return data;
  if (data.data?.auction != null) return data.data;
  return null;
};

export function useSoftwareAuction(auctionId) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [minNextBid, setMinNextBid] = useState(0);
  const [maxBidPrice, setMaxBidPrice] = useState(0);
  const [connected, setConnected] = useState(false);
  const [wsState, setWsState] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const clientRef = useRef(null);
  const handleUpdateRef = useRef(null);

  const fetchAuctionDetail = useCallback(async () => {
    if (!auctionId) return;
    const { data } = await softwareAuctionAPI.get(auctionId);
    const payload = extractDetailPayload(data);
    if (!payload?.auction) {
      throw new Error('Auction not found');
    }
    const normalizedAuction = normalizeAuction({
      ...payload.auction,
      software: payload.auction.software ?? payload.software ?? null,
    });
    const normalizedBids = Array.isArray(payload.bids)
      ? payload.bids.map(normalizeBid)
      : [];
    const limits = resolveAuctionBidLimits({
      minNextBid: payload.minNextBid ?? payload.min_next_bid,
      maxBidPrice: payload.maxBidPrice ?? payload.max_bid_price,
      currentHighestBid: normalizedAuction?.currentHighestBid,
      minBidPrice: normalizedAuction?.minBidPrice,
    });
    setAuction(normalizedAuction ? { ...normalizedAuction, ...limits } : normalizedAuction);
    setBids(normalizedBids);
    setMinNextBid(limits.minNextBid);
    setMaxBidPrice(limits.maxBidPrice);
    setLoadError('');
  }, [auctionId]);

  const handleUpdate = useCallback((msg) => {
    setLastUpdate(msg);

    if (msg.type === 'BID_PLACED') {
      setAuction((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          currentHighestBid: toNum(msg.currentHighestBid, prev.currentHighestBid),
          totalBids: toNum(msg.totalBids, prev.totalBids),
          endTime: msg.endTime
            ? withUtcIfNeeded(msg.endTime)
            : prev.endTime,
          status: msg.status,
          currentWinnerName: msg.currentWinnerName ?? prev.currentWinnerName,
        };
        const limits = resolveAuctionBidLimits({
          currentHighestBid: next.currentHighestBid,
          minBidPrice: next.minBidPrice,
        });
        setMinNextBid(limits.minNextBid);
        setMaxBidPrice(limits.maxBidPrice);
        return { ...next, ...limits };
      });
      if (msg.latestBid) {
        setBids((prev) => [normalizeBid(msg.latestBid), ...prev]);
      }
    } else if (msg.type === 'AUCTION_ENDED' || msg.type === 'AUCTION_UNSOLD') {
      setAuction((prev) => (prev ? {
        ...prev,
        status: msg.status,
        currentHighestBid: toNum(msg.currentHighestBid, prev.currentHighestBid),
        currentWinnerName: msg.currentWinnerName ?? prev.currentWinnerName,
        winnerPaymentPaid: Boolean(msg.winnerPaymentPaid ?? prev.winnerPaymentPaid),
      } : prev));
    } else if (msg.type === 'PAYMENT_COMPLETED') {
      setAuction((prev) => (prev ? {
        ...prev,
        status: msg.status ?? 'COMPLETED',
        winnerPaymentPaid: true,
        currentHighestBid: toNum(msg.currentHighestBid, prev.currentHighestBid),
      } : prev));
    } else if (msg.type === 'AUCTION_EXTENDED') {
      if (msg.endTime) {
        setAuction((prev) => (prev ? {
          ...prev,
          endTime: withUtcIfNeeded(msg.endTime),
          status: msg.status,
        } : prev));
      }
    } else if (msg.type === 'AUCTION_STARTED') {
      setAuction((prev) => (prev ? { ...prev, status: 'ACTIVE' } : prev));
    }
  }, []);

  handleUpdateRef.current = handleUpdate;

  useEffect(() => {
    if (!auctionId) {
      setLoading(false);
      setAuction(null);
      return;
    }
    setLoading(true);
    setLoadError('');
    fetchAuctionDetail()
      .catch((err) => {
        setAuction(null);
        setBids([]);
        setMinNextBid(0);
        setMaxBidPrice(0);
        const data = err?.response?.data;
        setLoadError(
          data?.error
          || data?.message
          || (typeof data?.detail === 'string' ? data.detail : null)
          || err?.message
          || 'Failed to load auction',
        );
      })
      .finally(() => setLoading(false));
  }, [auctionId, fetchAuctionDetail]);

  useEffect(() => {
    if (!auctionId) return undefined;

    setWsState('connecting');
    setConnected(false);

    const client = new Client({
      webSocketFactory: () => createAuctionStompSocket(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        setWsState('live');
        client.subscribe(`/topic/software-auction/${auctionId}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            handleUpdateRef.current(msg);
          } catch (e) {
            console.error('Failed to parse software auction message:', e);
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
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      setConnected(false);
      setWsState('connecting');
    };
  }, [auctionId]);

  const placeBid = useCallback(async (payload) => {
    const body = typeof payload === 'object' && payload !== null ? payload : { amount: payload };
    const res = await softwareAuctionAPI.placeBid(auctionId, body);
    await fetchAuctionDetail();
    return res;
  }, [auctionId, fetchAuctionDetail]);

  return {
    auction,
    bids,
    minNextBid,
    maxBidPrice,
    connected,
    wsState,
    loading,
    loadError,
    lastUpdate,
    placeBid,
    refresh: fetchAuctionDetail,
  };
}
