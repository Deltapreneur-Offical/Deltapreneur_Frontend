import { useEffect, useRef, useState } from 'react';
import { REGISTRY_PREMIUM_SEGMENT } from '../../utils/registryPremium';

/**
 * Standard vs Premium (Afternic/Sedo / registry-premium) segmented control.
 * Sliding gold indicator; instant tab switches (parent holds cached results).
 */
export default function RegistryPremiumSegment({
  value,
  onChange,
  standardCount,
  premiumCount,
  premiumLoading = false,
  standardLoading = false,
  className = '',
}) {
  const trackRef = useRef(null);
  const btnRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 4, width: 0 });

  const options = [
    {
      id: REGISTRY_PREMIUM_SEGMENT.STANDARD,
      label: 'Standard Domains',
      count: standardCount,
      loading: standardLoading,
    },
    {
      id: REGISTRY_PREMIUM_SEGMENT.PREMIUM,
      label: 'Premium Domains',
      count: premiumCount,
      sparkle: true,
      loading: premiumLoading,
    },
  ];

  useEffect(() => {
    const btn = btnRefs.current[value];
    const track = trackRef.current;
    if (!btn || !track) return;
    const trackBox = track.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    setIndicator({
      left: btnBox.left - trackBox.left,
      width: btnBox.width,
    });
  }, [value, standardCount, premiumCount, premiumLoading, standardLoading]);

  return (
    <div
      ref={trackRef}
      className={`relative inline-flex items-center gap-1 rounded-xl bg-gray-100/90 p-1 shadow-inner ${className}`}
      role="tablist"
      aria-label="Domain tier filter"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 bottom-1 rounded-lg shadow-sm transition-all duration-300 ease-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          background:
            value === REGISTRY_PREMIUM_SEGMENT.PREMIUM
              ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #fde68a 100%)'
              : '#ffffff',
          boxShadow:
            value === REGISTRY_PREMIUM_SEGMENT.PREMIUM
              ? '0 0 0 1px rgba(217, 119, 6, 0.22), 0 4px 14px rgba(180, 83, 9, 0.12)'
              : '0 1px 3px rgba(15, 23, 42, 0.08)',
        }}
      />
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            ref={(el) => {
              btnRefs.current[opt.id] = el;
            }}
            onClick={() => onChange(opt.id)}
            className={`relative z-[1] inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-300 whitespace-nowrap select-none ${
              active
                ? opt.sparkle
                  ? 'text-amber-950'
                  : 'text-gray-900'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {opt.sparkle ? <span aria-hidden="true">✦</span> : null}
            {opt.label}
            {opt.loading ? (
              <span className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${opt.sparkle ? 'border-amber-300 border-t-amber-700' : 'border-gray-300 border-t-gray-700'}`} />
            ) : typeof opt.count === 'number' ? (
              <span className="text-[11px] font-bold tabular-nums text-gray-400">{opt.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
