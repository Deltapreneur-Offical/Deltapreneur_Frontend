import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import RoundInkStamp from '../domainHeroCarousel/RoundInkStamp';

const statusStyles = {
  sold: 'border-emerald-200/90 bg-emerald-50/95 text-emerald-700 shadow-[0_8px_18px_rgba(16,185,129,0.14)]',
  unsold: 'border-rose-200/90 bg-rose-50/95 text-rose-700 shadow-[0_8px_18px_rgba(244,63,94,0.14)]',
  live: 'border-indigo-200/90 bg-indigo-50/95 text-indigo-700 shadow-[0_8px_18px_rgba(99,102,241,0.14)]',
};

const statusLabels = {
  sold: 'SOLD',
  unsold: 'UNSOLD',
  live: 'LIVE',
};

const STATUS_REVEAL_DELAY_MS = 3750;

function StatusStamp({ status }) {
  const variant = status === 'sold' ? 'sold' : status === 'live' ? 'live' : 'unsold';

  return (
    <div className="pointer-events-none absolute inset-y-2 right-3 z-20 flex w-[94px] items-center justify-center sm:right-4 sm:w-[104px]">
      <motion.span
        className="absolute h-[62px] w-[62px] rounded-full bg-slate-400/8 blur-md sm:h-[70px] sm:w-[70px]"
        initial={{ opacity: 0, scale: 0.35 }}
        animate={{
          opacity: [0, 0.14, 0.28, 0.22, 0.18, 0],
          scale: [0.35, 0.72, 1.18, 1.04, 1, 0.92],
        }}
        transition={{ duration: 3.45, times: [0, 0.38, 0.6, 0.72, 0.86, 1], ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute h-[72px] w-[72px] rounded-full bg-white/30 opacity-0 blur-sm sm:h-[80px] sm:w-[80px]"
        animate={{ opacity: [0, 0, 0.22, 0.06, 0], scale: [0.7, 0.9, 1.12, 1.02, 0.95] }}
        transition={{ duration: 3.45, times: [0, 0.5, 0.62, 0.82, 1], ease: 'easeOut' }}
      />
      <motion.div
        className="relative z-10 flex h-[78px] w-[78px] origin-center items-center justify-center sm:h-[86px] sm:w-[86px]"
        initial={{ opacity: 0, scale: 1.58, rotate: -28, y: -42, filter: 'blur(5px)' }}
        animate={{
          opacity: [0, 0.72, 1, 1, 1, 0],
          scale: [1.58, 1.25, 0.92, 1.045, 1, 0.98],
          rotate: [-28, -20, -10, -13, -12, -12],
          y: [-42, -14, 4, -2, 0, 0],
          filter: [
            'blur(5px)',
            'blur(2px)',
            'blur(0px)',
            'blur(0px)',
            'blur(0px)',
            'blur(0px)',
          ],
        }}
        transition={{
          duration: 3.45,
          times: [0, 0.38, 0.6, 0.72, 0.86, 1],
          ease: [0.16, 0.88, 0.22, 1],
        }}
        style={{
          transformOrigin: '50% 58%',
        }}
      >
        <motion.div
          className="h-full w-full"
          animate={{ scaleY: [1, 1, 0.86, 1.06, 1, 1] }}
          transition={{ duration: 3.45, times: [0, 0.52, 0.6, 0.72, 0.86, 1], ease: [0.2, 0.9, 0.22, 1] }}
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(15, 23, 42, 0.08))',
            transformOrigin: '50% 64%',
          }}
        >
          <RoundInkStamp variant={variant} size="md" className="h-full w-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status, visible }) {
  const label = statusLabels[status] || statusLabels.unsold;

  return (
    <motion.span
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
        statusStyles[status] || statusStyles.unsold
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.96 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!visible}
    >
      {label}
    </motion.span>
  );
}

const SmallDomainTickerCard = memo(function SmallDomainTickerCard({
  item,
  slotId,
  index = 0,
  focused = false,
  statusVisible = false,
  onStatusReveal,
  cardWidth = 224,
}) {
  const [stampRunId, setStampRunId] = useState(0);

  useEffect(() => {
    if (!focused || statusVisible) return undefined;

    if (item.status === 'live') {
      onStatusReveal?.(slotId);
      return undefined;
    }

    setStampRunId((current) => current + 1);
    const statusTimer = window.setTimeout(() => {
      onStatusReveal?.(slotId);
    }, STATUS_REVEAL_DELAY_MS);

    return () => window.clearTimeout(statusTimer);
  }, [focused, item.status, onStatusReveal, slotId, statusVisible]);

  return (
    <motion.article
      className="domain-ticker-card group relative flex h-[86px] shrink-0 items-center justify-between gap-3 overflow-visible rounded-2xl border border-slate-100/80 bg-white px-4 py-3 sm:h-[90px] sm:px-5"
      style={{ width: cardWidth }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 5) * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white" />
      {focused && !statusVisible && item.status !== 'live' ? (
        <StatusStamp key={stampRunId} status={item.status} />
      ) : null}

      <div className="relative min-w-0 flex-1 pr-1">
        <p className="whitespace-nowrap text-[13px] font-bold leading-tight text-slate-900 sm:text-[15px]">
          {item.domain}
        </p>
        <p className="mt-1.5 whitespace-nowrap text-[11px] font-medium text-slate-500 sm:text-[12px]">
          {item.owner || 'Verified buyer'}
        </p>
      </div>

      <div className="relative z-10 flex h-10 w-[94px] shrink-0 items-center justify-center sm:w-[104px]">
        {statusVisible ? <StatusBadge status={item.status} visible /> : null}
      </div>
    </motion.article>
  );
});

export default SmallDomainTickerCard;
