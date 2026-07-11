import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_MAX_WIDTH = 260;
const VIEWPORT_PAD = 12;
const GAP = 8;

export default function TruncatedTextTooltip({ text, className = '', children }) {
  const tooltipId = useId();
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimerRef = useRef(null);

  const checkTruncation = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return false;
    const child = trigger.firstElementChild;
    if (!child) return false;
    return child.scrollHeight > child.clientHeight + 1;
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

  const show = useCallback(() => {
    if (!isTruncated) return;
    clearHideTimer();
    updatePosition();
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, [isTruncated, updatePosition, clearHideTimer]);

  const hide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setOpen(false), 150);
    }, 100);
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
      hide();
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open, hide]);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    setIsTruncated(checkTruncation());
    const observer = new ResizeObserver(() => setIsTruncated(checkTruncation()));
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkTruncation, text, children]);

  const tooltip =
    open &&
    style &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={style}
        className="pointer-events-auto"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <div
          className={`rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-all duration-150 ease-out ${
            visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-[0.96]'
          }`}
        >
          <span className="block break-words whitespace-normal">{text || children}</span>
          <span
            className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-r border-b border-gray-200 bg-white"
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
        className={`relative inline-block ${className}`}
        tabIndex={isTruncated ? 0 : undefined}
        onMouseEnter={isTruncated ? show : undefined}
        onMouseLeave={isTruncated ? hide : undefined}
        onFocus={isTruncated ? show : undefined}
        onBlur={isTruncated ? hide : undefined}
        onClick={isTruncated ? (e) => { e.stopPropagation(); setOpen((v) => !v); } : undefined}
        onTouchStart={isTruncated ? (e) => { e.stopPropagation(); setOpen((v) => !v); } : undefined}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
