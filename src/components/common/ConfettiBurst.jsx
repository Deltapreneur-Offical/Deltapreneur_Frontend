import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

function Particle({ index }) {
  const angle = (index / 24) * Math.PI * 2;
  const distance = 80 + (index % 5) * 28;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance - 40;
  const color = COLORS[index % COLORS.length];
  const size = 6 + (index % 4);

  return (
    <motion.span
      className="absolute left-1/2 top-1/2 rounded-sm pointer-events-none"
      style={{ width: size, height: size, backgroundColor: color, marginLeft: -size / 2, marginTop: -size / 2 }}
      initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      animate={{ opacity: 0, x, y, scale: 0.2, rotate: 180 + index * 15 }}
      transition={{ duration: 1.1 + (index % 3) * 0.15, ease: 'easeOut' }}
    />
  );
}

export default function ConfettiBurst({ active, onDone }) {
  useEffect(() => {
    if (!active) return undefined;
    const t = setTimeout(() => onDone?.(), 1400);
    return () => clearTimeout(t);
  }, [active, onDone]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[2000] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <Particle key={i} index={i} />
          ))}
          <motion.div
            className="absolute text-center px-6 py-4 bg-white/95 border border-indigo-100 rounded-2xl shadow-xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="text-2xl mb-1">🎉</div>
            <div className="font-display text-lg font-semibold text-gray-900">Technology listed!</div>
            <p className="text-sm text-gray-500 m-0 mt-1">Pending admin verification</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
