const SKELETONS = Array.from({ length: 6 }, (_, index) => index);

/**
 * AI Brand Names loading UI — matches Standard Domains sky loader style.
 */
export default function AIDomainLoader({ stage, progress = 0, compact = false }) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const statusText = stage || 'Generating premium brands…';

  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col gap-2.5 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-cyan-50/40 px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sky-900/90">{statusText}</p>
            <p className="mt-0.5 text-xs font-medium text-sky-700/70">
              Building Delta Domains opportunities
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-sky-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-sky-800">
          {percent}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {!compact && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKELETONS.map((item, i) => (
            <div
              key={item}
              className="rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50/50 via-white to-white p-4 shadow-[0_4px_16px_rgba(2,132,199,0.05)] animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
              aria-hidden="true"
            >
              <div className="mb-1.5 h-4 w-20 rounded-full bg-sky-100" />
              <div className="mb-1.5 h-6 w-40 rounded bg-sky-100/70" />
              <div className="mb-3 h-5 w-24 rounded bg-sky-50" />
              <div className="h-9 w-[30%] min-w-[7rem] max-w-[9rem] rounded-lg bg-sky-100/80" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
