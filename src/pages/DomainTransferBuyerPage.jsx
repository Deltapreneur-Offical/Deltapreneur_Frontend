import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { domainTransferAPI } from '../api/domainTransferAPI';

const BUYER_HIDDEN_EVENTS = new Set([
  'PAYOUT_PENDING',
  'PAYOUT_APPROVED',
  'PAYOUT_RELEASED',
  'PAYOUT_REMINDER_SENT',
]);

const buyerStatusLabels = {
  PAYMENT_COMPLETED: 'Payment Completed',
  AWAITING_AUTH_CODE: 'Awaiting Authorization Code',
  AUTH_CODE_AVAILABLE: 'Authorization Code Available',
  AUTH_CODE_RECEIVED: 'Authorization Code Available',
  AUTH_CODE_VIEWED: 'Authorization Code Available',
  TRANSFER_IN_PROGRESS: 'Transfer In Progress',
  TRANSFER_COMPLETED: 'Transfer Completed',
  PAYOUT_PENDING: 'Transfer Completed',
  PAYOUT_APPROVED: 'Transfer Completed',
  PAYOUT_RELEASED: 'Transfer Completed',
  SELLER_PAID: 'Transfer Completed',
  COMPLETED: 'Transfer Completed',
  REFUNDED: 'Refunded',
  DISPUTED: 'Transfer Under Review',
  ADMIN_REVIEW_REQUIRED: 'Transfer Under Review',
  CANCELLED: 'Cancelled',
};

const timelineLabels = {
  PAYMENT_COMPLETED: 'Payment Completed',
  AUTH_SUBMITTED: 'Authorization Code Submitted',
  AUTH_CODE_AVAILABLE: 'Authorization Code Available',
  OTP_REVEAL: 'Authorization Code Viewed',
  TRANSFER_STARTED: 'Transfer In Progress',
  ASSISTANCE_REQUESTED: 'CoBrother Assistance Requested',
  TRANSFER_CONFIRMED: 'Transfer Confirmed',
  TRANSFER_COMPLETED: 'Transfer Completed',
  REFUNDED: 'Refunded',
  DISPUTE_OPENED: 'Transfer Review Opened',
  DISPUTE_RESOLVED: 'Transfer Review Resolved',
  WHOIS_CHECK: 'WHOIS Check Completed',
};

function readApiError(error, fallback = 'Action failed.') {
  return error?.response?.data?.message
    || error?.response?.data?.error
    || error?.response?.data?.detail
    || fallback;
}

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

function buyerStatus(tx) {
  return buyerStatusLabels[tx?.transferStatus] || 'Transfer In Progress';
}

function statusTone(status) {
  if (['TRANSFER_COMPLETED', 'PAYOUT_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_RELEASED', 'SELLER_PAID', 'COMPLETED'].includes(status)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (['TRANSFER_IN_PROGRESS', 'AUTH_CODE_AVAILABLE', 'AUTH_CODE_RECEIVED', 'AUTH_CODE_VIEWED'].includes(status)) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (['AWAITING_AUTH_CODE', 'PAYMENT_COMPLETED', 'ADMIN_REVIEW_REQUIRED'].includes(status)) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (['REFUNDED', 'CANCELLED'].includes(status)) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function StatusBadge({ tx }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(tx?.transferStatus)}`}>
      {buyerStatus(tx)}
    </span>
  );
}

function TransferTimeline({ tx, events }) {
  const visibleEvents = useMemo(() => {
    const mapped = (events || [])
      .filter((event) => !BUYER_HIDDEN_EVENTS.has(event.eventType))
      .map((event) => ({
        id: event.id,
        type: event.eventType,
        label: timelineLabels[event.eventType] || buyerStatusLabels[event.eventType] || 'Transfer Update',
        createdAt: event.createdAt,
      }));

    if (tx?.hasAuthCode && !mapped.some((event) => event.type === 'AUTH_CODE_AVAILABLE')) {
      mapped.push({
        id: 'auth-code-available',
        type: 'AUTH_CODE_AVAILABLE',
        label: 'Authorization Code Available',
        createdAt: tx.authCodeSubmittedAt,
      });
    }

    if (
      ['TRANSFER_COMPLETED', 'PAYOUT_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_RELEASED', 'SELLER_PAID', 'COMPLETED'].includes(tx?.transferStatus)
      && !mapped.some((event) => event.type === 'TRANSFER_COMPLETED')
    ) {
      mapped.push({
        id: 'transfer-completed',
        type: 'TRANSFER_COMPLETED',
        label: 'Transfer Completed',
        createdAt: tx.transferConfirmedAt || tx.updatedAt,
      });
    }

    return mapped;
  }, [events, tx]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Transfer Timeline</h2>
      <ol className="mt-5 space-y-0">
        {visibleEvents.map((event, index) => (
          <li key={event.id || `${event.type}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
            {index !== visibleEvents.length - 1 && (
              <span className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-gray-200" aria-hidden />
            )}
            <span className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-white">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-950">{event.label}</p>
              {event.createdAt && <p className="mt-1 text-sm text-gray-500">{formatDateTime(event.createdAt)}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function DomainTransferBuyerPage() {
  const { transactionId } = useParams();
  const { t } = useTranslation();
  const [tx, setTx] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [revealedCode, setRevealedCode] = useState('');
  const [registrar, setRegistrar] = useState('');
  const [busyAction, setBusyAction] = useState('');

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
      if (detail.data?.buyerTargetRegistrar) setRegistrar(detail.data.buyerTargetRegistrar);
    } catch (err) {
      setError(readApiError(err, t('transferLoadFailed', { defaultValue: 'Could not load transfer.' })));
    } finally {
      setLoading(false);
    }
  }, [transactionId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (actionId, fn, successMessage) => {
    setBusyAction(actionId);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
      if (successMessage) setMessage(successMessage);
    } catch (err) {
      setError(readApiError(err, t('transferActionFailed', { defaultValue: 'Action failed.' })));
    } finally {
      setBusyAction('');
    }
  };

  const chooseSelf = () => run(
    'chooseSelf',
    async () => {
      await domainTransferAPI.chooseSelfTransfer(transactionId, { buyerTargetRegistrar: registrar });
      const { data } = await domainTransferAPI.getInstructions(transactionId);
      setInstructions(data);
    },
    'Self-transfer selected. Use the authorization code to complete transfer at your registrar.',
  );

  const requestHelp = () => run(
    'requestHelp',
    () => domainTransferAPI.requestAssistance(transactionId),
    'CoBrother assistance requested. A transfer specialist will guide you through the process.',
  );

  const sendOtp = () => run(
    'sendOtp',
    () => domainTransferAPI.sendRevealOtp(transactionId),
    "We've sent a verification code to your registered email address.",
  );

  const verifyOtp = async () => {
    setBusyAction('verifyOtp');
    setError('');
    setMessage('');
    try {
      const { data } = await domainTransferAPI.verifyRevealOtp(transactionId, otp);
      setRevealedCode(data.authCode || '');
      setTx(data);
      setMessage('Authorization code verified successfully.');
      await load();
    } catch (err) {
      setError(readApiError(err, t('transferOtpInvalid', { defaultValue: 'Invalid OTP.' })));
    } finally {
      setBusyAction('');
    }
  };

  const markStarted = () => run(
    'markStarted',
    () => domainTransferAPI.markTransferStarted(transactionId),
    'Transfer marked as in progress.',
  );

  const confirmDone = () => run(
    'confirmDone',
    () => domainTransferAPI.confirmTransfer(transactionId),
    'Your transfer has been successfully completed.',
  );

  const hasAuth = tx?.hasAuthCode;
  const canReveal = hasAuth && ['AUTH_CODE_AVAILABLE', 'AUTH_CODE_RECEIVED', 'AUTH_CODE_VIEWED', 'TRANSFER_IN_PROGRESS'].includes(tx?.transferStatus);
  const canMarkStarted = tx?.transferMethod && ['AUTH_CODE_AVAILABLE', 'AUTH_CODE_RECEIVED', 'AUTH_CODE_VIEWED'].includes(tx?.transferStatus);
  const canConfirm = ['AUTH_CODE_VIEWED', 'TRANSFER_IN_PROGRESS'].includes(tx?.transferStatus);
  const completed = ['TRANSFER_COMPLETED', 'PAYOUT_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_RELEASED', 'SELLER_PAID', 'COMPLETED'].includes(tx?.transferStatus);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/purchases" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          <ArrowLeft size={16} /> {t('transferBackPurchases', { defaultValue: 'Back to purchases' })}
        </Link>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" /></div>
        ) : !tx ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Secure Domain Transfer</p>
                  <h1 className="mt-2 text-2xl font-bold text-gray-950 sm:text-3xl">{tx.domainFqdn}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    CoBrother is holding your payment securely while the domain transfer is completed.
                  </p>
                </div>
                <StatusBadge tx={tx} />
              </div>
              {completed && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  Your domain transfer has been successfully completed.
                </div>
              )}
              {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}
              {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            </section>

            {hasAuth && !tx.transferMethod && !completed && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-950">Transfer Method</h2>
                <p className="mt-1 text-sm text-gray-600">Choose how you would like to complete your domain transfer.</p>
                <input
                  className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Your target registrar"
                  value={registrar}
                  onChange={(e) => setRegistrar(e.target.value)}
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(busyAction) || !registrar}
                    onClick={chooseSelf}
                  >
                    <span className="font-semibold text-indigo-900">Complete Transfer Myself</span>
                    <span className="mt-1 block text-sm text-indigo-700">I will use the authorization code to complete the transfer.</span>
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(busyAction)}
                    onClick={requestHelp}
                  >
                    <span className="font-semibold text-gray-950">Get CoBrother Assistance</span>
                    <span className="mt-1 block text-sm text-gray-600">A transfer specialist will guide you through the process.</span>
                  </button>
                </div>
              </section>
            )}

            {instructions?.steps && (
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <h3 className="font-semibold text-indigo-950">Registrar Steps</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-indigo-900">
                  {instructions.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </section>
            )}

            {canReveal && !completed && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-blue-50 p-3 text-blue-600"><KeyRound className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-950">Authorization Code Verification</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      For security reasons, verify your OTP before viewing the authorization code.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-[auto_minmax(180px,1fr)_auto]">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(busyAction)}
                    onClick={sendOtp}
                  >
                    {busyAction === 'sendOtp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Send Verification Code
                  </button>
                  <input
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm tracking-wide outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Enter verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(busyAction) || !otp}
                    onClick={verifyOtp}
                  >
                    {busyAction === 'verifyOtp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Reveal Authorization Code
                  </button>
                </div>
                {revealedCode && (
                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Authorization Code</p>
                    <p className="mt-2 break-all font-mono text-lg font-semibold text-gray-950">{revealedCode}</p>
                  </div>
                )}
              </section>
            )}

            {!completed && (canMarkStarted || canConfirm) && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-950">Transfer Progress</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {canMarkStarted && (
                    <button
                      type="button"
                      className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={Boolean(busyAction)}
                      onClick={markStarted}
                    >
                      I've started the transfer
                    </button>
                  )}
                  {canConfirm && (
                    <button
                      type="button"
                      className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={Boolean(busyAction)}
                      onClick={confirmDone}
                    >
                      {busyAction === 'confirmDone' ? 'Completing...' : 'I completed the transfer'}
                    </button>
                  )}
                </div>
              </section>
            )}

            <TransferTimeline tx={tx} events={timeline} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
