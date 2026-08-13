import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2 } from 'lucide-react';
import SharePopover from './SharePopover';

const POPOVER_WIDTH = 320; // w-80
const POPOVER_HEIGHT = 416; // max-h on the popover (26rem) — used to flip above
const GAP = 8;

/**
 * Reusable Share button for domain result cards (Domain Search + AI Brand
 * Names). Renders a compact secondary button that opens the Share & Earn
 * popover.
 *
 * The popover is rendered through a portal directly into `document.body` with
 * fixed coordinates computed from the button's bounding rect, so it is always
 * drawn ABOVE the card grid — card hover transforms, sibling stacking contexts
 * and any `overflow` clipping can never hide or trap it.
 */
export default function ShareButton({
  shareType,
  domain,
  originalQuery,
  className = '',
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);
  const popoverRef = useRef(null);

  const updateAnchor = useCallback(() => {
    const el = btnRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    // Open BELOW the button when there is room, otherwise flip ABOVE so the
    // popover never spills off the bottom of the screen.
    const below = rect.bottom + GAP;
    const top =
      below + POPOVER_HEIGHT <= viewportH
        ? below
        : Math.max(GAP, rect.top - POPOVER_HEIGHT - GAP);
    setAnchor({
      top,
      left: Math.max(GAP, Math.min(rect.right - POPOVER_WIDTH, viewportW - POPOVER_WIDTH - GAP)),
      viewportW,
      viewportH,
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updateAnchor();

    const onPointerDown = (event) => {
      if (btnRef.current && btnRef.current.contains(event.target)) return;
      if (popoverRef.current && popoverRef.current.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Reposition while open so the popover follows the button on scroll/resize.
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('resize', updateAnchor);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [open, updateAnchor]);

  if (!shareType || !domain) return null;

  const portalStyle = anchor
    ? {
        position: 'fixed',
        top: anchor.top,
        left: anchor.left,
        zIndex: 9999,
      }
    : null;

  return (
    <>
      <div ref={btnRef} className="relative inline-flex">
        <button
          type="button"
          aria-label={`Share ${domain}`}
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen((v) => !v);
          }}
          className={`inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white font-bold text-gray-700 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 ${
            compact ? 'h-9 px-3 text-xs' : 'h-11 px-3.5 text-sm'
          } ${className}`}
        >
          <Share2 className={`shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          <span className="ml-1.5 whitespace-nowrap">Share</span>
        </button>
      </div>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div ref={popoverRef} style={portalStyle}>
              <SharePopover
                shareType={shareType}
                domain={domain}
                originalQuery={originalQuery}
                onClose={() => setOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
