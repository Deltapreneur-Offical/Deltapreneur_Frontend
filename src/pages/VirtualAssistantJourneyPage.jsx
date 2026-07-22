import React, { useState, useEffect, useCallback } from 'react';
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
  IndianRupee,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { virtualAssistantAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import { useAuth } from '../context/AuthContext';

const ROLE_STATUS_DOT = {
  pending: '🟡',
  approved: '🟢',
  rejected: '🔴',
};

const STATUS_BADGE_CLASSES = {
  pending: 'bg-gray-100 text-gray-800',
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

function TimelineStep({ number, icon: Icon, title, description, state, children }) {
  const stateClasses = {
    done: 'bg-green-100 text-green-600 border-green-200',
    active: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    locked: 'bg-amber-100 text-amber-600 border-amber-200',
    pending: 'bg-gray-100 text-gray-400 border-gray-200',
  }[state];
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${stateClasses}`}>
          {Icon ? <Icon size={18} /> : number}
        </span>
        <span className="mt-1 w-px flex-1 bg-gray-200" />
      </div>
      <div className="pt-1.5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
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
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const overallStatus = application?.overallStatus || application?.status || 'pending';
  const submittedAt = application?.createdAt;
  const workspaceLocked = application?.workspaceLocked !== false;
  const approvedCount = roles.filter((r) => r.status === 'approved').length;
  const pendingCount = roles.filter((r) => r.status === 'pending').length;
  const rejectedCount = roles.filter((r) => r.status === 'rejected').length;
  const allRejected = roles.length > 0 && rejectedCount === roles.length;
  const workspaceUnlocked = !workspaceLocked || approvedCount > 0;

  const fetchJourney = useCallback(async () => {
    if (!user) return;
    try {
      const response = await virtualAssistantAPI.getMy();
      const data = unwrapApiData(response);
      if (!data) {
        setNotFound(true);
        setApplication(null);
        setRoles([]);
      } else {
        setNotFound(false);
        setApplication(data);
        setRoles(data.applicationRoles || []);
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
            {t('vaJourneyNoApplication', { defaultValue: 'No Virtual Assistant Application Yet' })}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('vaJourneyNoApplicationDesc', { defaultValue: "You haven't submitted a Virtual Assistant application. Start your journey below." })}
          </p>
          <Link
            to="/virtual-assistant"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Send size={16} />
            {t('vaJourneyApplyCta', { defaultValue: 'Apply as a Virtual Assistant' })}
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('vaJourneyTitle', { defaultValue: 'My Virtual Assistant Journey' })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('vaJourneySubtitle', { defaultValue: 'Track the progress of your Virtual Assistant application.' })}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('vaJourneyTimeline', { defaultValue: 'Application Journey' })}
              </h2>
              <ol className="mt-6">
                <TimelineStep
                  number={1}
                  icon={CheckCircle2}
                  state="done"
                  title={t('vaJourneyStepSubmitted', { defaultValue: 'Application Submitted' })}
                  description={t('vaJourneyStepSubmittedDesc', { defaultValue: 'We have received your application. Thank you for applying!' })}
                >
                  <p className="mt-1 text-xs text-gray-500">
                    {t('vaJourneySubmittedOn', { defaultValue: 'Submitted' })}: {formatDate(submittedAt)}
                  </p>
                </TimelineStep>

                <TimelineStep
                  number={2}
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
                  number={3}
                  icon={workspaceUnlocked ? LockKeyhole : Lock}
                  state={workspaceUnlocked ? 'done' : allRejected ? 'locked' : 'locked'}
                  title={
                    workspaceUnlocked
                      ? t('vaJourneyStepUnlocked', { defaultValue: 'Workspace Unlocked' })
                      : t('vaJourneyStepLocked', { defaultValue: 'Workspace Locked' })
                  }
                  description={
                    workspaceUnlocked ? (
                      <span className="inline-flex items-center gap-1 font-medium text-green-700">
                        <CheckCircle2 size={14} />
                        {t('vaJourneyUnlockedDesc', { defaultValue: "Congratulations! At least one of your Virtual Assistant roles has been approved. Your VA Workspace is now available." })}
                      </span>
                    ) : (
                      t('vaJourneyLockedDesc', { defaultValue: 'Your Virtual Assistant Workspace will be unlocked once at least one selected role is approved.' })
                    )
                  }
                >
                  {workspaceUnlocked && (
                    <button
                      onClick={() => navigate('/virtual-assistant/workspace')}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      {t('vaJourneyOpenWorkspace', { defaultValue: 'Open VA Workspace' })}
                      <ArrowRight size={14} />
                    </button>
                  )}
                </TimelineStep>
              </ol>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('vaJourneyReference', { defaultValue: 'Reference Number' })}
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                {application.referenceNumber}
              </p>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t('vaJourneyOverallStatus', { defaultValue: 'Overall Status' })}
                </p>
                <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[overallStatus] || 'bg-gray-100 text-gray-800'}`}>
                  {formatStatusLabel(overallStatus)}
                </span>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Expected Compensation
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 flex items-center gap-1">
                  <IndianRupee size={14} className="text-gray-400" />
                  {application.expectedCompensation || '—'}
                </p>
              </div>
              {application.publicMonthlyPriceInr != null && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Customer Monthly Price (Public)
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <IndianRupee size={14} className="text-gray-400" />
                    {application.pricingCurrency || 'INR'} {application.publicMonthlyPriceInr.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText size={18} className="text-indigo-600" />
            {t('vaJourneyRoleStatus', { defaultValue: 'Role Status Summary' })}
          </h2>
          {roles.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              {t('vaJourneyNoRoles', { defaultValue: 'No roles selected.' })}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {roles.map((role) => (
                <li key={role.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base leading-none">{ROLE_STATUS_DOT[role.status] || '🟡'}</span>
                    <span className="text-sm font-medium text-gray-900">{role.roleName}</span>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[role.status] || 'bg-gray-100 text-gray-800'}`}>
                    {formatStatusLabel(role.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {roles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>🟢 {approvedCount} {t('vaJourneyApproved', { defaultValue: 'Approved' })}</span>
              <span>🟡 {pendingCount} {t('vaJourneyPending', { defaultValue: 'Pending' })}</span>
              <span>🔴 {rejectedCount} {t('vaJourneyRejected', { defaultValue: 'Rejected' })}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <Inbox size={16} />
          {t('vaJourneyAutoUpdate', { defaultValue: 'Your journey updates automatically as admins review your roles.' })}
        </div>
      </div>
    </AppLayout>
  );
}

export default VirtualAssistantJourneyPage;
