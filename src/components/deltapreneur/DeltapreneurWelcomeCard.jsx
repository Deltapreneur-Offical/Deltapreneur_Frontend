import { useMemo } from 'react';
import { PartyPopper, X } from 'lucide-react';

const CONFETTI_COLORS = ['#ff9933', '#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#eab308'];

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => {
  const seed = (i * 2654435761) % 1000;
  return {
    left: `${(seed % 100)}%`,
    delay: `${((seed >> 2) % 28) / 10}s`,
    drift: `${(((seed >> 3) % 80) - 40)}px`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    scale: 0.7 + ((seed >> 4) % 60) / 100,
  };
});

/**
 * DeltapreneurWelcomeCard — celebration shown once after a new Deltapreneur
 * completes their profile details following the LinkedIn connect. Pure UI:
 * confetti burst + congratulation copy, dismissible.
 */
export default function DeltapreneurWelcomeCard({ name, onDismiss }) {
  const pieces = useMemo(() => CONFETTI_PIECES, []);
  const firstName = String(name || '').trim().split(/\s+/)[0] || '';

  return (
    <section
      className="dp-scale-in relative mb-8 overflow-hidden rounded-3xl border border-orange-200/70 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-8 text-center shadow-[0_24px_64px_-24px_rgba(255,153,51,0.35)] sm:p-10"
      role="status"
      aria-live="polite"
    >
      {/* confetti layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="dp-confetti"
            style={{
              left: p.left,
              animationDelay: p.delay,
              background: p.color,
              transform: `scale(${p.scale})`,
              '--dp-drift': p.drift,
            }}
          />
        ))}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      ) : null}

      <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
        <PartyPopper className="text-white" size={30} />
      </div>

      <h2 className="relative font-display text-3xl font-bold text-slate-900 sm:text-4xl">
        🎉 Congratulations{name ? `, ${firstName}` : ''}!
      </h2>
      <p className="relative mt-2 font-display text-xl font-semibold text-orange-600">
        Welcome to the Deltapreneur community!
      </p>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        We&apos;re glad to have you with us. Your Deltapreneur profile is live — showcase it, connect
        with founders, and explore operator privileges.
      </p>
    </section>
  );
}
