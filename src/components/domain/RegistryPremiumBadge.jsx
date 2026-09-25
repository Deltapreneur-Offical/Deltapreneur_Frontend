import { Zap } from 'lucide-react';

/**
 * Registry premium badge (OpenProvider is_premium).
 * Not shared with marketplace ₹5L+ Premium badges.
 * Lightning bolt shows before "DELTA"; homepage mobile CSS may hide the icon.
 */
export default function RegistryPremiumBadge({ className = '' }) {
  return (
    <span
      className={`registry-premium-badge inline-flex w-fit items-center gap-1 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ${className}`}
    >
      <Zap
        className="registry-premium-badge__spark"
        aria-hidden="true"
        strokeWidth={2.5}
      />
      Delta
      <style>{`
        @keyframes registryPremiumBadgeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .registry-premium-badge {
          animation: registryPremiumBadgeIn 320ms ease-out;
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.35);
        }
        .registry-premium-badge__spark {
          display: inline-block;
          width: 0.7rem;
          height: 0.7rem;
          flex-shrink: 0;
        }
      `}</style>
    </span>
  );
}
