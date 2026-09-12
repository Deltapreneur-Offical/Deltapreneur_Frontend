import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  Lock,
  LockKeyhole,
  Briefcase,
  FileText,
  Loader2,
  ArrowRight,
  Send,
  Inbox,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { virtualAssistantAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import { useAuth } from '../context/AuthContext';
import {
  getVaApplicationUnlockId,
  hasSeenVaUnlock,
} from '../hooks/useVaUnlockSeen';
import '../styles/virtual-assistant-journey.css';

const ROLE_STATUS_DOT = {
  pending: '🟡',
  approved: '🟢',
  rejected: '🔴',
};

const STATUS_BADGE_CLASSES = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  partially_approved: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function formatStatusLabel(status) {
  if (!status) return 'Pending';
  return status.replace('_', ' ').replace('-', ' ');
}

function buildRoleSummariesFallback(data) {
  if (!data) return [];
  if (Array.isArray(data.roleSummaries) && data.roleSummaries.length > 0) {
    return data.roleSummaries;
  }
  const roles = data.applicationRoles || [];
  return roles.map((role) => ({
    id: role.id,
    referenceNumber: data.referenceNumber,
    roleName: role.roleName,
    status: role.status,
    expectedCompensation: data.expectedCompensation,
    publicMonthlyPriceInr: data.publicMonthlyPriceInr,
    pricingCurrency: data.pricingCurrency || 'INR',
  }));
}

function formatPublicMonthlyPrice(currency, amount) {
  if (amount == null || amount === '') return '—';
  const value = Number(amount);
  if (Number.isNaN(value)) return '—';
  const prefix = currency === 'INR' || !currency ? '₹' : `${currency} `;
  return `${prefix}${value.toLocaleString('en-IN')}/mo`;
}

function formatExpectedCompensation(value) {
  if (!value || !String(value).trim()) return '—';
  return String(value).trim();
}

function RoleStatusSummaryTable({ rows, t }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-gray-500">
        {t('vaJourneyNoRoles', { defaultValue: 'No roles selected.' })}
      </p>
    );
  }

  return (
    <div className="va-journey-role-table">
      <div className="va-journey-role-table__head">
        <span>{t('vaJourneyColReference', { defaultValue: 'Reference' })}</span>
        <span>{t('vaJourneyColRole', { defaultValue: 'Role' })}</span>
        <span>{t('vaJourneyColStatus', { defaultValue: 'Status' })}</span>
        <span>{t('vaJourneyColExpected', { defaultValue: 'Expected (Private)' })}</span>
        <span>{t('vaJourneyColPublic', { defaultValue: 'Public Price' })}</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} className="va-journey-role-table__row">
          <div className="va-journey-role-table__cell">
            <span className="va-journey-role-table__mobile-label">
              {t('vaJourneyColReference', { defaultValue: 'Reference' })}
            </span>
            <span className="va-journey-role-table__ref">{row.referenceNumber || '—'}</span>
          </div>
          <div className="va-journey-role-table__cell">
            <span className="va-journey-role-table__mobile-label">
              {t('vaJourneyColRole', { defaultValue: 'Role' })}
            </span>
            <span className="va-journey-role-table__role">
              <span aria-hidden>{ROLE_STATUS_DOT[row.status] || '🟡'}</span>
              {row.roleName || '—'}
            </span>
          </div>
          <div className="va-journey-role-table__cell">
            <span className="va-journey-role-table__mobile-label">
              {t('vaJourneyColStatus', { defaultValue: 'Status' })}
            </span>
            <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[row.status] || 'bg-gray-100 text-gray-800'}`}>
              {formatStatusLabel(row.status)}
            </span>
          </div>
          <div className="va-journey-role-table__cell">
            <span className="va-journey-role-table__mobile-label">
              {t('vaJourneyColExpected', { defaultValue: 'Expected (Private)' })}
            </span>
            <span className="va-journey-role-table__money">
              {formatExpectedCompensation(row.expectedCompensation)}
            </span>
          </div>
          <div className="va-journey-role-table__cell">
            <span className="va-journey-role-table__mobile-label">
              {t('vaJourneyColPublic', { defaultValue: 'Public Price' })}
            </span>
            <span className="va-journey-role-table__money">
              {formatPublicMonthlyPrice(row.pricingCurrency, row.publicMonthlyPriceInr)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

function TimelineStep({ icon: Icon, title, description, state, isLast, descVariant, children }) {
  return (
    <li className={`va-journey-timeline__step ${isLast ? 'va-journey-timeline__step--last' : ''}`}>
      <div className="va-journey-timeline__track">
        <span className={`va-journey-timeline__marker va-journey-timeline__marker--${state}`}>
          {Icon ? <Icon size={16} strokeWidth={2.25} /> : null}
        </span>
        {!isLast && <span className="va-journey-timeline__connector" aria-hidden />}
      </div>
      <div className="va-journey-timeline__content">
        <h3 className="va-journey-timeline__title">{title}</h3>
        {description && (
          <div className={`va-journey-timeline__desc ${descVariant === 'success' ? 'va-journey-timeline__desc--success' : ''}`}>
            {description}
          </div>
        )}
        {children}
      </div>
    </li>
  );
}

function VirtualAssistantJourneyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [application, setApplication] = useState(null);
  const [roleSummaries, setRoleSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const prevUnlockedRef = useRef(null);

  const submittedAt = application?.createdAt;
  const workspaceLocked = application?.workspaceLocked !== false;
  const approvedCount = roleSummaries.filter((r) => r.status === 'approved').length;
  const pendingCount = roleSummaries.filter((r) => r.status === 'pending').length;
  const rejectedCount = roleSummaries.filter((r) => r.status === 'rejected').length;
  const workspaceUnlocked = !workspaceLocked || approvedCount > 0;
  const applicationId = getVaApplicationUnlockId(application);

  const openWorkspace = useCallback(() => {
    if (applicationId && !hasSeenVaUnlock(applicationId)) {
      navigate('/virtual-assistant/unlock', { state: { from: 'journey' } });
      return;
    }
    navigate('/virtual-assistant/workspace');
  }, [applicationId, navigate]);

  // Auto-start cinematic when unlock flips locked → unlocked (once, if unseen).
  useEffect(() => {
    if (!application || !applicationId) return;
    const wasLocked = prevUnlockedRef.current === false;
    if (workspaceUnlocked && wasLocked && !hasSeenVaUnlock(applicationId)) {
      navigate('/virtual-assistant/unlock', { replace: true, state: { from: 'journey' } });
    }
    prevUnlockedRef.current = workspaceUnlocked;
  }, [application, applicationId, workspaceUnlocked, navigate]);

  const fetchJourney = useCallback(async () => {
    if (!user) return;
    try {
      const response = await virtualAssistantAPI.getMy();
      const data = unwrapApiData(response);
      if (!data) {
        setNotFound(true);
        setApplication(null);
        setRoleSummaries([]);
      } else {
        setNotFound(false);
        setApplication(data);
        setRoleSummaries(buildRoleSummariesFallback(data));
      }
      setError('');
    } catch (e) {
      console.error('Failed to load VA journey', e);
      setError('Unable to load your application journey. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    fetchJourney();
    // Dynamic updates: refresh when tab is refocused or periodically.
    const onFocus = () => fetchJourney();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(fetchJourney, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [authLoading, user, fetchJourney, navigate]);

  if (authLoading || (loading && !notFound)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600">Loading your application journey…</span>
        </div>
      </AppLayout>
    );
  }

  if (notFound) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Briefcase size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('vaJourneyNoApplication', { defaultValue: 'No DeltaOperator Application Yet' })}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('vaJourneyNoApplicationDesc', { defaultValue: "You haven't submitted a DeltaOperator application. Start your journey below." })}
          </p>
          <Link
            to="/virtual-assistant"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Send size={16} />
            {t('vaJourneyApplyCta', { defaultValue: 'Apply as a DeltaOperator' })}
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="va-journey-page mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="va-journey-page__header">
          <h1 className="va-journey-page__title">
            {t('vaJourneyTitle', { defaultValue: 'My DeltaOperator Journey' })}
          </h1>
          <p className="va-journey-page__subtitle">
            {t('vaJourneySubtitle', { defaultValue: 'Track the progress of your DeltaOperator application.' })}
          </p>
        </header>

        <section className="va-journey-timeline-card">
          <h2 className="va-journey-timeline-card__title">
            {t('vaJourneyTimeline', { defaultValue: 'Application Journey' })}
          </h2>
          <ol className="va-journey-timeline">
            <TimelineStep
              icon={CheckCircle2}
              state="done"
              title={t('vaJourneyStepSubmitted', { defaultValue: 'Application Submitted' })}
              description={t('vaJourneyStepSubmittedDesc', { defaultValue: 'We have received your application. Thank you for applying!' })}
            >
              <p className="va-journey-timeline__meta">
                {t('vaJourneySubmittedOn', { defaultValue: 'Submitted' })}: {formatDate(submittedAt)}
              </p>
            </TimelineStep>

            <TimelineStep
              icon={Clock}
              state={workspaceUnlocked ? 'done' : 'active'}
              title={t('vaJourneyStepReview', { defaultValue: 'Waiting for Review' })}
              description={
                workspaceUnlocked
                  ? t('vaJourneyStepReviewDone', { defaultValue: 'Your application has been reviewed by our team.' })
                  : t('vaJourneyStepReviewDesc', { defaultValue: "Our team is reviewing your application. You'll be notified once a decision is made." })
              }
            />

            <TimelineStep
              icon={workspaceUnlocked ? LockKeyhole : Lock}
              state={workspaceUnlocked ? 'done' : 'locked'}
              isLast
              descVariant={workspaceUnlocked ? 'success' : undefined}
              title={
                workspaceUnlocked
                  ? t('vaJourneyStepUnlocked', { defaultValue: 'Workspace Unlocked' })
                  : t('vaJourneyStepLocked', { defaultValue: 'Workspace Locked' })
              }
              description={
                workspaceUnlocked ? (
                  <span className="va-journey-timeline__success-text">
                    <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden />
                    {t('vaJourneyUnlockedDesc', { defaultValue: "Congratulations! At least one of your DeltaOperator roles has been approved. Open your workspace to begin." })}
                  </span>
                ) : (
                  t('vaJourneyLockedDesc', { defaultValue: 'Your DeltaOperator Workspace will be unlocked once at least one selected role is approved.' })
                )
              }
            >
              {workspaceUnlocked && (
                <button
                  type="button"
                  onClick={openWorkspace}
                  className="va-journey-timeline__action"
                >
                  {t('vaJourneyOpenWorkspace', { defaultValue: 'Open DeltaOperator Workspace' })}
                  <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              )}
            </TimelineStep>
          </ol>
        </section>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText size={18} className="text-indigo-600" />
            {t('vaJourneyRoleStatus', { defaultValue: 'Role Status Summary' })}
          </h2>
          <RoleStatusSummaryTable rows={roleSummaries} t={t} />
          {roleSummaries.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>🟢 {approvedCount} {t('vaJourneyApproved', { defaultValue: 'Approved' })}</span>
              <span>🟡 {pendingCount} {t('vaJourneyPending', { defaultValue: 'Pending' })}</span>
              <span>🔴 {rejectedCount} {t('vaJourneyRejected', { defaultValue: 'Rejected' })}</span>
            </div>
          )}
        </div>

        <div className="va-journey-auto-update mt-5">
          <Inbox size={15} strokeWidth={2.25} aria-hidden />
          {t('vaJourneyAutoUpdate', { defaultValue: 'Your journey updates automatically as admins review your roles.' })}
        </div>
      </div>
    </AppLayout>
  );
}

export default VirtualAssistantJourneyPage;
