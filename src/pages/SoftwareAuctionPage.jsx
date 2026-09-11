import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useSoftwareAuction } from '../hooks/useSoftwareAuction';
import { useAuth } from '../context/AuthContext';
import useReferralTracker from '../hooks/useReferralTracker';
import { softwareAuctionAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE } from '../config/featureFlags';
import { Gavel, Clock, Wifi, WifiOff, TrendingUp, Code, Wrench, FileText } from 'lucide-react';
import { formatAuctionDateTime, formatCountdown, resolveAuctionEndTime } from '../utils/auctionDate';
import { isSoftwareAuctionLister, resolveAuctionLister } from '../utils/auctionLister';
import { validateBidAmount, formatBidRangeLabel } from '../utils/auctionBidLimits';
import useCurrency from '../context/CurrencyContext';
import { fetchListingFeesAndCharges } from '../utils/auctionFees';
import { CURRENCY_LABELS } from '../constants/currencies';
import { convertPrice as convertInrToCurrency } from '../utils/currencyDisplay';
import SearchableCurrencySelect from '../components/common/SearchableCurrencySelect';
import EdgePointsRedeemToggle from '../components/profile/EdgePointsRedeemToggle';

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

const STATUS_STYLE_BASE = {
  ACTIVE:           { color: '#6ec896', bg: 'rgba(110,200,150,0.12)', labelKey: 'auctionsPageStatusLive' },
  EXTENDED:         { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', labelKey: 'auctionsPageStatusExtended' },
  ENDED:            { color: '#6eadc8', bg: 'rgba(110,173,200,0.12)', labelKey: 'auctionDetailStatusEnded' },
  COMPLETED:        { color: '#6ec896', bg: 'rgba(110,200,150,0.12)', labelKey: 'auctionDetailComplete' },
  UNSOLD:           { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', labelKey: 'auctionDetailStatusNoBids' },
  CLOSED:           { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', labelKey: 'auctionDetailStatusClosed' },
  DRAFT:            { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', labelKey: 'auctionDetailStatusPendingApproval' },
  PENDING_APPROVAL: { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', labelKey: 'auctionDetailStatusPendingApproval' },
};

export default function SoftwareAuctionPage() {
  const { t } = useTranslation();
  const { auctionId }                       = useParams();
  const { user }                            = useAuth();

  useReferralTracker(auctionId, 'auction');

  const navigate                            = useNavigate();
  const { auction, bids, minNextBid, maxBidPrice,
          wsState, loading, loadError, placeBid, refresh } = useSoftwareAuction(auctionId);
  const resolvedEndTime = resolveAuctionEndTime(auction);
  const {
    currency: navCurrency,
    formatPrice,
    formatCurrency,
    convertToInr,
    supportedCurrencies,
    ratesMeta,
  } = useCurrency();

  const [bidAmount, setBidAmount]           = useState('');
  const [bidAmountInr, setBidAmountInr]     = useState('');
  const [bidCurrency, setBidCurrency]       = useState(navCurrency || 'INR');
  const [bidError, setBidError]             = useState('');
  const [bidSuccess, setBidSuccess]         = useState('');
  const [placing, setPlacing]               = useState(false);
  const [participation, setParticipation]   = useState({ loading: true, paid: false, fee: 0 });
  const [imgError, setImgError]             = useState(false);
  const [payingParticipation, setPayingParticipation] = useState(false);
  const [participationError, setParticipationError] = useState('');
  const [bidFee, setBidFee] = useState(null);
  const [payingWinnerBid, setPayingWinnerBid] = useState(false);
  const [winnerPaymentError, setWinnerPaymentError] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [finalPayable, setFinalPayable] = useState(0);

  const isActive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const isEnded = auction?.status === 'ENDED';
  const isCompleted = auction?.status === 'COMPLETED';
  const isWinner = Boolean(
    user?.id && auction?.currentWinnerId
    && String(user.id) === String(auction.currentWinnerId),
  );
  const hasFinalWinner = (isEnded || isCompleted) && Number(auction?.currentHighestBid) > 0;
  const awaitingWinnerPayment = isEnded && isWinner && !auction?.winnerPaymentPaid;
  const isOwner = resolveAuctionLister(
    isSoftwareAuctionLister(auction, user?.id),
    participation,
  );
  const biddingBlocked = REQUIRE_TECHNOLOGY_VERIFICATION_BEFORE_PURCHASE && !auction?.software?.verified;
  const statusStyleBase = STATUS_STYLE_BASE[auction?.status] || STATUS_STYLE_BASE.DRAFT;
  const statusStyle = { ...statusStyleBase, label: t(statusStyleBase.labelKey) };
  const formatBidCurrencyFromInr = (amount) => (
    formatCurrency(convertInrToCurrency(amount, bidCurrency, ratesMeta), bidCurrency)
  );
  const formatBidInputValue = (inrAmount, currencyCode) => {
    const converted = convertInrToCurrency(inrAmount, currencyCode, ratesMeta);
    if (!Number.isFinite(converted)) return '';
    if (currencyCode === 'INR') return String(Math.round(converted));
    return String(Number(converted.toFixed(2)));
  };
  const bidPlaceholder = minNextBid > 0
    ? formatBidInputValue(minNextBid, bidCurrency)
    : '';

  const handleBidAmountChange = (value) => {
    setBidAmount(value);
    const parsed = Number(value);
    setBidAmountInr(
      Number.isFinite(parsed) && parsed > 0
        ? String(convertToInr(parsed, bidCurrency))
        : '',
    );
    setBidError('');
  };

  const handleBidCurrencyChange = (nextCurrency) => {
    if (bidAmountInr) {
      setBidAmount(formatBidInputValue(Number(bidAmountInr), nextCurrency));
    }
    setBidCurrency(nextCurrency);
    setBidError('');
  };

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

    if (user && isActive) {
      fetchListingFeesAndCharges()
        .then(data => {
          if (data?.auctionBidFeeInr) {
            setBidFee(data.auctionBidFeeInr);
          }
        })
        .catch(console.error);
    }
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
        description: t('auctionDetailParticipationFeeSoftware'),
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
      setParticipationError(err?.response?.data?.error || t('auctionDetailFailedStartPayment'));
      setPayingParticipation(false);
    }
  };

  useEffect(() => {
    if (auction?.currentHighestBid) {
      setFinalPayable(Number(auction.currentHighestBid));
    }
  }, [auction?.currentHighestBid]);

  const handlePayWinningBid = async () => {
    if (!auction?.id || !user) return;
    setPayingWinnerBid(true);
    setWinnerPaymentError('');
    try {
      const { data: res } = await softwareAuctionAPI.winnerPaymentCreateOrder(
        auction.id,
        redeemPoints,
      );
      const orderData = res?.data ?? res;
      openRazorpayCheckout({
        orderData,
        user,
        description: t('auctionDetailBidFee', {
          defaultValue: `Winning bid for ${auction?.software?.name || 'software auction'}`,
        }),
        onSuccess: async (response) => {
          try {
            await softwareAuctionAPI.winnerPaymentVerify(auction.id, {
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
    if (!user) {
      const returnUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    const amt = parseFloat(bidAmount);
    if (isNaN(amt) || amt <= 0) { setBidError(t('auctionDetailEnterValidAmount')); return; }
    const bidAmountInrValue = Number(bidAmountInr) || convertToInr(amt, bidCurrency);
    const bidErrorMsg = validateBidAmount(bidAmountInrValue, { minNextBid, maxBidPrice }, formatBidCurrencyFromInr);
    if (bidErrorMsg) {
      setBidError(bidErrorMsg);
      return;
    }
    setBidError(''); setBidSuccess('');
    setPlacing(true);
    try {
      const { payBidFee } = await import('../utils/auctionFees');
      const payment = await payBidFee({
        auctionType: 'SOFTWARE',
        auctionId: auction.id,
        bidAmount: bidAmountInrValue,
        user,
        description: t('auctionDetailBidFee', { defaultValue: 'Auction bid fee' }),
      });
      await placeBid({
        amount: bidAmountInrValue,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpaySignature: payment.razorpaySignature,
      });
      setBidSuccess(t('auctionDetailBidPlacedSuccess'));
      setBidAmount('');
      setBidAmountInr('');
      setTimeout(() => setBidSuccess(''), 4000);
    } catch (e) {
      const data = e.response?.data;
      setBidError(
        data?.error
        || data?.message
        || (typeof data?.detail === 'string' ? data.detail : null)
        || t('auctionDetailFailedPlaceBid'),
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
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">{t('auctionDetailNotFound')}</h2>
        {loadError && (
          <p className="text-red-600 text-sm mt-2 max-w-md mx-auto">{loadError}</p>
        )}
        <button className="btn-ghost mt-4" onClick={() => navigate('/technology')}>{t('auctionDetailBackTechnology')}</button>
      </div>
    </AppLayout>
  );

  const sw = auction.software || {};

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1rem' }}>

        {/* Back */}
        <button className="btn-ghost mb-4 font-bold text-gray-800 hover:text-purple-700 transition-colors" style={{ fontSize: '0.85rem' }}
          onClick={() => navigate('/technology')}>
          {t('auctionDetailBackTechnology')}
        </button>

        {/* Header card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {sw.imageUrl && !imgError ? (
                <img src={sw.imageUrl} alt={sw.name}
                  onError={() => setImgError(true)}
                  style={{ width: 56, height: 56, borderRadius: 10,
                           objectFit: 'cover', border: '1px solid #e5e7eb' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f3f4f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.5rem', color: '#9ca3af', border: '1px solid #e5e7eb' }}>⌥</div>
              )}
              <div>
                <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif',
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
                      <WifiOff size={11} /> {t('auctionDetailLivePaused')}
                    </span>
                  )}
                  {wsState === 'connecting' && isActive && (
                    <span style={{ fontSize: '0.72rem', color: '#c8a96e',
                                   display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wifi size={11} /> {t('auctionDetailConnecting')}
                    </span>
                  )}
                  {wsState === 'live' && isActive && (
                    <span style={{ fontSize: '0.72rem', color: '#6ec896',
                                   display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wifi size={11} /> {t('auctionDetailLive')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Countdown */}
            {isActive && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              marginBottom: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  <Clock size={12} />{t('auctionDetailTimeLeft')}
                </div>
                <Countdown endTime={resolvedEndTime} status={auction.status} />
                {auction.status === 'EXTENDED' && (
                  <div style={{ fontSize: '0.72rem', color: '#c8a96e', marginTop: '0.25rem' }}>
                    {t('auctionDetailExtendedAntiSnipe')}
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
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('auctionDetailMinBid')}</div>
              <div style={{ fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: '1.3rem', fontWeight: 700, color: '#111827' }}>
                {formatPrice(auction.minBidPrice)}
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af',
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('auctionsPageHighestBid')}</div>
              <div style={{ fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: '1.3rem', fontWeight: 700,
                            color: auction.currentHighestBid > 0 ? '#6ec896' : '#9ca3af' }}>
                {auction.currentHighestBid > 0
                  ? formatPrice(auction.currentHighestBid)
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
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('auctionsPageTotalBids')}</div>
              <div style={{ fontFamily: 'Inter, system-ui, sans-serif',
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
              <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                           fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                           margin: '0 0 0.75rem' }}>{t('auctionDetailAboutSoftware')}</h3>
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
              <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                           fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                           margin: '0 0 1rem' }}>{t('auctionDetailWhatsIncluded')}</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                              fontSize: '0.88rem', color: '#374151' }}>
                  <Code size={16} color={auction.sourceCodeIncluded ? '#6ec896' : '#d1d5db'} />
                  <span style={{ color: auction.sourceCodeIncluded ? '#111827' : '#9ca3af' }}>
                    {auction.sourceCodeIncluded ? t('auctionDetailSourceCodeIncluded') : t('auctionDetailSourceCodeNotIncluded')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                              fontSize: '0.88rem', color: '#374151' }}>
                  <Wrench size={16} color={auction.supportIncluded ? '#6ec896' : '#d1d5db'} />
                  <span style={{ color: auction.supportIncluded ? '#111827' : '#9ca3af' }}>
                    {auction.supportIncluded
                      ? t('auctionDetailSupportIncluded', { count: auction.supportDays, days: auction.supportDays })
                      : t('auctionDetailNoSupport')}
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
                <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                             fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                             margin: '0 0 0.75rem' }}>{t('auctionDetailWhyAuction')}</h3>
                <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                  {auction.auctionRationale}
                </p>
              </div>
            )}

            {/* External links */}
            {(sw.liveDemoLink || sw.githubLink || sw.videoLink) && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                             fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                             margin: '0 0 0.75rem' }}>{t('auctionDetailLinks')}</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {sw.liveDemoLink && (
                    <a href={sw.liveDemoLink} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
                      {t('auctionDetailLiveDemo')}
                    </a>
                  )}
                  {sw.githubLink && (
                    <a href={sw.githubLink} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
                      {t('auctionDetailGithub')}
                    </a>
                  )}
                  {sw.videoLink && (
                    <a href={sw.videoLink} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary btn-sm" style={{ fontSize: '0.8rem', color: '#111827', borderColor: '#d1d5db' }}>
                      {t('auctionDetailDemoVideo')}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Bid history */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                          borderRadius: 12, padding: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                           fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                           margin: '0 0 0.75rem' }}>
                <TrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('auctionDetailBidHistory')} ({bids.length})
              </h3>
              {bids.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>{t('auctionDetailNoBidsFirstShort')}</p>
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
                                         color: '#059669' }}>🏆 {t('auctionDetailWinnerBadge')}</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700,
                                      color: bid.isWinningBid ? '#059669' : '#6eadc8' }}>
                          {formatPrice(bid.amount)}
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
                <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                             fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
                  {t('auctionDetailAwaitingApproval')}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                  {t('auctionDetailAwaitingApprovalDesc')}
                </p>
              </div>
            ) : hasFinalWinner ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                  {isCompleted ? '✅' : '🏆'}
                </div>
                <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                             fontWeight: 700, color: isCompleted ? '#059669' : '#111827',
                             margin: '0 0 0.5rem' }}>
                  {isCompleted ? t('auctionDetailComplete') : t('auctionDetailEndedTitle')}
                </h3>
                {auction.currentWinnerName && (
                  <p style={{ fontSize: '0.88rem', color: '#374151', margin: '0 0 0.5rem' }}>
                    {t('auctionDetailWonBy', { name: auction.currentWinnerName })}
                  </p>
                )}
                <p style={{ fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: '1.5rem', fontWeight: 700, color: '#6ec896', margin: '0 0 0.75rem' }}>
                  {formatPrice(auction.currentHighestBid)}
                </p>
                {awaitingWinnerPayment && (
                  <div style={{ marginTop: '1rem', padding: '1rem',
                                background: '#f0fdf4', border: '1px solid #bbf7d0',
                                borderRadius: 8, textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
                      {t('auctionDetailWonPayPrompt')}
                    </div>
                    <EdgePointsRedeemToggle
                      originalAmount={Number(auction.currentHighestBid ?? 0)}
                      onChange={(redeem, _discount, final) => {
                        setRedeemPoints(redeem);
                        setFinalPayable(final);
                      }}
                    />
                    <button className="btn-glow w-full"
                      onClick={handlePayWinningBid}
                      disabled={payingWinnerBid}
                      style={{ marginTop: '0.75rem' }}>
                      {payingWinnerBid
                        ? t('auctionDetailProcessing')
                        : `Pay ₹${finalPayable} and Claim Software`}
                    </button>
                    {winnerPaymentError && (
                      <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem' }}>
                        {winnerPaymentError}
                      </div>
                    )}
                  </div>
                )}
                {isCompleted && isWinner && (
                  <p style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600, marginTop: '0.75rem' }}>
                    {t('auctionDetailPaymentReceivedDomain')}
                  </p>
                )}
                {isEnded && !isWinner && (
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.75rem' }}>
                    {t('auctionDetailWaitingWinnerPayment')}
                  </p>
                )}
              </div>
            ) : auction.status === 'UNSOLD' && isOwner ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                             fontWeight: 700, color: '#111827', margin: '0 0 1rem' }}>
                  {t('auctionDetailNoBidsReauctionTitle')}
                </h3>
                <p style={{ fontSize: '0.83rem', color: '#6b7280', margin: '0 0 1rem' }}>
                  {t('auctionDetailEndedNoBidsRestorePrice', {
                    defaultValue: 'No bids were placed. This listing is back at its original asking price. You can sell it as usual or start a new auction.',
                  })}
                </p>
                <button className="btn-glow w-full"
                  onClick={() => navigate(`/technology`)}>
                  {t('auctionDetailManageListing')}
                </button>
              </div>
            ) : isActive && !isOwner && user ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif',
                             fontSize: '1.15rem', fontWeight: 700, color: '#111827',
                             margin: '0 0 0.25rem' }}>
                  <Gavel size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {t('auctionDetailPlaceBid')}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 1.25rem' }}>
                  {t('auctionDetailAllowedRange', { range: formatBidRangeLabel({ minNextBid, maxBidPrice }, formatBidCurrencyFromInr) })}
                </p>
                {bidFee !== null && (
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', margin: '-0.5rem 0 1rem 0', padding: '0.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                    A fee of <strong>{formatPrice(bidFee)}</strong> will be charged for placing this bid.
                  </div>
                )}
                {biddingBlocked ? (
                  <div style={{ padding: '0.75rem', borderRadius: 8, background: '#fff8e7', border: '1px solid #f3d38a', fontSize: '0.82rem', color: '#8a6d1f' }}>
                    {t('auctionDetailBiddingBlockedTech')}
                  </div>
                ) : (
                <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
                    <SearchableCurrencySelect
                      value={bidCurrency}
                      onChange={handleBidCurrencyChange}
                      wrapperClassName="shrink-0"
                      showFlag={false}
                      style={{
                        width: 96,
                        padding: '0.55rem 0.5rem',
                        border: '1px solid #d1d5db',
                        borderRight: 0,
                        borderRadius: '8px 0 0 8px',
                        color: '#111827',
                        background: '#fff',
                        outline: 'none',
                        fontWeight: 600,
                      }}
                    />
                    <input type="number" value={bidAmount}
                      onChange={e => handleBidAmountChange(e.target.value)}
                      placeholder={bidPlaceholder}
                      style={{
                        width: '100%',
                        minWidth: 0,
                        borderRadius: '0 8px 8px 0',
                      }} />
                  </div>
                  <button className="btn-glow" onClick={handleBid} disabled={placing}
                    style={{ whiteSpace: 'nowrap', minWidth: 80 }}>
                    {placing ? <span className="btn-spinner" /> : t('auctionDetailBidBtn')}
                  </button>
                </div>

                {/* Quick bid shortcuts */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
                              marginBottom: '0.75rem' }}>
                  {[1, 1.1, 1.25].map(mult => {
                    const val = Math.ceil(minNextBid * mult);
                    const bidValue = formatBidInputValue(val, bidCurrency);
                    return (
                      <button key={mult}
                        onClick={() => {
                          setBidAmount(bidValue);
                          setBidAmountInr(String(val));
                          setBidError('');
                        }}
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                                 background: '#f9fafb', border: '1px solid #e5e7eb',
                                 borderRadius: 6, cursor: 'pointer', color: '#374151' }}>
                        {formatBidCurrencyFromInr(val)}
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
                  {t('auctionDetailBidCommitSoftware')}
                </p>
                </>
                )}
              </div>
            ) : isActive && isOwner ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
                  {t('auctionDetailCannotBidOwn')}
                </p>
              </div>
            ) : !user ? (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem' }}>
                  {t('auctionDetailSignInToBid')}
                </p>
                <button className="btn-glow w-full" onClick={() => navigate('/login')}>
                  {t('signIn')}
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
                              marginBottom: '0.5rem' }}>{t('auctionDetailListedBy')}</div>
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
