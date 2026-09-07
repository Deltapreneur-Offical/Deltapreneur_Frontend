/**
 * Registry premium badge (OpenProvider is_premium).
 * Not shared with marketplace ₹5L+ Premium badges.
 */
export default function RegistryPremiumBadge({ className = '' }) {
  return (
    <span
      className={`registry-premium-badge inline-flex w-fit items-center gap-1 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ${className}`}
    >
      <span className="registry-premium-badge__spark" aria-hidden="true">✦</span>
      Delta
      <style>{`
        @keyframes registryPremiumBadgeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes registryPremiumSpark {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .registry-premium-badge {
          animation: registryPremiumBadgeIn 320ms ease-out;
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.35);
        }
        .registry-premium-badge__spark {
          display: inline-block;
          animation: registryPremiumSpark 1.6s ease-in-out infinite;
        }
      `}</style>
    </span>
  );
}
