import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { domainTransferAPI } from '../api/domainTransferAPI';
import { readApiError } from '../utils/apiError';
import PayoutProfileBanner from '../components/payout/PayoutProfileBanner';

const sellerLabels = {
  PAYMENT_COMPLETED: 'Domain Sold',
  AWAITING_AUTH_CODE: 'Awaiting Auth Code',
  AUTH_CODE_AVAILABLE: 'Auth Code Submitted',
  AUTH_CODE_RECEIVED: 'Auth Code Submitted',
  AUTH_CODE_VIEWED: 'Auth Code Viewed',
  TRANSFER_IN_PROGRESS: 'Transfer In Progress',
  TRANSFER_COMPLETED: 'Transfer Completed',
  PAYOUT_PENDING: 'Payout Pending',
  PAYOUT_APPROVED: 'Payout Approved',
  PAYOUT_REMINDER_SENT: 'Payout Reminder Sent',
  PAYOUT_RELEASED: 'Payout Released',
  SELLER_PAID: 'Payout Released',
  COMPLETED: 'Payout Released',
  REFUNDED: 'Refunded',
  ADMIN_REVIEW_REQUIRED: 'Admin Review Required',
  DISPUTED: 'Under Review',
  CANCELLED: 'Cancelled',
};

const eventLabels = {
  PAYMENT_COMPLETED: 'Domain Sold',
  AUTH_SUBMITTED: 'Auth Code Submitted',
  AUTH_CODE_AVAILABLE: 'Auth Code Available',
  OTP_REVEAL: 'Auth Code Viewed',
  TRANSFER_STARTED: 'Transfer In Progress',
  TRANSFER_CONFIRMED: 'Transfer Completed',
  PAYOUT_PENDING: 'Payout Pending',
  PAYOUT_APPROVED: 'Payout Approved',
  PAYOUT_RELEASED: 'Payout Released',
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

function statusTone(status) {
  if (['TRANSFER_COMPLETED', 'PAYOUT_APPROVED', 'PAYOUT_RELEASED', 'SELLER_PAID', 'COMPLETED'].includes(status)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (['TRANSFER_IN_PROGRESS', 'AUTH_CODE_AVAILABLE', 'AUTH_CODE_RECEIVED', 'AUTH_CODE_VIEWED'].includes(status)) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (['AWAITING_AUTH_CODE', 'PAYOUT_PENDING', 'PAYMENT_COMPLETED', 'ADMIN_REVIEW_REQUIRED'].includes(status)) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (['REFUNDED', 'CANCELLED'].includes(status)) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function DomainTransferSellerPage() {
  const { transactionId } = useParams();
  const { t } = useTranslation();
  const [tx, setTx] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrarName, setRegistrarName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!transactionId) return;
    setError('');
    try {
      const [detail, events] = await Promise.all([
        domainTransferAPI.get(transactionId),
        domainTransferAPI.timeline(transactionId),
      ]);
      setTx(detail.data);
      setTimeline(events.data?.events || []);
    } catch (err) {
      setError(readApiError(err, t('transferLoadFailed', { defaultValue: 'Could not load transfer.' })));
    } finally {
      setLoading(false);
    }
  }, [transactionId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await domainTransferAPI.submitAuthCode(transactionId, {
        registrarName,
        authCode,
      });
      setAuthCode('');
      await load();
    } catch (err) {
      setError(readApiError(err, t('transferSubmitFailed', { defaultValue: 'Submit failed.' })));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = tx && ['AWAITING_AUTH_CODE', 'ADMIN_REVIEW_REQUIRED'].includes(tx.transferStatus);
  const payoutPending = tx && ['TRANSFER_COMPLETED', 'PAYOUT_PENDING', 'PAYOUT_APPROVED'].includes(tx.transferStatus);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/domains/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          <ArrowLeft size={16} /> {t('transferBackDashboard', { defaultValue: 'Back to dashboard' })}
        </Link>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" /></div>
        ) : !tx ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Domain Sale Transfer</p>
                  <h1 className="mt-2 text-2xl font-bold text-gray-950">{tx.domainFqdn}</h1>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(tx.transferStatus)}`}>
                  {sellerLabels[tx.transferStatus] || 'Transfer Update'}
                </span>
              </div>
              {tx.sellerDeadlineAt && canSubmit && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {t('transferSellerDeadline', { defaultValue: 'Deadline' })}: {formatDateTime(tx.sellerDeadlineAt)}
                </p>
              )}
              {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </section>

            {payoutPending ? <PayoutProfileBanner context="domain" /> : null}

            {canSubmit && (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">{t('transferSubmitAuthCode', { defaultValue: 'Submit Auth Code' })}</h2>
                  <p className="mt-1 text-sm text-gray-600">Share the domain authorization code so the buyer can complete the transfer securely.</p>
                </div>
                <input
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder={t('transferRegistrar', { defaultValue: 'Registrar name' })}
                  value={registrarName}
                  onChange={(e) => setRegistrarName(e.target.value)}
                  required
                />
                <input
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder={t('transferAuthCode', { defaultValue: 'Auth / EPP code' })}
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  required
                />
                <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
                  {submitting ? t('transferSubmitting', { defaultValue: 'Submitting...' }) : t('transferSubmit', { defaultValue: 'Submit' })}
                </button>
              </form>
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-950">{t('transferTimeline', { defaultValue: 'Timeline' })}</h3>
              <ol className="mt-5">
                {timeline.map((event, index) => (
                  <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {index !== timeline.length - 1 && (
                      <span className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-gray-200" aria-hidden />
                    )}
                    <span className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{eventLabels[event.eventType] || sellerLabels[event.eventType] || 'Transfer Update'}</p>
                      {event.createdAt && <p className="mt-1 text-sm text-gray-500">{formatDateTime(event.createdAt)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
