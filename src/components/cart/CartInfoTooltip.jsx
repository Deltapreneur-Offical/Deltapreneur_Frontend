import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

const TOOLTIP_WIDTH = 300;
const VIEWPORT_PAD = 12;
const GAP = 10;
const CLOSE_DELAY_MS = 100;

export const VA_FOLLOW_UP_TOOLTIP =
  'This Virtual Assistant is requested as part of your order. A Deltapreneur team member will contact you after your purchase to understand your requirements, provide the final quotation, and collect payment separately if you choose to proceed.';

export const SERVICE_FOLLOW_UP_TOOLTIP =
  'This service is requested as part of your order. A Deltapreneur team member will contact you after your purchase to understand your requirements, provide the final quotation, and collect payment separately if you choose to proceed.';

/** @deprecated */
export const VA_CHECKOUT_TOOLTIP = VA_FOLLOW_UP_TOOLTIP;

/** @deprecated */
export const FOLLOW_UP_SERVICES_TOOLTIP = SERVICE_FOLLOW_UP_TOOLTIP;

export default function CartInfoTooltip({
  text,
  ariaLabel = 'More information',
  triggerClassName = '',
  maxWidth = TOOLTIP_WIDTH,
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const closeTimerRef = useRef(null);
  const tooltipId = useId();

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const show = () => {
    clearCloseTimer();
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const hide = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => setOpen(false), 200);
    }, CLOSE_DELAY_MS);
  };

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = Math.min(maxWidth, window.innerWidth - VIEWPORT_PAD * 2);

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - width - VIEWPORT_PAD));

    setStyle({
      position: 'fixed',
      top: rect.top - GAP,
      left,
      width,
      transform: 'translateY(-100%)',
      zIndex: 10060,
    });
  }, [maxWidth]);

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

  useEffect(() => () => clearCloseTimer(), []);

  const tooltip =
    open &&
    style &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        style={style}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`pointer-events-auto pb-2 transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`relative rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[12px] leading-relaxed text-gray-600 shadow-[0_12px_40px_rgba(15,23,42,0.14)] transition-transform duration-200 ease-out ${
            visible ? 'translate-y-0' : 'translate-y-1'
          }`}
        >
          <p>{text}</p>
          <span
            className="absolute left-1/2 bottom-0 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 border-r border-b border-gray-200 bg-white"
            aria-hidden="true"
          />
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${triggerClassName}`}
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={(e) => {
          if (!tooltipRef.current?.contains(e.relatedTarget)) hide();
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Info size={13} strokeWidth={2} aria-hidden />
      </button>
      {tooltip}
    </>
  );
}
