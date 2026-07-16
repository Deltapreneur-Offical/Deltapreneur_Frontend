import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart } from 'lucide-react';

const ANIMATION_DURATION = 650;

export default function CartFlyAnimation({ fromRect, onComplete }) {
  const [phase, setPhase] = useState('start');
  const [coords, setCoords] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !fromRect) return;
    started.current = true;

    const cartEl = document.querySelector('[data-cart-icon]');
    const toRect = cartEl?.getBoundingClientRect();
    if (!toRect) {
      onComplete?.();
      return;
    }

    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;

    setCoords({ startX, startY, endX, endY });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('fly'));
    });

    const timer = setTimeout(() => {
      if (cartEl) {
        cartEl.classList.add('animate-bounce');
        setTimeout(() => cartEl.classList.remove('animate-bounce'), 500);
      }
      onComplete?.();
    }, ANIMATION_DURATION + 50);

    return () => clearTimeout(timer);
  }, [fromRect, onComplete]);

  if (!coords) return null;

  const { startX, startY, endX, endY } = coords;
  const flying = phase === 'fly';

  return createPortal(
    <div
      className="pointer-events-none fixed z-[99999] flex items-center justify-center rounded-full bg-gradient-to-br from-[#c8a96e] to-[#b8944e] text-white shadow-lg transition-all ease-out"
      style={{
        left: flying ? endX - 8 : startX - 14,
        top: flying ? endY - 8 : startY - 14,
        width: flying ? 16 : 28,
        height: flying ? 16 : 28,
        opacity: flying ? 0.25 : 1,
        transform: flying ? 'scale(0.35)' : 'scale(1)',
        transitionDuration: `${ANIMATION_DURATION}ms`,
        transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <ShoppingCart size={flying ? 10 : 14} />
    </div>,
    document.body,
  );
}
