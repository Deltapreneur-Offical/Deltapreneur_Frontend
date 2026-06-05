import { useState, useEffect, useCallback } from 'react';

const COLORS = ['#9440dd', '#7c3aed', '#6366f1', '#50BF78', '#fbbf24', '#ec4899', '#f97316', '#f43f5e', '#facc15'];
const SHAPES = ['circle', 'square', 'rectangle'];

function rand(a, b) { return a + Math.random() * (b - a); }

function makeBurst(count, originX, originY) {
  return Array.from({ length: count }, (_, i) => {
    const angle = rand(0, 2 * Math.PI);
    const velocity = rand(200, 600);
    const txEnd = Math.cos(angle) * velocity;
    const tyEnd = Math.sin(angle) * velocity - rand(100, 400);
    const shape = SHAPES[i % SHAPES.length];
    const size = rand(6, 16);
    return {
      id: `${originX}-${i}-${Date.now()}`,
      color: COLORS[i % COLORS.length],
      shape,
      size,
      originX,
      originY,
      txEnd,
      tyEnd,
      rotation: rand(-720, 720),
      duration: rand(1.2, 2.2),
      delay: rand(0, 0.08),
    };
  });
}

export default function Confetti({ show }) {
  const [particles, setParticles] = useState([]);
  const [visible, setVisible] = useState(false);

  const fireBlasts = useCallback(() => {
    const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const burst1 = makeBurst(80, cx - 100, -20);
    const burst2 = makeBurst(80, cx + 100, -20);

    setParticles(burst1);
    setVisible(true);

    setTimeout(() => {
      setParticles(prev => [...prev, ...burst2]);
    }, 300);

    setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (show) fireBlasts();
  }, [show, fireBlasts]);

  if (!visible || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map(p => {
        const w = p.shape === 'rectangle' ? p.size * 1.8 : p.size;
        const h = p.shape === 'rectangle' ? p.size * 0.6 : p.size;
        return (
          <div
            key={p.id}
            className="absolute animate-confetti-burst"
            style={{
              left: `${p.originX}px`,
              top: `${p.originY}px`,
              width: `${w}px`,
              height: `${h}px`,
              backgroundColor: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              '--tx-start': '0px',
              '--ty-start': '0px',
              '--tx-end': `${p.txEnd}px`,
              '--ty-end': `${p.tyEnd + 800}px`,
              '--rotation': `${p.rotation}deg`,
              '--duration': `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              opacity: 0.95,
            }}
          />
        );
      })}
    </div>
  );
}
