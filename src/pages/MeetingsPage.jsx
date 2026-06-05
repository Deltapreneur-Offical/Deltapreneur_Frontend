import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { meetingAPI } from '../api/services';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { formatAuctionDateTime, parseAuctionDate } from '../utils/auctionDate';

/**
 * MeetingsPage — Two independent sections:
 *  1. "My Profile Meetings" (as lister/profile-owner)  → manage incoming requests
 *  2. "Meetings I've Requested" (as requester)         → track outgoing requests
 */
export default function MeetingsPage() {
  const { t } = useTranslation();
  const navigate    = useNavigate();

  const [schedule, setSchedule]   = useState([]);   // as lister
  const [requests, setRequests]   = useState([]);   // as requester
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      meetingAPI.getMySchedule().then(r => r.data).catch(() => []),
      meetingAPI.getMyRequests().then(r => r.data).catch(() => []),
    ]).then(([sched, reqs]) => {
      setSchedule(Array.isArray(sched) ? sched : []);
      setRequests(Array.isArray(reqs)  ? reqs  : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action, meetingId, extraData) => {
    setActionLoading(p => ({ ...p, [meetingId]: action }));
    try {
      if (action === 'confirm')  await meetingAPI.confirm(meetingId);
      if (action === 'cancel')   await meetingAPI.cancel(meetingId, extraData);
      if (action === 'complete') await meetingAPI.complete(meetingId);
      load();
    } catch (err) {
      alert(err.response?.data?.error || t('meetingsPageFailedAction', { action }));
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[meetingId]; return n; });
    }
  };

  // ── Section helpers ───────────────────────────────────────────────────────
  const pendingRequests   = schedule.filter(m => m.status === 'PENDING');
  const upcomingSchedule  = schedule.filter(m => m.status === 'CONFIRMED' && isFuture(m.scheduledAt));
  const pastSchedule      = schedule.filter(m =>
    (m.status === 'CONFIRMED' && !isFuture(m.scheduledAt)) ||
    m.status === 'COMPLETED');
  const cancelledSchedule = schedule.filter(m => m.status === 'CANCELLED');

  const myPending    = requests.filter(m => m.status === 'PENDING');
  const myConfirmed  = requests.filter(m => m.status === 'CONFIRMED');
  const myPast       = requests.filter(m => m.status === 'COMPLETED' || (m.status === 'CONFIRMED' && !isFuture(m.scheduledAt)));
  const myCancelled  = requests.filter(m => m.status === 'CANCELLED');

  const hasSchedule = schedule.length > 0;
  const hasRequests = requests.length > 0;

  return (
    <AppLayout>
      <div className="max-w-[1100px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{t('meetingsPageTitle')}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {t('meetingsPageSubtitle')}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : !hasSchedule && !hasRequests ? (
          <EmptyState navigate={navigate} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* ══ LEFT: As Profile Owner (Lister) ══════════════════════════ */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h2 className="font-display text-lg font-bold text-gray-900 m-0">
                  {t('meetingsPageProfileTitle')}
                </h2>
                <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {t('meetingsPageAsOwner')}
                </span>
              </div>

              {!hasSchedule ? (
                <div className="p-6 bg-white border border-gray-200 rounded-[14px] text-center text-gray-400 text-sm">
                  <div className="text-3xl mb-2">📋</div>
                  <p>{t('meetingsPageNoRequestsYet')}</p>
                  <p className="text-xs mt-1 text-gray-300">{t('meetingsPageAuctionHint')}</p>
                </div>
              ) : (
                <>
                  {/* Pending requests — need action */}
                  {pendingRequests.length > 0 && (
                    <SectionGroup
                      title={t('meetingsPagePendingRequests')}
                      subtitle={t('meetingsPageNeedsResponse')}
                      color="amber"
                      count={pendingRequests.length}>
                      {pendingRequests.map(m => (
                        <ListerMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}

                  {/* Upcoming confirmed */}
                  {upcomingSchedule.length > 0 && (
                    <SectionGroup
                      title={t('meetingsPageUpcoming')}
                      color="green"
                      count={upcomingSchedule.length}>
                      {upcomingSchedule.map(m => (
                        <ListerMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}

                  {/* Past / completed */}
                  {pastSchedule.length > 0 && (
                    <SectionGroup title={t('meetingsPagePast')} color="gray" count={pastSchedule.length} collapsed>
                      {pastSchedule.map(m => (
                        <ListerMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}

                  {/* Cancelled */}
                  {cancelledSchedule.length > 0 && (
                    <SectionGroup title={t('meetingsPageCancelled')} color="red" count={cancelledSchedule.length} collapsed>
                      {cancelledSchedule.map(m => (
                        <ListerMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}
                </>
              )}
            </div>

            {/* ══ RIGHT: As Requester ═══════════════════════════════════════ */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <h2 className="font-display text-lg font-bold text-gray-900 m-0">
                  {t('meetingsPageRequestedTitle')}
                </h2>
                <span className="text-xs text-teal-600 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  {t('meetingsPageAsRequester')}
                </span>
              </div>

              {!hasRequests ? (
                <div className="p-6 bg-white border border-gray-200 rounded-[14px] text-center text-gray-400 text-sm">
                  <div className="text-3xl mb-2">🔍</div>
                  <p>{t('meetingsPageNoRequestedYet')}</p>
                  <button className="btn-glow btn-glow-sm mt-3"
                    onClick={() => navigate('/auctions')}>
                    {t('meetingsPageBrowseAuctions')}
                  </button>
                </div>
              ) : (
                <>
                  {/* My pending */}
                  {myPending.length > 0 && (
                    <SectionGroup
                      title={t('meetingsPageAwaitingConfirmation')}
                      subtitle={t('meetingsPageWaitingOwner')}
                      color="amber"
                      count={myPending.length}>
                      {myPending.map(m => (
                        <RequesterMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}

                  {/* My confirmed */}
                  {myConfirmed.length > 0 && (
                    <SectionGroup
                      title={t('meetingsPageConfirmed')}
                      color="green"
                      count={myConfirmed.length}>
                      {myConfirmed.map(m => (
                        <RequesterMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}

                  {/* Past */}
                  {myPast.length > 0 && (
                    <SectionGroup title={t('meetingsPagePast')} color="gray" count={myPast.length} collapsed>
                      {myPast.map(m => (
                        <RequesterMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}

                  {/* Cancelled */}
                  {myCancelled.length > 0 && (
                    <SectionGroup title={t('meetingsPageCancelled')} color="red" count={myCancelled.length} collapsed>
                      {myCancelled.map(m => (
                        <RequesterMeetingCard key={m.id} meeting={m}
                          actionLoading={actionLoading[m.id]}
                          onAction={handleAction}
                          navigate={navigate} />
                      ))}
                    </SectionGroup>
                  )}
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Section Group ────────────────────────────────────────────────────────────
function SectionGroup({ title, subtitle, color, count, collapsed = false, children }) {
  const [open, setOpen] = useState(!collapsed);

  const colors = {
    amber: 'text-amber-700 border-amber-300 bg-amber-50',
    green: 'text-green-700 border-green-300 bg-green-50',
    gray:  'text-gray-600 border-gray-300 bg-gray-50',
    red:   'text-red-600  border-red-300   bg-red-50',
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-semibold mb-2 transition-colors ${colors[color]}`}>
        <span>{title} {count > 0 && <span className="ml-1.5 text-xs opacity-70">({count})</span>}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {subtitle && open && (
        <p className="text-xs text-gray-400 -mt-1 mb-2 px-1">{subtitle}</p>
      )}
      {open && (
        <div className="flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Lister Meeting Card ──────────────────────────────────────────────────────
function ListerMeetingCard({ meeting, actionLoading, onAction, navigate }) {
  const { t } = useTranslation();
  const [showCancel, setShowCancel] = useState(false);

  const isPending   = meeting.status === 'PENDING';
  const isConfirmed = meeting.status === 'CONFIRMED';
  const isLoading   = !!actionLoading;

  return (
    <div className={`bg-white border rounded-[12px] p-4 shadow-sm ${
      isPending ? 'border-amber-200' : isConfirmed ? 'border-green-200' : 'border-gray-200'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <StatusBadge status={meeting.status} />
          <div className="font-semibold text-gray-900 text-sm mt-1 truncate max-w-[220px]">
            {meeting.topic}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-gray-500">{meeting.durationMinutes} min</div>
        </div>
      </div>

      {/* Requester */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-600">
          {meeting.requester?.firstName?.[0]?.toUpperCase() || meeting.requester?.firstname?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">
            {meeting.requester?.firstName || meeting.requester?.firstname}{' '}
            {meeting.requester?.lastName  || meeting.requester?.lastname}
          </span>
          {meeting.requester?.email && (
            <span className="text-gray-400 ml-1">· {meeting.requester.email}</span>
          )}
        </div>
      </div>

      {/* Date/time */}
      <div className="text-xs text-gray-500 mb-2">
        📅 {formatDateTime(meeting.scheduledAt)}
      </div>

      {/* Message from requester */}
      {meeting.message && (
        <p className="text-xs text-gray-500 italic mb-2 line-clamp-2 leading-relaxed">
          "{meeting.message}"
        </p>
      )}

      {/* Google Meet link */}
      {isConfirmed && meeting.meetingLink && (
        <GoogleMeetButton link={meeting.meetingLink} calendarLink={meeting.calendarEventLink} />
      )}

      {/* Cancel info */}
      {meeting.status === 'CANCELLED' && (
        <div className="text-xs text-red-500 mt-1">
          {meeting.cancelReason && t('meetingsPageCancelReasonLabel', { reason: meeting.cancelReason })}
          {meeting.cancelledBy && (
            <span className="ml-2 text-gray-400">
              {meeting.cancelledBy === 'LISTER' ? t('meetingsPageCancelledByYou') : t('meetingsPageCancelledByRequester')}
            </span>
          )}
        </div>
      )}

      {meeting.auction?.id && (
        <button
          onClick={() => navigate(`/creator-auction/${meeting.auction.id}`)}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold mt-1 block">
          {t('meetingsPageViewAuction')}
        </button>
      )}

      {isPending && !showCancel && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onAction('confirm', meeting.id)}
            disabled={isLoading}
            className="flex-1 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
            {actionLoading === 'confirm' ? '…' : t('meetingsPageConfirm')}
          </button>
          <button
            onClick={() => setShowCancel(true)}
            disabled={isLoading}
            className="flex-1 py-1.5 text-xs font-bold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {t('meetingsPageDecline')}
          </button>
        </div>
      )}

      {isConfirmed && !showCancel && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onAction('complete', meeting.id)}
            disabled={isLoading}
            className="flex-1 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {actionLoading === 'complete' ? '…' : t('meetingsPageMarkComplete')}
          </button>
          <button
            onClick={() => setShowCancel(true)}
            disabled={isLoading}
            className="py-1.5 px-3 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {t('cancel')}
          </button>
        </div>
      )}

      {/* Cancel prompt */}
      {showCancel && (
        <CancelPrompt
          onConfirm={(r) => { onAction('cancel', meeting.id, r); setShowCancel(false); }}
          onBack={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}

// ─── Requester Meeting Card ───────────────────────────────────────────────────
function RequesterMeetingCard({ meeting, actionLoading, onAction, navigate }) {
  const { t } = useTranslation();
  const [showCancel, setShowCancel] = useState(false);
  const isPending   = meeting.status === 'PENDING';
  const isConfirmed = meeting.status === 'CONFIRMED';
  const isLoading   = !!actionLoading;

  return (
    <div className={`bg-white border rounded-[12px] p-4 shadow-sm ${
      isPending ? 'border-amber-200' : isConfirmed ? 'border-green-200' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <StatusBadge status={meeting.status} />
          <div className="font-semibold text-gray-900 text-sm mt-1 truncate max-w-[220px]">
            {meeting.topic}
          </div>
        </div>
        <div className="text-xs text-gray-400 flex-shrink-0">{meeting.durationMinutes} min</div>
      </div>

      {/* Profile owner */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-xs font-bold text-teal-600">
          {meeting.lister?.firstName?.[0]?.toUpperCase() || meeting.lister?.firstname?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="text-xs text-gray-600">
          {t('meetingsPageWith')} <span className="font-semibold text-gray-800">
            {meeting.lister?.firstName || meeting.lister?.firstname}{' '}
            {meeting.lister?.lastName  || meeting.lister?.lastname}
          </span>
          {meeting.auction?.auctionTitle && (
            <span className="text-gray-400 ml-1">· {meeting.auction.auctionTitle}</span>
          )}
        </div>
      </div>

      {/* Date/time */}
      <div className="text-xs text-gray-500 mb-2">
        📅 {formatDateTime(meeting.scheduledAt)}
      </div>

      {/* Google Meet link */}
      {isConfirmed && meeting.meetingLink && (
        <GoogleMeetButton link={meeting.meetingLink} calendarLink={meeting.calendarEventLink} />
      )}

      {/* Pending notice */}
      {isPending && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
          {t('meetingsPageWaitingFor', { name: meeting.lister?.firstName || meeting.lister?.firstname })}
        </div>
      )}

      {meeting.status === 'CANCELLED' && (
        <div className="text-xs text-red-500 mt-1">
          {meeting.cancelReason && t('meetingsPageCancelReasonLabel', { reason: meeting.cancelReason })}
          {meeting.cancelledBy && (
            <span className="ml-2 text-gray-400">
              {meeting.cancelledBy === 'REQUESTER' ? t('meetingsPageCancelledByYou') : t('meetingsPageCancelledByOwner')}
            </span>
          )}
        </div>
      )}

      {meeting.auction?.id && (
        <button
          onClick={() => navigate(`/creator-auction/${meeting.auction.id}`)}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold mt-1 block">
          {t('meetingsPageViewAuction')}
        </button>
      )}

      {(isPending || isConfirmed) && !showCancel && (
        <div className="mt-3">
          <button
            onClick={() => setShowCancel(true)}
            disabled={isLoading}
            className="w-full py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {t('meetingsPageCancelRequest')}
          </button>
        </div>
      )}

      {showCancel && (
        <CancelPrompt
          onConfirm={(r) => { onAction('cancel', meeting.id, r); setShowCancel(false); }}
          onBack={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}

// ─── Google Meet Button ───────────────────────────────────────────────────────
function GoogleMeetButton({ link, calendarLink }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 mb-2 mt-1 flex-wrap">
      <a href={link} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-semibold rounded-lg hover:bg-[#1557b0] transition-colors">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
        </svg>
        {t('meetingsPageJoinGoogleMeet')}
      </a>
      {calendarLink && (
        <a href={calendarLink} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-semibold">
          {t('meetingsPageViewCalendar')}
        </a>
      )}
    </div>
  );
}

// ─── Cancel Prompt ────────────────────────────────────────────────────────────
function CancelPrompt({ onConfirm, onBack }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  return (
    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-xs font-semibold text-red-700 mb-2">{t('meetingsPageCancelReason')}</div>
      <input
        type="text"
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder={t('meetingsPageCancelPlaceholder')}
        className="app-field-input w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 mb-2 outline-none focus:border-red-400 bg-white"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(reason || undefined)}
          className="flex-1 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors">
          {t('meetingsPageConfirmCancel')}
        </button>
        <button
          onClick={onBack}
          className="py-1 px-3 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors">
          {t('auctionDetailBack')}
        </button>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const { t } = useTranslation();
  const cfg = {
    PENDING:   { cls: 'bg-amber-100 text-amber-800 border-amber-300',  label: t('meetingsPageStatusPending')   },
    CONFIRMED: { cls: 'bg-green-100 text-green-800 border-green-300',  label: t('meetingsPageStatusConfirmed') },
    CANCELLED: { cls: 'bg-red-100   text-red-700   border-red-300',    label: t('meetingsPageStatusCancelled') },
    COMPLETED: { cls: 'bg-blue-100  text-blue-700  border-blue-300',   label: t('meetingsPageStatusCompleted') },
  }[status] || { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: status };

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ navigate }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">📅</div>
      <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{t('meetingsPageEmptyTitle')}</h3>
      <p className="text-gray-500 text-sm mb-6">
        {t('meetingsPageEmptyBody')}
      </p>
      <button className="btn-glow" onClick={() => navigate('/auctions')}>
        {t('meetingsPageBrowseAuctionsBtn')}
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isFuture(dt) {
  const d = parseAuctionDate(dt);
  if (!d) return false;
  return d.getTime() > Date.now();
}

function formatDateTime(dt) {
  return formatAuctionDateTime(dt, {
    weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
