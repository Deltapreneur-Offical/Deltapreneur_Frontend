import { ShieldCheck } from 'lucide-react';
import { PendingVerificationDot } from '../domains/DomainVerificationPendingBanner';

export default function VentureVerificationPendingBanner({
  count = 1,
  onVerifyClick,
  showAction = true,
}) {
  const plural = count !== 1;

  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200/90 bg-amber-50/60 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      role="status"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <PendingVerificationDot />
          <p className="m-0 text-sm font-semibold text-amber-900">
            Verification pending review
          </p>
        </div>
        <p className="m-0 text-sm leading-relaxed text-amber-900/90">
          {plural
            ? `${count} of your listings have verification requests awaiting admin review.`
            : 'Your verification request is awaiting admin review. You can update documents or video while it is pending.'}
        </p>
      </div>
      {showAction && onVerifyClick ? (
        <button
          type="button"
          className="btn-glow btn-glow-sm shrink-0 self-start"
          onClick={onVerifyClick}
        >
          <ShieldCheck size={14} />
          Manage verification
        </button>
      ) : null}
    </div>
  );
}
