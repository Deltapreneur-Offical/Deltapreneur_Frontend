import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_PAD = 12;
const GAP = 8;

export default function TruncatedItemsTooltip({ items = [], title, children }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimerRef = useRef(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const maxItemLen = Math.max(10, ...items.map((it) => String(it).length));
    const estimatedWidth = Math.min(260, Math.max(130, maxItemLen * 8.5 + 28));

    let left = rect.left + rect.width / 2 - estimatedWidth / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - estimatedWidth - VIEWPORT_PAD));

    const spaceAbove = rect.top;
    const positionAbove = spaceAbove >= 80;

    const top = positionAbove ? rect.top - GAP : rect.bottom + GAP;

    setStyle({
      position: 'fixed',
      top,
      left,
      minWidth: 120,
      maxWidth: 260,
      transform: positionAbove ? 'translateY(-100%)' : 'translateY(0)',
      zIndex: 99999,
    });
  }, [items]);

  const openTooltip = useCallback(() => {
    if (!items || items.length === 0) return;
    clearHideTimer();
    updatePosition();
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, [items, updatePosition, clearHideTimer]);

  const closeTooltip = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setOpen(false), 120);
    }, 80);
  }, [clearHideTimer]);

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
      closeTooltip();
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open, closeTooltip]);

  const tooltip =
    open &&
    style &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={style}
        className="pointer-events-auto select-none"
        onMouseEnter={clearHideTimer}
        onMouseLeave={closeTooltip}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div
          className={`rounded-xl border border-blue-200/90 bg-blue-50/95 backdrop-blur-md px-3.5 py-2.5 text-xs leading-relaxed text-slate-800 shadow-[0_8px_24px_rgba(37,99,235,0.18)] transition-all duration-150 ease-out ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {title && (
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 mb-1 border-b border-blue-200/80 pb-1">
              {title}
            </div>
          )}
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
            {items.map((item, idx) => (
              <span key={idx} className="font-semibold text-[12px] text-slate-800 break-words leading-tight">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex cursor-pointer select-none"
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
