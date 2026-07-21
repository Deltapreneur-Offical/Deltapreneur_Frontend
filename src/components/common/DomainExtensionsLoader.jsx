import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import './domain-extensions-loader.css';

function SkeletonBone({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`.trim()} aria-hidden="true" />;
}

/** Compact card skeleton matching DomainCard proportions. */
export function DomainCardSkeleton({ featured = false }) {
  if (featured) {
    return (
      <div
        className="domain-search-card domain-search-card--featured rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-[0_6px_24px_rgba(15,23,42,0.06)]"
        aria-hidden="true"
      >
        <SkeletonBone className="mb-2.5 h-5 w-24 rounded-full" />
        <SkeletonBone className="mb-2.5 h-8 w-2/3 max-w-sm" />
        <SkeletonBone className="mb-3.5 h-7 w-28" />
        <SkeletonBone className="h-10 w-[30%] min-w-[7.5rem] max-w-[9.5rem] rounded-lg" />
      </div>
    );
  }

  return (
    <div
      className="domain-search-card flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]"
      aria-hidden="true"
    >
      <SkeletonBone className="mb-1.5 h-4 w-20 rounded-full" />
      <SkeletonBone className="mb-1.5 h-6 w-40" />
      <SkeletonBone className="mb-3 h-5 w-24" />
      <SkeletonBone className="h-9 w-[30%] min-w-[7rem] max-w-[9rem] rounded-lg" />
    </div>
  );
}

export const DOMAIN_LOADING_MESSAGES = [
  'Domains will appear as each batch finishes…',
  'Loading more extensions…',
  'Exploring more TLDs for you…',
  'Checking premium extensions…',
  'Looking for the best domain matches…',
  'More domains are on the way…',
  'Almost there…',
  'Did you know? We support hundreds of TLDs.',
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
 * Premium loading strip shown while remaining TLD waves load.
 * Rotating messages + three-dot indicator; unmounts when loading ends.
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

  return (
    <div
      className="domain-tld-loader space-y-3.5"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={activeMessage}
    >
      <div className="domain-tld-loader__pill">
        <span className="domain-tld-loader__icon" aria-hidden="true">
          <Sparkles size={14} strokeWidth={2.25} />
        </span>

        <div className="domain-tld-loader__message-wrap">
          <p className={`domain-tld-loader__message domain-tld-loader__message--${phase}`}>
            {activeMessage}
          </p>
        </div>

        <ThreeDotLoader />
      </div>

      {slots.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {slots.map((item) => (
            <DomainCardSkeleton key={`tld-skel-${item}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
