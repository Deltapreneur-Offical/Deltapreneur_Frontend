/**
 * Registry standard badge — deep teal counterpart to RegistryPremiumBadge.
 * Diamond icon stays static.
 */
export default function RegistryStandardBadge({ className = '' }) {
  return (
    <span
      className={`registry-standard-badge inline-flex w-fit items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700 ${className}`}
    >
      <span className="registry-standard-badge__diamond" aria-hidden="true">◆</span>
      Domain
      <style>{`
        @keyframes registryStandardBadgeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .registry-standard-badge {
          animation: registryStandardBadgeIn 320ms ease-out;
          color: #0f766e;
          background: #f0fdfa;
          border-color: #5eead4;
          box-shadow: 0 0 10px rgba(15, 118, 110, 0.16);
        }
        .registry-standard-badge__diamond {
          display: inline-block;
          font-size: 0.65em;
          line-height: 1;
          color: #0f766e;
        }
      `}</style>
    </span>
  );
}
