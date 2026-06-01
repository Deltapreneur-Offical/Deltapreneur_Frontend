import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_MAX_WIDTH = 320;
const VIEWPORT_PAD = 12;
const GAP = 8;

export default function LearnMoreTooltip({ label = 'Learn More', children }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const maxWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);

    let left = rect.left + rect.width / 2 - maxWidth / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - maxWidth - VIEWPORT_PAD));

    const top = rect.top - GAP;

    setStyle({
      position: 'fixed',
      top,
      left,
      maxWidth,
      width: maxWidth,
      transform: 'translateY(-100%)',
      zIndex: 10050,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (triggerRef.current?.contains(t) || tooltipRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const tooltip =
    open &&
    style &&
    createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        style={style}
        className="px-3.5 py-3 text-xs leading-relaxed text-gray-700 bg-white border border-gray-200 rounded-xl shadow-lg break-words whitespace-normal"
      >
        {children}
      </div>,
      document.body,
    );

  return (
    <>
      <span className="relative inline-flex items-center" ref={triggerRef}>
        <button
          type="button"
          className="text-xs font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {label}
        </button>
      </span>
      {tooltip}
    </>
  );
}
