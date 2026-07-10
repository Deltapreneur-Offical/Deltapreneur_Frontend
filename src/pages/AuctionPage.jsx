import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../hooks/useAuction';
import useReferralTracker from '../hooks/useReferralTracker';
import { auctionAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { payAuctionCreationFee, fetchListingFeesAndCharges } from '../utils/auctionFees';
import { formatCountdown, formatAuctionDate, formatAuctionDateTime, formatAuctionTime, resolveAuctionEndTime } from '../utils/auctionDate';
import { isDomainAuctionLister, resolveAuctionLister } from '../utils/auctionLister';
import { validateBidAmount, formatBidRangeLabel } from '../utils/auctionBidLimits';
import useCurrency from '../context/CurrencyContext';
import EdgePointsRedeemToggle from '../components/profile/EdgePointsRedeemToggle';
import { REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE } from '../config/featureFlags';

const LIVE_AUCTION_STATUSES = new Set(['ACTIVE', 'EXTENDED']);
const FINAL_WINNER_STATUSES = new Set(['ENDED', 'PAYMENT_PENDING', 'COMPLETED']);

// Countdown uses shared auctionDate helpers (handles +00:00 and missing endTime)
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
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return { timeLeft, isUrgent };
}

export default function AuctionPage() {
  const { t } = useTranslation();
  const { auctionId }  = useParams();
  const { user }       = useAuth();
  
  useReferralTracker(auctionId, 'auction');

  const navigate       = useNavigate();
  const { auction, bids, minNextBid, maxBidPrice, connected, loading, lastUpdate, placeBid, refresh }
                       = useAuction(auctionId);
  const { timeLeft, isUrgent } = useCountdown(resolveAuctionEndTime(auction));
  const { formatPrice, getSymbol } = useCurrency();

  const [bidAmount, setBidAmount]         = useState('');
  const [bidLoading, setBidLoading]       = useState(false);
  const [bidError, setBidError]           = useState('');
  const [bidSuccess, setBidSuccess]       = useState('');
  const [flashBid, setFlashBid]           = useState(false);
  const [reAuctionModal, setReAuctionModal] = useState(false);
  const [participation, setParticipation] = useState({ loading: true, paid: false, fee: 0 });
  const [participationError, setParticipationError] = useState('');
  const [payingParticipation, setPayingParticipation] = useState(false);
  const [payingWinnerBid, setPayingWinnerBid] = useState(false);
  const [winnerPaymentError, setWinnerPaymentError] = useState('');
  const [bidFee, setBidFee] = useState(null);
  const bidListRef = useRef(null);

  const [redeemPoints, setRedeemPoints] = useState(false);
  const [finalPayable, setFinalPayable] = useState(0);

  // FIX #13: access domain.listedBy safely — it comes through because
  // @JsonIgnoreProperties on domain only strips {"auction","hibernateLazyInitializer"}
  useEffect(() => {
    if (auction) {
      setFinalPayable(Number(auction.currentHighestBid ?? 0));
    }
  }, [auction]);

  const isOwner = resolveAuctionLister(
    isDomainAuctionLister(auction, user?.id),
    participation,
  );
  const isActive = LIVE_AUCTION_STATUSES.has(auction?.status);
  const isPaymentPending = auction?.status === 'PAYMENT_PENDING';
  const isCompleted = auction?.status === 'COMPLETED';
  const isWinner = Boolean(
    user?.id && auction?.currentWinnerId
    && String(user.id) === String(auction.currentWinnerId),
  );
  const hasFinalWinner = (
    FINAL_WINNER_STATUSES.has(auction?.status)
    && Number(auction?.currentHighestBid) > 0
  );
  const awaitingWinnerPayment = isPaymentPending && isWinner && !auction?.winnerPaymentPaid;
  const biddingBlocked = REQUIRE_DOMAIN_VERIFICATION_BEFORE_PURCHASE && !auction?.domain?.verified;

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

    const parseParticipation = (body) => ({
      loading: false,
      paid: Boolean(body?.paid),
      fee: Number(
        body?.participationFeeInr ??
        body?.participation_fee_inr ??
        0,
      ),
      isOwner: Boolean(body?.isOwner ?? body?.is_owner),
      biddingBlocked: Boolean(body?.biddingBlocked ?? body?.bidding_blocked),
      biddingBlockedReason:
        body?.biddingBlockedReason ??
        body?.bidding_blocked_reason ??
        null,
    });

    auctionAPI.participationStatus(auction.id)
      .then(({ data }) => {
        const body = data?.data ?? data;
        setParticipation(parseParticipation(body));
      })
      .catch(async () => {
        try {
          const { data } = await auctionAPI.getParticipationFees();
          const fees = data?.data ?? data;
          setParticipation({
            loading: false,
            paid: false,
            fee: Number(fees?.domainParticipationFeeInr ?? fees?.domain_participation_fee_inr ?? 118),
            isOwner: false,
            biddingBlocked: biddingBlocked,
            biddingBlockedReason: null,
          });
        } catch {
          setParticipation({
            loading: false,
            paid: false,
            fee: 118,
            isOwner: false,
            biddingBlocked: biddingBlocked,
            biddingBlockedReason: null,
          });
        }
      });

    if (user && isActive) {
      fetchListingFeesAndCharges()
        .then(data => {
          if (data?.auctionBidFeeInr) {
            setBidFee(data.auctionBidFeeInr);
          }
        })
        .catch(console.error);
    }
  }, [auction?.id, user?.id, isActive, biddingBlocked]);

  const handlePayParticipation = async () => {
    if (!auction?.id || !user) return;
    setPayingParticipation(true);
    setParticipationError('');
    try {
      const { data: orderData } = await auctionAPI.participationCreateOrder(auction.id);
      openRazorpayCheckout({
        orderData,
        user,
        description: t('auctionDetailParticipationFeeDomain'),
        onSuccess: async (response) => {
          try {
            await auctionAPI.participationVerify(auction.id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setParticipation((p) => ({ ...p, paid: true }));
          } catch {
            setParticipationError(t('auctionDetailPaymentVerifyFailed'));
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
      setParticipationError(err?.response?.data?.error || t('auctionDetailFailedStartPayment'));
      setPayingParticipation(false);
    }
  };

  const handlePayWinningBid = async () => {
    if (!auction?.id || !user) return;
    setPayingWinnerBid(true);
    setWinnerPaymentError('');
    try {
      const { data: res } = await auctionAPI.winnerPaymentCreateOrder(auction.id, redeemPoints);
      const orderData = res?.data ?? res;
      openRazorpayCheckout({
        orderData,
        user,
        description: t('auctionDetailBidFee', {
          defaultValue: `Winning bid for ${auction.domainDisplayName || 'domain auction'}`,
        }),
        onSuccess: async (response) => {
          try {
            await auctionAPI.winnerPaymentVerify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refresh();
          } catch {
            setWinnerPaymentError(t('auctionDetailPaymentVerifyFailedRetry'));
          } finally {
            setPayingWinnerBid(false);
          }
        },
        onFailure: async () => {
          setWinnerPaymentError(t('auctionDetailPaymentFailed'));
          setPayingWinnerBid(false);
        },
        onDismiss: async () => setPayingWinnerBid(false),
      });
    } catch (err) {
      setWinnerPaymentError(
        err?.response?.data?.error
        || err?.response?.data?.message
        || err?.message
        || t('auctionDetailFailedStartPayment'),
      );
      setPayingWinnerBid(false);
    }
  };

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    const bidErrorMsg = validateBidAmount(amount, { minNextBid, maxBidPrice }, formatPrice);
    if (bidErrorMsg) {
      setBidError(bidErrorMsg);
      return;
    }
    setBidLoading(true); setBidError(''); setBidSuccess('');
    try {
      const { payBidFee } = await import('../utils/auctionFees');
      const payment = await payBidFee({
        auctionType: 'DOMAIN',
        auctionId: auction.id,
        bidAmount: amount,
        user,
        description: t('auctionDetailBidFee', { defaultValue: 'Auction bid fee' }),
      });
      await placeBid({
        amount,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpaySignature: payment.razorpaySignature,
      });
      setBidSuccess(t('auctionDetailBidPlaced', { amount: formatPrice(amount) }));
      setBidAmount('');
    } catch (err) {
      setBidError(err?.response?.data?.error || err?.message || t('auctionDetailFailedPlaceBid'));
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
        <h3 className="font-display text-2xl font-bold text-gray-900">{t('auctionDetailNotFound')}</h3>
      </div>
    </AppLayout>
  );

  const domain = auction.domain || {};
  const domainTitle = (
    auction.domainDisplayName
    || domain.fullDomain
    || `${domain.domainName || ''}${domain.domainExtension || ''}`.trim()
    || t('auctionsPageUnnamedDomain')
  );
  const ownerName = domain?.listedBy
    ? `${domain.listedBy.firstname || ''} ${domain.listedBy.lastname || ''}`.trim()
      || domain.listedBy.email
    : domain?.listedBy?.name
    || domain?.listedBy?.fullName
    || domain?.listedBy?.username
    || domain?.listedBy?.email
    || t('auctionDetailDomainOwner');
  const ownerInitial = (ownerName || 'D').trim().charAt(0).toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-[1100px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="mb-8">
          <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4" onClick={() => navigate('/auctions')}>
            {t('auctionDetailBackToAuctions')}
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="font-display text-4xl font-bold text-gray-900 m-0">
                  {domainTitle}
                </h1>
                {domain.verified ? (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold text-green-600 bg-green-100 border border-green-300">
                    {t('auctionsPageVerified')}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300">
                    {t('auctionDetailVerificationPending')}
                  </span>
                )}
                <StatusBadge status={auction.status} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-600' : 'bg-amber-500'}`} />
                <span className={`text-xs ${connected ? 'text-green-600' : 'text-amber-600'}`}>
                  {connected ? t('auctionDetailLive') : t('auctionDetailLivePaused')}
                </span>
              </div>
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

        <div className="mb-4 p-5 bg-white border border-gray-200 rounded-[14px]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xl flex items-center justify-center">
              {ownerInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-semibold text-gray-900 m-0 truncate">
                  {domainTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200">
                  {t('auctionDomain')}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {t('auctionDetailOwnerLabel')} <span className="font-semibold text-gray-800">{ownerName}</span>
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
                {domain.verified ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-green-700 bg-green-50 border border-green-200">
                    {t('auctionsPageVerified')}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                    {t('auctionDetailVerificationPending')}
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
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('auctionDetailCurrentHighestBid')}</div>
                  <div className={`font-display text-[2rem] font-bold ${auction.currentHighestBid > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {auction.currentHighestBid > 0
                      ? `${formatPrice(auction.currentHighestBid)}`
                      : t('auctionDetailNoBidsYet')}
                  </div>
                  {auction.currentWinnerName && (
                    <div className="text-[0.78rem] text-gray-400 mt-1">
                      {t('auctionDetailLeading', { name: auction.currentWinnerName })}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('auctionsPageStartingBid')}</div>
                  <div className="font-display text-[1.5rem] font-bold text-amber-600">
                    {formatPrice(auction.minBidPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('auctionsPageTotalBids')}</div>
                  <div className="font-display text-[2rem] font-bold text-gray-900">
                    {auction.totalBids}
                  </div>
                </div>
              </div>

              {isActive && auction.currentHighestBid > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[0.82rem] text-amber-800">
                  {t('auctionDetailBidRange')} <strong>{formatBidRangeLabel({ minNextBid, maxBidPrice }, formatPrice)}</strong>
                  <span className="text-gray-500 ml-2">{t('auctionDetailBidRangeHint')}</span>
                </div>
              )}
            </div>

            {/* Bid History */}
            <div className="bg-white border border-gray-200 rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900 text-[0.9rem]">
                {t('auctionDetailBidHistory')}
                <span className="text-gray-500 font-normal ml-2 text-[0.8rem]">{t('auctionDetailBidHistoryCount', { count: bids.length })}</span>
              </div>
              <div ref={bidListRef} className="max-h-[360px] overflow-y-auto py-2">
                {bids.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-[0.875rem]">
                    {t('auctionDetailNoBidsFirst')}
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
                <div className="font-semibold text-amber-700 mb-2">{t('auctionDetailEndedNoBids')}</div>
                <p className="text-gray-500 text-[0.875rem] mb-4">
                  {t('auctionDetailEndedNoBidsTakeDown')}
                </p>
                <div className="flex gap-3">
                  <button className="btn-glow"
                    onClick={() => setReAuctionModal(true)}>
                    {t('auctionDetailReAuctionBtn')}
                  </button>
                  <button className="btn-glow"
                    onClick={async () => {
                      try {
                        await auctionAPI.close(auction.id);
                        navigate('/domains/dashboard');
                      } catch (e) {
                        alert(t('auctionDetailFailedClose'));
                      }
                    }}>
                    {t('auctionDetailTakeDown')}
                  </button>
                </div>
              </div>
            )}

            {/* ENDED / PAYMENT_PENDING / COMPLETED — winner announcement */}
            {hasFinalWinner && (
              <div className="p-6 text-center bg-green-50 border border-green-200 rounded-[14px]">
                <div className="text-[2.5rem] mb-2">{isCompleted ? '✅' : '🏆'}</div>
                <h3 className="font-display text-[1.5rem] text-green-700 mb-2">
                  {isCompleted ? t('auctionDetailComplete') : t('auctionDetailWon')}
                </h3>
                <p className="text-gray-500">
                  {t('auctionDetailWonLine', {
                    name: auction.currentWinnerName || t('auctionDetailWonGenericBidder'),
                    amount: formatPrice(auction.currentHighestBid),
                  })}
                </p>
                {awaitingWinnerPayment && (
                  <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg text-left">
                    <div className="text-sm text-gray-700 mb-3">
                      {t('auctionDetailWonPayPrompt')}
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
                      disabled={payingWinnerBid}
                    >
                      {payingWinnerBid
                        ? t('auctionDetailProcessing')
                        : `Pay ₹${finalPayable} and Claim Domain`}
                    </button>
                    {winnerPaymentError && (
                      <div className="text-xs text-red-600 mt-2">{winnerPaymentError}</div>
                    )}
                  </div>
                )}
                {isCompleted && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[0.82rem] text-green-700 font-semibold">
                      {t('auctionDetailPaymentReceivedDomain')}
                    </p>
                    {isWinner && auction.transferTransactionId && (
                      <Link
                        to={`/purchases/transfers/${auction.transferTransactionId}`}
                        className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {t('auctionDetailViewTransfer')} →
                      </Link>
                    )}
                  </div>
                )}
                {isPaymentPending && !isWinner && (
                  <p className="text-[0.82rem] text-gray-500 mt-2">
                    {t('auctionDetailWaitingWinnerPayment')}
                  </p>
                )}
                {isPaymentPending && isOwner && (
                  <p className="text-[0.82rem] text-gray-500 mt-2">
                    {t('auctionDetailWinnerMustPay')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Bid placement + info ── */}
          <div className="sticky top-6 flex flex-col gap-4">

            {/* Bid form — only for non-owner, active auction */}
            {isActive && !isOwner && (
              <div className="p-6 bg-white border border-gray-200 rounded-[14px]">
                <h3 className="font-display text-[1.25rem] font-semibold text-gray-900 mb-5">
                  {t('auctionDetailPlaceYourBid')}
                </h3>
                {(biddingBlocked || participation.biddingBlocked) ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    {participation.biddingBlockedReason ||
                      t('auctionDetailBiddingBlockedDomain')}
                  </div>
                ) : (
                <>
                {false && !participation.loading && !participation.paid && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-sm text-amber-800 mb-2">
                      {t('auctionDetailParticipationRequired', { amount: formatPrice(participation.fee || 0) })}
                    </div>
                    <button className="btn-glow w-full" onClick={handlePayParticipation} disabled={payingParticipation}>
                      {payingParticipation ? t('auctionDetailProcessing') : t('auctionDetailPayParticipation')}
                    </button>
                    {participationError && <div className="text-xs text-red-600 mt-2">{participationError}</div>}
                  </div>
                )}

                {/* Quick bid buttons */}
                {minNextBid > 0 && (
                  <div className="mb-4">
                    <div className="text-[0.72rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('auctionDetailQuickBid')}</div>
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
                            {formatPrice(quickAmount)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {bidFee !== null && (
                  <div className="mb-4 text-[0.82rem] text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    A fee of <strong>{formatPrice(bidFee)}</strong> will be charged for placing this bid.
                  </div>
                )}

                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[0.78rem] text-gray-500 font-semibold block uppercase tracking-wider">
                    {t('auctionDetailYourBidAmount', { symbol: getSymbol() })}
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => { setBidAmount(e.target.value); setBidError(''); }}
                    placeholder={t('auctionDetailMinPlaceholder', { amount: formatPrice(minNextBid) })}
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

                {bidFee > 0 && (
                  <div className="text-[0.75rem] text-gray-500 mb-3 text-center font-medium bg-gray-50 p-2 rounded">
                    A non-refundable per-bid fee of {formatPrice(bidFee)} will be charged.
                  </div>
                )}

                <button className="btn-glow w-full" onClick={handleBid}
                  disabled={bidLoading || !bidAmount}>
                  {bidLoading ? <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> :
                    (bidAmount
                      ? t('auctionDetailPlaceBidWithAmount', { amount: formatPrice(bidAmount) })
                      : `${t('auctionDetailPlaceBidBtn')} →`)}
                </button>

                <p className="text-[0.72rem] text-gray-500 mt-3 text-center leading-relaxed">
                  {t('auctionDetailBidCommitDomain')}
                </p>
                </>
                )}
              </div>
            )}

            {/* Owner — can't bid on own listing */}
            {isOwner && isActive && (
              <div className="p-5 bg-white border border-gray-200 rounded-[14px] text-center">
                <div className="text-[1.5rem] mb-2">👑</div>
                <p className="text-gray-500 text-[0.875rem]">
                  {t('auctionDetailOwnListing')}
                </p>
              </div>
            )}

            {/* Auction info card */}
            <div className="p-5 bg-white border border-gray-200 rounded-[14px]">
              <div className="text-[0.72rem] font-semibold text-gray-900 uppercase tracking-wider mb-3">{t('auctionDetailInfo')}</div>
              <div className="flex flex-col gap-2.5">
                <InfoRow label={t('auctionDetailDuration')}
                  value={auction.duration?.replace(/_/g, ' ')} />
                <InfoRow label={t('auctionDetailStarted')}
                  value={formatAuctionDate(auction.startTime, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })} />
                <InfoRow label={t('auctionDetailEnds')}
                  value={formatAuctionDateTime(auction.endTime, {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })} />
                {auction.status === 'EXTENDED' && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-[0.75rem] text-amber-800">
                    {t('auctionDetailExtendedNote')}
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
          domainId={auction.domainId || auction.domain_id}
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
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
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
          {bid.bidderName || t('auctionDetailAnonymous')}
          {isWinner && (
            <span className="ml-1.5 text-[0.68rem] text-amber-600 font-bold">{t('auctionDetailWinnerBadge')}</span>
          )}
          {!isWinner && isLeading && (
            <span className="ml-1.5 text-[0.68rem] text-green-600 font-bold">{t('auctionDetailLeadingBadge')}</span>
          )}
        </div>
        <div className="text-[0.72rem] text-gray-500">
          {bidTimeStr ? t('auctionDetailBidderWithTime', { time: bidTimeStr }) : t('auctionDetailBidder')}
        </div>
      </div>
      <div className={`font-display text-[1.1rem] font-bold flex-shrink-0 ${
        isLatest ? 'text-green-600' : 'text-amber-600'
      }`}>
        {formatPrice(bid.amount)}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const { t } = useTranslation();
  const config = {
    DRAFT:    { color: '#888',    label: t('auctionsPageStatusDraft') },
    ACTIVE:   { color: '#6ec896', label: t('auctionsPageStatusLive') },
    EXTENDED: { color: '#c8a96e', label: t('auctionsPageStatusExtended') },
    ENDED:    { color: '#a06ec8', label: t('auctionDetailStatusEnded') },
    PAYMENT_PENDING: { color: '#c8a96e', label: t('auctionDetailStatusPaymentPending') },
    COMPLETED: { color: '#6ec896', label: t('auctionDetailStatusCompleted') },
    UNSOLD:   { color: '#c86e6e', label: t('auctionDetailStatusUnsold') },
    CANCELLED:{ color: '#888',    label: t('auctionDetailStatusCancelled') },
    CLOSED:   { color: '#666',    label: t('auctionDetailStatusClosed') },
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
function ReAuctionModal({ auctionId, domainId, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getSymbol } = useCurrency();
  const [form, setForm]       = useState({ minBidPrice: '', duration: 'SEVEN_DAYS' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.minBidPrice || parseFloat(form.minBidPrice) <= 0) {
      setError(t('auctionDetailValidMinBid'));
      return;
    }
    setLoading(true); setError('');
    try {
      const creationFeeOrderId = await payAuctionCreationFee({
        auctionType: 'DOMAIN',
        user,
        referenceId: domainId,
        description: t('auctionDetailReAuctionCreationFee', { defaultValue: 'Domain re-auction creation fee' }),
      });
      await auctionAPI.reAuction(auctionId, {
        domainId,
        minBidPrice: parseFloat(form.minBidPrice),
        duration:    form.duration,
        creationFeeOrderId,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('auctionDetailFailedReAuction'));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8">
        <div className="absolute -top-24 -right-24 w-[300px] h-[300px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
        <button className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors hover:text-gray-700" onClick={onClose}>✕</button>
        <div className="mb-6">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[0.72rem] font-semibold text-indigo-600 uppercase tracking-wide mb-2">{t('auctionDetailReAuctionBadge')}</div>
          <h2 className="font-display text-[1.75rem] font-semibold text-gray-900 mb-1">{t('auctionDetailReAuctionTitle')}</h2>
          <p className="text-sm text-gray-500">{t('auctionDetailReAuctionSubtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('auctionDetailNewMinBidRequired', { symbol: getSymbol() })}</label>
            <input className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" type="number" min="1" value={form.minBidPrice}
              onChange={e => setForm(f => ({ ...f, minBidPrice: e.target.value }))}
              placeholder={t('domainsPageMinBidPlaceholder')} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('auctionDetailAuctionDurationRequired')}</label>
            <select className="px-3 py-2 border border-gray-300 rounded-[8px] text-gray-900 bg-white outline-none focus:border-indigo-500 transition-all" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
              <option value="ONE_DAY">{t('domainsPageDurationOneDay')}</option>
              <option value="SEVEN_DAYS">{t('domainsPageDurationSevenDays')}</option>
              <option value="THIRTY_DAYS">{t('domainsPageDurationThirtyDays')}</option>
              <option value="SIXTY_DAYS">{t('domainsPageDurationSixtyDays')}</option>
              <option value="NINETY_DAYS">{t('domainsPageDurationNinetyDays')}</option>
            </select>
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="flex gap-3 mt-1">
            <button type="submit" className="btn-glow flex-1" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin inline-block" /> : t('auctionDetailStartReAuction')}
            </button>
            <button type="button" className="btn-glow" onClick={onClose}>{t('cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
