import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import useReferralTracker from '../hooks/useReferralTracker';
import EdgePointsRedeemToggle from '../components/profile/EdgePointsRedeemToggle';
import { useCommunityAuction, isCreatorAuctionId } from '../hooks/useCommunityAuction';
import { communityAuctionAPI, meetingAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import MeetingDateTimePicker from '../components/common/MeetingDateTimePicker';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import {
  isCommunityAuctionLister,
  resolveAuctionLister,
} from '../utils/auctionLister';
import { validateBidAmount, formatBidRangeLabel } from '../utils/auctionBidLimits';
import {
  formatAuctionDate,
  formatAuctionDateTime,
  formatAuctionTime,
  formatCountdown,
  formatDateOrText,
  formatExpectedRate,
  resolveAuctionEndTime,
  toDatetimeLocalInput,
} from '../utils/auctionDate';
import { getLinkedInProfileUrl } from '../utils/creatorProfile';
import { payAuctionCreationFee, fetchListingFeesAndCharges } from '../utils/auctionFees';
import useCurrency from '../context/CurrencyContext';
import { convertPrice as convertInrToCurrency } from '../utils/currencyDisplay';
import { hasPlacedCommunityAuctionBid } from '../utils/communityAuctionMeetings';

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(endTime) {
  const [timeLeft, setTimeLeft] = useState('—');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = formatCountdown(endTime);
      setTimeLeft(next.timeLeft);
      setIsUrgent(next.isUrgent);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return { timeLeft, isUrgent };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CommunityAuctionPage() {
  const { t } = useTranslation();
  const { auctionId } = useParams();
  const { user }      = useAuth();

  useReferralTracker(auctionId, 'auction');

  const navigate      = useNavigate();
  const { auction, bids, minNextBid, maxBidPrice, bidFee: hookBidFee, wsState, loading, lastUpdate, placeBid, refresh }
                      = useCommunityAuction(auctionId);
  const resolvedEndTime = resolveAuctionEndTime(auction);
  const { timeLeft, isUrgent } = useCountdown(resolvedEndTime);
  const {
    currency,
    formatPrice,
    convertToInr,
    getSymbol,
    ratesMeta,
  } = useCurrency();

  // Bid state — input is in site currency; API always receives INR
  const [bidAmount, setBidAmount]   = useState('');
  const [bidAmountInr, setBidAmountInr] = useState('');
  const [bidFee, setBidFee] = useState(0);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError]     = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [flashBid, setFlashBid]     = useState(false);
  const bidListRef                  = useRef(null);
  const [participation, setParticipation] = useState({ loading: true, paid: false, fee: 0 });
  const [payingParticipation, setPayingParticipation] = useState(false);
  const [participationError, setParticipationError] = useState('');
  const [payingWinnerBid, setPayingWinnerBid] = useState(false);
  const [winnerPaymentError, setWinnerPaymentError] = useState('');

  const [redeemPoints, setRedeemPoints] = useState(false);
  const [finalPayable, setFinalPayable] = useState(0);

  const formatBidInputValue = (inrAmount, currencyCode = currency) => {
    const converted = convertInrToCurrency(inrAmount, currencyCode, ratesMeta);
    if (!Number.isFinite(converted)) return '';
    if (currencyCode === 'INR') return String(Math.round(converted));
    return String(Number(converted.toFixed(2)));
  };

  const handleBidAmountChange = (value) => {
    setBidAmount(value);
    const parsed = Number(value);
    setBidAmountInr(
      Number.isFinite(parsed) && parsed > 0
        ? String(convertToInr(parsed, currency))
        : '',
    );
    setBidError('');
  };

  useEffect(() => {
    if (!bidAmountInr) return;
    setBidAmount(formatBidInputValue(Number(bidAmountInr), currency));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, ratesMeta]);

  useEffect(() => {
    let cancelled = false;
    fetchListingFeesAndCharges()
      .then((fees) => {
        if (cancelled) return;
        const fromApi = Number(fees?.auctionBidFeeInr ?? 0);
        if (fromApi > 0) setBidFee(fromApi);
        else if (Number(hookBidFee) > 0) setBidFee(Number(hookBidFee));
      })
      .catch(() => {
        if (!cancelled && Number(hookBidFee) > 0) setBidFee(Number(hookBidFee));
      });
    return () => { cancelled = true; };
  }, [hookBidFee]);

  useEffect(() => {
    if (auction) {
      setFinalPayable(Number(auction.currentHighestBid ?? 0));
    }
  }, [auction]);

  // Meetings state
  const [meetings, setMeetings]           = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingActionLoading, setMeetingActionLoading] = useState({});
  const [showMeetingForm, setShowMeetingForm] = useState(false);

  // Re-auction / close modal
  const [reAuctionModal, setReAuctionModal] = useState(false);
  const [closingAuction, setClosingAuction] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  const [closeError, setCloseError] = useState('');

  const community = auction?.community || {};
  const linkedInUrl = getLinkedInProfileUrl(community);
  const isOwner = resolveAuctionLister(
    isCommunityAuctionLister(auction, user?.id),
    participation,
  );
  const isActive  = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const isEnded   = auction?.status === 'ENDED';
  const isCompleted = auction?.status === 'COMPLETED';
  const isUnsold  = auction?.status === 'UNSOLD';
  const isClosed  = auction?.status === 'CLOSED';
  const canCloseActive = isActive && Number(auction?.totalBids || 0) === 0;
  const isWinner = Boolean(
    user?.id && auction?.currentWinnerId
    && String(user.id) === String(auction.currentWinnerId),
  );
  const hasFinalWinner = (isEnded || isCompleted) && Number(auction?.currentHighestBid) > 0;
  const awaitingWinnerPayment = isEnded && isWinner && !auction?.winnerPaymentPaid;

  useEffect(() => {
    const auctionKey = auction?.id;
    if (!auctionKey || !isCreatorAuctionId(auctionKey) || !user || !isActive) {
      setParticipation({ loading: false, paid: false, fee: 0, isOwner: false });
      return;
    }
    setParticipation((p) => ({ ...p, loading: true }));
    communityAuctionAPI.participationStatus(auctionKey)
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
      const { data: res } = await communityAuctionAPI.participationCreateOrder(auction.id);
      const orderData = res?.data ?? res;
      openRazorpayCheckout({
        orderData,
        user,
        description: t('auctionDetailParticipationFeeCreator'),
        onSuccess: async (response) => {
          try {
            await communityAuctionAPI.participationVerify(auction.id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setParticipation((p) => ({ ...p, paid: true }));
          } catch {
            setParticipationError(t('auctionDetailPaymentVerifyFailedRetry'));
          } finally {
            setPayingParticipation(false);
          }
        },
        onFailure: async () => {
          setParticipationError(t('auctionDetailParticipationPaymentFailed'));
          setPayingParticipation(false);
        },
        onDismiss: async () => setPayingParticipation(false),
      });
    } catch (err) {
      setParticipationError(err?.response?.data?.error || err?.response?.data?.message || t('auctionDetailFailedStartPayment'));
      setPayingParticipation(false);
    }
  };

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

  // Load meetings for this auction
  const loadMeetings = useCallback(() => {
    if (!auctionId) return;
    setMeetingsLoading(true);
    meetingAPI.getForAuction(auctionId)
      .then(({ data }) => setMeetings(Array.isArray(data) ? data : []))
      .catch(() => setMeetings([]))
      .finally(() => setMeetingsLoading(false));
  }, [auctionId]);

  useEffect(() => {
    if (auction) loadMeetings();
  }, [auction, loadMeetings]);

  // Place bid
  const handleBid = async () => {
    const displayAmount = parseFloat(bidAmount);
    if (isNaN(displayAmount) || displayAmount <= 0) {
      setBidError('Enter a valid bid amount.');
      return;
    }
    const amountInr = Number(bidAmountInr) || convertToInr(displayAmount, currency);
    const bidErrorMsg = validateBidAmount(amountInr, { minNextBid, maxBidPrice }, formatPrice);
    if (bidErrorMsg) {
      setBidError(bidErrorMsg);
      return;
    }
    setBidLoading(true); setBidError(''); setBidSuccess('');
    try {
      const { payBidFee } = await import('../utils/auctionFees');
      const payment = await payBidFee({
        auctionType: 'COMMUNITY',
        auctionId: auction.id,
        bidAmount: amountInr,
        user,
        description: 'Creator auction bid fee',
      });
      await placeBid({
        amount: amountInr,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpaySignature: payment.razorpaySignature,
      });
      setBidSuccess(`Bid of ${formatPrice(amountInr)} placed!`);
      setBidAmount('');
      setBidAmountInr('');
    } catch (err) {
      setBidError(err.response?.data?.error || err?.message || 'Failed to place bid.');
    } finally { setBidLoading(false); }
  };

  // Meeting actions
  const meetingAction = async (action, meetingId, extraData) => {
    setMeetingActionLoading(p => ({ ...p, [meetingId]: true }));
    try {
      if (action === 'confirm')  await meetingAPI.confirm(meetingId);
      if (action === 'cancel')   await meetingAPI.cancel(meetingId, extraData);
      if (action === 'complete') await meetingAPI.complete(meetingId);
      loadMeetings();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} meeting.`);
    } finally {
      setMeetingActionLoading(p => ({ ...p, [meetingId]: false }));
    }
  };

  const handlePayWinningBid = async () => {
    if (!auction?.id || !user) return;
    setPayingWinnerBid(true);
    setWinnerPaymentError('');
    try {
      const { data: res } = await communityAuctionAPI.winnerPaymentCreateOrder(auction.id, redeemPoints);
      const orderData = res?.data ?? res;
      openRazorpayCheckout({
        orderData,
        user,
        description: `Winning bid for ${auction.auctionTitle || 'profile auction'}`,
        onSuccess: async (response) => {
          try {
            await communityAuctionAPI.winnerPaymentVerify(auction.id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refresh();
          } catch {
            setWinnerPaymentError('Payment verification failed. Please retry.');
          } finally {
            setPayingWinnerBid(false);
          }
        },
        onFailure: async () => {
          setWinnerPaymentError('Payment failed. Please retry.');
          setPayingWinnerBid(false);
        },
        onDismiss: async () => setPayingWinnerBid(false),
      });
    } catch (err) {
      setWinnerPaymentError(
        err?.response?.data?.error
        || err?.response?.data?.message
        || 'Failed to start payment.',
      );
      setPayingWinnerBid(false);
    }
  };

  const resolveApiError = (err, fallback) => {
    const detail = err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.response?.data?.error;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg || item).filter(Boolean).join(', ') || fallback;
    }
    return fallback;
  };

  // Close / re-auction
  const handleClose = async () => {
    setShowCloseConfirm(false);
    setClosingAuction(true);
    setCloseMessage('');
    setCloseError('');
    try {
      await communityAuctionAPI.close(auction.id);
      await refresh();
      setCloseMessage(t('auctionDetailClosedSuccess'));
    } catch (e) {
      setCloseError(resolveApiError(e, t('auctionDetailFailedClose')));
    } finally {
      setClosingAuction(false);
    }
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
        <h3 className="font-display text-2xl font-bold text-gray-900">{t('auctionDetailNotFound')}</h3>
        <button className="btn-glow mt-4" onClick={() => navigate('/auctions')}>{t('auctionDetailBackToAuctions')}</button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-[1100px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="mb-8">
          <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
            onClick={() => navigate('/auctions')}>
            {t('auctionDetailBackToAuctions')}
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="font-display text-3xl font-bold text-gray-900 m-0">
                  {auction.auctionTitle}
                </h1>
                <StatusBadge status={auction.status} />
              </div>
              <p className="text-gray-500 text-sm m-0">
                {community.name && `Profile: ${community.name}`}
                {auction.workType && ` · ${auction.workType.replace(/_/g, ' ')}`}
              </p>
              {(isActive || auction?.status === 'EXTENDED') && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${wsState === 'live' ? 'bg-green-600' : wsState === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={`text-xs ${wsState === 'live' ? 'text-green-600' : 'text-amber-600'}`}>
                  {wsState === 'live'
                    ? t('auctionDetailLiveUpdates', 'Live bid updates')
                    : wsState === 'connecting'
                      ? t('auctionDetailConnectingUpdates', 'Connecting live updates…')
                      : t('auctionDetailReconnecting', 'Reconnecting live updates…')}
                </span>
              </div>
              )}
            </div>

            {/* Countdown */}
            {isActive && (
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                  {auction.status === 'EXTENDED' ? t('auctionDetailEndsExtended') : t('auctionsPageEndsIn')}
                </div>
                <div className={`font-display text-3xl font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-indigo-600'}`}>
                  {timeLeft}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-4">

            {/* Profile info card */}
            <ProfileInfoCard community={community} auction={auction} />

            {/* Bid stats card */}
            <div className={`p-6 border rounded-[14px] transition-all duration-300 ${flashBid ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
              <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_max-content_minmax(0,1fr)] gap-4 2xl:gap-6">
                <div className="min-w-0 w-full 2xl:min-w-max text-center">
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Current Highest Bid</div>
                  <div className={`font-display text-[1.75rem] lg:text-[2rem] font-bold leading-tight break-words ${auction.currentHighestBid > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {auction.currentHighestBid > 0
                      ? formatPrice(auction.currentHighestBid)
                      : 'No bids yet'}
                  </div>
                  {auction.currentWinnerName && (
                    <div className="text-[0.78rem] text-gray-400 mt-1">
                      Leading: {auction.currentWinnerName}
                    </div>
                  )}
                </div>
                <div className="min-w-0 w-full 2xl:min-w-max text-center">
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Starting Bid</div>
                  <div className="w-full overflow-x-auto 2xl:overflow-visible">
                    <div className="font-display text-[1.75rem] lg:text-[2rem] font-bold text-amber-600 leading-tight whitespace-nowrap">
                      {formatPrice(auction.minBidPrice)}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 w-full text-center">
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Total Bids</div>
                  <div className="font-display text-[1.75rem] lg:text-[2rem] font-bold text-gray-900 leading-tight">
                    {auction.totalBids}
                  </div>
                </div>
              </div>

              {isActive && auction.currentHighestBid > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[0.82rem] text-amber-800">
                  Allowed bid range:{' '}
                  <strong>{formatBidRangeLabel({ minNextBid, maxBidPrice }, formatPrice)}</strong>
                  <span className="text-gray-500 ml-2">(between min and 150% max)</span>
                </div>
              )}
            </div>

            {/* Bid history */}
            <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900 text-[0.9rem]">
                Bid History
                <span className="text-gray-500 font-normal ml-2 text-[0.8rem]">({bids.length} bids)</span>
              </div>
              <div ref={bidListRef} className="max-h-[320px] overflow-y-auto py-2">
                {bids.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-[0.875rem]">
                    No bids yet. Be the first to bid!
                  </div>
                ) : (
                  bids.map((bid, i) => (
                    <BidRow key={i} bid={bid} isLatest={i === 0}
                            isWinner={(isEnded || isCompleted || isClosed) && (bid.isWinningBid || bid.winningBid)}
                            formatPrice={formatPrice} />
                  ))
                )}
              </div>
            </div>

            {/* CLOSED — lister / visitors */}
            {isClosed && (
              <div className="p-5 bg-gray-50 border border-gray-200 rounded-[12px]">
                <div className="font-semibold text-gray-700 mb-2">This auction is closed</div>
                <p className="text-gray-500 text-[0.875rem] m-0">
                  Bidding is disabled. Bid history is preserved below.
                </p>
              </div>
            )}

            {/* UNSOLD — lister options */}
            {isOwner && isUnsold && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-[12px]">
                <div className="font-semibold text-amber-700 mb-2">Auction ended with no bids</div>
                <p className="text-gray-500 text-[0.875rem] mb-4">
                  You can re-auction with new settings, or take the listing down.
                </p>
                <div className="flex gap-3">
                  <button className="btn-glow" onClick={() => setReAuctionModal(true)}>
                    ↺ Re-Auction
                  </button>
                  <button type="button" className="btn-glow" onClick={() => setShowCloseConfirm(true)}>
                    Take Down
                  </button>
                </div>
              </div>
            )}

            {/* ENDED / COMPLETED — winner announcement */}
            {hasFinalWinner && (
              <div className="p-6 text-center bg-green-50 border border-green-200 rounded-[14px]">
                <div className="text-[2.5rem] mb-2">{isCompleted ? '✅' : '🏆'}</div>
                <h3 className="font-display text-[1.5rem] text-green-700 mb-2">
                  {isCompleted ? 'Auction Complete' : 'Auction Won!'}
                </h3>
                <p className="text-gray-500">
                  <strong className="text-gray-900">{auction.currentWinnerName || 'A bidder'}</strong>
                  {' '}won with a bid of{' '}
                  <strong className="text-green-700">
                    {formatPrice(auction.currentHighestBid)}
                  </strong>
                </p>
                {awaitingWinnerPayment && (
                  <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg text-left">
                    <div className="text-sm text-gray-700 mb-3">
                      You won this auction. Pay your winning bid amount to finalize.
                    </div>
                    <EdgePointsRedeemToggle
                      originalAmount={Number(auction.currentHighestBid ?? 0)}
                      onChange={(redeem, discount, final) => {
                        setRedeemPoints(redeem);
                        setFinalPayable(final);
                      }}
                    />
                    <button
                      className="btn-glow w-full"
                      onClick={handlePayWinningBid}
                      disabled={payingWinnerBid}>
                      {payingWinnerBid
                        ? 'Processing…'
                        : `Pay Winning Bid — ₹${finalPayable}`}
                    </button>
                    {winnerPaymentError && (
                      <div className="text-xs text-red-600 mt-2">{winnerPaymentError}</div>
                    )}
                  </div>
                )}
                {isCompleted && (
                  <p className="text-[0.82rem] text-green-700 mt-2 font-semibold">
                    Payment received. Our team will coordinate next steps with you and the profile owner.
                  </p>
                )}
                {isEnded && !isWinner && (
                  <p className="text-[0.82rem] text-gray-500 mt-2">
                    Waiting for the winner to complete payment.
                  </p>
                )}
                {isEnded && isOwner && (
                  <p className="text-[0.82rem] text-gray-500 mt-2">
                    The winner must pay their bid amount to finalize the auction.
                  </p>
                )}
              </div>
            )}

            {/* ── Meetings Section ── */}
          <MeetingsSection
            auction={auction}
            bids={bids}
            meetings={meetings}
            meetingsLoading={meetingsLoading}
            meetingActionLoading={meetingActionLoading}
              isOwner={isOwner}
              isActive={isActive}
              user={user}
              participationPaid={participation.paid}
              participationLoading={participation.loading}
              participationFee={participation.fee}
              payingParticipation={payingParticipation}
              participationError={participationError}
              onPayParticipation={handlePayParticipation}
              onAction={meetingAction}
              onMeetingRequested={loadMeetings}
              showMeetingForm={showMeetingForm}
              setShowMeetingForm={setShowMeetingForm}
              formatPrice={formatPrice}
            />
          </div>

          {/* ── Right: Bid form + info ── */}
          <div className="sticky top-6 flex flex-col gap-4">

            {/* Bid form — non-owner, active */}
            {isActive && !isOwner && (
              <div className="p-6 bg-white border border-gray-200 rounded-[14px]">
                <h3 className="font-display text-[1.25rem] font-semibold text-gray-900 mb-5">
                  Place Your Bid
                </h3>
                {minNextBid > 0 && (
                  <div className="mb-4">
                    <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Bid</div>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 1.1, 1.25].map(mult => {
                        const quickAmountInr = Math.ceil(minNextBid * mult / 100) * 100;
                        const quickDisplay = formatBidInputValue(quickAmountInr);
                        const selected = bidAmountInr === String(quickAmountInr)
                          || bidAmount === quickDisplay;
                        return (
                          <button key={mult}
                            type="button"
                            onClick={() => {
                              setBidAmount(quickDisplay);
                              setBidAmountInr(String(quickAmountInr));
                              setBidError('');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[0.78rem] cursor-pointer font-semibold transition-all ${
                              selected
                                ? 'bg-indigo-50 border border-indigo-400 text-indigo-700'
                                : 'bg-gray-50 border border-gray-200 text-gray-500 hover:border-indigo-300'
                            }`}>
                            {formatPrice(quickAmountInr)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[0.78rem] text-gray-500 font-semibold block uppercase tracking-wider">
                    YOUR BID AMOUNT ({getSymbol()})
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => handleBidAmountChange(e.target.value)}
                    placeholder={`Min ${formatPrice(minNextBid)}`}
                    min={formatBidInputValue(minNextBid) || undefined}
                    max={maxBidPrice ? formatBidInputValue(maxBidPrice) : undefined}
                    step="any"
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

                {bidFee > 0 && (
                  <div className="text-[0.75rem] text-gray-500 mb-3 text-center font-medium bg-gray-50 p-2 rounded">
                    A non-refundable per-bid fee of {formatPrice(bidFee)} will be charged.
                  </div>
                )}

                <button className="btn-glow w-full" onClick={handleBid}
                  disabled={bidLoading || !bidAmount}>
                  {bidLoading
                    ? <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" />
                    : (bidAmountInr
                      ? (bidFee > 0
                        ? `Place Bid — pay ${formatPrice(Number(bidFee))} fee →`
                        : `Place Bid — ${formatPrice(Number(bidAmountInr))} →`)
                      : 'Place Bid →')}
                </button>

                <p className="text-[0.72rem] text-gray-500 mt-3 text-center leading-relaxed">
                  Each bid must be strictly greater than the current highest bid.
                </p>
              </div>
            )}

            {/* Owner can't bid on own listing */}
            {isOwner && isActive && (
              <div className="p-5 bg-white border border-gray-200 rounded-[14px] text-center">
                <div className="text-[1.5rem] mb-2">👑</div>
                <p className="text-gray-500 text-[0.875rem]">
                  This is your auction. You cannot bid on your own listing.
                </p>
                {closeError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-3 text-[0.82rem] text-red-600 text-left">
                    {closeError}
                  </div>
                )}
                {closeMessage && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mt-3 text-[0.82rem] text-green-700 text-left">
                    {closeMessage}
                  </div>
                )}
                {canCloseActive ? (
                  <button
                    type="button"
                    className="btn-glow mt-3 w-full"
                    onClick={() => setShowCloseConfirm(true)}
                    disabled={closingAuction}
                  >
                    {closingAuction ? 'Closing…' : 'Close Auction'}
                  </button>
                ) : (
                  <p className="text-[0.78rem] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg mt-3 px-3 py-2 text-left">
                    You cannot close a live auction that already has bids. Wait for it to end, or contact support if needed.
                  </p>
                )}
              </div>
            )}

            {/* Auction info card */}
            <div className="p-5 bg-white border border-gray-200 rounded-[14px]">
              <div className="text-[0.72rem] font-semibold text-gray-900 uppercase tracking-wider mb-3">Auction Info</div>
              <div className="flex flex-col gap-2.5">
                <InfoRow label="Duration"
                  value={auction.duration?.replace(/_/g, ' ')} />
                <InfoRow label="Expected Rate"
                  value={formatExpectedRate(auction.expectedRate)} />
                <InfoRow label="Available From"
                  value={formatDateOrText(auction.availableFrom, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })} />
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

            {/* Request meeting shortcut — non-owner, active */}
            {isActive && !isOwner && (
              <button
                className="btn-glow w-full"
                onClick={() => {
                  setShowMeetingForm(true);
                  setTimeout(() => {
                    document.getElementById('meeting-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}>
                📅 Schedule a Meeting
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCloseConfirm}
        title={t('auctionDetailCloseTitle')}
        message={t('auctionDetailCloseMessage')}
        confirmLabel={t('auctionDetailCloseAuction')}
        cancelLabel={t('cancel')}
        danger
        onConfirm={handleClose}
        onCancel={() => setShowCloseConfirm(false)}
      />

      {reAuctionModal && (
        <ReAuctionModal
          auctionId={auction.id}
          onClose={() => setReAuctionModal(false)}
          onSuccess={() => { setReAuctionModal(false); window.location.reload(); }}
        />
      )}
    </AppLayout>
  );
}

// ─── Profile Info Card ────────────────────────────────────────────────────────
function ProfileInfoCard({ community, auction }) {
  const linkedInUrl = getLinkedInProfileUrl(community);
  const skills = auction.auctionSkills
    ? auction.auctionSkills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="bg-white border border-gray-200 rounded-[14px] p-6">
      <div className="flex items-start gap-5">
        {community.imageUrl ? (
          <img src={community.imageUrl} alt={community.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-3xl font-bold text-indigo-600 flex-shrink-0">
            {community.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="font-display text-xl font-bold text-gray-900 m-0">{community.name || '—'}</h2>
            {community.role && (
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
                {community.role.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {community.location && (
            <div className="text-sm text-gray-500 mb-1">📍 {community.location}</div>
          )}
          {community.industry && (
            <div className="text-sm text-gray-500 mb-1">🏢 {community.industry.replace(/_/g, ' ')}</div>
          )}
          {linkedInUrl ? (
            <div className="flex items-center justify-end w-full">
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#0077b5] no-underline hover:text-[#005885] font-medium whitespace-nowrap"
              >
                View LinkedIn profile ↗
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {community.whyImHere && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">About</div>
          <p className="text-sm text-gray-700 m-0 leading-relaxed">{community.whyImHere}</p>
        </div>
      )}

      {/* Auction-specific details */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {auction.workType && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-xs text-purple-500 font-semibold uppercase tracking-wider mb-0.5">Work Type</div>
            <div className="text-sm font-bold text-purple-800">{auction.workType.replace(/_/g, ' ')}</div>
          </div>
        )}
        {auction.expectedRate && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-0.5">Expected Rate</div>
            <div className="text-sm font-bold text-green-800 break-all leading-snug">{formatExpectedRate(auction.expectedRate)}</div>
          </div>
        )}
        {auction.availableFrom && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-0.5">Available From</div>
            <div className="text-sm font-bold text-blue-800">
              {formatDateOrText(auction.availableFrom, {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </div>
          </div>
        )}
      </div>

      {skills.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {auction.additionalInfo && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Additional Info</div>
          <p className="text-sm text-amber-900 m-0 leading-relaxed">{auction.additionalInfo}</p>
        </div>
      )}
    </div>
  );
}

// ─── Meetings Section ─────────────────────────────────────────────────────────
function MeetingsSection({
  auction, bids, meetings, meetingsLoading, meetingActionLoading,
  isOwner, isActive, user,
  participationPaid, participationLoading, participationFee,
  payingParticipation, participationError, onPayParticipation,
  onAction, onMeetingRequested, showMeetingForm, setShowMeetingForm,
  formatPrice
}) {
  const userId = user?.id != null ? String(user.id) : null;
  const hasPlacedBid = hasPlacedCommunityAuctionBid(bids, userId);
  const pendingMeetings   = meetings.filter(m => m.status === 'PENDING');
  const confirmedMeetings = meetings.filter(m => m.status === 'CONFIRMED');
  const pastMeetings      = meetings.filter(m => m.status === 'CANCELLED' || m.status === 'COMPLETED');
  const myPendingRequest  = meetings.find(m =>
    m.status === 'PENDING'
    && (String(m.requester?.id ?? m.requesterId ?? '') === userId)
  );

  return (
    <div id="meeting-section" className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900 text-[0.9rem]">
            📅 Meetings
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
          </div>
        </div>
        {isActive && !isOwner && !myPendingRequest && participationPaid && hasPlacedBid && (
          <button
            className="btn-glow btn-glow-sm"
            onClick={() => setShowMeetingForm(v => !v)}>
            {showMeetingForm ? '✕ Cancel' : '+ Request Meeting'}
          </button>
        )}
      </div>

      {isActive && !isOwner && !hasPlacedBid && (
        <div className="px-5 py-4 bg-sky-50 border-b border-sky-200">
          <div className="text-sm text-sky-800 font-semibold">
            Place at least one bid first to unlock meeting requests.
          </div>
          <div className="text-xs text-sky-700 mt-0.5">
            After your first bid, you can pay the meeting request fee and schedule a meeting.
          </div>
        </div>
      )}

      {isActive && !isOwner && hasPlacedBid && !participationLoading && !participationPaid && (
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
          <div className="text-sm text-amber-800 mb-2">
            Meeting request fee required to request a meeting:{' '}
            <strong>{formatPrice(participationFee || 0)}</strong>
          </div>
          <button className="btn-glow btn-glow-sm w-full sm:w-auto" onClick={onPayParticipation} disabled={payingParticipation}>
            {payingParticipation ? 'Processing…' : 'Pay Meeting Request Fee →'}
          </button>
          {participationError && <div className="text-xs text-red-600 mt-2">{participationError}</div>}
        </div>
      )}

      {/* Request meeting form */}
      {showMeetingForm && isActive && !isOwner && hasPlacedBid && participationPaid && (
        <MeetingRequestForm
          auctionId={auction.id}
          auctionEndTime={resolveAuctionEndTime(auction) ?? auction.endTime}
          onSuccess={() => { setShowMeetingForm(false); onMeetingRequested(); }}
          onCancel={() => setShowMeetingForm(false)}
        />
      )}

      {/* Already requested notice */}
      {myPendingRequest && (
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
          <div className="text-sm text-amber-800 font-semibold">⏳ Your meeting request is pending</div>
          <div className="text-xs text-amber-700 mt-0.5">
            Requested for {formatDateTime(myPendingRequest.scheduledAt)}
          </div>
          <button
            className="mt-2 text-xs text-red-500 hover:text-red-700 font-semibold"
            disabled={meetingActionLoading[myPendingRequest.id]}
            onClick={() => onAction('cancel', myPendingRequest.id, 'Cancelled by requester')}>
            {meetingActionLoading[myPendingRequest.id] ? 'Cancelling…' : 'Cancel Request'}
          </button>
        </div>
      )}

      {meetingsLoading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading meetings…</div>
      ) : meetings.length === 0 && !showMeetingForm ? (
        <div className="p-8 text-center text-gray-400 text-[0.875rem]">
          {isOwner
            ? 'No meeting requests yet. When others request meetings, they will appear here.'
            : isActive
              ? hasPlacedBid
                ? 'No meetings scheduled. Request one using the button above!'
                : 'No meetings scheduled yet. Place a bid first to unlock meeting requests.'
              : 'No meetings were scheduled for this auction.'}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {/* Confirmed meetings */}
          {confirmedMeetings.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              isOwner={isOwner}
              userId={user?.id}
              actionLoading={meetingActionLoading[m.id]}
              onAction={onAction}
            />
          ))}
          {/* Pending meetings — show to lister */}
          {isOwner && pendingMeetings.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              isOwner={isOwner}
              userId={user?.id}
              actionLoading={meetingActionLoading[m.id]}
              onAction={onAction}
            />
          ))}
          {/* Past meetings */}
          {pastMeetings.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              isOwner={isOwner}
              userId={user?.id}
              actionLoading={meetingActionLoading[m.id]}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Meeting Request Form ─────────────────────────────────────────────────────
function MeetingRequestForm({ auctionId, auctionEndTime, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    scheduledAt:     '',
    topic:           '',
    message:         '',
    durationMinutes: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Min datetime = now + 1 hour
  const minDateTime = toDatetimeLocalInput(Date.now() + 60 * 60 * 1000);
  const maxDateTime = toDatetimeLocalInput(auctionEndTime);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scheduledAt || !form.topic) {
      setError('Please confirm date & time and enter a topic.');
      return;
    }
    const scheduled = new Date(form.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) {
      setError('Invalid date or time. Please confirm your selection again.');
      return;
    }
    setLoading(true); setError('');
    try {
      await meetingAPI.request(auctionId, {
        scheduledAt:     scheduled.toISOString(),
        topic:           form.topic.trim(),
        message:         form.message.trim(),
        durationMinutes: parseInt(form.durationMinutes, 10),
      });
      onSuccess();
    } catch (err) {
      const data = err.response?.data;
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((e) => e?.msg || e).join(', ')
          : null;
      setError(data?.error || data?.message || detail || 'Failed to request meeting.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-indigo-50 border-b border-indigo-200">
      <div className="text-sm font-semibold text-indigo-800 mb-4">Schedule a Meeting</div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <MeetingDateTimePicker
              value={form.scheduledAt}
              minDateTime={minDateTime}
              maxDateTime={maxDateTime}
              disabled={loading}
              onChange={(val) => setForm((f) => ({ ...f, scheduledAt: val }))}
              onValidationError={(msg) => { if (msg) setError(msg); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration (min)</label>
            <select
              value={form.durationMinutes}
              onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:border-indigo-400">
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Topic *</label>
          <input
            type="text"
            value={form.topic}
            onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. Project discussion, Freelance opportunity"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:border-indigo-400"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Message (optional)</label>
          <textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Tell them what you want to discuss…"
            rows={3}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:border-indigo-400 resize-none"
          />
        </div>
        {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" className="btn-glow flex-1" disabled={loading}>
            {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : 'Send Request →'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────
function MeetingCard({ meeting, isOwner, userId, actionLoading, onAction }) {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason]         = useState('');

  const isRequester = String(meeting.requester?.id ?? meeting.requesterId ?? '') === String(userId);
  const statusConfig = {
    PENDING:   { color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: '⏳ Pending'   },
    CONFIRMED: { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  label: '✅ Confirmed' },
    CANCELLED: { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    label: '❌ Cancelled' },
    COMPLETED: { color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',   label: '✓ Completed' },
  }[meeting.status] || { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: meeting.status };

  return (
    <div className={`p-4 ${statusConfig.bg} border-l-4 ${statusConfig.border.replace('border-', 'border-l-')}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-600">{meeting.durationMinutes} min</span>
          </div>
          <div className="font-semibold text-gray-900 text-sm truncate">{meeting.topic}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {formatDateTime(meeting.scheduledAt)}
          </div>
          {meeting.message && (
            <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">{meeting.message}</p>
          )}
          {!isOwner && (
            <div className="text-xs text-gray-500 mt-1">
              With: <span className="font-semibold text-gray-700">{meeting.lister?.firstName || 'Profile Owner'} {meeting.lister?.lastName || ''}</span>
            </div>
          )}
          {isOwner && (
            <div className="text-xs text-gray-500 mt-1">
              With: <span className="font-semibold text-gray-700">{meeting.requester?.firstName || 'Bidder'} {meeting.requester?.lastName || ''}</span>
              {meeting.requester?.email && (
                <span className="text-gray-400"> · {meeting.requester.email}</span>
              )}
            </div>
          )}

          {/* Google Meet link */}
          {meeting.status === 'CONFIRMED' && meeting.meetingLink && (
            <div className="flex flex-col gap-1 mt-2">
              <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                style={{ background: '#1a73e8', width: 'fit-content' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 3H4C2.9 3 2 3.9 2 5v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM15 9l-5 3.5L15 16V9z"/>
                </svg>
                Join Google Meet
              </a>
              {meeting.calendarEventLink && (
                <a href={meeting.calendarEventLink} target="_blank" rel="noopener noreferrer"
                  className="text-xs hover:underline" style={{ color: '#1a73e8' }}>
                  📅 View in Calendar
                </a>
              )}
            </div>
          )}

          {/* Cancel info */}
          {meeting.status === 'CANCELLED' && meeting.cancelReason && (
            <div className="text-xs text-red-500 mt-1">Reason: {meeting.cancelReason}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {/* Lister actions on pending */}
          {isOwner && meeting.status === 'PENDING' && (
            <>
              <button
                onClick={() => onAction('confirm', meeting.id)}
                disabled={actionLoading}
                className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50">
                {actionLoading ? '…' : '✓ Confirm'}
              </button>
              <button
                onClick={() => setShowCancelPrompt(true)}
                disabled={actionLoading}
                className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">
                ✕ Decline
              </button>
            </>
          )}
          {/* Lister can complete confirmed */}
          {isOwner && meeting.status === 'CONFIRMED' && (
            <>
              <button
                onClick={() => onAction('complete', meeting.id)}
                disabled={actionLoading}
                className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50">
                {actionLoading ? '…' : '✓ Complete'}
              </button>
              <button
                onClick={() => setShowCancelPrompt(true)}
                disabled={actionLoading}
                className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">
                Cancel
              </button>
            </>
          )}
          {/* Requester can cancel pending */}
          {isRequester && meeting.status === 'PENDING' && !isOwner && (
            <button
              onClick={() => setShowCancelPrompt(true)}
              disabled={actionLoading}
              className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">
              Cancel
            </button>
          )}
          {/* Requester can cancel confirmed */}
          {isRequester && meeting.status === 'CONFIRMED' && !isOwner && (
            <button
              onClick={() => setShowCancelPrompt(true)}
              disabled={actionLoading}
              className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Cancel reason prompt */}
      {showCancelPrompt && (
        <div className="mt-3 p-3 bg-white border border-red-200 rounded-lg">
          <div className="text-xs font-semibold text-red-700 mb-2">Reason for cancellation (optional)</div>
          <input
            type="text"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="e.g. Schedule conflict"
            className="app-field-input w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 mb-2 outline-none focus:border-red-400 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onAction('cancel', meeting.id, cancelReason || undefined);
                setShowCancelPrompt(false);
              }}
              className="flex-1 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors">
              Confirm Cancel
            </button>
            <button
              onClick={() => { setShowCancelPrompt(false); setCancelReason(''); }}
              className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Re-Auction Modal ─────────────────────────────────────────────────────────
function ReAuctionModal({ auctionId, onClose, onSuccess }) {
  const { user } = useAuth();
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
      const creationFeeOrderId = await payAuctionCreationFee({
        auctionType: 'COMMUNITY',
        user,
        referenceId: auctionId,
        description: 'Community re-auction creation fee',
      });
      await communityAuctionAPI.reAuction(auctionId, {
        minBidPrice: parseFloat(form.minBidPrice),
        duration:    form.duration,
        creationFeeOrderId,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to re-auction.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer hover:text-gray-700"
          onClick={onClose}>✕</button>
        <div className="mb-6">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide mb-2">
            Re-Auction
          </div>
          <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">Start a New Auction</h2>
          <p className="text-sm text-gray-500">Set new parameters for your creator profile auction.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">New Minimum Bid ({getSymbol()}) *</label>
            <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500"
              type="number" min="1" value={form.minBidPrice}
              onChange={e => setForm(f => ({ ...f, minBidPrice: e.target.value }))}
              placeholder="e.g. 5000" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Auction Duration *</label>
            <select className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500"
              value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
              <option value="ONE_DAY">1 Day</option>
              <option value="SEVEN_DAYS">7 Days</option>
              <option value="FIFTEEN_DAYS">15 Days</option>
              <option value="THIRTY_DAYS">30 Days</option>
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

// ─── Helper Components ────────────────────────────────────────────────────────
function BidRow({ bid, isLatest, isWinner, formatPrice }) {
  const bidTimeStr = formatAuctionTime(bid.bidTime, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }, '');
  return (
    <div className={`flex items-center gap-4 px-5 py-3 transition-all ${
      isLatest ? 'bg-green-50 border-l-[3px] border-l-green-400' : 'bg-transparent border-l-[3px] border-l-transparent'
    }`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
        isWinner ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {isWinner ? '🏆' : bid.bidderName?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[0.875rem] text-gray-900">
          {bid.bidderName || 'Anonymous'}
          {isWinner && <span className="ml-1.5 text-[0.68rem] text-amber-600 font-bold">WINNER</span>}
        </div>
        <div className="text-[0.72rem] text-gray-400">{bidTimeStr}</div>
      </div>
      <div className={`font-display text-[1.1rem] font-bold flex-shrink-0 ${isLatest ? 'text-green-600' : 'text-amber-600'}`}>
        {formatPrice(bid.amount)}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    PAYMENT_PENDING: { color: '#888',    label: 'Payment Pending' },
    ACTIVE:          { color: '#6ec896', label: '🟢 Live'         },
    EXTENDED:        { color: '#c8a96e', label: '⚡ Extended'     },
    ENDED:           { color: '#a06ec8', label: 'Ended'           },
    COMPLETED:       { color: '#6ec896', label: 'Completed'       },
    UNSOLD:          { color: '#c86e6e', label: 'Unsold'          },
    CLOSED:          { color: '#666',    label: 'Closed'          },
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

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-[0.82rem]">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-semibold">{value || '—'}</span>
    </div>
  );
}

function formatDateTime(dt) {
  return formatAuctionDateTime(dt, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
