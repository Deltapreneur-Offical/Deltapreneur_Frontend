import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/confetti-burst.css';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e', '#eab308'];
const SHAPES = ['circle', 'square', 'rectangle'];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function makeFallParticles(count) {
  return Array.from({ length: count }, (_, i) => {
    const shape = SHAPES[i % SHAPES.length];
    const size = rand(8, 16);
    return {
      id: `fall-${i}`,
      color: COLORS[i % COLORS.length],
      shape,
      size,
      left: rand(0, 100),
      delay: rand(0, 1.8),
      duration: rand(2.8, 4.8),
      rotation: rand(0, 720),
    };
  });
}

function makeBurstParticles(count, originX, originY) {
  return Array.from({ length: count }, (_, i) => {
    const angle = rand(0, Math.PI * 2);
    const velocity = rand(280, 720);
    const shape = SHAPES[i % SHAPES.length];
    const size = rand(8, 18);
    return {
      id: `burst-${originX}-${i}`,
      color: COLORS[i % COLORS.length],
      shape,
      size,
      originX,
      originY,
      txEnd: Math.cos(angle) * velocity,
      tyEnd: Math.sin(angle) * velocity + rand(120, 420),
      rotation: rand(-720, 720),
      duration: rand(1.4, 2.4),
      delay: rand(0, 0.12),
    };
  });
}

function Particle({ particle, variant }) {
  const w = particle.shape === 'rectangle' ? particle.size * 1.8 : particle.size;
  const h = particle.shape === 'rectangle' ? particle.size * 0.6 : particle.size;
  const radius = particle.shape === 'circle' ? '50%' : '2px';

  if (variant === 'fall') {
    return (
      <div
        className="tech-listing-celebration__particle animate-confetti-fall"
        style={{
          left: `${particle.left}vw`,
          width: `${w}px`,
          height: `${h}px`,
          backgroundColor: particle.color,
          borderRadius: radius,
          '--rotation': `${particle.rotation}deg`,
          '--duration': `${particle.duration}s`,
          animationDelay: `${particle.delay}s`,
        }}
      />
    );
  }

  return (
    <div
      className="tech-listing-celebration__particle tech-listing-celebration__particle--burst animate-confetti-burst"
      style={{
        left: `${particle.originX}px`,
        top: `${particle.originY}px`,
        width: `${w}px`,
        height: `${h}px`,
        backgroundColor: particle.color,
        borderRadius: radius,
        '--tx-start': '0px',
        '--ty-start': '0px',
        '--tx-end': `${particle.txEnd}px`,
        '--ty-end': `${particle.tyEnd}px`,
        '--rotation': `${particle.rotation}deg`,
        '--duration': `${particle.duration}s`,
        animationDelay: `${particle.delay}s`,
      }}
    />
  );
}

const CELEBRATION_MS = 4800;

export default function ConfettiBurst({ active, onDone }) {
  const [particles, setParticles] = useState({ fall: [], burst: [] });

  useEffect(() => {
    if (!active) {
      setParticles({ fall: [], burst: [] });
      return undefined;
    }

    const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
    const fall = makeFallParticles(90);
    const burst1 = makeBurstParticles(70, cx - 120, cy - 40);
    const burst2 = makeBurstParticles(70, cx + 120, cy - 40);
    const burst3 = makeBurstParticles(50, cx, cy - 80);

    setParticles({ fall, burst: burst1 });

    const t2 = setTimeout(() => {
      setParticles((prev) => ({ ...prev, burst: [...prev.burst, ...burst2] }));
    }, 280);
    const t3 = setTimeout(() => {
      setParticles((prev) => ({ ...prev, burst: [...prev.burst, ...burst3] }));
    }, 520);
    const done = setTimeout(() => onDone?.(), CELEBRATION_MS);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(done);
    };
  }, [active, onDone]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="tech-listing-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="tech-listing-celebration__backdrop" aria-hidden />

          <div className="tech-listing-celebration__confetti-layer" aria-hidden>
            {particles.fall.map((p) => (
              <Particle key={p.id} particle={p} variant="fall" />
            ))}
            {particles.burst.map((p) => (
              <Particle key={p.id} particle={p} variant="burst" />
            ))}
          </div>

          <motion.div
            className="tech-listing-celebration__card"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            role="status"
            aria-live="polite"
          >
            <div className="tech-listing-celebration__icon" aria-hidden>
              🎉
            </div>
            <h2 className="tech-listing-celebration__title">Technology listing published!</h2>
            <p className="tech-listing-celebration__subtitle">
              Your listing is live on the marketplace. Admin verification may be required before buyers can purchase.
            </p>
            <span className="tech-listing-celebration__badge">
              <span aria-hidden>✓</span> Listing published
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
