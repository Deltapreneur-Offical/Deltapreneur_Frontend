import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 280;
const VIEWPORT_PAD = 12;
const GAP = 10;
const CLOSE_DELAY_MS = 100;

export default function PremiumInfoTooltip({
  title,
  paragraphs = [],
  ariaLabel = 'More information',
  triggerClassName = '',
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
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - width - VIEWPORT_PAD));

    const top = rect.top - GAP;

    setStyle({
      position: 'fixed',
      top,
      left,
      width,
      transform: 'translateY(-100%)',
      zIndex: 10060,
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
          className={`relative rounded-[14px] bg-[#0F172A] px-4 py-3.5 text-[13px] leading-[1.6] shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out ${
            visible ? 'translate-y-0' : 'translate-y-1'
          }`}
        >
          {title && (
            <p className="mb-2 text-[14px] font-bold leading-snug text-white">
              {title}
            </p>
          )}
          {paragraphs.map((text) => (
            <p key={text.slice(0, 24)} className="text-[#CBD5E1] [&+p]:mt-2.5">
              {text}
            </p>
          ))}
          <span
            className="absolute left-1/2 bottom-0 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 bg-[#0F172A]"
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
        className={`flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e8d4b0] bg-white text-[0.62rem] font-bold leading-none text-[#b8862d] transition-colors duration-200 hover:border-[#d4a96a] hover:bg-[#fff9f0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a96a]/50 ${triggerClassName}`}
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={(e) => {
          if (!tooltipRef.current?.contains(e.relatedTarget)) hide();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        ?
      </button>
      {tooltip}
    </>
  );
}
