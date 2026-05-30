import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../hooks/useAuction';
import { auctionAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import {
  formatAuctionDate,
  formatAuctionDateTime,
  formatAuctionTime,
  formatCountdown,
  resolveAuctionEndTime,
} from '../utils/auctionDate';
import { isDomainAuctionLister, resolveAuctionLister } from '../utils/auctionLister';
import { validateBidAmount, formatBidRangeLabel } from '../utils/auctionBidLimits';

const LIVE_AUCTION_STATUSES = new Set(['ACTIVE', 'EXTENDED']);
const FINAL_WINNER_STATUSES = new Set(['ENDED', 'PAYMENT_PENDING', 'COMPLETED']);

function useCountdown(endTime) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!endTime) return;

    const tick = () => {
      const next = formatCountdown(endTime);
      setTimeLeft(next.timeLeft);
      setIsUrgent(next.isUrgent);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return { timeLeft, isUrgent };
}

export default function AuctionPage() {
  const { auctionId }  = useParams();
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const { auction, bids, minNextBid, maxBidPrice, connected, loading, lastUpdate, placeBid }
                       = useAuction(auctionId);
  const { timeLeft, isUrgent } = useCountdown(resolveAuctionEndTime(auction));

  const [bidAmount, setBidAmount]         = useState('');
  const [bidLoading, setBidLoading]       = useState(false);
  const [bidError, setBidError]           = useState('');
  const [bidSuccess, setBidSuccess]       = useState('');
  const [flashBid, setFlashBid]           = useState(false);
  const [reAuctionModal, setReAuctionModal] = useState(false);
  const [participation, setParticipation] = useState({ loading: true, paid: false, fee: 0 });
  const [participationError, setParticipationError] = useState('');
  const [payingParticipation, setPayingParticipation] = useState(false);
  const bidListRef = useRef(null);

  // FIX #13: access domain.listedBy safely — it comes through because
  // @JsonIgnoreProperties on domain only strips {"auction","hibernateLazyInitializer"}
  const isOwner = resolveAuctionLister(
    isDomainAuctionLister(auction, user?.id),
    participation,
  );
  const isActive = LIVE_AUCTION_STATUSES.has(auction?.status);
  const hasFinalWinner = FINAL_WINNER_STATUSES.has(auction?.status);

  // Flash on new bid
  useEffect(() => {
    if (lastUpdate?.type === 'BID_PLACED') {
      setFlashBid(true);
      setTimeout(() => setFlashBid(false), 600);
      setBidSuccess('');
      setBidError('');
    }
  }, [lastUpdate]);

  // Scroll bid list to top on new bid
  useEffect(() => {
    if (bidListRef.current) bidListRef.current.scrollTop = 0;
  }, [bids.length]);

  useEffect(() => {
    if (!auction?.id || !user || !isActive) {
      setParticipation({ loading: false, paid: false, fee: 0, isOwner: false });
      return;
    }
    setParticipation((p) => ({ ...p, loading: true }));
    auctionAPI.participationStatus(auction.id)
      .then(({ data }) => {
        const body = data?.data ?? data;
        setParticipation({
          loading: false,
          paid: Boolean(body?.paid),
          fee: Number(body?.participationFeeInr || 0),
          isOwner: Boolean(body?.isOwner),
        });
      })
      .catch(() => setParticipation({ loading: false, paid: false, fee: 0, isOwner: false }));
  }, [auction?.id, user?.id, isActive]);

  const handlePayParticipation = async () => {
    if (!auction?.id || !user) return;
    setPayingParticipation(true);
    setParticipationError('');
    try {
      const { data: orderData } = await auctionAPI.participationCreateOrder(auction.id);
      openRazorpayCheckout({
        orderData,
        user,
        description: `Auction participation fee`,
        onSuccess: async (response) => {
          try {
            await auctionAPI.participationVerify(auction.id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setParticipation((p) => ({ ...p, paid: true }));
          } catch {
            setParticipationError('Payment verification failed. Please try again.');
          } finally {
            setPayingParticipation(false);
          }
        },
        onFailure: async () => {
          setParticipationError('Participation payment failed. Please retry.');
          setPayingParticipation(false);
        },
        onDismiss: async () => setPayingParticipation(false),
      });
    } catch (err) {
      setParticipationError(err?.response?.data?.error || 'Failed to start payment.');
      setPayingParticipation(false);
    }
  };

  const handleBid = async () => {
    if (!participation.paid) {
      setBidError('Please pay participation fee first.');
      return;
    }
    const amount = parseFloat(bidAmount);
    const bidErrorMsg = validateBidAmount(amount, { minNextBid, maxBidPrice });
    if (bidErrorMsg) {
      setBidError(bidErrorMsg);
      return;
    }
    setBidLoading(true); setBidError(''); setBidSuccess('');
    try {
      await placeBid(amount);
      setBidSuccess(`Bid of ₹${Number(amount).toLocaleString('en-IN')} placed!`);
      setBidAmount('');
    } catch (err) {
      setBidError(err.response?.data?.error || 'Failed to place bid.');
    } finally { setBidLoading(false); }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  if (!auction) return (
    <AppLayout>
      <div className="text-center py-20">
        <h3 className="font-display text-2xl font-bold text-gray-900">Auction not found</h3>
      </div>
    </AppLayout>
  );

  const domain = auction.domain || {};
  const ownerName =
    domain?.listedBy?.name
    || domain?.listedBy?.fullName
    || domain?.listedBy?.username
    || domain?.listedBy?.email
    || 'Domain Owner';
  const ownerInitial = (ownerName || 'D').trim().charAt(0).toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-[1100px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="mb-8">
          <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4" onClick={() => navigate('/auctions')}>
            ← Back to Auctions
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="font-display text-4xl font-bold text-gray-900 m-0">
                  {domain.domainName}{domain.domainExtension}
                </h1>
                {domain.verified && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold text-green-600 bg-green-100 border border-green-300">
                    ✓ Verified
                  </span>
                )}
                <StatusBadge status={auction.status} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-600' : 'bg-amber-500'}`} />
                <span className={`text-xs ${connected ? 'text-green-600' : 'text-amber-600'}`}>
                  {connected ? 'Live' : 'Live updates paused'}
                </span>
              </div>
            </div>

            {/* Countdown */}
            {isActive && (
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                  {auction.status === 'EXTENDED' ? '⚡ Extended — Ends in' : 'Ends in'}
                </div>
                <div className={`font-display text-3xl font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-indigo-600'}`}>
                  {timeLeft}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 p-5 bg-white border border-gray-200 rounded-[14px]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xl flex items-center justify-center">
              {ownerInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-semibold text-gray-900 m-0 truncate">
                  {domain.domainName || 'Domain Listing'}{domain.domainExtension || ''}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200">
                  Domain Auction
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Owner: <span className="font-semibold text-gray-800">{ownerName}</span>
              </div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {domain.domainStatus && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200">
                    {String(domain.domainStatus).replace(/_/g, ' ')}
                  </span>
                )}
                {domain.saleType && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                    {String(domain.saleType).replace(/_/g, ' ')}
                  </span>
                )}
                {domain.verified && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-green-700 bg-green-50 border border-green-200">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ── Left: Bid info + history ── */}
          <div className="flex flex-col gap-4">

            {/* Current bid stats card */}
            <div className={`p-6 border rounded-[14px] transition-all duration-300 ${flashBid ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Current Highest Bid</div>
                  <div className={`font-display text-[2rem] font-bold ${auction.currentHighestBid > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {auction.currentHighestBid > 0
                      ? `₹${Number(auction.currentHighestBid).toLocaleString('en-IN')}`
                      : 'No bids yet'}
                  </div>
                  {auction.currentWinnerName && (
                    <div className="text-[0.78rem] text-gray-400 mt-1">
                      Leading: {auction.currentWinnerName}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Starting Bid</div>
                  <div className="font-display text-[1.5rem] font-bold text-amber-600">
                    ₹{Number(auction.minBidPrice).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Total Bidss</div>
                  <div className="font-display text-[2rem] font-bold text-gray-900">
                    {auction.totalBids}
                  </div>
                </div>
              </div>

              {isActive && auction.currentHighestBid > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[0.82rem] text-amber-800">
                  Allowed bid range: <strong>{formatBidRangeLabel({ minNextBid, maxBidPrice })}</strong>
                  <span className="text-gray-500 ml-2">(5% above current)</span>
                </div>
              )}
            </div>

            {/* Bid History */}
            <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900 text-[0.9rem]">
                Bid History
                <span className="text-gray-500 font-normal ml-2 text-[0.8rem]">({bids.length} bids)</span>
              </div>
              <div ref={bidListRef} className="max-h-[360px] overflow-y-auto py-2">
                {bids.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-[0.875rem]">
                    No bids yet. Be the first to bid!
                  </div>
                ) : (
                  bids.map((bid, i) => (
                    <BidRow key={i} bid={bid} isLatest={i === 0}
                            isWinner={hasFinalWinner && (bid.isWinningBid || bid.winningBid)}
                            isLeading={isActive && (bid.isWinningBid || bid.winningBid)} />
                  ))
                )}
              </div>
            </div>

            {/* UNSOLD — lister options */}
            {isOwner && auction.status === 'UNSOLD' && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-[12px]">
                <div className="font-semibold text-amber-700 mb-2">Auction ended with no bids</div>
                <p className="text-gray-500 text-[0.875rem] mb-4">
                  You can re-auction with new settings, or take the listing down.
                </p>
                <div className="flex gap-3">
                  <button className="btn-glow"
                    onClick={() => setReAuctionModal(true)}>
                    ↺ Re-Auction
                  </button>
                  <button className="btn-glow"
                    onClick={async () => {
                      try {
                        await auctionAPI.close(auction.id);
                        navigate('/domains/dashboard');
                      } catch (e) {
                        alert('Failed to close auction.');
                      }
                    }}>
                    Take Down
                  </button>
                </div>
              </div>
            )}

            {/* ENDED — winner announcement */}
            {hasFinalWinner && (
              <div className="p-6 text-center bg-green-50 border border-green-200 rounded-[14px]">
                <div className="text-[2.5rem] mb-2">🏆</div>
                <h3 className="font-display text-[1.5rem] text-green-700 mb-2">Auction Won!</h3>
                <p className="text-gray-500">
                  <strong className="text-gray-900">{auction.currentWinnerName || 'A bidder'}</strong>
                  {' '}won with a bid of{' '}
                  <strong className="text-green-700">
                    ₹{Number(auction.currentHighestBid).toLocaleString('en-IN')}
                  </strong>
                </p>
                <p className="text-[0.82rem] text-gray-500 mt-2">
                  Our admin team will coordinate the transfer.
                </p>
              </div>
            )}
          </div>

          {/* ── Right: Bid placement + info ── */}
          <div className="sticky top-6 flex flex-col gap-4">

            {/* Bid form — only for non-owner, active auction */}
            {isActive && !isOwner && (
              <div className="p-6 bg-white border border-gray-200 rounded-[14px]">
                <h3 className="font-display text-[1.25rem] font-semibold text-gray-900 mb-5">
                  Place Your Bid
                </h3>
                {!participation.loading && !participation.paid && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-sm text-amber-800 mb-2">
                      Participation fee required: <strong>₹{Number(participation.fee || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <button className="btn-glow w-full" onClick={handlePayParticipation} disabled={payingParticipation}>
                      {payingParticipation ? 'Processing…' : 'Pay Participation Fee →'}
                    </button>
                    {participationError && <div className="text-xs text-red-600 mt-2">{participationError}</div>}
                  </div>
                )}

                {/* Quick bid buttons */}
                {minNextBid > 0 && (
                  <div className="mb-4">
                    <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Bid</div>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 1.1, 1.25].map(mult => {
                        const quickAmount = Math.ceil(minNextBid * mult / 100) * 100;
                        const selected = bidAmount === String(quickAmount);
                        return (
                          <button key={mult}
                            onClick={() => setBidAmount(String(quickAmount))}
                            className={`px-3 py-1.5 rounded-lg text-[0.78rem] cursor-pointer font-semibold transition-all ${
                              selected
                                ? 'bg-indigo-50 border border-indigo-400 text-indigo-700'
                                : 'bg-gray-50 border border-gray-200 text-gray-500 hover:border-indigo-300'
                            }`}>
                            ₹{Number(quickAmount).toLocaleString('en-IN')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[0.78rem] text-gray-500 font-semibold block uppercase tracking-wider">
                    YOUR BID AMOUNT (₹)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => { setBidAmount(e.target.value); setBidError(''); }}
                    placeholder={`Min ₹${Number(minNextBid).toLocaleString('en-IN')}`}
                    min={minNextBid}
                    max={maxBidPrice || undefined}
                    className="text-[1.1rem] font-semibold bg-gray-50 text-gray-900 border-2 border-gray-200 px-4 py-3 rounded-lg w-full outline-none focus:border-indigo-400 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && handleBid()}
                  />
                </div>

                {bidError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-[0.82rem] text-red-600">
                    {bidError}
                  </div>
                )}

                {bidSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-[0.82rem] text-green-700">
                    ✓ {bidSuccess}
                  </div>
                )}

                <button className="btn-glow w-full" onClick={handleBid}
                  disabled={bidLoading || !bidAmount || !participation.paid}>
                  {bidLoading ? <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> :
                    `Place Bid${bidAmount
                      ? ` — ₹${Number(bidAmount).toLocaleString('en-IN')}`
                      : ''} →`}
                </button>

                <p className="text-[0.72rem] text-gray-500 mt-3 text-center leading-relaxed">
                  By bidding you commit to purchasing this domain if you win.
                  Each bid must be at least 5% above the current highest bid.
                </p>
              </div>
            )}

            {/* Owner — can't bid on own listing */}
            {isOwner && isActive && (
              <div className="p-5 bg-white border border-gray-200 rounded-[14px] text-center">
                <div className="text-[1.5rem] mb-2">👑</div>
                <p className="text-gray-500 text-[0.875rem]">
                  This is your auction. You cannot bid on your own listing.
                </p>
              </div>
            )}

            {/* Auction info card */}
            <div className="p-5 bg-white border border-gray-200 rounded-[14px]">
              <div className="text-[0.72rem] font-semibold text-gray-900 uppercase tracking-wider mb-3">Auction Info</div>
              <div className="flex flex-col gap-2.5">
                <InfoRow label="Duration"
                  value={auction.duration?.replace(/_/g, ' ')} />
                <InfoRow label="Started"
                  value={formatAuctionDate(auction.startTime, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })} />
                <InfoRow label="Ends"
                  value={formatAuctionDateTime(auction.endTime, {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })} />
                {auction.status === 'EXTENDED' && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-[0.75rem] text-amber-800">
                    ⚡ Extended due to last-minute bid
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {reAuctionModal && (
        <ReAuctionModal
          auctionId={auction.id}
          onClose={() => setReAuctionModal(false)}
          onSuccess={() => { setReAuctionModal(false); window.location.reload(); }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </AppLayout>
  );
}

// ─── Bid Row ──────────────────────────────────────────────────────────────────
function BidRow({ bid, isLatest, isWinner, isLeading }) {
  // FIX #12: normalize bidTime
  const bidTimeStr = formatAuctionTime(bid.bidTime, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }, '');

  return (
    <div className={`flex items-center gap-4 px-5 py-3 transition-all ${
      isLatest ? 'bg-green-50 border-l-[3px] border-l-green-400' : 'bg-transparent border-l-[3px] border-l-transparent'
    }`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
        isWinner
          ? 'bg-amber-100 text-amber-700'
          : isLeading
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
      }`}>
        {isWinner ? '🏆' : isLeading ? '1' : bid.bidderName?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[0.875rem] text-gray-900">
          {bid.bidderName || 'Anonymous'}
          {isWinner && (
            <span className="ml-1.5 text-[0.68rem] text-amber-600 font-bold">WINNER</span>
          )}
          {!isWinner && isLeading && (
            <span className="ml-1.5 text-[0.68rem] text-green-600 font-bold">LEADING</span>
          )}
        </div>
        <div className="text-[0.72rem] text-gray-500">
          {bidTimeStr ? `${bidTimeStr} · Bidder` : 'Bidder'}
        </div>
      </div>
      <div className={`font-display text-[1.1rem] font-bold flex-shrink-0 ${
        isLatest ? 'text-green-600' : 'text-amber-600'
      }`}>
        ₹{Number(bid.amount).toLocaleString('en-IN')}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    DRAFT:    { color: '#888',    label: 'Draft'       },
    ACTIVE:   { color: '#6ec896', label: '🟢 Live'     },
    EXTENDED: { color: '#c8a96e', label: '⚡ Extended' },
    ENDED:    { color: '#a06ec8', label: 'Ended'       },
    PAYMENT_PENDING: { color: '#c8a96e', label: 'Payment Pending' },
    COMPLETED: { color: '#6ec896', label: 'Completed' },
    UNSOLD:   { color: '#c86e6e', label: 'Unsold'      },
    CANCELLED:{ color: '#888',    label: 'Cancelled'   },
    CLOSED:   { color: '#666',    label: 'Closed'      },
  }[status] || { color: '#888', label: status };

  return (
    <span style={{
      padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
      color: config.color, background: config.color + '18', border: `1px solid ${config.color}33`,
    }}>
      {config.label}
    </span>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-[0.82rem]">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-semibold">{value || '—'}</span>
    </div>
  );
}

// ─── Re-Auction Modal ─────────────────────────────────────────────────────────
function ReAuctionModal({ auctionId, onClose, onSuccess }) {
  const [form, setForm]       = useState({ minBidPrice: '', duration: 'SEVEN_DAYS' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.minBidPrice || parseFloat(form.minBidPrice) <= 0) {
      setError('Please enter a valid minimum bid.');
      return;
    }
    setLoading(true); setError('');
    try {
      await auctionAPI.reAuction(auctionId, {
        minBidPrice: parseFloat(form.minBidPrice),
        duration:    form.duration,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to re-auction.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>
        <div className="mb-6">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide mb-2">Re-Auction</div>
          <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">Start a New Auction</h2>
          <p className="text-sm text-gray-500">Set new parameters for your re-auction.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">New Minimum Bid (₹) <span className="text-red-500">*</span></label>
            <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" type="number" min="1" value={form.minBidPrice}
              onChange={e => setForm(f => ({ ...f, minBidPrice: e.target.value }))}
              placeholder="e.g. 5000" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Auction Duration <span className="text-red-500">*</span></label>
            <select className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
              <option value="ONE_HOUR">1 Hour</option>
              <option value="SIX_HOURS">6 Hours</option>
              <option value="TWELVE_HOURS">12 Hours</option>
              <option value="ONE_DAY">1 Day</option>
              <option value="THREE_DAYS">3 Days</option>
              <option value="SEVEN_DAYS">7 Days</option>
            </select>
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="flex gap-3 mt-1">
            <button type="submit" className="btn-glow flex-1" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : 'Start Re-Auction →'}
            </button>
            <button type="button" className="btn-glow" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
