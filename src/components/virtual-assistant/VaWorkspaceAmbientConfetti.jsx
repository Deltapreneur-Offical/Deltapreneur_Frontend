import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import '../../styles/virtual-assistant-unlock.css';

const COLORS = ['#7c3aed', '#6366f1', '#50BF78', '#a78bfa', '#818cf8'];
const AMBIENT_MS = 90_000;
const PARTICLE_COUNT = 12;

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function makeParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `ambient-${i}`,
    color: COLORS[i % COLORS.length],
    left: rand(2, 98),
    size: rand(5, 9),
    duration: rand(7.5, 12),
    delay: rand(0, 6),
    rotation: rand(180, 540),
    tx: rand(-40, 40),
    round: i % 3 !== 0,
  }));
}

/**
 * Very low-density falling confetti for ~90s after unlock → workspace entry.
 * pointer-events: none; cleans up on unmount or timeout.
 */
export default function VaWorkspaceAmbientConfetti({ active = true, durationMs = AMBIENT_MS }) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(Boolean(active) && !reduceMotion);
  const particles = useMemo(
    () => (visible ? makeParticles(PARTICLE_COUNT) : []),
    // recreate once when becoming visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]
  );

  useEffect(() => {
    if (!active || reduceMotion) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [active, durationMs, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="va-workspace-ambient-confetti"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {particles.map((p) => (
            <span
              key={p.id}
              className="va-workspace-ambient-confetti__particle"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.round ? p.size : p.size * 0.55}px`,
                borderRadius: p.round ? '50%' : '2px',
                backgroundColor: p.color,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--rotation': `${p.rotation}deg`,
                '--tx': `${p.tx}px`,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
