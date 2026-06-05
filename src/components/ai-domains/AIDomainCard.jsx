import { prepareAIDomainStorefront } from './aiDomainStorefront';

function normalizeStatus(status, available) {
  if (status === 'available' || available === true) return 'available';
  if (status === 'taken') return 'taken';
  if (status === 'checking') return 'checking';
  return 'unknown';
}

function AvailabilityPill({ label, status, available }) {
  const normalized = normalizeStatus(status, available);
  const tone = {
    available: 'bg-[var(--cobrother-brand-green-soft)] text-[var(--cobrother-brand-green)]',
    taken: 'bg-rose-50 text-rose-600',
    checking: 'bg-amber-50 text-amber-700',
    unknown: 'bg-slate-100 text-slate-500',
  }[normalized];
  const copy = {
    available: 'Available',
    taken: 'Taken',
    checking: 'Checking...',
    unknown: 'Unknown',
  }[normalized];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      {label} {copy}
    </span>
  );
}

export default function AIDomainCard({ item, index = 0 }) {
  const comStatus = normalizeStatus(item.com_status, item.com_available);
  const inStatus = normalizeStatus(item.in_status, item.in_available);
  const primaryDomain = comStatus === 'available' ? item.domain_com : item.domain_in || item.domain_com;
  const action = prepareAIDomainStorefront(primaryDomain);

  return (
    <article
      className="ai-domain-card rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--cobrother-brand-green)] hover:shadow-[0_14px_30px_rgba(var(--cobrother-brand-green-rgb),0.14)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[var(--cobrother-brand-green-soft)] px-3 py-1 text-[11px] font-bold text-[var(--cobrother-brand-green)]">
          {item.brand_category}
        </span>
        <span className="text-sm font-extrabold text-slate-900">{item.score}/100</span>
      </div>

      <h2 className="mb-3 truncate text-xl font-extrabold text-slate-950">{item.name}</h2>

      <div className="mb-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-semibold text-slate-700">{item.domain_com}</span>
          <AvailabilityPill label=".com" status={comStatus} available={item.com_available} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-semibold text-slate-700">{item.domain_in}</span>
          <AvailabilityPill label=".in" status={inStatus} available={item.in_available} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => action.run()}
        className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--cobrother-brand-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--cobrother-brand-green-rgb),0.35)]"
      >
        Buy Domain
      </button>
    </article>
  );
}
