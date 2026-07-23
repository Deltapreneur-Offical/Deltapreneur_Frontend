import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShoppingBag, X } from 'lucide-react';

/**
 * Explains why premium / managed-acquisition domains (> ₹5L) need a dedicated cart.
 * Portaled to document.body so card overflow/transform cannot clip the overlay.
 */
export default function PremiumCartConflictModal({
  open,
  onClose,
  onGoToCart,
  onClearAndRetry,
  clearing = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !clearing) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, clearing, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4"
      style={{
        // Avoid backdrop-filter here — it breaks under transformed ancestors
        // and can leave a partial-screen “cut” artifact. Dim is enough.
        isolation: 'isolate',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !clearing) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-cart-conflict-title"
    >
      <div className="relative w-full max-w-[480px] max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl border border-amber-100/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600" />
        <button
          type="button"
          onClick={() => !clearing && onClose?.()}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-7 pb-6 sm:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">
            <ShieldCheck size={13} />
            Managed acquisition
          </div>
          <h2
            id="premium-cart-conflict-title"
            className="font-display text-[1.55rem] font-extrabold leading-tight text-slate-900 pr-8"
          >
            Premium domains need a dedicated checkout
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Domains priced above <strong className="text-slate-900">₹5,00,000</strong> are not
            available for instant online payment. CoBrother personally manages verification,
            seller coordination, and secure transfer — so this domain must sit alone in your cart.
          </p>

          <ul className="mt-4 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-[13px] text-slate-700">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-amber-600">1.</span>
              <span>Clear other items from your cart (or complete them separately).</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-amber-600">2.</span>
              <span>Add this premium domain alone and submit an acquisition request.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-amber-600">3.</span>
              <span>Our team guides payment and transfer — no charge until we contact you.</span>
            </li>
          </ul>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            {onClearAndRetry && (
              <button
                type="button"
                disabled={clearing}
                onClick={onClearAndRetry}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <ShoppingBag size={15} />
                {clearing ? 'Clearing…' : 'Clear cart & continue'}
              </button>
            )}
            <button
              type="button"
              disabled={clearing}
              onClick={onGoToCart || onClose}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Review cart
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
