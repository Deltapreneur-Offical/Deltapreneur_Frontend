import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { communityAPI, deltapreneurOnboardingAPI } from '../../api/services';
import { readApiError } from '../../utils/apiError';
import amountInWordsInr from '../../utils/amountInWords';
import AppOverlay from '../common/AppOverlay';

const THRESHOLD_INR = 4000000;

const fmt = new Intl.NumberFormat('en-IN');

/**
 * RevenueGateModal — opens ONLY from /creator's "Connect with LinkedIn".
 *
 *   >= Rs 40,00,000 -> record revenue server-side, then start the LinkedIn
 *                      OAuth connect (full-page redirect) which creates the
 *                      Creator/Deltapreneur profile on callback.
 *   <  Rs 40,00,000 -> redirect to the Apply-to-Become-Deltapreneur page.
 *                      Nothing is recorded and no onboarding starts.
 */
export default function RevenueGateModal({ open, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const numeric = useMemo(() => {
    const digits = String(value).replace(/[^\d.]/g, '');
    const n = Number(digits);
    return Number.isFinite(n) && digits !== '' ? n : null;
  }, [value]);

  const wordsRaw = numeric != null && numeric > 0 ? amountInWordsInr(numeric) : '';
  const words = wordsRaw ? wordsRaw.charAt(0).toUpperCase() + wordsRaw.slice(1) : '';

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (numeric == null || numeric <= 0) {
      setError('Enter your annual business revenue in rupees.');
      return;
    }
    if (!user) {
      // Safety net — on /creator the user is always signed in (protected route).
      navigate('/login', { state: { from: '/creator' } });
      return;
    }

    if (numeric < THRESHOLD_INR) {
      // Below 40L: do NOT record anything, do NOT start LinkedIn onboarding.
      onClose();
      navigate('/deltapreneurs/apply', { state: { revenue: numeric } });
      return;
    }

    // 40L and above: trust the entered revenue (no documents, no admin approval).
    setBusy(true);
    try {
      const { data } = await deltapreneurOnboardingAPI.declareRevenue(numeric);
      const result = data?.data || data || {};
      if (result.eligible === false) {
        // Server disagreed (edge case) — follow the apply route.
        onClose();
        navigate('/deltapreneurs/apply', { state: { revenue: numeric } });
        return;
      }
      // Eligible — go straight into the LinkedIn connect (full-page OAuth).
      const auth = await communityAPI.linkedInAuthUrl();
      const payload = auth?.data ?? {};
      const url = payload.url || payload.authUrl || payload.data?.url;
      if (!url) throw new Error('Missing LinkedIn authorization URL');
      window.location.assign(url); // navigating away — keep the spinner on
    } catch (err) {
      setBusy(false);
      setError(readApiError(err, 'Could not start the LinkedIn connection. Please try again.'));
    }
  };

  // Portal to document.body (AppOverlay) so the app layout's sticky navbar,
  // footer, and WhatsApp button cannot paint above the modal backdrop.
  return (
    <AppOverlay>
    <div
      className="dp-fade-in fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Join Deltapreneurs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dp-scale-in dp-gate-card relative w-full max-w-md overflow-hidden rounded-3xl ring-1 ring-slate-900/5">
        {/* top halo glow */}
        <div className="dp-gate-halo pointer-events-none absolute inset-x-0 top-0 h-28" aria-hidden="true" />

        <div className="relative p-7 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>

          {/* eyebrow */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-700 ring-1 ring-orange-200/80">
              <Sparkles size={12} className="text-orange-500" />
              Join Deltapreneurs
            </span>
          </div>

          <h3 className="mt-4 font-display text-[26px] font-bold leading-tight text-slate-900">
            What&apos;s your annual business revenue?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Enter it below and we&apos;ll guide you to the right way to join.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <div className="group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-all focus-within:border-orange-400 focus-within:shadow-[0_0_0_4px_rgba(255,153,51,0.12)] hover:border-slate-300">
                <span className="font-display text-xl font-semibold text-slate-400 transition-colors group-focus-within:text-orange-500">
                  ₹
                </span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="50,00,000"
                  className="w-full bg-transparent font-display text-lg font-semibold tracking-wide text-slate-900 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300"
                />
              </div>

              {/* live amount in words — replaces the old threshold lines */}
              {numeric != null && numeric > 0 ? (
                <p className="dp-live mt-2.5 flex items-baseline gap-1.5 px-1 text-sm">
                  <span className="font-display text-base font-semibold text-slate-900">
                    ₹ {fmt.format(numeric)}
                  </span>
                  {words ? (
                    <span className="font-medium text-orange-600">{words} per year</span>
                  ) : null}
                </p>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-500 hover:to-orange-700 hover:shadow-orange-500/35 focus:outline-none focus:ring-4 focus:ring-orange-500/25 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connecting to LinkedIn…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            {!user ? (
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                <Lock size={12} />
                You&apos;ll be asked to sign in first so we can remember your eligibility.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
    </AppOverlay>
  );
}
