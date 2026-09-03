import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import usePayoutProfile from '../../hooks/usePayoutProfile';

const CONTEXT_COPY = {
  default: {
    incomplete: 'Add your UPI or bank details so Deltapreneur can send payouts when a sale is completed.',
    complete: 'Your payout details are saved and ready for seller payouts.',
  },
  domain: {
    incomplete: 'Add payout details to receive your domain sale earnings after transfer completes.',
    complete: 'Payout details saved — you are ready to receive domain sale earnings.',
  },
  venture: {
    incomplete: 'Add payout details to receive earnings once escrow is released.',
    complete: 'Payout details saved — you are ready to receive venture deal earnings.',
  },
  coventure: {
    incomplete: 'Add your UPI or bank details now so you are ready for any future venture payouts from Deltapreneur.',
    complete: 'Payout details saved — you are ready for venture and partnership payouts.',
  },
  technology: {
    incomplete: 'Add payout details to receive technology listing and auction earnings.',
    complete: 'Payout details saved — you are ready to receive technology earnings.',
  },
};

export default function PayoutProfileBanner({
  context = 'default',
  enabled = true,
  showWhenComplete = false,
  className = '',
}) {
  const { isComplete, loading } = usePayoutProfile({ enabled });
  const copy = CONTEXT_COPY[context] || CONTEXT_COPY.default;

  if (!enabled || loading) return null;
  if (isComplete && !showWhenComplete) return null;

  if (isComplete) {
    return (
      <section
        className={`rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 ${className}`}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-950">Payout details ready</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900">{copy.complete}</p>
            <Link
              to="/settings/payouts"
              className="mt-2 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Review payout settings →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-950">Payout details required</p>
            <p className="mt-1 text-sm leading-6 text-amber-900">{copy.incomplete}</p>
          </div>
        </div>
        <Link
          to="/settings/payouts"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <CreditCard className="h-4 w-4" />
          Set Up Payouts
        </Link>
      </div>
    </section>
  );
}
