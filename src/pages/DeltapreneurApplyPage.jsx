import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, CheckCircle2, FileText, Globe, Link2, Mail, Sparkles, TrendingUp, User } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { deltapreneurOnboardingAPI } from '../api/services';
import amountInWordsInr from '../utils/amountInWords';
import { scheduleScrollAppLayoutToTop } from '../utils/preserveAppLayoutScroll';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-orange-400 focus:shadow-[0_0_0_4px_rgba(255,153,51,0.10)] hover:border-slate-300';
const labelCls =
  'mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500';

// One-shot confetti burst shown on the success screen (brand palette).
const CONFETTI_COLORS = ['#f97316', '#fb923c', '#0ea5e9', '#22c55e', '#fbbf24', '#cbd5e1'];
const CONFETTI_PIECES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: `${(i * 3.85 + (i % 5) * 1.9) % 100}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: `${((i % 9) * 0.11).toFixed(2)}s`,
  duration: `${(2.1 + (i % 5) * 0.32).toFixed(2)}s`,
  drift: `${((i * 37) % 96) - 48}px`,
  rotate: i % 2 ? '540deg' : '-540deg',
}));

function Field({ label, required, icon: Icon, htmlFor, children }) {
  return (
    <div>
      <label className={labelCls} htmlFor={htmlFor}>
        {Icon ? <Icon size={12} className="text-slate-400" /> : null}
        {label}
        {required ? <span className="text-orange-500"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

/**
 * DeltapreneurApplyPage — "Join Deltapreneur Community" (below Rs 40L route).
 *
 * Per spec: after submission there is NO tracking page and NO status display.
 * The applicant only sees the confirmation copy and waits for email contact.
 */
export default function DeltapreneurApplyPage() {
  const location = useLocation();
  const prefillRevenue = location.state?.revenue;

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    companyName: '',
    annualRevenueInr: prefillRevenue ? String(prefillRevenue) : '',
    linkedInUrl: '',
    websiteUrl: '',
    about: '',
    motivation: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Success screen lands at the top of the page, confetti visible immediately.
  useEffect(() => {
    if (submitted) scheduleScrollAppLayoutToTop();
  }, [submitted]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const revenueWordsRaw = (() => {
    const revenue = Number(String(form.annualRevenueInr).replace(/[^\d.]/g, ''));
    return Number.isFinite(revenue) && revenue > 0 ? amountInWordsInr(revenue) : '';
  })();
  const revenueWords = revenueWordsRaw
    ? revenueWordsRaw.charAt(0).toUpperCase() + revenueWordsRaw.slice(1)
    : '';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const revenue = Number(String(form.annualRevenueInr).replace(/[^\d.]/g, ''));
    if (!form.fullName.trim() || !form.email.trim() || !Number.isFinite(revenue) || revenue <= 0) {
      setError('Please fill your name, a valid email, and annual revenue.');
      return;
    }
    if (revenue >= 4000000) {
      // Exactly-40L-or-above users belong on the direct route.
      setError(
        'Your revenue qualifies for direct onboarding — use the Sign Up button in the Deltapreneurs section instead.',
      );
      return;
    }
    setBusy(true);
    try {
      await deltapreneurOnboardingAPI.submitApplication({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        companyName: form.companyName.trim() || null,
        annualRevenueInr: revenue,
        linkedInUrl: form.linkedInUrl.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        about: form.about.trim() || null,
        motivation: form.motivation.trim() || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-lg px-4 py-20">
          <div className="dp-scale-in relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.12)]">
            {/* one-shot confetti burst, clipped to the card */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-52 overflow-hidden" aria-hidden="true">
              {CONFETTI_PIECES.map((c) => (
                <span
                  key={c.id}
                  className="dp-confetti-burst"
                  style={{
                    left: c.left,
                    background: c.color,
                    animationDelay: c.delay,
                    animationDuration: c.duration,
                    '--dp-drift': c.drift,
                  }}
                />
              ))}
            </div>
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/50">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
            <h1 className="relative font-display text-3xl font-bold text-slate-900">Application submitted</h1>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              Thank you — our team reviews every application manually and will reach out to you
              through the email address provided.
            </p>
            <Link
              to="/"
              className="relative mt-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/35 focus:outline-none focus:ring-4 focus:ring-orange-500/25"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="dp-fade-in text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-700 ring-1 ring-orange-200/80">
            <Sparkles size={12} className="text-orange-500" />
            Deltapreneur Application
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Join Deltapreneur Community
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
            Tell us about your business. Every application is reviewed personally by our team, and
            we&apos;ll contact you by email.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="dp-scale-in mt-8 space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.12)] sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name" required icon={User} htmlFor="dp-fullname">
              <input id="dp-fullname" className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="Your full name" />
            </Field>
            <Field label="Email Address" required icon={Mail} htmlFor="dp-email">
              <input id="dp-email" type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="you@company.com" />
            </Field>
            <Field label="Company / Venture Name" icon={Building2} htmlFor="dp-company">
              <input id="dp-company" className={inputCls} value={form.companyName} onChange={set('companyName')} placeholder="Your company or venture" />
            </Field>
            <Field label="Annual Revenue" required icon={TrendingUp} htmlFor="dp-revenue">
              <input
                id="dp-revenue"
                inputMode="numeric"
                className={inputCls}
                value={form.annualRevenueInr}
                onChange={set('annualRevenueInr')}
                placeholder="25,00,000"
              />
              {revenueWords ? (
                <p className="dp-live mt-1.5 text-xs font-medium text-orange-600">{revenueWords}</p>
              ) : null}
            </Field>
            <Field label="LinkedIn URL" icon={Link2} htmlFor="dp-linkedin">
              <input id="dp-linkedin" className={inputCls} value={form.linkedInUrl} onChange={set('linkedInUrl')} placeholder="https://linkedin.com/in/…" />
            </Field>
            <Field label="Website (if available)" icon={Globe} htmlFor="dp-website">
              <input id="dp-website" className={inputCls} value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://…" />
            </Field>
          </div>

          <div className="space-y-5 border-t border-slate-100 pt-6">
            <Field label="Short About / Description" icon={FileText} htmlFor="dp-about">
              <textarea id="dp-about" rows={3} className={inputCls} value={form.about} onChange={set('about')} placeholder="A couple of lines about your business…" />
            </Field>
            <Field label="Why do you want to become a Deltapreneur?" icon={Sparkles} htmlFor="dp-motivation">
              <textarea id="dp-motivation" rows={4} className={inputCls} value={form.motivation} onChange={set('motivation')} placeholder="What draws you to the Deltapreneur network?" />
            </Field>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/35 focus:outline-none focus:ring-4 focus:ring-orange-500/25 disabled:opacity-60 sm:w-auto sm:px-12"
          >
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
            {busy ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
