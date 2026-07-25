import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { auctionAPI } from '../api/services';
import { createAuctionStompSocket } from '../config/urls';
import { normalizeAuctionTimestamp, resolveAuctionEndTime } from '../utils/auctionDate';
import { resolveAuctionBidLimits } from '../utils/auctionBidLimits';

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function withUtcIfNeeded(value) {
  if (!value || typeof value !== 'string') return value ?? null;
  return value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
}

function normalizeBid(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const isWinning = Boolean(
    raw.isWinningBid ?? raw.is_winning_bid ?? raw.winningBid ?? false,
  );
  return {
    ...raw,
    id: raw.id ?? null,
    amount: toNum(raw.amount, 0),
    bidTime: withUtcIfNeeded(raw.bidTime ?? raw.created_at ?? raw.createdAt ?? null),
    bidderName: raw.bidderName ?? raw.bidder_name ?? '',
    isWinningBid: isWinning,
    winningBid: isWinning,
  };
}

function normalizeAuctionPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const domainRaw = payload.domain || {};
  const normalized = {
    ...payload,
    id: payload.id ?? null,
    status: payload.status ?? null,
    domainDisplayName:
      payload.domainDisplayName
      ?? payload.domain_display_name
      ?? domainRaw.fullDomain
      ?? domainRaw.full_domain
      ?? null,
    domain: domainRaw.domainName || domainRaw.domain_name || domainRaw.fullDomain || domainRaw.full_domain
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
    startTime: withUtcIfNeeded(normalizeAuctionTimestamp(payload.startTime ?? payload.start_time)),
    endTime: withUtcIfNeeded(
      resolveAuctionEndTime(payload) ?? normalizeAuctionTimestamp(payload.endTime ?? payload.end_time),
    ),
    currentWinnerId:
      payload.currentWinnerId
      ?? payload.current_winner_id
      ?? payload.winner?.user_id
      ?? payload.winner?.userId
      ?? null,
    currentWinnerName:
      payload.currentWinnerName
      ?? payload.current_winner_name
      ?? payload.winner?.name
      ?? null,
    winnerPaymentPaid: Boolean(
      payload.winnerPaymentPaid ?? payload.winner_payment_paid ?? false,
    ),
    transferTransactionId:
      payload.transferTransactionId
      ?? payload.transfer_transaction_id
      ?? null,
  };
  const resolvedEnd = resolveAuctionEndTime(normalized);
  if (resolvedEnd) normalized.endTime = withUtcIfNeeded(resolvedEnd);
  return normalized;
}

function extractDetailPayload(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.auction != null) return data;
  if (data.data?.auction != null) return data.data;
  return null;
}

function extractBidList(data, root) {
  if (Array.isArray(data?.bids)) return data.bids;
  if (Array.isArray(data?.recent_bids)) return data.recent_bids;
  if (Array.isArray(root?.recent_bids)) return root.recent_bids;
  if (Array.isArray(root?.bids)) return root.bids;
  return [];
}

export function useAuction(auctionId) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [minNextBid, setMinNextBid] = useState(0);
  const [maxBidPrice, setMaxBidPrice] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const clientRef = useRef(null);
  const handleUpdateRef = useRef(null);

  const fetchAuctionDetail = useCallback(async () => {
    if (!auctionId) return;
    const { data } = await auctionAPI.get(auctionId);
    const payload = extractDetailPayload(data) ?? data;
    const root = payload?.auction && typeof payload.auction === 'object'
      ? payload.auction
      : payload;
    const a = normalizeAuctionPayload(root);
    const limits = resolveAuctionBidLimits({
      maxBidPrice: payload?.maxBidPrice ?? payload?.max_bid_price ?? data?.maxBidPrice ?? data?.max_bid_price,
      minNextBid: payload?.minNextBid ?? payload?.min_next_bid ?? data?.minNextBid ?? data?.min_next_bid,
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
    setBids(extractBidList(payload ?? data, root).map(normalizeBid));
  }, [auctionId]);

  const handleUpdate = useCallback((msg) => {
    setLastUpdate(msg);

    if (msg.type === 'BID_PLACED') {
      setAuction((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          currentHighestBid: toNum(
            msg.currentHighestBid ?? msg.current_highest_bid,
            prev.currentHighestBid,
          ),
          totalBids: toNum(msg.totalBids ?? msg.total_bids, prev.totalBids),
          endTime: msg.endTime || msg.end_time
            ? withUtcIfNeeded(msg.endTime ?? msg.end_time)
            : prev.endTime,
          status: msg.status ?? prev.status,
          currentWinnerName: msg.currentWinnerName ?? msg.current_winner_name ?? prev.currentWinnerName,
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

      const latest = msg.latestBid ?? msg.bid ?? msg.latest_bid;
      if (latest) {
        const normalized = normalizeBid(latest);
        setBids((prev) => {
          const withoutDup = prev.filter(
            (b) => !normalized.id || b.id !== normalized.id,
          );
          return [
            normalized,
            ...withoutDup.map((b) => ({ ...b, isWinningBid: false, winningBid: false })),
          ];
        });
      }
    } else if (msg.type === 'AUCTION_ENDED' || msg.type === 'AUCTION_UNSOLD') {
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: msg.status ?? prev.status,
          currentHighestBid: toNum(
            msg.currentHighestBid ?? msg.current_highest_bid,
            prev.currentHighestBid,
          ),
          currentWinnerId:
            msg.currentWinnerId
            ?? msg.current_winner_id
            ?? msg.winner?.user_id
            ?? prev.currentWinnerId,
          currentWinnerName:
            msg.currentWinnerName
            ?? msg.current_winner_name
            ?? msg.winner?.name
            ?? prev.currentWinnerName,
          winnerPaymentPaid: Boolean(
            msg.winnerPaymentPaid ?? msg.winner_payment_paid ?? prev.winnerPaymentPaid,
          ),
        };
      });
      fetchAuctionDetail().catch(() => {});
    } else if (msg.type === 'PAYMENT_COMPLETED') {
      setAuction((prev) => (prev ? {
        ...prev,
        status: msg.status ?? 'COMPLETED',
        winnerPaymentPaid: true,
        transferTransactionId:
          msg.transferTransactionId
          ?? msg.transfer_transaction_id
          ?? prev.transferTransactionId,
      } : prev));
      fetchAuctionDetail().catch(() => {});
    } else if (msg.type === 'AUCTION_EXTENDED') {
      if (msg.endTime || msg.end_time) {
        setAuction((prev) => (prev ? {
          ...prev,
          endTime: withUtcIfNeeded(msg.endTime ?? msg.end_time),
          status: msg.status ?? prev.status,
        } : prev));
      }
    } else if (msg.type === 'AUCTION_STARTED') {
      setAuction((prev) => (prev ? { ...prev, status: 'ACTIVE' } : prev));
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

    const client = new Client({
      webSocketFactory: () => createAuctionStompSocket(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/auction/${auctionId}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
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

  const placeBid = useCallback(async (payload) => {
    const body = typeof payload === 'object' && payload !== null
      ? payload
      : { amount: payload };
    const res = await auctionAPI.placeBid(auctionId, body);
    await fetchAuctionDetail();
    return res;
  }, [auctionId, fetchAuctionDetail]);

  return {
    auction,
    bids,
    minNextBid,
    maxBidPrice,
    connected,
    loading,
    lastUpdate,
    placeBid,
    refresh: fetchAuctionDetail,
  };
}
