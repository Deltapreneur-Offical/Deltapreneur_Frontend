/**
 * Registry standard badge — sky/cyan counterpart to RegistryPremiumBadge
 * (matches search-bar border: #7dd3fc → #38bdf8). Diamond icon stays static.
 */
export default function RegistryStandardBadge({ className = '' }) {
  return (
    <span
      className={`registry-standard-badge inline-flex w-fit items-center gap-1 rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800 ${className}`}
    >
      <span className="registry-standard-badge__diamond" aria-hidden="true">◆</span>
      Standard
      <style>{`
        @keyframes registryStandardBadgeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .registry-standard-badge {
          animation: registryStandardBadgeIn 320ms ease-out;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
        }
        .registry-standard-badge__diamond {
          display: inline-block;
          font-size: 0.65em;
          line-height: 1;
        }
      `}</style>
    </span>
  );
}
