import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { ventureDealAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { unwrapApiData } from '../utils/apiResponse';
import { formatEquityPercent } from '../constants/ventureLabels';
import PayoutProfileBanner from '../components/payout/PayoutProfileBanner';
import {
  getVentureDealAmount,
  isVentureDealBuyer,
  isVentureDealSeller,
  ventureDealCanPay,
  ventureDealShowPaymentSection,
} from '../utils/ventureDeal';

const COBROTHER_EMAIL = 'support@cobrother.com';

const ESCROW_STATUS_LABELS = {
  HELD: 'Funds held in escrow',
  RELEASED: 'Released to seller',
  REFUNDED: 'Refunded',
};

function formatEscrowStatusLabel(escrowStatus, dealStatus) {
  if (
    escrowStatus === 'HELD'
    && ['PENDING_ADMIN_APPROVAL', 'PENDING_PAYMENT'].includes(dealStatus)
  ) {
    return 'Awaiting payment';
  }
  return ESCROW_STATUS_LABELS[escrowStatus] || escrowStatus;
}

const DEAL_STATUS_LABELS = {
  PENDING_ADMIN_APPROVAL: 'Awaiting admin approval',
  PENDING_PAYMENT: 'Pending payment',
  PAYMENT_HELD: 'Payment held in escrow',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function dealStatusTone(status) {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['PAYMENT_HELD', 'IN_PROGRESS'].includes(status)) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (['PENDING_ADMIN_APPROVAL', 'PENDING_PAYMENT'].includes(status)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function StatusBadge({ status }) {
  const label = DEAL_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || 'In progress';
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${dealStatusTone(status)}`}>
      {label}
    </span>
  );
}

function ContactDetails({ title, person, email, phone }) {
  if (!person && !email && !phone) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <div className="mt-3 space-y-2">
        {person && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-950">
            <User className="h-4 w-4 shrink-0 text-gray-400" />
            {person}
          </div>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            <Mail className="h-4 w-4 shrink-0" />
            {email}
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
            <Phone className="h-4 w-4 shrink-0 text-gray-400" />
            {phone}
          </a>
        )}
      </div>
    </div>
  );
}

function DealTimeline({ events }) {
  if (!Array.isArray(events) || events.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Timeline</h2>
      <ol className="mt-5 space-y-0">
        {events.map((evt, index) => (
          <li key={`${evt.eventType}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
            {index !== events.length - 1 && (
              <span className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-gray-200" aria-hidden />
            )}
            <span className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-white">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-950">
                {evt.label || evt.eventType?.replace(/_/g, ' ')}
              </p>
              {evt.message && <p className="mt-1 text-sm text-gray-600">{evt.message}</p>}
              {evt.createdAt && (
                <p className="mt-1 text-sm text-gray-500">{formatDateTime(evt.createdAt)}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function VentureDealPage() {
  const { dealId } = useParams();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!dealId) return;
    setError('');
    try {
      const { data } = await ventureDealAPI.get(dealId);
      setDeal(unwrapApiData(data) || data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load deal.');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!dealId) return undefined;
    const shouldPoll = deal?.dealStatus === 'PENDING_ADMIN_APPROVAL' || deal?.dealStatus === 'PENDING_PAYMENT';
    if (!shouldPoll) return undefined;

    const onFocus = () => { load(); };
    window.addEventListener('focus', onFocus);
    const intervalId = window.setInterval(load, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [dealId, deal?.dealStatus, load]);

  const handlePayNow = async () => {
    setPaying(true);
    setError('');
    try {
      const { data: orderResp } = await ventureDealAPI.createPaymentOrder(dealId);
      const order = unwrapApiData(orderResp) || orderResp;
      if (order?.contactOnly) {
        setMessage('No payment required. CoBrother will contact you shortly.');
        await load();
        return;
      }
      await openRazorpayCheckout({
        orderData: order,
        user,
        description: 'Venture deal payment',
        onSuccess: async (response) => {
          try {
            await ventureDealAPI.verifyPayment(dealId, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setMessage('Payment received. Funds are held in escrow.');
            await load();
          } catch (err) {
            setError(err?.response?.data?.error || 'Payment verification failed.');
          } finally {
            setPaying(false);
          }
        },
        onFailure: () => {
          setError('Payment failed. Please try again.');
          setPaying(false);
        },
        onDismiss: () => setPaying(false),
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not start payment.');
      setPaying(false);
    }
  };

  const isBuyer = isVentureDealBuyer(deal, user);
  const isSeller = isVentureDealSeller(deal, user);
  const isPartnership = deal?.dealKind === 'CO_VENTURE';
  const dealAmount = getVentureDealAmount(deal);
  const counterparty = isBuyer ? deal?.seller : deal?.buyer;
  const counterpartyLabel = isPartnership
    ? (isBuyer ? 'Founder' : 'Partner')
    : (isBuyer ? 'Seller' : 'Buyer');
  const showPaymentSection = ventureDealShowPaymentSection(deal);
  const canPay = ventureDealCanPay(deal, user);
  const paymentLocked = isBuyer && showPaymentSection && deal?.dealStatus === 'PENDING_ADMIN_APPROVAL';
  const paymentComplete = showPaymentSection && ['PAYMENT_HELD', 'IN_PROGRESS', 'COMPLETED'].includes(deal?.dealStatus);
  const paymentRefunded = deal?.dealStatus === 'REFUNDED';
  const awaitingBuyerPayment = isSeller && deal?.dealStatus === 'PENDING_PAYMENT' && dealAmount > 0;
  const paymentWaitingOnBuyer = showPaymentSection && !isBuyer && deal?.dealStatus === 'PENDING_PAYMENT';
  const brandName = deal?.venture?.brandName || (isPartnership ? 'Partnership Deal' : 'Venture Deal');
  const typeLabel = isPartnership ? 'Co-Venture Partnership' : 'Venture Deal';
  const headerSubtitle = isPartnership
    ? (dealAmount > 0
      ? 'Complete payment after admin approval. CoBrother will assist both parties with next steps.'
      : 'CoBrother is assisting both parties with next steps.')
    : 'CoBrother is holding payment securely while the deal is completed.';
  const showPayoutReminder = isSeller
    && !['COMPLETED', 'CANCELLED'].includes(deal?.dealStatus);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to="/ventures/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-indigo-600" />
          </div>
        ) : !deal ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error || 'Deal not found.'}</p>
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{typeLabel}</p>
                  <h1 className="mt-2 text-2xl font-bold text-gray-950 sm:text-3xl">{brandName}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{headerSubtitle}</p>
                  {!isPartnership && deal.escrowStatus && (
                    <p className="mt-1 text-sm text-gray-500">
                      Escrow: <span className="font-medium text-gray-700">{formatEscrowStatusLabel(deal.escrowStatus, deal.dealStatus)}</span>
                    </p>
                  )}
                </div>
                <StatusBadge status={deal.dealStatus} />
              </div>
              {message && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  {message}
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
            </section>

            {showPayoutReminder && (
              <PayoutProfileBanner context={isPartnership ? 'coventure' : 'venture'} />
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-950">Deal Details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ContactDetails
                  title={counterpartyLabel}
                  person={isPartnership && !isBuyer ? (deal.partnerName || counterparty?.name) : counterparty?.name}
                  email={counterparty?.email}
                  phone={counterparty?.phoneNumber}
                />
                {isPartnership ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Partnership</p>
                    {dealAmount > 0 ? (
                      <>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-950">
                          {formatPrice(dealAmount)}
                        </p>
                        <p className="mt-1 text-sm text-emerald-800">Partnership fee</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm font-medium leading-6 text-emerald-950">
                        CoBrother is assisting both parties with next steps.
                      </p>
                    )}
                    {deal.venture?.equityPercentOffered != null && (
                      <p className="mt-2 text-sm text-emerald-800">
                        Equity offered:{' '}
                        <span className="font-semibold">
                          {formatEquityPercent(deal.venture.equityPercentOffered)}%
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deal amount</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-gray-950">
                        {formatPrice(dealAmount)}
                      </p>
                    </div>
                    {deal.equityPercent != null && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Equity</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-gray-950">
                          {formatEquityPercent(deal.equityPercent)}%
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {awaitingBuyerPayment && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
                This deal was approved. The buyer can complete payment from their Purchases page or this deal link shared with them.
              </section>
            )}

            {isPartnership && isBuyer && dealAmount <= 0 && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
                This co-venture partnership does not require a payment. CoBrother will assist both parties with next steps.
              </section>
            )}

            {showPaymentSection && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-950">Payment</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {paymentWaitingOnBuyer && 'Waiting for the partner/buyer to complete payment.'}
                  {!paymentWaitingOnBuyer && paymentLocked && 'This deal is awaiting CoBrother admin approval. Payment will unlock once approved.'}
                  {!paymentWaitingOnBuyer && canPay && (isPartnership
                    ? 'Complete payment to confirm your partnership placement.'
                    : 'Complete payment to hold funds in escrow while the deal progresses.')}
                  {!paymentWaitingOnBuyer && paymentComplete && deal.dealStatus !== 'COMPLETED' && 'Payment received and held in escrow. CoBrother will assist with next steps.'}
                  {!paymentWaitingOnBuyer && deal.dealStatus === 'COMPLETED' && 'Payment completed and deal finalized.'}
                  {!paymentWaitingOnBuyer && paymentRefunded && 'This payment was refunded.'}
                  {!paymentWaitingOnBuyer && deal.dealStatus === 'CANCELLED' && 'This deal was cancelled.'}
                  {!paymentWaitingOnBuyer && !isBuyer && deal?.dealStatus === 'PENDING_ADMIN_APPROVAL' && 'This deal is awaiting admin approval before the partner/buyer can pay.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount due</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-gray-950">{formatPrice(dealAmount)}</p>
                  </div>
                  {canPay ? (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={paying}
                      onClick={handlePayNow}
                    >
                      {paying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Opening payment…
                        </>
                      ) : (
                        'Pay Now'
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
                      disabled
                    >
                      {paymentLocked
                        ? 'Awaiting admin approval'
                        : paymentWaitingOnBuyer
                          ? 'Waiting for partner/buyer'
                          : paymentComplete
                            ? 'Payment complete'
                            : 'Pay Now'}
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">Contact CoBrother</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-700">
                    For deal assistance, email{' '}
                    <a
                      href={`mailto:${deal.cobrotherContactEmail || COBROTHER_EMAIL}`}
                      className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      {deal.cobrotherContactEmail || COBROTHER_EMAIL}
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <DealTimeline events={deal.timeline} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
