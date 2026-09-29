import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Undo2,
  X,
} from 'lucide-react';
import { deltapreneurAdminAPI } from '../../api/services';
import { formatInr } from '../../utils/money';
import AppOverlay from '../common/AppOverlay';

const STATUS_BADGES = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-800 ring-amber-200',
  APPROVED: 'bg-blue-100 text-blue-800 ring-blue-200',
  REJECTED: 'bg-red-100 text-red-800 ring-red-200',
  ONBOARDED: 'bg-green-100 text-green-800 ring-green-200',
  INVITATION_ACTIVE: 'bg-blue-100 text-blue-800 ring-blue-200',
  INVITATION_EXPIRED: 'bg-gray-100 text-gray-700 ring-gray-200',
  INVITATION_USED: 'bg-green-100 text-green-800 ring-green-200',
};

const STATUS_LABELS = {
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ONBOARDED: 'Onboarded',
  INVITATION_ACTIVE: 'Invitation Active',
  INVITATION_EXPIRED: 'Invitation Expired',
  INVITATION_USED: 'Onboarded',
};

function StatusBadge({ status }) {
  const key = STATUS_BADGES[status] ? status : 'PENDING_REVIEW';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_BADGES[key]}`}>
      {STATUS_LABELS[key] || status}
    </span>
  );
}

function buildEmailContent(applicant, link) {
  return [
    'Subject: Your Deltapreneur Application Has Been Approved',
    '',
    `Hi ${applicant.fullName},`,
    '',
    'Your application to become a Deltapreneur has been approved.',
    '',
    'Please use the private invitation link below to connect your LinkedIn account and create your Deltapreneur profile:',
    '',
    link,
    '',
    'This private invitation link is valid for 7 days and can only be used once.',
    '',
    'Regards,',
    'Deltapreneur Team',
  ].join('\n');
}

/** Shared modal shell — portals above the AppLayout navbar/footer/WhatsApp. */
function AdminModal({ eyebrow, eyebrowIcon: EyebrowIcon, title, onClose, children }) {
  return (
    <AppOverlay>
      <div
        className="dp-fade-in fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="dp-scale-in dp-gate-card relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl ring-1 ring-slate-900/5">
          <div className="dp-gate-halo pointer-events-none absolute inset-x-0 top-0 h-24 opacity-50" aria-hidden="true" />
          <div className="relative p-7 sm:p-8">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-700 ring-1 ring-red-200/80">
                <EyebrowIcon size={12} className="text-red-500" />
                {eyebrow}
              </span>
            </div>

            <h3 className="mt-4 font-display text-[22px] font-bold leading-tight text-slate-900">{title}</h3>
            {children}
          </div>
        </div>
      </div>
    </AppOverlay>
  );
}

export default function DeltapreneurApplicationsAdminTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // Row-level busy: { id, label } — drives the per-row spinner + busy label.
  const [busy, setBusy] = useState(null);
  // Modal submit in flight (revoke / reject confirm buttons).
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);
  // No default: admin must explicitly pick Discard or Keep (null = unchosen).
  const [revokeDiscardLink, setRevokeDiscardLink] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const notify = useCallback((type, msg) => {
    setNotice({ type, msg });
    window.setTimeout(() => setNotice((n) => (n && n.msg === msg ? null : n)), 4500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await deltapreneurAdminAPI.listApplications(statusFilter || undefined);
      const items = data?.data || data?.items || data || [];
      setRows(Array.isArray(items) ? items : []);
    } catch (err) {
      notify('error', err.response?.data?.error || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [notify, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Esc closes whichever admin modal is open.
  useEffect(() => {
    if (!rejectTarget && !revokeTarget) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (!submitting) {
        setRejectTarget(null);
        setRevokeTarget(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rejectTarget, revokeTarget, submitting]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.fullName, r.email, r.companyName].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const failMsg = (err) =>
    err.response?.data?.detail || err.response?.data?.error || 'Action failed.';

  /** Inline row action with spinner + busy label, then refresh. */
  const runRowAction = async (row, busyLabel, fn, okMsg) => {
    setBusy({ id: row.id, label: busyLabel });
    try {
      await fn();
      notify('success', okMsg);
      await load();
    } catch (err) {
      notify('error', failMsg(err));
    } finally {
      setBusy(null);
    }
  };

  /** Modal confirm action: keeps the modal open with a spinner, closes on success. */
  const submitModal = async (fn, okMsg, close) => {
    setSubmitting(true);
    try {
      await fn();
      close();
      notify('success', okMsg);
      await load();
    } catch (err) {
      notify('error', failMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (text, okMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      notify('success', okMsg);
    } catch {
      notify('error', 'Copy failed — select and copy manually.');
    }
  };

  const anyBusy = busy != null || submitting;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-gray-900">Deltapreneur Applications</h2>
          <p className="text-sm text-gray-500">
            Below-₹40L applicants awaiting manual review. Approve, then generate a 7-day
            one-time secret invitation link. Revoking an approval immediately disables that
            applicant's link until re-approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, company…"
              className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ONBOARDED">Onboarded</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          className={`dp-fade-in rounded-lg px-3 py-2 text-sm ${
            notice.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {notice.msg}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="mt-3 text-sm font-medium text-gray-500">Loading applications…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-gray-500">
          No applications yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Company / Venture</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const expanded = expandedId === r.id;
                const isBusy = busy?.id === r.id;
                const busyLabel = isBusy ? busy.label : null;
                const st = r.displayStatus || r.status;
                // Strict gate: a link is only usable/copyable while the
                // application itself is APPROVED — a link kept across a revoke
                // still exists but must not be handed out until re-approval.
                const hasActiveLink =
                  r.invitation?.status === 'INVITATION_ACTIVE' && r.status === 'APPROVED';
                const canGenerate =
                  (st === 'APPROVED' || st === 'INVITATION_EXPIRED') &&
                  !r.invitation?.usedAt &&
                  r.invitation?.status !== 'INVITATION_ACTIVE';
                return (
                  <Fragment key={r.id}>
                    <tr className="align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setExpandedId(expanded ? null : r.id)}
                        >
                          <div className="font-semibold text-gray-900">{r.fullName}</div>
                          <div className="text-xs text-gray-500">{r.email}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.companyName || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{formatInr(r.annualRevenueInr)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.applicationDate ? new Date(r.applicationDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={st} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {st === 'PENDING_REVIEW' ? (
                            <>
                              <button
                                type="button"
                                disabled={anyBusy}
                                onClick={() => runRowAction(
                                  r,
                                  'Approving…',
                                  () => deltapreneurAdminAPI.approveApplication(r.id),
                                  'Application approved.',
                                )}
                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" /> {busyLabel}
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} /> Approve
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={anyBusy}
                                onClick={() => { setRejectTarget(r); setRejectReason(''); }}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <X size={12} /> Reject
                              </button>
                            </>
                          ) : null}

                          {st === 'REJECTED' ? (
                            <button
                              type="button"
                              disabled={anyBusy}
                              onClick={() => runRowAction(
                                r,
                                'Moving…',
                                () => deltapreneurAdminAPI.reopenApplication(r.id),
                                'Application moved back to Pending Review.',
                              )}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" /> {busyLabel}
                                </>
                              ) : (
                                <>
                                  <RotateCcw size={12} /> Move to Pending
                                </>
                              )}
                            </button>
                          ) : null}

                          {(r.status === 'APPROVED' || r.status === 'ONBOARDED') ? (
                            <button
                              type="button"
                              disabled={anyBusy}
                              onClick={() => {
                                setRevokeTarget(r);
                                setRevokeDiscardLink(null); // force explicit choice
                                setRevokeReason('');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Undo2 size={12} /> Revoke
                            </button>
                          ) : null}

                          {canGenerate ? (
                            <button
                              type="button"
                              disabled={anyBusy}
                              onClick={() => runRowAction(
                                r,
                                'Generating…',
                                () => deltapreneurAdminAPI.generateInvitation(r.id),
                                'Secret link generated.',
                              )}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" /> {busyLabel}
                                </>
                              ) : (
                                <>
                                  <Link2 size={12} /> Generate Secret Link
                                </>
                              )}
                            </button>
                          ) : null}

                          {hasActiveLink && r.invitation?.linkUrl ? (
                            <>
                              <button
                                type="button"
                                disabled={anyBusy}
                                onClick={() => copy(r.invitation.linkUrl, 'Link copied.')}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs transition-colors hover:bg-white disabled:opacity-50"
                              >
                                <Copy size={12} /> Copy Link
                              </button>
                              <button
                                type="button"
                                disabled={anyBusy}
                                onClick={() => copy(buildEmailContent(r, r.invitation.linkUrl), 'Email content copied.')}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs transition-colors hover:bg-white disabled:opacity-50"
                              >
                                <Copy size={12} /> Copy Email Content
                              </button>
                            </>
                          ) : null}
                        </div>

                        {hasActiveLink ? (
                          <div className="mt-2 text-right text-xs text-gray-500">
                            Expires {r.invitation.expiresAt ? new Date(r.invitation.expiresAt).toLocaleString() : '—'}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr key={`${r.id}-details`} className="bg-slate-50/70">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid gap-4 text-sm text-gray-700 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">About</div>
                              <p className="whitespace-pre-wrap">{r.about || '—'}</p>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Why they want to join</div>
                              <p className="whitespace-pre-wrap">{r.motivation || '—'}</p>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">LinkedIn</div>
                              {r.linkedInUrl ? (
                                <a href={r.linkedInUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{r.linkedInUrl}</a>
                              ) : '—'}
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Website</div>
                              {r.websiteUrl ? (
                                <a href={r.websiteUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{r.websiteUrl}</a>
                              ) : '—'}
                            </div>
                            {r.rejectionReason ? (
                              <div>
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Rejection reason</div>
                                <p className="whitespace-pre-wrap">{r.rejectionReason}</p>
                              </div>
                            ) : null}
                            {r.invitation ? (
                              <div>
                                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Last invitation</div>
                                <p>
                                  {STATUS_LABELS[r.invitation.status] || r.invitation.status}
                                  {r.invitation.expiresAt ? ` · expires ${new Date(r.invitation.expiresAt).toLocaleString()}` : ''}
                                  {r.invitation.usedAt ? ` · used ${new Date(r.invitation.usedAt).toLocaleString()}` : ''}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {revokeTarget ? (
        <AdminModal
          eyebrow="Revoke approval"
          eyebrowIcon={ShieldAlert}
          title={`Revoke approval — ${revokeTarget.fullName}`}
          onClose={() => { if (!submitting) setRevokeTarget(null); }}
        >
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            The application returns to <span className="font-semibold text-slate-700">Pending Review</span>
            {revokeTarget.status === 'ONBOARDED'
              ? ' and their invitation-based onboarding access is removed (their community profile is kept).'
              : '.'}
          </p>

          {revokeTarget.invitation?.status === 'INVITATION_ACTIVE' ? (
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Already-sent invitation link{' '}
                <span className="font-normal normal-case tracking-normal text-slate-400">
                  — choose one
                </span>
              </legend>
              <div className="mt-2 space-y-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                    revokeDiscardLink === true
                      ? 'border-orange-300 bg-orange-50/60 ring-2 ring-orange-200/60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="revoke-link-choice"
                    className="mt-0.5 accent-orange-600"
                    checked={revokeDiscardLink === true}
                    onChange={() => setRevokeDiscardLink(true)}
                  />
                  <span className="text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold">Discard the link</span> — it stops working
                    immediately (recommended if the email was sent in error).
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                    revokeDiscardLink === false
                      ? 'border-orange-300 bg-orange-50/60 ring-2 ring-orange-200/60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="revoke-link-choice"
                    className="mt-0.5 accent-orange-600"
                    checked={revokeDiscardLink === false}
                    onChange={() => setRevokeDiscardLink(false)}
                  />
                  <span className="text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold">Keep the link</span> — stored, but the applicant{' '}
                    <span className="font-semibold">cannot onboard with it</span> while the
                    application is in Pending Review. Re-approving revives the same link until its
                    original expiry.
                  </span>
                </label>
              </div>
            </fieldset>
          ) : null}

          {revokeTarget.invitation?.status === 'INVITATION_ACTIVE' && revokeDiscardLink == null ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700">
              Choose what happens to the invitation link above before revoking.
            </p>
          ) : null}

          <textarea
            rows={2}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Reason (optional, internal)"
            disabled={submitting}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-indigo-400 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.10)] disabled:opacity-60"
          />

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setRevokeTarget(null)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || (revokeTarget.invitation?.status === 'INVITATION_ACTIVE' && revokeDiscardLink == null)}
              onClick={() => {
                const target = revokeTarget;
                submitModal(
                  // null only when there's no active link (no radios shown) —
                  // coerce to true (backend default; a no-op with no unused link).
                  () => deltapreneurAdminAPI.revokeApplication(target.id, revokeDiscardLink ?? true, revokeReason.trim() || null),
                  'Approval revoked — application is back in Pending Review.',
                  () => setRevokeTarget(null),
                );
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Revoking…
                </>
              ) : (
                <>
                  <Undo2 size={14} /> Revoke approval
                </>
              )}
            </button>
          </div>
        </AdminModal>
      ) : null}

      {rejectTarget ? (
        <AdminModal
          eyebrow="Reject application"
          eyebrowIcon={X}
          title={`Reject application — ${rejectTarget.fullName}`}
          onClose={() => { if (!submitting) setRejectTarget(null); }}
        >
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            The applicant will be contacted by email. Any unused invitation links are invalidated
            immediately.
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional, internal)"
            disabled={submitting}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-indigo-400 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.10)] disabled:opacity-60"
          />
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setRejectTarget(null)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                const target = rejectTarget;
                submitModal(
                  () => deltapreneurAdminAPI.rejectApplication(target.id, rejectReason.trim() || null),
                  'Application rejected.',
                  () => setRejectTarget(null),
                );
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Rejecting…
                </>
              ) : (
                <>
                  <X size={14} /> Reject application
                </>
              )}
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
