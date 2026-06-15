import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  Phone,
  User,
  XCircle,
} from 'lucide-react';
import { ventureDealAPI } from '../api/services';
import ConfirmationModal, { buttonVariantMap } from '../components/common/ConfirmationModal';

const CLOSED_DEAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REFUNDED']);

const dealStatusLabels = {
  PENDING_ADMIN_APPROVAL: 'Awaiting Admin Approval',
  PENDING_PAYMENT: 'Pending Payment',
  PAYMENT_HELD: 'Payment Held',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  HELD: 'Held',
  RELEASED: 'Released',
  VENTURE_SALE: 'Venture Sale',
  CO_VENTURE: 'Co-Venture',
};

const statusToneMap = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
};

function getApiErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.detail ||
    error?.message ||
    'Action failed.'
  );
}

function formatStatus(value) {
  return dealStatusLabels[value] || (value ? String(value).replaceAll('_', ' ') : 'Not available');
}

function statusTone(value) {
  const status = String(value || '').toUpperCase();
  if (['COMPLETED', 'RELEASED', 'IN_PROGRESS'].includes(status)) return 'green';
  if (['PENDING_ADMIN_APPROVAL', 'PENDING_PAYMENT', 'PAYMENT_HELD', 'HELD'].includes(status)) return 'yellow';
  if (['REFUNDED', 'CANCELLED'].includes(status)) return 'red';
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

function getAdminAccountNumber(payoutProfile = {}) {
  return String(payoutProfile.account_number || payoutProfile.accountNumber || '').trim();
}

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
            toast.type === 'error' ? 'border-red-200 text-red-800' : 'border-emerald-200 text-emerald-800'
          }`}
          role="status"
        >
          {toast.type === 'error' ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
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

function ContactCard({ title, person, email, phone }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <div className="mt-2 space-y-1.5 text-sm text-gray-900">
        {person && (
          <p className="flex items-center gap-2 font-medium">
            <User className="h-4 w-4 shrink-0 text-gray-500" />
            {person}
          </p>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700">
            <Mail className="h-4 w-4 shrink-0" />
            {email}
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-2 text-gray-700">
            <Phone className="h-4 w-4 shrink-0 text-gray-500" />
            {phone}
          </a>
        )}
      </div>
    </div>
  );
}

export default function VentureDealsAdminTab() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toasts, setToasts] = useState([]);

  const payoutProfile = selected?.sellerPayoutProfile || {};
  const fullAccountNumber = getAdminAccountNumber(payoutProfile);
  const isCoVenture = selected?.dealKind === 'CO_VENTURE';
  const brandName = selected?.venture?.brandName || (isCoVenture ? 'Co-Venture Deal' : 'Venture Deal');

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
    ventureDealAPI
      .adminGetAll()
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
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
      const { data } = await ventureDealAPI.get(id);
      setSelected(data);
    } catch (error) {
      pushToast('error', getApiErrorMessage(error));
    }
  };

  const actions = useMemo(() => {
    if (!selected) return [];

    const dealStatus = selected.dealStatus;
    const isClosed = CLOSED_DEAL_STATUSES.has(dealStatus);
    const hasPayment = Boolean(selected.razorpayPaymentId);
    const payoutBlocked =
      dealStatus === 'PAYMENT_HELD'
      && Number(selected.sellerPayoutInr) > 0
      && !selected.sellerPayoutProfileReady;

    const availableActions = [];

    if (dealStatus === 'PENDING_ADMIN_APPROVAL') {
      availableActions.push({
        id: 'approve',
        label: 'Approve Deal',
        loadingLabel: 'Approving...',
        variant: 'green',
        title: 'Approve Deal',
        message: 'Approve this deal so the buyer can proceed to payment.',
        confirmLabel: 'Approve',
        successMessage: 'Deal approved.',
        run: (id) => ventureDealAPI.adminApproveDeal(id),
      });
      availableActions.push({
        id: 'reject',
        label: 'Reject Deal',
        loadingLabel: 'Rejecting...',
        variant: 'red',
        title: 'Reject Deal',
        message: 'Reject this deal and reopen the venture listing.',
        confirmLabel: 'Reject',
        successMessage: 'Deal rejected.',
        requiresRejectReason: true,
        run: (id, reason) => ventureDealAPI.adminRejectDeal(id, reason),
      });
    }

    if (dealStatus === 'PAYMENT_HELD' && !isClosed) {
      availableActions.push({
        id: 'releaseEscrow',
        label: 'Pay Seller & Complete',
        loadingLabel: 'Releasing...',
        variant: 'green',
        disabled: payoutBlocked,
        disabledReason: 'Seller payout profile is incomplete.',
        title: 'Release Escrow',
        message: 'Release escrow to the seller and mark this deal as completed.',
        confirmLabel: 'Release Escrow',
        successMessage: 'Escrow released and deal completed.',
        run: (id) => ventureDealAPI.adminReleaseEscrow(id),
      });
    }

    if (dealStatus === 'PAYMENT_HELD' && hasPayment && !isClosed) {
      availableActions.push({
        id: 'refund',
        label: 'Refund',
        loadingLabel: 'Refunding...',
        variant: 'red',
        title: 'Confirm Refund',
        message: 'Refund the buyer and cancel this deal. This action may not be reversible.',
        confirmLabel: 'Confirm Refund',
        successMessage: 'Refund completed successfully.',
        run: (id) => ventureDealAPI.adminRefund(id),
      });
    }

    return availableActions;
  }, [selected]);

  const runAction = async (action) => {
    if (!selected?.id || busyActionId) return;
    if (action.requiresRejectReason && !rejectReason.trim()) {
      pushToast('error', 'Please provide a rejection reason.');
      return;
    }
    setBusyActionId(action.id);
    try {
      await action.run(selected.id, action.requiresRejectReason ? rejectReason.trim() : undefined);
      pushToast('success', action.successMessage || 'Action completed successfully.');
      await openDetail(selected.id);
      loadList();
      setPendingAction(null);
      setRejectReason('');
    } catch (error) {
      pushToast('error', getApiErrorMessage(error));
    } finally {
      setBusyActionId(null);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading venture deals...</p>;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="p-3">Venture</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Deal</th>
                  <th className="p-3">Escrow</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="p-4 text-gray-500" colSpan={5}>No venture deals found.</td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t ${selected?.id === row.id ? 'bg-indigo-50/50' : 'bg-white'}`}
                    >
                      <td className="p-3 font-medium text-gray-950">
                        {row.venture?.brandName || (row.dealKind === 'CO_VENTURE' ? 'Co-Venture' : 'Venture')}
                      </td>
                      <td className="p-3">
                        <StatusChip value={row.dealKind} />
                      </td>
                      <td className="p-3"><StatusChip value={row.dealStatus} /></td>
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
            <p className="text-sm text-gray-500">Select a deal</p>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="truncate text-lg font-bold text-gray-950">{brandName}</h3>
                <p className="mt-1 text-xs text-gray-500">Deal ID: {selected.id}</p>
                <p className="mt-1 text-xs text-gray-500">Created: {formatDateTime(selected.createdAt)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Deal Status</p>
                  <div className="mt-2"><StatusChip value={selected.dealStatus} /></div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Escrow</p>
                  <div className="mt-2"><StatusChip value={selected.escrowStatus} /></div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Buyer Paid</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.grossAmountInr)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Commission</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.platformFeeInr)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Seller Receives</p>
                  <p className="mt-2 text-lg font-bold text-gray-950">{formatInr(selected.sellerPayoutInr)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Completed</p>
                  <p className="mt-2 text-sm font-medium text-gray-800">{formatDateTime(selected.completedAt)}</p>
                </div>
              </div>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Parties</h4>
                <ContactCard
                  title={isCoVenture ? 'Partner (Buyer)' : 'Buyer'}
                  person={selected.buyer?.name}
                  email={selected.buyer?.email}
                  phone={selected.buyer?.phoneNumber}
                />
                <ContactCard
                  title="Founder (Seller)"
                  person={selected.seller?.name}
                  email={selected.seller?.email}
                  phone={selected.seller?.phoneNumber}
                />
              </section>

              {Number(selected.sellerPayoutInr) > 0 && (
                <section className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                      Seller Payout Details
                    </h4>
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        selected.sellerPayoutProfileReady
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {selected.sellerPayoutProfileReady ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Preferred Method</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {formatPayoutMethod(payoutProfile.payoutMethod)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">UPI ID</dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span className="min-w-0 break-all">{payoutProfile.upiId || 'Not configured'}</span>
                        {payoutProfile.upiId && (
                          <button
                            type="button"
                            className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            onClick={() => copyValue(payoutProfile.upiId, 'UPI ID')}
                          >
                            Copy
                          </button>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Account Holder</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {payoutProfile.accountHolderName || 'Not configured'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Bank Name</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {payoutProfile.bankName || 'Not configured'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">Account Number</dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                        <span className="min-w-0 break-all">
                          {fullAccountNumber || payoutProfile.accountNumber || 'Account number not yet provided'}
                        </span>
                        {fullAccountNumber && (
                          <button
                            type="button"
                            className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            onClick={() => copyValue(fullAccountNumber, 'Account Number')}
                          >
                            Copy
                          </button>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-gray-500">IFSC Code</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">
                        {payoutProfile.bankIfsc || 'Not configured'}
                      </dd>
                    </div>
                  </dl>
                </section>
              )}

              {selected.timeline?.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Timeline</h4>
                  <ul className="mt-3 space-y-2">
                    {selected.timeline.map((event, index) => (
                      <li key={`${event.eventType}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                        <p className="font-medium text-gray-900">{event.label}</p>
                        {event.message && <p className="text-gray-600">{event.message}</p>}
                        <p className="text-xs text-gray-500">{formatDateTime(event.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <AdminActionButton
                    key={action.id}
                    action={action}
                    busyActionId={busyActionId}
                    onClick={(item) => {
                      if (item.title) {
                        setPendingAction(item);
                      } else {
                        runAction(item);
                      }
                    }}
                  />
                ))}
              </div>
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
        confirmDisabled={pendingAction?.requiresRejectReason && !rejectReason.trim()}
        onCancel={() => {
          setPendingAction(null);
          setRejectReason('');
        }}
        onConfirm={() => runAction(pendingAction)}
      >
        {pendingAction?.requiresRejectReason && (
          <textarea
            className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm"
            rows={3}
            placeholder="Rejection reason (required)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        )}
      </ConfirmationModal>
    </>
  );
}
