import { CheckCircle2, ArrowRight } from 'lucide-react';

import NoDomainsOverlay from './NoDomainsOverlay';

/** Strip trailing unit suffix from API labels like "From ₹708 / yr" so the unit shows once. */
function splitCardPrice(price, unit) {
  const raw = String(price ?? '').trim();
  const cleaned = raw.replace(/\s*\/\s*(yr|year|mo|month|setup)\s*$/i, '').trim() || raw;

  if (/^free(\s+setup)?$/i.test(cleaned)) {
    return { amount: 'Free', unitLabel: 'setup' };
  }

  const unitWords = { yr: 'year', month: 'month', setup: 'setup' };
  return {
    amount: cleaned,
    unitLabel: `per ${unitWords[unit] || unit}`,
  };
}

function fmtInr(n) {
  return n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
}

export default function ServiceCard({
  icon,
  name,
  tag,
  price,
  unit = 'yr',
  hasDomains = false,
  tldPrices,
  tldRenewPrices,
  bullets = [],
  onConfigure,
  isActive,
  noDomainsOverlay = false,
  children,
}) {
  const { amount, unitLabel } = splitCardPrice(price, unit);
  const showNeedsDomainHint = !hasDomains && name !== 'Domain Transfer';

  const renderTldRow = ([tld, value]) => (
    <div key={tld} className="flex items-center justify-between text-[10.5px]">
      <span className="font-mono font-bold text-gray-700">{tld}</span>
      <span className="font-semibold text-gray-500">
        {fmtInr(value)}
        <span className="text-[9px] text-gray-400">/yr</span>
      </span>
    </div>
  );

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_8px_24px_rgba(30,167,253,0.15)] transition-all duration-200 ${
        isActive
          ? 'border-[#1EA7FD] ring-2 ring-[#1EA7FD]/40 shadow-[0_12px_28px_rgba(30,167,253,0.22)]'
          : 'border-[#93C5FD] hover:-translate-y-0.5 hover:border-[#1EA7FD] hover:shadow-[0_12px_28px_rgba(30,167,253,0.22)]'
      }`}
    >
      {/* Premium top accent bar */}
      <div
        className="h-1 w-full bg-gradient-to-r from-[#1EA7FD] via-[#7DD3FC] to-[#1EA7FD]"
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#93C5FD] bg-[#EFF6FF]">
            {icon}
          </div>
          <span className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0E7ACD]">
            {tag}
          </span>
        </div>

        <div>
          <h3 className="text-[15px] font-bold leading-snug text-gray-900">{name}</h3>
          {showNeedsDomainHint && (
            <span className="mt-1 inline-block rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2 py-0.5 text-[9px] font-bold text-[#0E7ACD]">
              Needs an Active Domain
            </span>
          )}
        </div>

        {tldPrices && Object.keys(tldPrices).length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(tldPrices).map(renderTldRow)}
          </div>
        )}

        {tldRenewPrices && Object.keys(tldRenewPrices).length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(tldRenewPrices).map(renderTldRow)}
          </div>
        )}

        {bullets.length > 0 && (
          <ul className="flex-1 space-y-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12px] font-medium text-gray-600">
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1EA7FD]"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-gray-100" />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-[13px] font-bold leading-tight text-gray-900 tabular-nums">
              {amount}
            </p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
              {unitLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl bg-black px-3 text-[11px] font-semibold text-white shadow-sm transition-all select-none hover:bg-neutral-900 active:scale-95"
          >
            {isActive ? 'Hide Panel' : 'Configure'}
            <ArrowRight
              className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {isActive && children && (
        <div className="relative border-t border-[#E2E8F0] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {noDomainsOverlay ? (
            <>
              <div
                className="pointer-events-none select-none opacity-70 blur-[1px]"
                aria-hidden="true"
              >
                {children}
              </div>
              <NoDomainsOverlay />
            </>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
