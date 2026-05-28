import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ventureAuctionAPI } from '../api/services';
import { API_ORIGIN } from '../config/urls';

const toNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const withUtcIfNeeded = (value) => {
  if (!value || typeof value !== 'string') return value ?? null;
  return value.endsWith('Z') ? value : `${value}Z`;
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
  return {
    ...a,
    minBidPrice: toNum(a.minBidPrice ?? a.min_bid_price, 0),
    currentHighestBid: toNum(a.currentHighestBid ?? a.current_highest_bid, 0),
    totalBids: toNum(a.totalBids ?? a.total_bids, 0),
    startTime: withUtcIfNeeded(a.startTime ?? a.start_time ?? null),
    endTime: withUtcIfNeeded(a.endTime ?? a.end_time ?? null),
    originalEndTime: withUtcIfNeeded(a.originalEndTime ?? a.original_end_time ?? null),
    currentWinnerName: a.currentWinnerName ?? '',
  };
};

export function useVentureAuction(auctionId) {
  const [auction, setAuction]       = useState(null);
  const [bids, setBids]             = useState([]);
  const [minNextBid, setMinNextBid] = useState(0);
  const [connected, setConnected]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const clientRef                   = useRef(null);
  const handleUpdateRef             = useRef(null);

  const fetchAuctionDetail = useCallback(async () => {
    if (!auctionId) return;
    const { data } = await ventureAuctionAPI.get(auctionId);
    const normalizedAuction = normalizeAuction(data?.auction);
    const normalizedBids = Array.isArray(data?.bids) ? data.bids.map(normalizeBid) : [];
    setAuction(normalizedAuction);
    setBids(normalizedBids);
    setMinNextBid(toNum(data?.minNextBid ?? data?.min_next_bid, 0));
  }, [auctionId]);

  const handleUpdate = useCallback((msg) => {
    setLastUpdate(msg);

    if (msg.type === 'BID_PLACED') {
      setAuction(prev => prev ? {
        ...prev,
        currentHighestBid:  toNum(msg.currentHighestBid, prev.currentHighestBid),
        totalBids:          toNum(msg.totalBids, prev.totalBids),
        endTime:            msg.endTime
            ? (msg.endTime.endsWith('Z') ? msg.endTime : msg.endTime + 'Z')
            : prev.endTime,
        status:             msg.status,
        currentWinnerName:  msg.currentWinnerName,
      } : prev);
      setMinNextBid(toNum(msg.currentHighestBid, 0) * 1.05);
      if (msg.latestBid) setBids(prev => [normalizeBid(msg.latestBid), ...prev]);
    } else if (msg.type === 'AUCTION_ENDED' || msg.type === 'AUCTION_UNSOLD') {
      setAuction(prev => prev ? { ...prev, status: msg.status } : prev);
    } else if (msg.type === 'AUCTION_EXTENDED') {
      if (msg.endTime) {
        setAuction(prev => prev ? {
          ...prev,
          endTime: msg.endTime.endsWith('Z') ? msg.endTime : msg.endTime + 'Z',
          status:  msg.status,
        } : prev);
      }
    } else if (msg.type === 'AUCTION_STARTED') {
      setAuction(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
    }
  }, []);

  handleUpdateRef.current = handleUpdate;

  useEffect(() => {
    if (!auctionId) return;
    setLoading(true);
    fetchAuctionDetail()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auctionId, fetchAuctionDetail]);

  useEffect(() => {
    if (!auctionId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_ORIGIN.replace(/\/$/, '')}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/venture-auction/${auctionId}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            handleUpdateRef.current(msg);
          } catch (e) {
            console.error('Failed to parse venture auction message:', e);
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError:  (frame) => { console.error('STOMP error:', frame); setConnected(false); },
    });

    client.activate();
    clientRef.current = client;

    return () => { client.deactivate(); setConnected(false); };
  }, [auctionId]);

  const placeBid = useCallback(async (amount) => {
    const res = await ventureAuctionAPI.placeBid(auctionId, amount);
    // WebSocket can be temporarily disconnected; force-refresh to keep UI accurate.
    await fetchAuctionDetail();
    return res;
  }, [auctionId, fetchAuctionDetail]);

  return { auction, bids, minNextBid, connected, loading, lastUpdate, placeBid };
}
