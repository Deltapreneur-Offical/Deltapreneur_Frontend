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

    // Fire EXACTLY TWO confetti cannons simultaneously:
    // - Top-left cannon (origin.x ≈ 0, origin.y ≈ 0.05, angle ≈ 55°)
    // - Top-right cannon (origin.x ≈ 1, origin.y ≈ 0.05, angle ≈ 125°)
    // Both cannons fire once at the exact same instant, crossing in the center & cascading down.
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

      // Top-left cannon
      confetti({
        ...defaults,
        angle: 55,
        origin: { x: 0, y: 0.05 },
      });

      // Top-right cannon
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
