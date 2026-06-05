const SKELETONS = Array.from({ length: 8 }, (_, index) => index);

export default function AIDomainLoader({ stage, progress = 0, compact = false }) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));

  return (
    <div className="rounded-2xl border border-[rgba(var(--cobrother-brand-green-rgb),0.18)] bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-slate-950">
            {stage || 'Analyzing business idea...'}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Building premium domain opportunities
          </p>
        </div>
        <span className="rounded-full bg-[var(--cobrother-brand-green-soft)] px-3 py-1 text-xs font-extrabold text-[var(--cobrother-brand-green)]">
          {percent}%
        </span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[var(--cobrother-brand-green)] transition-all duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SKELETONS.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            >
              <div className="mb-4 h-5 w-24 animate-pulse rounded-full bg-slate-100" />
              <div className="mb-4 h-7 w-32 animate-pulse rounded bg-slate-100" />
              <div className="mb-2 h-5 w-full animate-pulse rounded bg-slate-100" />
              <div className="mb-5 h-5 w-4/5 animate-pulse rounded bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
