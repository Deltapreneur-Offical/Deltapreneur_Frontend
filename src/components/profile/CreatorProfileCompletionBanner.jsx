import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { evaluateCreatorProfileCompletion } from '../../utils/creatorProfile';

export default function CreatorProfileCompletionBanner({ profile, onEdit, editTo }) {
  const { t } = useTranslation();
  const completion = evaluateCreatorProfileCompletion(profile);

  if (!profile || completion.isComplete) return null;

  const ctaLabel = t('creatorProfileCompleteCta', { defaultValue: 'Complete profile' });

  const ctaClassName =
    'inline-flex w-full min-h-8 items-center justify-center rounded-full border border-slate-900/15 bg-white px-4 py-2 text-center text-xs font-bold leading-tight text-black no-underline transition hover:border-slate-900/25 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:w-auto sm:min-h-[1.85rem] sm:whitespace-nowrap';

  const cta = editTo ? (
    <Link to={editTo} className={ctaClassName}>
      {ctaLabel}
    </Link>
  ) : onEdit ? (
    <button type="button" className={ctaClassName} onClick={onEdit}>
      {ctaLabel}
    </button>
  ) : null;

  return (
    <section
      className="flex w-full min-w-0 max-w-full flex-col gap-3 rounded-[14px] border border-[#f0e4c8] bg-[#fef8ec] px-3.5 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:px-3.5 sm:py-2.5"
      role="status"
      aria-label={t('creatorProfileStatusIncomplete', { defaultValue: 'Profile incomplete' })}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600"
          aria-hidden="true"
        >
          <AlertCircle size={18} strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 leading-tight">
            <span className="text-[0.68rem] font-extrabold uppercase tracking-wider text-amber-700">
              {t('creatorProfileStatusIncomplete', { defaultValue: 'Profile incomplete' })}
            </span>
            <span className="text-xs font-bold text-amber-600" aria-hidden="true">
              ·
            </span>
            <span className="text-[0.78rem] font-extrabold text-amber-700">
              {completion.percent}%
            </span>
          </p>
          <p className="mt-1 m-0 text-[0.8rem] font-medium leading-snug text-amber-800">
            {t('creatorProfileCompletionWarning', {
              defaultValue: "Please complete 100% of your profile until it's completed to make it visible publicly.",
            })}
          </p>
        </div>
      </div>

      {cta ? (
        <div className="w-full min-w-0 shrink-0 sm:ml-auto sm:w-auto">
          {cta}
        </div>
      ) : null}
    </section>
  );
}
