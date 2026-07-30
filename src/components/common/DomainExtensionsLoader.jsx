import { useEffect, useState } from 'react';
import './domain-extensions-loader.css';

function SkeletonBone({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded bg-sky-100/80 ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

/** Compact card skeleton — sky theme for Standard Domains (search-bar border palette). */
export function DomainCardSkeleton({ featured = false }) {
  if (featured) {
    return (
      <div
        className="domain-search-card domain-search-card--featured rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50/60 via-white to-white p-4 sm:p-5 shadow-[0_6px_24px_rgba(2,132,199,0.06)] animate-pulse"
        aria-hidden="true"
      >
        <SkeletonBone className="mb-2.5 h-5 w-24 rounded-full bg-sky-100" />
        <SkeletonBone className="mb-2.5 h-8 w-2/3 max-w-sm bg-sky-100/70" />
        <SkeletonBone className="mb-3.5 h-7 w-28 bg-sky-50" />
        <SkeletonBone className="h-10 w-[30%] min-w-[7.5rem] max-w-[9.5rem] rounded-lg bg-sky-100/80" />
      </div>
    );
  }

  return (
    <div
      className="domain-search-card flex flex-col rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50/50 via-white to-white p-4 shadow-[0_4px_16px_rgba(2,132,199,0.05)] animate-pulse"
      aria-hidden="true"
    >
      <SkeletonBone className="mb-1.5 h-4 w-20 rounded-full bg-sky-100" />
      <SkeletonBone className="mb-1.5 h-6 w-40 bg-sky-100/70" />
      <SkeletonBone className="mb-3 h-5 w-24 bg-sky-50" />
      <SkeletonBone className="h-9 w-[30%] min-w-[7rem] max-w-[9rem] rounded-lg bg-sky-100/80" />
    </div>
  );
}

export const DOMAIN_LOADING_MESSAGES = [
  'Checking available extensions…',
  'Loading more TLDs…',
  'Exploring more domains for you…',
  'Looking for the best matches…',
  'More domains are on the way…',
  'Almost there…',
  'Finding the perfect domain for you…',
];

const ROTATE_MS = 2600;
const FADE_MS = 220;

/** Sequential three-dot pulse — SaaS/chat style, no CSS spinner. */
function ThreeDotLoader() {
  return (
    <span className="domain-tld-dots" aria-hidden="true">
      <span className="domain-tld-dots__dot" />
      <span className="domain-tld-dots__dot" />
      <span className="domain-tld-dots__dot" />
    </span>
  );
}

/**
 * Standard Domains loading strip — sky theme (mirrors premium gold loader).
 * Rotating messages + skeleton cards; unmounts when loading ends.
 */
export default function DomainExtensionsLoader({
  skeletonCount = 0,
  messages = DOMAIN_LOADING_MESSAGES,
}) {
  const slots = Array.from({ length: Math.max(0, skeletonCount) }, (_, i) => i);
  const list = messages?.length ? messages : DOMAIN_LOADING_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);
  const [phase, setPhase] = useState('in'); // in | out

  useEffect(() => {
    setMessageIndex(0);
    setPhase('in');
    let fadeTimer = 0;
    const id = window.setInterval(() => {
      setPhase('out');
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        setMessageIndex((i) => (i + 1) % list.length);
        setPhase('in');
      }, FADE_MS);
    }, ROTATE_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeTimer);
    };
  }, [list.length]);

  const activeMessage = list[messageIndex % list.length];
  const displaySlots = slots.length > 0 ? slots : [];

  return (
    <div
      className="domain-tld-loader space-y-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={activeMessage}
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-cyan-50/40 px-4 py-3">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
        <p
          className={`text-sm font-semibold text-sky-900/90 transition-opacity duration-300 ${
            phase === 'out' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {activeMessage}
        </p>
        <span className="ml-auto hidden sm:inline-flex">
          <ThreeDotLoader />
        </span>
      </div>

      {displaySlots.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {displaySlots.map((item, i) => (
            <div key={`tld-skel-${item}`} style={{ animationDelay: `${i * 80}ms` }}>
              <DomainCardSkeleton />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
