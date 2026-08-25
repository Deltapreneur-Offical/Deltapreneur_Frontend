import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export default function Confetti({ show }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!show) {
      firedRef.current = false;
      return;
    }

    if (firedRef.current) return;
    firedRef.current = true;

    try {
      const defaults = {
        particleCount: 180,
        spread: 90,
        startVelocity: 65,
        gravity: 0.85,
        decay: 0.92,
        ticks: 420,
        scalar: 1.15,
        zIndex: 99999,
        disableForReducedMotion: true,
      };

      confetti({
        ...defaults,
        angle: 55,
        origin: { x: 0, y: 0.05 },
      });
      confetti({
        ...defaults,
        angle: 125,
        origin: { x: 1, y: 0.05 },
      });
    } catch (err) {
      console.error('Confetti trigger failed:', err);
    }
  }, [show]);

  return null;
}
