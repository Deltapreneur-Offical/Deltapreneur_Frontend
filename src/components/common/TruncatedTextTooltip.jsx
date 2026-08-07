import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_MAX_WIDTH = 280;
const VIEWPORT_PAD = 12;
const GAP = 7;
const TOOLTIP_OPEN_EVENT = 'tooltip:open';

function isMobile() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent || '') || window.innerWidth <= 768;
}

export default function TruncatedTextTooltip({ text, className = '', children }) {
  const tooltipId = useId();
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placeBelow: false, maxWidth: TOOLTIP_MAX_WIDTH });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimerRef = useRef(null);
  const touchOpenedRef = useRef(false);

  const checkTruncation = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return false;
    const child = trigger.firstElementChild || trigger;
    return (
      child.scrollWidth > child.clientWidth + 1 ||
      child.scrollHeight > child.clientHeight + 1
    );
  }, []);

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
    const maxWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);

    // Check vertical space above trigger
    const placeBelow = rect.top < 65;
    const top = placeBelow ? rect.bottom + GAP : rect.top - GAP;

    // Center horizontal position on title trigger element, clamped within viewport bounds
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(VIEWPORT_PAD + 40, Math.min(centerX, window.innerWidth - VIEWPORT_PAD - 40));

    setPos({ top, left, placeBelow, maxWidth });
  }, []);

  const openTooltip = useCallback(() => {
    if (!isTruncated) return;
    clearHideTimer();
    updatePosition();
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, [isTruncated, updatePosition, clearHideTimer]);

  const closeTooltip = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setOpen(false), 150);
    }, 100);
  }, [clearHideTimer]);

  const toggleTooltip = useCallback(() => {
    if (!isTruncated) return;
    if (open) {
      closeTooltip();
    } else {
      openTooltip();
    }
  }, [isTruncated, open, closeTooltip, openTooltip]);

  useEffect(() => {
    const onGlobalOpen = () => {
      if (open) closeTooltip();
    };
    window.addEventListener(TOOLTIP_OPEN_EVENT, onGlobalOpen);
    return () => window.removeEventListener(TOOLTIP_OPEN_EVENT, onGlobalOpen);
  }, [open, closeTooltip]);

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

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    setIsTruncated(checkTruncation());
    const observer = new ResizeObserver(() => setIsTruncated(checkTruncation()));
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkTruncation, text, children]);

  useEffect(() => {
    if (!open) return undefined;
    const onTouchStart = () => {
      touchOpenedRef.current = true;
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => document.removeEventListener('touchstart', onTouchStart);
  }, [open]);

  const tooltipStyle = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    maxWidth: pos.maxWidth,
    width: 'max-content',
    transform: pos.placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
    zIndex: 10050,
  };

  const tooltip =
    open &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={tooltipStyle}
        className="pointer-events-auto"
        onMouseEnter={clearHideTimer}
        onMouseLeave={closeTooltip}
      >
        <div
          className={`relative rounded-[8px] border border-[#90CAF9] bg-[#E6F4FF] px-[10px] py-[6px] text-[13px] font-medium leading-snug text-[#1565C0] shadow-[0_4px_14px_rgba(21,101,192,0.14)] transition-all duration-150 ease-out ${
            visible
              ? 'opacity-100 translate-y-0 scale-100'
              : pos.placeBelow
              ? 'opacity-0 -translate-y-1 scale-95'
              : 'opacity-0 translate-y-1 scale-95'
          }`}
        >
          <span className="block break-words whitespace-normal text-center max-w-[260px]">
            {text || children}
          </span>
          <span
            className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#E6F4FF] ${
              pos.placeBelow
                ? 'bottom-full translate-y-1 border-l border-t border-[#90CAF9]'
                : 'top-full -translate-y-1 border-r border-b border-[#90CAF9]'
            }`}
            aria-hidden="true"
          />
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-block w-full max-w-full min-w-0 ${className}`}
        tabIndex={isTruncated ? 0 : undefined}
        onMouseEnter={isTruncated && !isMobile() ? openTooltip : undefined}
        onMouseLeave={isTruncated && !isMobile() ? closeTooltip : undefined}
        onFocus={isTruncated ? openTooltip : undefined}
        onBlur={isTruncated ? closeTooltip : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (touchOpenedRef.current) {
            touchOpenedRef.current = false;
            return;
          }
          toggleTooltip();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          if (!isTruncated) return;
          touchOpenedRef.current = true;
          if (!open) {
            openTooltip();
            window.dispatchEvent(new Event(TOOLTIP_OPEN_EVENT));
          } else {
            closeTooltip();
          }
        }}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
