import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSoftwareAuction } from '../hooks/useSoftwareAuction';
import { useAuth } from '../context/AuthContext';
import { softwareAuctionAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { Gavel, Clock, Wifi, WifiOff, TrendingUp, Code, Wrench, FileText } from 'lucide-react';
import { formatAuctionDateTime, formatCountdown, resolveAuctionEndTime } from '../utils/auctionDate';
import { isSoftwareAuctionLister, resolveAuctionLister } from '../utils/auctionLister';
import { validateBidAmount, formatBidRangeLabel } from '../utils/auctionBidLimits';

function Countdown({ endTime, status }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!endTime || (status !== 'ACTIVE' && status !== 'EXTENDED')) {
      setTimeLeft('');
      setIsUrgent(false);
      return;
    }
    const tick = () => {
      const next = formatCountdown(endTime);
      setTimeLeft(next.timeLeft === 'Awaiting schedule' ? '' : next.timeLeft);
      setIsUrgent(next.isUrgent);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, status]);

  if (!timeLeft) return null;
  return (
    <span style={{ color: isUrgent ? '#c86e6e' : '#6ec896', fontFamily: 'monospace',
                   fontWeight: 700, fontSize: '1.1rem' }}>
      {timeLeft}
    </span>
  );
}

const STATUS_STYLES = {
  ACTIVE:           { color: '#6ec896', bg: 'rgba(110,200,150,0.12)', label: '🟢 Live' },
  EXTENDED:         { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', label: '⏱ Extended' },
  ENDED:            { color: '#6eadc8', bg: 'rgba(110,173,200,0.12)', label: '✓ Ended' },
  UNSOLD:           { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: 'No Bids' },
  CLOSED:           { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Closed'  },
  DRAFT:            { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', label: '⏳ Pending Approval' },
  PENDING_APPROVAL: { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', label: '⏳ Pending Approval' },
};

export default function SoftwareAuctionPage() {
  const { auctionId }                       = useParams();
  const { user }                            = useAuth();
  const navigate                            = useNavigate();
  const { auction, bids, minNextBid, maxBidPrice,
          wsState, loading, loadError, placeBid } = useSoftwareAuction(auctionId);
  const resolvedEndTime = resolveAuctionEndTime(auction);

  const [bidAmount, setBidAmount]           = useState('');
  const [bidError, setBidError]             = useState('');
  const [bidSuccess, setBidSuccess]         = useState('');
  const [placing, setPlacing]               = useState(false);
  const [participation, setParticipation]   = useState({ loading: true, paid: false, fee: 0 });
  const [payingParticipation, setPayingParticipation] = useState(false);
  const [participationError, setParticipationError] = useState('');

  const isActive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const isOwner = resolveAuctionLister(
    isSoftwareAuctionLister(auction, user?.id),
    participation,
  );
  const statusStyle = STATUS_STYLES[auction?.status] || STATUS_STYLES.DRAFT;

  useEffect(() => {
    if (!auction?.id || !user || !isActive) {
      setParticipation({ loading: false, paid: false, fee: 0, isOwner: false });
      return;
    }
    setParticipation((p) => ({ ...p, loading: true }));
    softwareAuctionAPI.participationStatus(auction.id)
      .then(({ data }) => {
        const status = data?.data ?? data;
        setParticipation({
          loading: false,
          paid: Boolean(status?.paid),
          fee: Number(status?.participationFeeInr ?? status?.participation_fee_inr ?? 0),
          isOwner: Boolean(status?.isOwner),
        });
      })
      .catch(() => setParticipation({ loading: false, paid: false, fee: 0, isOwner: false }));
  }, [auction?.id, user?.id, isActive]);

  const handlePayParticipation = async () => {
    if (!auction?.id || !user) return;
    setPayingParticipation(true);
    setParticipationError('');
    try {
      const { data: res } = await softwareAuctionAPI.participationCreateOrder(auction.id);
      const orderData = res?.data ?? res;
      openRazorpayCheckout({
        orderData,
        user,
        description: `Software auction participation fee`,
        onSuccess: async (response) => {
          try {
            await softwareAuctionAPI.participationVerify(auction.id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            const { data: statusRes } = await softwareAuctionAPI.participationStatus(auction.id);
            const status = statusRes?.data ?? statusRes;
            setParticipation({
              loading: false,
              paid: Boolean(status?.paid ?? status?.canBid ?? true),
              fee: Number(status?.participationFeeInr ?? status?.participation_fee_inr ?? participation.fee),
            });
            setBidError('');
          } catch {
            setParticipationError('Payment verification failed. Please retry.');
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
    if (!participation.paid) { setBidError('Please pay participation fee first'); return; }
    const amt = parseFloat(bidAmount);
    if (isNaN(amt) || amt <= 0) { setBidError('Enter a valid amount'); return; }
    const bidErrorMsg = validateBidAmount(amt, { minNextBid, maxBidPrice });
    if (bidErrorMsg) {
      setBidError(bidErrorMsg);
      return;
    }
    setBidError(''); setBidSuccess('');
    setPlacing(true);
    try {
      await placeBid(amt);
      setBidSuccess('Bid placed successfully!');
      setBidAmount('');
      setTimeout(() => setBidSuccess(''), 4000);
    } catch (e) {
      const data = e.response?.data;
      setBidError(
        data?.error
        || data?.message
        || (typeof data?.detail === 'string' ? data.detail : null)
        || 'Failed to place bid',
      );
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  if (!auction) return (
    <AppLayout>
      <div className="text-center py-24">
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Auction not found</h2>
        {loadError && (
          <p className="text-red-600 text-sm mt-2 max-w-md mx-auto">{loadError}</p>
        )}
        <button className="btn-ghost mt-4" onClick={() => navigate('/technology')}>← Back to Technology</button>
      </div>
    </AppLayout>
  );

  const sw = auction.software || {};

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1rem' }}>

        {/* Back */}
        <button className="btn-ghost mb-4" style={{ fontSize: '0.85rem' }}
          onClick={() => navigate('/technology')}>
          ← Technology
        </button>

        {/* Header card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {sw.imageUrl && (
                <img src={sw.imageUrl} alt={sw.name}
                  style={{ width: 56, height: 56, borderRadius: 10,
                           objectFit: 'cover', border: '1px solid #e5e7eb' }} />
              )}
              <div>
                <h1 style={{ fontFamily: 'Cormorant Garamond, serif',
                             fontSize: '1.75rem', fontWeight: 700,
                             color: '#111827', margin: 0 }}>
                  {sw.name}
                </h1>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                  {sw.category && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600,
                                   background: 'rgba(110,173,200,0.12)',
                                   color: '#6eadc8', border: '1px solid rgba(110,173,200,0.3)',
                                   padding: '0.2rem 0.6rem', borderRadius: 4 }}>
                      {sw.category.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', fontWeight: 700,
                                 background: statusStyle.bg, color: statusStyle.color,
                                 border: `1px solid ${statusStyle.color}44`,
                                 padding: '0.2rem 0.6rem', borderRadius: 4 }}>
                    {statusStyle.label}
                  </span>
                  {wsState === 'reconnecting' && isActive && (
                    <span style={{ fontSize: '0.72rem', color: '#c86e6e',
                                   display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <WifiOff size={11} /> Live updates paused
                    </span>
                  )}
                  {wsState === 'connecting' && isActive && (
                    <span style={{ fontSize: '0.72rem', color: '#c8a96e',
                                   display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wifi size={11} /> Connecting…
                    </span>
                  )}
                  {wsState === 'live' && isActive && (
                    <span style={{ fontSize: '0.72rem', color: '#6ec896',
                                   display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wifi size={11} /> Live
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Countdown */}
            {isActive && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af',
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              marginBottom: '0.3rem' }}>
                  <Clock size={11} style={{ marginRight: 4 }} />Time Left
                </div>
                <Countdown endTime={resolvedEndTime} status={auction.status} />
                {auction.status === 'EXTENDED' && (
                  <div style={{ fontSize: '0.72rem', color: '#c8a96e', marginTop: '0.25rem' }}>
                    ⚡ Extended (anti-snipe)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current bid stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                        gap: '1rem', marginTop: '1.25rem',
                        padding: '1rem', background: '#f9fafb',
                        borderRadius: 10, border: '1px solid #e5e7eb' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af',
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min Bid</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif',
                            fontSize: '1.3rem', fontWeight: 700, color: '#111827' }}>
                ₹{Number(auction.minBidPrice).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af',
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Highest</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif',
                            fontSize: '1.3rem', fontWeight: 700,
                            color: auction.currentHighestBid > 0 ? '#6ec896' : '#9ca3af' }}>
                {auction.currentHighestBid > 0
                  ? `₹${Number(auction.currentHighestBid).toLocaleString('en-IN')}`
                  : '—'}
              </div>
              {auction.currentWinnerName && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
                  {auction.currentWinnerName}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af',
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Bids</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif',
                            fontSize: '1.3rem', fontWeight: 700, color: '#111827' }}>
                {auction.totalBids}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>

          {/* Left: Software details + auction terms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Software description */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                          borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                           fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                           margin: '0 0 0.75rem' }}>About the Software</h3>
              {sw.description && (
                <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                  {sw.description}
                </p>
              )}
              {sw.techStack && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {sw.techStack.split(',').map(t => (
                    <span key={t.trim()} style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem',
                                                  background: 'rgba(110,173,200,0.1)',
                                                  color: '#6eadc8', borderRadius: 4,
                                                  border: '1px solid rgba(110,173,200,0.25)' }}>
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Auction terms */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                          borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                           fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                           margin: '0 0 1rem' }}>What's Included</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                              fontSize: '0.88rem', color: '#374151' }}>
                  <Code size={16} color={auction.sourceCodeIncluded ? '#6ec896' : '#d1d5db'} />
                  <span style={{ color: auction.sourceCodeIncluded ? '#111827' : '#9ca3af' }}>
                    Source code {auction.sourceCodeIncluded ? 'included' : 'not included'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                              fontSize: '0.88rem', color: '#374151' }}>
                  <Wrench size={16} color={auction.supportIncluded ? '#6ec896' : '#d1d5db'} />
                  <span style={{ color: auction.supportIncluded ? '#111827' : '#9ca3af' }}>
                    {auction.supportIncluded
                      ? `Post-sale support — ${auction.supportDays} day${auction.supportDays !== 1 ? 's' : ''}`
                      : 'No post-sale support'}
                  </span>
                </div>
                {auction.transferDetails && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                fontSize: '0.88rem', color: '#374151' }}>
                    <FileText size={16} color="#6eadc8" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{auction.transferDetails}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Why auction */}
            {auction.auctionRationale && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                             fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                             margin: '0 0 0.75rem' }}>Why Auction?</h3>
                <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                  {auction.auctionRationale}
                </p>
              </div>
            )}

            {/* External links */}
            {(sw.liveDemoLink || sw.githubLink || sw.videoLink) && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                             fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                             margin: '0 0 0.75rem' }}>Links</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {sw.liveDemoLink && (
                    <a href={sw.liveDemoLink} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
                      🔗 Live Demo
                    </a>
                  )}
                  {sw.githubLink && (
                    <a href={sw.githubLink} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
                      ⌥ GitHub
                    </a>
                  )}
                  {sw.videoLink && (
                    <a href={sw.videoLink} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
                      ▶ Demo Video
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Bid history */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                          borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                           fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                           margin: '0 0 0.75rem' }}>
                <TrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Bid History ({bids.length})
              </h3>
              {bids.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>No bids yet. Be the first!</p>
              ) : (
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {bids.map((bid, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                          alignItems: 'center', padding: '0.5rem 0',
                                          borderBottom: i < bids.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                          {bid.bidderName}
                        </span>
                        {bid.isWinningBid && (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem',
                                         color: '#059669' }}>🏆 Winner</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700,
                                      color: bid.isWinningBid ? '#059669' : '#6eadc8' }}>
                          ₹{Number(bid.amount).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                          {formatAuctionDateTime(bid.bidTime, {
                            hour: '2-digit', minute: '2-digit',
                            day: 'numeric', month: 'short',
                          }, '')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Bid panel */}
          <div style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
            {auction.status === 'DRAFT' || auction.status === 'PENDING_APPROVAL' ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                             fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
                  Awaiting Approval
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                  This auction is under review. It will go live once approved by our team.
                </p>
              </div>
            ) : auction.status === 'ENDED' ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏆</div>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                             fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
                  Auction Ended
                </h3>
                {auction.currentWinnerName && (
                  <p style={{ fontSize: '0.88rem', color: '#374151', margin: '0 0 0.5rem' }}>
                    Won by <strong>{auction.currentWinnerName}</strong>
                  </p>
                )}
                <p style={{ fontFamily: 'Cormorant Garamond, serif',
                            fontSize: '1.5rem', fontWeight: 700, color: '#6ec896', margin: 0 }}>
                  ₹{Number(auction.currentHighestBid).toLocaleString('en-IN')}
                </p>
              </div>
            ) : auction.status === 'UNSOLD' && isOwner ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                             fontWeight: 700, color: '#111827', margin: '0 0 1rem' }}>
                  No Bids — Re-Auction?
                </h3>
                <p style={{ fontSize: '0.83rem', color: '#6b7280', margin: '0 0 1rem' }}>
                  Your auction ended without bids. You can re-list with a new price/duration.
                </p>
                <button className="btn-glow w-full"
                  onClick={() => navigate(`/technology`)}>
                  Manage Listing
                </button>
              </div>
            ) : isActive && !isOwner && user ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif',
                             fontSize: '1.15rem', fontWeight: 700, color: '#111827',
                             margin: '0 0 0.25rem' }}>
                  <Gavel size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Place a Bid
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 1.25rem' }}>
                  Allowed range: {formatBidRangeLabel({ minNextBid, maxBidPrice })}
                </p>
                {!participation.loading && !participation.paid && (
                  <div style={{ marginBottom: '0.8rem', padding: '0.65rem', borderRadius: 8, background: '#fff8e7', border: '1px solid #f3d38a' }}>
                    <div style={{ fontSize: '0.8rem', color: '#8a6d1f', marginBottom: '0.4rem' }}>
                      Participation fee required: <strong>₹{Number(participation.fee || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <button className="btn-glow w-full" onClick={handlePayParticipation} disabled={payingParticipation}>
                      {payingParticipation ? 'Processing…' : 'Pay Participation Fee →'}
                    </button>
                    {participationError && <div style={{ fontSize: '0.74rem', color: '#c86e6e', marginTop: '0.35rem' }}>{participationError}</div>}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%',
                                   transform: 'translateY(-50%)', color: '#6b7280',
                                   fontWeight: 600 }}>₹</span>
                    <input type="number" value={bidAmount}
                      onChange={e => { setBidAmount(e.target.value); setBidError(''); }}
                      placeholder={Number(minNextBid).toFixed(0)}
                      style={{ paddingLeft: '1.75rem', width: '100%' }} />
                  </div>
                  <button className="btn-glow" onClick={handleBid} disabled={placing || !participation.paid}
                    style={{ whiteSpace: 'nowrap', minWidth: 80 }}>
                    {placing ? <span className="btn-spinner" /> : 'Bid →'}
                  </button>
                </div>

                {/* Quick bid shortcuts */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
                              marginBottom: '0.75rem' }}>
                  {[1, 1.1, 1.25].map(mult => {
                    const val = Math.ceil(minNextBid * mult);
                    return (
                      <button key={mult}
                        onClick={() => setBidAmount(String(val))}
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                                 background: '#f9fafb', border: '1px solid #e5e7eb',
                                 borderRadius: 6, cursor: 'pointer', color: '#374151' }}>
                        ₹{Number(val).toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>

                {bidError && (
                  <div style={{ fontSize: '0.8rem', color: '#c86e6e', marginBottom: '0.5rem' }}>
                    ⚠ {bidError}
                  </div>
                )}
                {bidSuccess && (
                  <div style={{ fontSize: '0.8rem', color: '#6ec896', marginBottom: '0.5rem' }}>
                    ✓ {bidSuccess}
                  </div>
                )}

                <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                  Each bid must be at least 5% above the current highest. Last-minute bids extend the auction by 5 minutes.
                </p>
              </div>
            ) : isActive && isOwner ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
                  You cannot bid on your own listing.
                </p>
              </div>
            ) : !user ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem' }}>
                  Sign in to place a bid
                </p>
                <button className="btn-glow w-full" onClick={() => navigate('/login')}>
                  Sign In
                </button>
              </div>
            ) : null}

            {/* Lister info */}
            {sw.listedBy && (
              <div style={{ marginTop: '1rem', background: '#fff',
                            border: '1px solid #e5e7eb', borderRadius: 12,
                            padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af',
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              marginBottom: '0.5rem' }}>Listed by</div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.88rem' }}>
                  {sw.listedBy.firstname} {sw.listedBy.lastname}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}