import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, Phone, User } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { ventureDealAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import { unwrapApiData } from '../utils/apiResponse';
import { formatEquityPercent } from '../constants/ventureLabels';

const COBROTHER_EMAIL = 'contact@cobrother.com';

const DEAL_STATUS_LABELS = {
  PENDING_ADMIN_APPROVAL: 'Awaiting admin approval',
  PENDING_PAYMENT: 'Pending payment',
  PAYMENT_HELD: 'Payment held in escrow',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function ContactCard({ title, person, email, phone }) {
  if (!person && !email && !phone) return null;
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{title}</div>
      {person && (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-1">
          <User size={14} className="text-gray-400" />
          {person}
        </div>
      )}
      {email && (
        <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline mb-1">
          <Mail size={14} />
          {email}
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:underline">
          <Phone size={14} className="text-gray-400" />
          {phone}
        </a>
      )}
    </div>
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

  const isBuyer = user?.id && deal?.buyerId === user.id;
  const isPartnership = deal?.dealKind === 'CO_VENTURE';
  const counterparty = isBuyer ? deal?.seller : deal?.buyer;
  const counterpartyLabel = isPartnership
    ? (isBuyer ? 'Founder' : 'Partner')
    : (isBuyer ? 'Seller' : 'Buyer');
  const canPay = !isPartnership && isBuyer && deal?.dealStatus === 'PENDING_PAYMENT' && Number(deal?.grossAmountInr) > 0;
  const awaitingAdmin = deal?.dealStatus === 'PENDING_ADMIN_APPROVAL';
  const statusLabel = DEAL_STATUS_LABELS[deal?.dealStatus] || deal?.dealStatus;

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-3xl">
        <Link to="/ventures/dashboard" className="inline-flex items-center gap-2 text-indigo-600 mb-4">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
        ) : !deal ? (
          <p className="text-red-600">{error || 'Deal not found.'}</p>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="font-display text-2xl font-bold text-gray-900 m-0">
                {deal.venture?.brandName || (isPartnership ? 'Partnership Deal' : 'Venture Deal')}
              </h1>
              {isPartnership && (
                <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                  Co-Venture
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-6">
              Status: <strong>{statusLabel}</strong>
              {!isPartnership && (
                <>
                  {' · '}
                  Escrow: <strong>{deal.escrowStatus}</strong>
                </>
              )}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <ContactCard
                title={counterpartyLabel}
                person={isPartnership && !isBuyer ? (deal.partnerName || counterparty?.name) : counterparty?.name}
                email={counterparty?.email}
                phone={counterparty?.phoneNumber}
              />
              {isPartnership ? (
                <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl">
                  <div className="text-xs text-teal-700 uppercase tracking-wide">Partnership</div>
                  <div className="text-sm text-teal-900 mt-1 font-medium">
                    CoBrother is assisting both parties with next steps.
                  </div>
                  {deal.venture?.equityPercentOffered != null && (
                    <div className="text-sm text-teal-800 mt-2">
                      Equity offered: <strong>{formatEquityPercent(deal.venture.equityPercentOffered)}%</strong>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Deal amount</div>
                    <div className="text-xl font-bold text-gray-900">{formatPrice(deal.grossAmountInr)}</div>
                  </div>
                  {deal.equityPercent != null && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Equity</div>
                      <div className="text-xl font-bold text-gray-900">{formatEquityPercent(deal.equityPercent)}%</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {awaitingAdmin && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6 text-sm text-blue-900">
                This deal is awaiting CoBrother admin approval. Payment will be available after approval.
              </div>
            )}

            {canPay && (
              <button
                type="button"
                className="btn-glow mb-6"
                disabled={paying}
                onClick={handlePayNow}
              >
                {paying ? 'Opening payment…' : 'Pay Now'}
              </button>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex gap-3">
              <Mail className="shrink-0 text-amber-700 mt-0.5" size={18} />
              <div>
                <div className="font-semibold text-gray-900">Contact CoBrother</div>
                <p className="text-sm text-gray-700 mt-1">
                  For deal assistance, email{' '}
                  <a href={`mailto:${deal.cobrotherContactEmail || COBROTHER_EMAIL}`} className="text-indigo-600 underline">
                    {deal.cobrotherContactEmail || COBROTHER_EMAIL}
                  </a>
                </p>
              </div>
            </div>

            {message && <p className="text-green-700 mb-4">{message}</p>}
            {error && <p className="text-red-600 mb-4">{error}</p>}

            {Array.isArray(deal.timeline) && deal.timeline.length > 0 && (
              <section>
                <h2 className="font-semibold text-gray-900 mb-3">Timeline</h2>
                <ol className="border-l-2 border-gray-200 pl-4 space-y-4">
                  {deal.timeline.map((evt, idx) => (
                    <li key={`${evt.eventType}-${idx}`} className="relative">
                      <span className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <div className="text-sm font-medium text-gray-900">{evt.label || evt.eventType.replace(/_/g, ' ')}</div>
                      {evt.message && <div className="text-sm text-gray-600">{evt.message}</div>}
                      {evt.createdAt && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(evt.createdAt).toLocaleString()}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
