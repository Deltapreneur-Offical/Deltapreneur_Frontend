import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarClock, MailCheck, ShieldCheck } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LinkedInIcon from '../components/auth/LinkedInIcon';
import { useAuth } from '../context/AuthContext';
import { creatorAPI, deltapreneurOnboardingAPI } from '../api/services';

/**
 * InviteLandingPage — /creator/invite/:token
 *
 * Secret-link landing for approved below-₹40L applicants. Validates the token
 * (public endpoint), then sends the user through the normal LinkedIn connect
 * flow with the token attached so the backend carries it inside the signed
 * OAuth state and consumes it once the profile is created (one-time use).
 */
export default function InviteLandingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [state, setState] = useState({ checking: true, valid: false, info: null, error: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    deltapreneurOnboardingAPI
      .validateInvitation(token)
      .then(({ data }) => {
        if (cancelled) return;
        setState({ checking: false, valid: true, info: data?.data || data || null, error: '' });
      })
      .catch((err) => {
        if (cancelled) return;
        const detail =
          err.response?.status === 410
            ? err.response?.data?.detail || 'This invitation link has expired or was already used.'
            : 'This invitation link is invalid.';
        setState({ checking: false, valid: false, info: null, error: detail });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const connectLinkedIn = async () => {
    setBusy(true);
    try {
      const { data } = await creatorAPI.linkedInAuthUrl({ invitation_token: token });
      const url = data?.url || data?.data?.url || data?.authUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error('missing url');
    } catch {
      setBusy(false);
      navigate('/login', { state: { from: `/creator/invite/${token}` } });
    }
  };

  const expiresLabel = (() => {
    if (!state.info?.expiresAt) return null;
    const then = new Date(state.info.expiresAt);
    if (Number.isNaN(then.getTime())) return null;
    return then.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-16 sm:py-20">
        {state.checking ? (
          <div className="dp-fade-in flex flex-col items-center py-16 text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-500" />
            <p className="mt-5 text-sm font-medium text-slate-500">Validating your invitation…</p>
          </div>
        ) : state.valid ? (
          <div className="dp-scale-in relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.14)]">
            {/* header band */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-8 pb-14 pt-10 text-center">
              <div className="pointer-events-none absolute inset-0 dp-gate-halo opacity-60" aria-hidden="true" />
              <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200 ring-1 ring-white/15 backdrop-blur">
                <MailCheck size={12} />
                Invitation approved
              </span>
              <h1 className="relative mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-[28px]">
                You&apos;re invited to become a Deltapreneur
              </h1>
            </div>

            <div className="relative -mt-8 px-8 pb-8">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.15)]">
                {state.info?.applicantName ? (
                  <p className="text-center text-sm font-medium text-slate-700">
                    Welcome{state.info.companyName ? `, ${state.info.companyName}` : ''} — your
                    application has been approved.
                  </p>
                ) : null}

                <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
                  Connect your LinkedIn account to create your Deltapreneur profile. This personal
                  link works <span className="font-semibold text-slate-700">only once</span>
                  {expiresLabel ? (
                    <>
                      {' '}and expires{' '}
                      <span className="font-semibold text-slate-700">{expiresLabel}</span>
                    </>
                  ) : null}
                  .
                </p>

                <div className="mt-5 flex items-center justify-center gap-4 text-[11px] font-medium text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    Single use
                  </span>
                  <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock size={12} className="text-orange-500" />
                    7-day validity
                  </span>
                </div>

                <button
                  type="button"
                  onClick={connectLinkedIn}
                  disabled={busy}
                  className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#0a8ec0] to-[#0077b5] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0077b5]/25 transition-all hover:shadow-[#0077b5]/35 focus:outline-none focus:ring-4 focus:ring-[#0077b5]/25 disabled:opacity-60"
                >
                  {busy ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <LinkedInIcon />
                  )}
                  {busy ? 'Connecting…' : 'Connect with LinkedIn'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="dp-scale-in rounded-3xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.12)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-50/60">
              <AlertTriangle className="text-amber-500" size={28} />
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Invitation unavailable</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">{state.error}</p>
            <p className="mx-auto mt-5 max-w-sm rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-100">
              {t('deltapreneurInviteContact', {
                defaultValue: 'Please contact the Deltapreneur team if you need a fresh invitation.',
              })}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
