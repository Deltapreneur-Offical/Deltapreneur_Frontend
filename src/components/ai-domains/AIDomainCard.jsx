import { useNavigate } from 'react-router-dom';
import { goToAIDomainStorefront } from './aiDomainStorefront';

function normalizeStatus(status, available) {
  if (status === 'available' || available === true) return 'available';
  if (status === 'taken') return 'taken';
  if (status === 'checking') return 'checking';
  return 'unknown';
}

function AvailabilityStatus({ status, available }) {
  const normalized = normalizeStatus(status, available);
  const config = {
    available: {
      dot: 'bg-[var(--cobrother-brand-green)]',
      label: 'Available',
    },
    taken: {
      dot: 'bg-rose-500',
      label: 'Taken',
    },
    checking: {
      dot: 'bg-amber-400',
      label: 'Checking',
    },
    unknown: {
      dot: 'bg-slate-300',
      label: 'Unknown',
    },
  }[normalized];

  return (
    <span
      className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`}
      role="img"
      aria-label={config.label}
      title={config.label}
    />
  );
}

export default function AIDomainCard({ item, index = 0 }) {
  const navigate = useNavigate();
  const comStatus = normalizeStatus(item.com_status, item.com_available);
  const primaryDomain = item.domain_com;
  const canBuy = comStatus === 'available';

  return (
    <article
      className="ai-domain-card flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(59,130,246,0.14)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="mb-3">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
          {item.style || item.brand_category}
        </span>
      </div>

      <h2 className="mb-1 truncate text-xl font-extrabold text-slate-950">{item.name}</h2>

      <div className="mb-4 flex-1 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-semibold text-slate-700">{item.domain_com}</span>
          <AvailabilityStatus status={comStatus} available={item.com_available} />
        </div>
      </div>

      <button
        type="button"
        disabled={!canBuy}
        onClick={() => goToAIDomainStorefront(primaryDomain, navigate)}
        className={`mt-auto w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
          canBuy
            ? 'bg-slate-950 text-white hover:bg-blue-600'
            : 'cursor-not-allowed bg-slate-100 text-slate-400'
        }`}
      >
        {canBuy ? 'Register Domain →' : 'No available TLD'}
      </button>
    </article>
  );
}
