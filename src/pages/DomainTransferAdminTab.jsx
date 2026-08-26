import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  Wallet,
  XCircle,
} from 'lucide-react';
import { domainTransferAdminAPI } from '../api/domainTransferAPI';
import { adminAPI } from '../api/services';
import { readApiError } from '../utils/apiError';
import ConfirmationModal, { buttonVariantMap } from '../components/common/ConfirmationModal';

const CLOSED_TRANSFER_STATUSES = new Set(['REFUNDED', 'SELLER_PAID', 'PAYOUT_RELEASED', 'COMPLETED', 'CANCELLED']);
const FINAL_ESCROW_STATUSES = new Set(['REFUNDED', 'RELEASED']);
const TRANSFER_COMPLETED_STATUSES = new Set(['TRANSFER_COMPLETED', 'PAYOUT_PENDING']);

const adminLabels = {
  PAYMENT_COMPLETED: 'Payment Completed',
  AWAITING_AUTH_CODE: 'Awaiting Auth Code',
  AUTH_CODE_AVAILABLE: 'Authorization Code Available',
  AUTH_CODE_RECEIVED: 'Authorization Code Available',
  AUTH_CODE_VIEWED: 'Authorization Code Viewed',
  TRANSFER_IN_PROGRESS: 'Transfer In Progress',
  TRANSFER_COMPLETED: 'Transfer Completed',
  PAYOUT_PENDING: 'Processing Seller Payment',
  PAYOUT_APPROVED: 'Payout Approved',
  PAYOUT_REMINDER_SENT: 'Payout Reminder Sent',
  PAYOUT_RELEASED: 'Payout Released',
  SELLER_PAID: 'Seller Paid',
  COMPLETED: 'Completed',
  REFUNDED: 'Refunded',
  DISPUTED: 'Disputed',
  ADMIN_REVIEW_REQUIRED: 'Admin Review Required',
  CANCELLED: 'Cancelled',
  AUTH_SUBMITTED: 'Authorization Code Submitted',
  OTP_REVEAL: 'OTP Verified',
  TRANSFER_STARTED: 'Transfer Started',
  TRANSFER_CONFIRMED: 'Transfer Confirmed',
  ASSISTANCE_REQUESTED: 'Assistance Requested',
  WHOIS_CHECK: 'WHOIS Check',
  HELD: 'Held',
  RELEASED: 'Released',
  SENT: 'Sent',
  FAILED: 'Failed',
};

const statusToneMap = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
};

function getAdminAccountNumber(payoutProfile = {}) {
  return String(payoutProfile.account_number || payoutProfile.accountNumber || '').trim();
}

function getApiErrorMessage(error) {
  return readApiError(error, 'Action failed.');
}

function formatStatus(value) {
  return adminLabels[value] || (value ? String(value).replaceAll('_', ' ') : 'Not available');
}

function statusTone(value) {
  const status = String(value || '').toUpperCase();
  if (['SELLER_PAID', 'TRANSFER_COMPLETED', 'PAYOUT_RELEASED', 'RELEASED', 'COMPLETED', 'VERIFIED', 'SENT'].includes(status)) {
    return 'green';
  }
  if (['PAYOUT_PENDING', 'PAYOUT_APPROVED', 'AWAITING_AUTH_CODE', 'PENDING', 'HELD', 'ADMIN_REVIEW_REQUIRED'].includes(status)) {
    return 'yellow';
  }
  if (['PAYMENT_COMPLETED', 'AUTH_CODE_AVAILABLE', 'AUTH_CODE_RECEIVED', 'AUTH_CODE_VIEWED', 'TRANSFER_IN_PROGRESS', 'DISPUTED'].includes(status)) {
    return 'blue';
  }
  if (['REFUNDED', 'FAILED', 'CANCELLED', 'AUTH_CODE_TIMEOUT', 'BUYER_TRANSFER_TIMEOUT', 'REJECTED'].includes(status)) {
    return 'red';
  }
  return 'gray';
}

function formatDateTime(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatInr(value) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatPayoutMethod(value) {
  if (value === 'UPI') return 'UPI';
  if (value === 'BANK_ACCOUNT') return 'Bank Account';
  return 'Not configured';
}

function formatManualPayoutMethod(value) {
  if (value === 'UPI') return 'UPI';
  if (value === 'BANK_TRANSFER') return 'Bank Transfer';
  return value || 'Not recorded';
}

function getPayoutProfileStatus(selected, accountNumber) {
  const profile = selected?.sellerPayoutProfile;
  if (!profile || selected?.sellerPayoutProfileMissing) {
    return {
      tone: 'red',
      label: 'Payout Profile Missing',
    };
  }
  if (selected?.sellerPayoutProfileReady) {
    return {
      tone: 'green',
      label: 'Payout Profile Complete',
    };
  }
  if (profile.payoutMethod === 'UPI' && !profile.upiId) {
    return {
      tone: 'yellow',
      label: 'Missing UPI',
    };
  }
  if (
    profile.payoutMethod === 'BANK_ACCOUNT' &&
    (!profile.accountHolderName || !profile.bankName || !accountNumber || !profile.bankIfsc)
  ) {
    return {
      tone: 'red',
      label: 'Missing Bank Details',
    };
  }
  return {
    tone: 'yellow',
    label: 'Payout Profile Incomplete',
  };
}

const payoutStatusClassMap = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  yellow: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-red-200 bg-red-50 text-red-800',
};

const payoutStatusIconClassMap = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
};

function StatusChip({ value }) {
  const tone = statusTone(value);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusToneMap[tone]}`}>
      {formatStatus(value)}
    </span>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed right-4 top-4 z-[1100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg ${
            toast.type === 'error' ? 'border-red-200 text-red-800'
            : toast.type === 'info' ? 'border-blue-200 text-blue-800'
            : 'border-emerald-200 text-emerald-800'
          }`}
          role="status"
        >
          {toast.type === 'error' ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : toast.type === 'info' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}

function AdminActionButton({ action, busyActionId, onClick }) {
  const isBusy = busyActionId === action.id;
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65 ${buttonVariantMap[action.variant]}`}
      disabled={Boolean(busyActionId) || Boolean(action.disabled)}
      title={action.disabled ? action.disabledReason : undefined}
      onClick={() => onClick(action)}
    >
      {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
      {isBusy ? action.loadingLabel : action.label}
    </button>
  );
}

export default function DomainTransferAdminTab({ isTechnologyOnly = false }) {
  const api = isTechnologyOnly
    ? {
        list: adminAPI.getTechnologyTransfers,
        get: adminAPI.getTechnologyTransferDetail,
        approvePayout: adminAPI.approveTechnologyPayout,
        releasePayout: adminAPI.releaseTechnologyPayout,
      }
    : domainTransferAdminAPI;
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [releaseForm, setReleaseForm] = useState({
    payoutMethodUsed: 'UPI',
    transactionReferenceNumber: '',
    notes: '',
    manualPayoutConfirmed: false,
  });
  const [additionalDetailsOpen, setAdditionalDetailsOpen] = useState(false);
  const [forceCompleteReason, setForceCompleteReason] = useState('');
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [toasts, setToasts] = useState([]);

  const payoutProfile = selected?.sellerPayoutProfile || {};
  const fullAccountNumber = getAdminAccountNumber(payoutProfile);
  const accountNumberDisplay = fullAccountNumber;
  const payoutProfileStatus = getPayoutProfileStatus(selected, fullAccountNumber);
  const releaseConfirmDisabled = Boolean(
    pendingAction?.requiresReleaseDetails &&
      (!releaseForm.manualPayoutConfirmed || !releaseForm.transactionReferenceNumber.trim()),
  );
  const selectedOrderId =
    selected?.razorpayOrderId ||
    selected?.orderId ||
    selected?.razorpay_order_id ||
    'Not recorded';

  const pushToast = (type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const copyValue = async (value, label) => {
    if (!value) {
      pushToast('error', `${label} is not configured.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(String(value));
      pushToast('success', `${label} copied.`);
    } catch {
      pushToast('error', `Unable to copy ${label}.`);
    }
  };

  const loadList = () => {
    setLoading(true);
    api
      .list()
      .then(({ data }) => setItems(data?.items || []))
      .catch((error) => {
        setItems([]);
        pushToast('error', getApiErrorMessage(error));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
  }, []);

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(id);
      setSelected(data);
    } catch (error) {
      pushToast('error', getApiErrorMessage(error));
    }
  };

  const actions = useMemo(() => {
    if (!selected) return [];

    const transferStatus = selected.transferStatus;
    const escrowStatus = selected.escrowStatus;
    const isClosed = CLOSED_TRANSFER_STATUSES.has(transferStatus);
    const transferCompleted = TRANSFER_COMPLETED_STATUSES.has(transferStatus);
    const payoutApproved = transferStatus === 'PAYOUT_APPROVED';
    const escrowHeld = escrowStatus === 'HELD';

    const availableActions = [];

    if (transferCompleted && escrowHeld && !selected.payoutApprovedAt) {
      availableActions.push({
        id: 'approvePayout',
        label: 'Approve Payout',
        loadingLabel: 'Approving...',
        variant: 'green',
        disabled: !selected.sellerPayoutProfileReady,
        disabledReason: 'Seller payout profile is incomplete.',
        title: 'Approve Payout',
        message: 'Are you sure you want to approve this payout request?',
        confirmLabel: 'Approve',
        successMessage: 'Payout approved successfully.',
        run: (id) => api.approvePayout(id),
      });
    }

    if (payoutApproved && escrowHeld && selected.payoutApprovedAt) {
      availableActions.push({
        id: 'releasePayout',
        label: 'Release Payout',
        loadingLabel: 'Releasing...',
        variant: 'blue',
        disabled: !selected.sellerPayoutProfileReady,
        disabledReason: 'Seller payout profile is incomplete.',
        title: 'Release Seller Payout',
        message: 'Are you sure you want to mark this seller payout as released?',
        confirmLabel: 'Release Payout',
        successMessage: 'Payout released successfully.',
        requiresReleaseDetails: true,
        run: (id, data) => api.releasePayout(id, data),
      });
    }

    if (!isTechnologyOnly && !isClosed && escrowHeld && selected.razorpayPaymentId) {
      const buyerPaid = selected.buyerPaidAmountInr != null ? selected.buyerPaidAmountInr : (selected.grossAmountInr || 0) * 1.18;
      const gstAmount = Math.round(buyerPaid * 1800 / 11800) / 100;
      const listingPrice = Math.round((buyerPaid - gstAmount) * 100) / 100;
      availableActions.push({
        id: 'processRefund',
        label: 'Refund',
        loadingLabel: 'Processing refund…',
        variant: 'red',
        title: 'Confirm Refund via Razorpay',
        message: '',
        confirmLabel: 'Confirm & Process Refund',
        requiresRefundConfirm: true,
        successMessage: 'Refund processed successfully.',
        run: (id) => api.processRefund(id),
        refundBuyerPaid: buyerPaid,
        refundGst: gstAmount,
        refundListingPrice: listingPrice,
        refundPaymentId: selected.razorpayPaymentId,
        refundDomain: selected.domainFqdn || selected.domain_fqdn || '—',
      });
    }
    if (!isTechnologyOnly && !isClosed && escrowHeld && selected.razorpayPaymentId) {
      availableActions.push({
        id: 'syncRefund',
        label: 'Sync Refund Status',
        loadingLabel: 'Syncing...',
        variant: 'neutral',
        title: 'Sync Refund Status from Razorpay',
        message: 'Check Razorpay for an existing refund on this payment and synchronize the status.',
        confirmLabel: 'Sync Refund Status',
        successMessage: 'Refund status synchronized.',
        run: (id) => api.syncRefund(id),
      });
    }

    // Cancel Transaction — available for any non-terminal state
    if (!isTechnologyOnly && !isClosed && !FINAL_ESCROW_STATUSES.has(escrowStatus)) {
      availableActions.push({
        id: 'cancelTransaction',
        label: 'Cancel Transaction',
        loadingLabel: 'Cancelling...',
        variant: 'red',
        title: 'Cancel Transaction',
        message: 'This will cancel the transaction and restore the listing. If a payment was made, use \"Refund\" to complete the refund through Razorpay.',
        confirmLabel: 'Cancel Transaction',
        successMessage: 'Transaction cancelled.',
        run: (id) => api.resolveAdminReview(id, { action: 'cancel' }),
      });
    }
    if (!isTechnologyOnly && !isClosed && !FINAL_ESCROW_STATUSES.has(escrowStatus) && !transferCompleted && !payoutApproved) {
      availableActions.push({
        id: 'forceComplete',
        label: 'Force Complete',
        loadingLabel: 'Completing...',
        variant: 'orange',
        title: 'Force Complete Transfer',
        message: 'This will manually mark the transfer as completed. A reason is required for the audit trail.',
        confirmLabel: 'Force Complete',
        successMessage: 'Transfer marked as completed.',
        requiresForceCompleteReason: true,
        run: (id, data) => api.forceComplete(id, data),
      });
    }

    return availableActions;
  }, [selected, isTechnologyOnly]);

  const reviewActions = useMemo(() => {
    if (isTechnologyOnly || selected?.transferStatus !== 'ADMIN_REVIEW_REQUIRED') return [];
    return [
      {
        id: 'extendReview',
        label: 'Extend 36h',
        loadingLabel: 'Extending...',
        variant: 'neutral',
        successMessage: 'Seller deadline extended by 36 hours.',
        run: (id) =>
          api.resolveAdminReview(id, {
            action: 'extend_deadline',
            extensionHours: 36,
          }),
      },
    ];
  }, [selected, isTechnologyOnly]);

  const runAction = async (action) => {
    if (!selected?.id || busyActionId) return;
    let payload;
    if (action.requiresRefundConfirm) {
      if (!refundConfirmed) {
        pushToast('error', 'Please confirm you want to proceed with this refund.');
        return;
      }
    }
    if (action.requiresReleaseDetails) {
      payload = releaseForm;
      if (!releaseForm.transactionReferenceNumber.trim()) {
        pushToast('error', 'Transaction reference number is required.');
        return;
      }
      if (!releaseForm.payoutMethodUsed) {
        pushToast('error', 'Payout method is required.');
        return;
      }
      if (!releaseForm.manualPayoutConfirmed) {
        pushToast('error', 'Please confirm the payout has been manually sent.');
        return;
      }
    }
    if (action.requiresForceCompleteReason) {
      if (!forceCompleteReason.trim()) {
        pushToast('error', 'A reason is required to force-complete.');
        return;
      }
      payload = { reason: forceCompleteReason.trim() };
    }
    setBusyActionId(action.id);
    try {
      const result = await action.run(selected.id, payload);
      let msg = action.successMessage || 'Action completed successfully.';
      // Handle sync-refund response
      if (result?.refundFound === false) {
        msg = result.message || 'No refund found on Razorpay.';
        pushToast('info', msg);
        await openDetail(selected.id);
        setPendingAction(null);
        setRefundConfirmed(false);
        return;
      }
      // Handle sync-refund success (real Razorpay refund ID found)
      if (result?.refundFound === true && result?.refundId) {
        msg = `Refund confirmed by Razorpay.\n\nRefund ID: ${result.refundId}\nRefund Amount: ${formatInr(result.refundAmountInr)}\nPayment ID: ${result.paymentId || selected?.razorpayPaymentId || '—'}`;
      } else if (result?.refundId) {
        // Handle process-refund success (real Razorpay refund ID returned)
        msg = `Refund processed successfully via Razorpay.\n\nRefund ID: ${result.refundId}\nRefund Amount: ${formatInr(result.refundAmountInr)}`;
      } else if (result?.refundAmountInr) {
        msg = `Refund of ${formatInr(result.refundAmountInr)} synchronized from Razorpay.`;
      }
      pushToast('success', msg);
      await openDetail(selected.id);
      loadList();
      setPendingAction(null);
      setRefundConfirmed(false);
      setAdditionalDetailsOpen(false);
      setForceCompleteReason('');
      if (action.requiresReleaseDetails) {
        setReleaseForm({
          payoutMethodUsed: 'UPI',
          transactionReferenceNumber: '',
          notes: '',
          manualPayoutConfirmed: false,
        });
      }
    } catch (error) {
      pushToast('error', getApiErrorMessage(error));
    } finally {
      setBusyActionId(null);
    }
  };

  const syncWhois = async () => {
    if (isTechnologyOnly || !selected?.id || busyActionId) return;
    setBusyActionId('syncWhois');
    try {
      await api.syncWhois(selected.id);
      pushToast('success', 'WHOIS sync completed successfully.');
      await openDetail(selected.id);
      loadList();
    } catch (error) {
      pushToast('error', getApiErrorMessage(error));
    } finally {
      setBusyActionId(null);
    }
  };

  const sendPayoutReminder = async () => {
    if (!selected?.id || busyActionId) return;
    setBusyActionId('payoutReminder');
    try {
      await api.sendPayoutProfileReminder(selected.id);
      pushToast('success', 'Reminder sent successfully.');
      await openDetail(selected.id);
      loadList();
    } catch (error) {
      pushToast('error', getApiErrorMessage(error) || 'Unable to send reminder.');
    } finally {
      setBusyActionId(null);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading transfers...</p>;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="p-3">{isTechnologyOnly ? 'Technology' : 'Domain'}</th>
                  <th className="p-3">Transfer</th>
                  <th className="p-3">Escrow</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={4}>
                      {isTechnologyOnly ? 'No technology transfers found.' : 'No domain transfers found.'}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className={`border-t ${selected?.id === row.id ? 'bg-indigo-50/50' : 'bg-white'}`}>
                      <td className="p-3 font-medium text-gray-950">{row.domainFqdn}</td>
                      <td className="p-3"><StatusChip value={row.transferStatus} /></td>
                      <td className="p-3"><StatusChip value={row.escrowStatus} /></td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          className="rounded-md px-2 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
                          onClick={() => openDetail(row.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="min-h-[260px] rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {!selected ? (
            <p className="text-sm text-gray-500">Select a transfer</p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-gray-950">{selected.domainFqdn}</h3>
                    <p className="mt-1 text-xs text-gray-500">Transaction ID: {selected.id}</p>
                  </div>
                  {!isTechnologyOnly && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-65"
                      disabled={Boolean(busyActionId)}
                      onClick={syncWhois}
                    >
                      {busyActionId === 'syncWhois' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {busyActionId === 'syncWhois' ? 'Syncing...' : 'Sync WHOIS'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Escrow</p>
                  <div className="mt-2"><StatusChip value={selected.escrowStatus} /></div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Transfer</p>
                  <div className="mt-2"><StatusChip value={selected.transferStatus} /></div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Buyer Paid (incl. GST)</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.buyerPaidAmountInr != null ? selected.buyerPaidAmountInr : (selected.grossAmountInr || 0) * 1.18)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Listing Price (pre-GST)</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.grossAmountInr)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">GST (18%)</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.gstAmountInr != null ? selected.gstAmountInr : (selected.grossAmountInr || 0) * 0.18)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Platform Commission</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.platformFeeInr)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Seller Receives</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.sellerPayoutInr)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Payout Approval</p>
                  <p className="mt-2 text-sm font-medium text-gray-800">{formatDateTime(selected.payoutApprovedAt)}</p>
                </div>
              </div>

              {selected.escrowStatus === 'REFUNDED' && (
                <section className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-red-900">
                    Refund Details
                  </h4>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Refund Amount</dt>
                      <dd className="mt-1 text-lg font-bold text-red-800">
                        {formatInr(selected.buyerPaidAmountInr != null ? selected.buyerPaidAmountInr : (selected.grossAmountInr || 0) * 1.18)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Refund ID</dt>
                      <dd className="mt-1 text-sm font-medium text-red-800 break-all">
                        {selected.razorpayRefundId || 'Not recorded'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Refund Date</dt>
                      <dd className="mt-1 text-sm font-medium text-red-800">
                        {formatDateTime(selected.refundCompletedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Payment ID</dt>
                      <dd className="mt-1 text-sm font-medium text-red-800 break-all">
                        {selected.razorpayPaymentId || 'Not recorded'}
                      </dd>
                    </div>
                  </dl>
                </section>
              )}

              {selected.escrowStatus === 'REFUNDED' && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-800">
                    Payout Status: Not eligible — Transaction refunded
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    No seller payout can be approved or released for a refunded transaction.
                  </p>
                </div>
              )}

              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                    Seller Payout Snapshot
                  </h4>
                  {selected.sellerPayoutSnapshot ? (
                    <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Snapshot Captured
                    </span>
                  ) : (
                    <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      Snapshot Unavailable
                    </span>
                  )}
                </div>
                {selected.sellerPayoutSnapshot ? (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Preferred Method</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {formatPayoutMethod(selected.sellerPayoutSnapshot.preferredMethod)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">UPI ID</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900 break-all">
                        {selected.sellerPayoutSnapshot.upiId || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Account Holder Name</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {selected.sellerPayoutSnapshot.accountHolderName || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Bank Name</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {selected.sellerPayoutSnapshot.bankName || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Account Number (Last 4)</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {selected.sellerPayoutSnapshot.accountNumberLast4
                          ? `XXXXXX${selected.sellerPayoutSnapshot.accountNumberLast4}`
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">IFSC Code</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {selected.sellerPayoutSnapshot.ifscCode || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Snapshot Captured</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {formatDateTime(selected.sellerPayoutSnapshot.snapshotCreatedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Source</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {selected.sellerPayoutSnapshot.snapshotSource || 'Unknown'}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-gray-500">
                      No seller payout details were captured for this transaction.
                    </p>
                    {selected.sellerPayoutProfile && !selected.sellerPayoutProfileMissing && (
                      <p className="mt-1 text-xs text-gray-400">
                        The seller currently has a payout profile configured, but it was not snapshotted at transaction time.
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                    Seller Payout Details
                    {selected.escrowStatus === 'REFUNDED' && (
                      <span className="ml-2 text-xs font-normal text-gray-500">(for reference)</span>
                    )}
                  </h4>
                  <span
                    className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      selected.escrowStatus === 'REFUNDED'
                        ? 'border-gray-200 bg-gray-50 text-gray-600'
                        : selected.sellerPayoutProfileReady
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {selected.escrowStatus === 'REFUNDED'
                      ? 'N/A — Refunded'
                      : selected.sellerPayoutProfileReady ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Preferred Method</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {formatPayoutMethod(selected.sellerPayoutProfile?.payoutMethod)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">UPI ID</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
                      <span className="min-w-0 break-all">
                        {selected.sellerPayoutProfile?.upiId || 'Not configured'}
                      </span>
                      {selected.sellerPayoutProfile?.upiId && (
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => copyValue(selected.sellerPayoutProfile.upiId, 'UPI ID')}
                        >
                          Copy UPI ID
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Account Holder Name</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {selected.sellerPayoutProfile?.accountHolderName || 'Not configured'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Bank Name</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {selected.sellerPayoutProfile?.bankName || 'Not configured'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Account Number</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                      <span className="min-w-0 break-all">
                        {accountNumberDisplay || 'Account number not yet provided'}
                      </span>
                      {fullAccountNumber && (
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => copyValue(fullAccountNumber, 'Account Number')}
                        >
                          Copy Account Number
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">IFSC Code</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
                      <span className="min-w-0 break-all">
                        {selected.sellerPayoutProfile?.bankIfsc || 'Not configured'}
                      </span>
                      {selected.sellerPayoutProfile?.bankIfsc && (
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => copyValue(selected.sellerPayoutProfile.bankIfsc, 'IFSC')}
                        >
                          Copy IFSC
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {formatDateTime(selected.sellerPayoutProfile?.updatedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Last Reminder</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {formatDateTime(selected.lastPayoutReminderSentAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-gray-500">Reminder Count</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {selected.payoutReminderCount || 0}
                    </dd>
                  </div>
                </dl>
              </section>

              {TRANSFER_COMPLETED_STATUSES.has(selected.transferStatus) || selected.transferStatus === 'PAYOUT_APPROVED' ? (
                !selected.sellerPayoutProfileReady && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-900">
                      {selected.sellerPayoutProfileMissing
                        ? 'Seller payout details are missing.'
                        : 'Cannot approve payout. Seller payout profile is incomplete.'}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      The domain transfer can continue. However, payout cannot be released until payout details are added.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.seller?.id && (
                        <Link
                          className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                          to={`/admin?tab=domain-transfers&sellerId=${selected.seller.id}`}
                        >
                          View Seller Profile
                        </Link>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-65"
                        disabled={Boolean(busyActionId)}
                        onClick={sendPayoutReminder}
                      >
                        {busyActionId === 'payoutReminder' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {busyActionId === 'payoutReminder' ? 'Sending...' : 'Send Reminder'}
                      </button>
                    </div>
                  </div>
                )
              ) : null}

              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <AdminActionButton
                    key={action.id}
                    action={action}
                    busyActionId={busyActionId}
                    onClick={setPendingAction}
                  />
                ))}
                {reviewActions.map((action) =>
                  action.title ? (
                    <AdminActionButton
                      key={action.id}
                      action={action}
                      busyActionId={busyActionId}
                      onClick={setPendingAction}
                    />
                  ) : (
                    <AdminActionButton
                      key={action.id}
                      action={action}
                      busyActionId={busyActionId}
                      onClick={runAction}
                    />
                  ),
                )}
                {actions.length === 0 && reviewActions.length === 0 && (
                  <p className="text-sm text-gray-500">No critical admin actions are available for this status.</p>
                )}
              </div>

              <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                  {selected.escrowStatus === 'REFUNDED' ? 'Refund & Payout History' : 'Payout History'}
                </h4>

                {selected.escrowStatus === 'REFUNDED' && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-800">
                        Transaction Refunded
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-red-600">Refund Amount</dt>
                        <dd className="text-sm font-bold text-red-800">
                          {formatInr(selected.buyerPaidAmountInr != null ? selected.buyerPaidAmountInr : (selected.grossAmountInr || 0) * 1.18)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-red-600">Refund ID</dt>
                        <dd className="text-sm font-medium text-red-800 break-all">
                          {selected.razorpayRefundId || 'Not recorded'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-red-600">Refund Date</dt>
                        <dd className="text-sm font-medium text-red-800">
                          {formatDateTime(selected.refundCompletedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-red-600">Payment ID</dt>
                        <dd className="text-sm font-medium text-red-800 break-all">
                          {selected.razorpayPaymentId || 'Not recorded'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {selected.payoutHistory?.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="py-2 pr-3">Release Date</th>
                          <th className="py-2 pr-3">Method</th>
                          <th className="py-2 pr-3">Reference</th>
                          <th className="py-2 pr-3">Released By</th>
                          <th className="py-2 pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.payoutHistory.map((row) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="py-2 pr-3 text-gray-700">{formatDateTime(row.releaseDate)}</td>
                            <td className="py-2 pr-3 font-medium text-gray-900">
                              {formatManualPayoutMethod(row.method)}
                            </td>
                            <td className="py-2 pr-3 text-gray-700">{row.referenceNumber || 'Not recorded'}</td>
                            <td className="py-2 pr-3 text-gray-700">{row.releasedBy || 'Admin'}</td>
                            <td className="py-2 pr-3">
                              <StatusChip value={row.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : selected.escrowStatus === 'REFUNDED' ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No payout was released because the transaction was refunded.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No payout release has been recorded yet.</p>
                )}
              </section>

              <section>
                <h4 className="text-sm font-semibold text-gray-950">Audit log</h4>
                {selected.timeline?.length > 0 ? (
                  <ol className="mt-3 max-h-72 space-y-0 overflow-auto pr-1">
                    {selected.timeline.map((event, index) => (
                      <li key={event.id || `${event.eventType}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                        {index !== selected.timeline.length - 1 && (
                          <span className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-gray-200" aria-hidden />
                        )}
                        <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-white">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{formatStatus(event.eventType)}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(event.createdAt)}</p>
                          {event.actorRole && (
                            <p className="mt-1 text-xs text-gray-400">Actor: {event.actorRole}</p>
                          )}
                          {event.payload?.recipient && (
                            <p className="mt-1 text-xs text-gray-400">Recipient: {event.payload.recipient}</p>
                          )}
                          {event.payload?.reminderCount && (
                            <p className="mt-1 text-xs text-gray-400">
                              Reminder Count: {event.payload.reminderCount}
                            </p>
                          )}
                          {event.payload?.methodUsed && (
                            <p className="mt-1 text-xs text-gray-400">
                              Method: {formatManualPayoutMethod(event.payload.methodUsed)}
                            </p>
                          )}
                          {event.payload?.referenceNumber && (
                            <p className="mt-1 text-xs text-gray-400">
                              Reference: {event.payload.referenceNumber}
                            </p>
                          )}

                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No audit events recorded yet.</p>
                )}
              </section>
            </div>
          )}
        </aside>
      </div>

      <ConfirmationModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title}
        message={pendingAction?.message}
        confirmLabel={pendingAction?.confirmLabel}
        variant={pendingAction?.variant}
        loading={pendingAction ? busyActionId === pendingAction.id : false}
        loadingLabel={pendingAction?.loadingLabel}
        size={pendingAction?.requiresReleaseDetails ? 'xl' : (pendingAction?.requiresForceCompleteReason || pendingAction?.requiresRefundConfirm) ? 'lg' : 'md'}
        confirmDisabled={releaseConfirmDisabled || (pendingAction?.requiresRefundConfirm && !refundConfirmed)}
        bodyClassName={pendingAction?.requiresReleaseDetails ? 'bg-slate-50 pb-6' : ''}
        footerClassName={
          pendingAction?.requiresReleaseDetails
            ? 'shadow-[0_-10px_30px_rgba(15,23,42,0.08)]'
            : ''
        }
        onCancel={() => {
          if (!busyActionId) {
            setPendingAction(null);
            setRefundConfirmed(false);
            setAdditionalDetailsOpen(false);
          }
        }}
        onConfirm={() => pendingAction && runAction(pendingAction)}
      >
        {pendingAction?.requiresForceCompleteReason && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Please provide a reason for forcing this transfer to complete. This will be recorded in the audit trail.
            </p>
            <div>
              <label htmlFor="force-complete-reason" className="text-sm font-bold text-gray-950">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="force-complete-reason"
                required
                rows={3}
                value={forceCompleteReason}
                onChange={(e) => setForceCompleteReason(e.target.value)}
                placeholder="e.g. Transfer verified via external registrar confirmation"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>
        )}
        {pendingAction?.requiresRefundConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will refund the full buyer-paid amount through the Razorpay Refund API. The refund will be processed immediately and cannot be reversed.
            </p>
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
              <h4 className="text-sm font-bold text-red-800 mb-3">Refund Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Domain</span>
                  <p className="font-semibold text-gray-900">{pendingAction.refundDomain}</p>
                </div>
                <div>
                  <span className="text-gray-500">Payment ID</span>
                  <p className="font-mono text-xs text-gray-900 break-all">{pendingAction.refundPaymentId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Listing Price (pre-GST)</span>
                  <p className="font-semibold text-gray-900">{formatInr(pendingAction.refundListingPrice)}</p>
                </div>
                <div>
                  <span className="text-gray-500">GST (18%)</span>
                  <p className="font-semibold text-gray-900">{formatInr(pendingAction.refundGst)}</p>
                </div>
                <div className="col-span-2 border-t border-red-200 pt-3">
                  <span className="text-gray-500">Full Refund Amount (incl. GST)</span>
                  <p className="text-lg font-bold text-red-700">{formatInr(pendingAction.refundBuyerPaid)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <input
                id="refund-confirm"
                type="checkbox"
                checked={refundConfirmed}
                onChange={(e) => setRefundConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="refund-confirm" className="text-sm text-amber-800 leading-5">
                I confirm this refund is correct. The full amount of <strong>{formatInr(pendingAction.refundBuyerPaid)}</strong> will be refunded to the buyer. This action cannot be undone.
              </label>
            </div>
          </div>
        )}
        {pendingAction?.requiresReleaseDetails && (
          <div className="space-y-5">
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                payoutStatusClassMap[payoutProfileStatus.tone]
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  payoutStatusIconClassMap[payoutProfileStatus.tone]
                }`}
              >
                {payoutProfileStatus.tone === 'green' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 truncate">{payoutProfileStatus.label}</span>
            </div>              <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Seller Receives</p>
                    <p className="mt-1 truncate text-lg font-bold text-gray-950">
                      {formatInr(selected?.sellerPayoutInr)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-blue-700">Buyer Paid (incl. GST)</p>
                    <p className="mt-1 truncate text-lg font-bold text-gray-950">
                      {formatInr(selected?.buyerPaidAmountInr != null ? selected.buyerPaidAmountInr : (selected?.grossAmountInr || 0) * 1.18)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                    <ReceiptText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-orange-700">Commission</p>
                    <p className="mt-1 truncate text-lg font-bold text-gray-950">
                      {formatInr(selected?.platformFeeInr)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Landmark className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-950">
                  Seller Bank Details
                </h3>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-gray-500">Account Holder</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-gray-950">
                    {selected?.sellerPayoutProfile?.accountHolderName || 'Not configured'}
                  </dd>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-gray-500">Bank</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-gray-950">
                    {selected?.sellerPayoutProfile?.bankName || 'Not configured'}
                  </dd>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-gray-500">Account Number</dt>
                  <dd className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-all text-sm font-semibold text-gray-950">
                      {accountNumberDisplay || 'Account number not yet provided'}
                    </span>
                    {fullAccountNumber && (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => copyValue(fullAccountNumber, 'Account Number')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Account Number
                      </button>
                    )}
                  </dd>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-gray-500">IFSC</dt>
                  <dd className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-all text-sm font-semibold text-gray-950">
                      {selected?.sellerPayoutProfile?.bankIfsc || 'Not configured'}
                    </span>
                    {selected?.sellerPayoutProfile?.bankIfsc && (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => copyValue(selected.sellerPayoutProfile.bankIfsc, 'IFSC')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy IFSC
                      </button>
                    )}
                  </dd>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-gray-500">Method</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-gray-950">
                    {formatPayoutMethod(selected?.sellerPayoutProfile?.payoutMethod)}
                  </dd>
                </div>
                <div className="min-w-0 rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-gray-500">UPI</dt>
                  <dd className="mt-1 break-all text-sm font-semibold text-gray-950">
                    {selected?.sellerPayoutProfile?.upiId || 'Not configured'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div>
                  <p className="text-sm font-bold text-gray-950">Payout Method Used</p>
                  <div className="mt-3 inline-grid w-full grid-cols-2 rounded-xl bg-gray-100 p-1">
                    {[
                      ['UPI', 'UPI'],
                      ['BANK_TRANSFER', 'Bank Transfer'],
                    ].map(([value, label]) => (
                      <label
                        key={value}
                        className={`cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                          releaseForm.payoutMethodUsed === value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name="payoutMethodUsed"
                          value={value}
                          checked={releaseForm.payoutMethodUsed === value}
                          onChange={() =>
                            setReleaseForm((current) => ({ ...current, payoutMethodUsed: value }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="payout-reference-number"
                      className="text-sm font-bold text-gray-950"
                    >
                      UTR / Transaction Reference
                    </label>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!releaseForm.transactionReferenceNumber.trim()}
                      onClick={() => copyValue(releaseForm.transactionReferenceNumber, 'UTR')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy UTR
                    </button>
                  </div>
                  <input
                    id="payout-reference-number"
                    required
                    value={releaseForm.transactionReferenceNumber}
                    onChange={(event) =>
                      setReleaseForm((current) => ({
                        ...current,
                        transactionReferenceNumber: event.target.value,
                      }))
                    }
                    placeholder="Enter UTR / Bank Reference Number"
                    className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="payout-notes" className="text-sm font-bold text-gray-950">
                  Notes <span className="font-normal text-gray-500">(Optional)</span>
                </label>
                <textarea
                  id="payout-notes"
                  value={releaseForm.notes}
                  onChange={(event) =>
                    setReleaseForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={5}
                  placeholder="Add internal notes for audit trail"
                  className="mt-3 min-h-32 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </section>

            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    Confirm that the seller payout has already been manually transferred.
                  </p>
                  <label className="mt-4 flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500"
                      checked={releaseForm.manualPayoutConfirmed}
                      onChange={(event) =>
                        setReleaseForm((current) => ({
                          ...current,
                          manualPayoutConfirmed: event.target.checked,
                        }))
                      }
                    />
                    <span className="font-semibold">
                      I confirm the payout has been manually sent.
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
                onClick={() => setAdditionalDetailsOpen((current) => !current)}
              >
                <span className="text-sm font-bold text-gray-950">Additional Details</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gray-500 transition ${
                    additionalDetailsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {additionalDetailsOpen && (
                <dl className="grid gap-4 border-t border-gray-100 px-6 py-5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase text-gray-500">Last Updated</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-gray-950">
                      {formatDateTime(selected?.sellerPayoutProfile?.updatedAt)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase text-gray-500">
                      Payout Profile Completion
                    </dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-gray-950">
                      {selected?.sellerPayoutProfileReady ? 'Complete' : 'Incomplete'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase text-gray-500">Seller ID</dt>
                    <dd className="mt-1 break-all text-sm font-semibold text-gray-950">
                      {selected?.seller?.id || 'Not recorded'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase text-gray-500">Order ID</dt>
                    <dd className="mt-1 break-all text-sm font-semibold text-gray-950">
                      {selectedOrderId}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase text-gray-500">Transaction ID</dt>
                    <dd className="mt-1 break-all text-sm font-semibold text-gray-950">
                      {selected?.id || 'Not recorded'}
                    </dd>
                  </div>
                </dl>
              )}
            </section>
          </div>
        )}
      </ConfirmationModal>
    </>
  );
}
