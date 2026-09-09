import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

const CONFIRM_BTN_STYLE =
  'flex w-full min-h-[2.75rem] items-center justify-center rounded-full border border-gray-900 bg-white px-4 text-center text-sm font-semibold leading-none whitespace-nowrap text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Usage:
 * <ConfirmDialog
 *   open={showConfirm}
 *   title="Delete Venture?"
 *   message="This cannot be undone."
 *   confirmLabel="Delete"
 *   danger
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 * />
 */
export default function ConfirmDialog({
  open, title, message,
  confirmLabel, cancelLabel,
  danger = false,
  loading = false,
  onConfirm, onCancel,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel, loading]);

  const resolvedConfirm = confirmLabel ?? t('confirm');
  const resolvedCancel = cancelLabel ?? t('cancel');

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-900/40 p-6 backdrop-blur-md animate-fadeIn"
      style={{ zIndex: 11000 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="relative mx-4 w-full max-w-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-9 text-center shadow-[0_24px_60px_rgba(17,24,39,0.2)] animate-slideUp md:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-[250px] w-[250px] rounded-full bg-indigo-100 opacity-20 blur-[80px]"
          aria-hidden
        />

        <div className="relative z-10 mb-3 text-[2rem]">
          {danger ? '⚠️' : '❓'}
        </div>

        <h2
          id="confirm-dialog-title"
          className="relative z-10 mb-2 font-display text-[1.65rem] font-semibold text-gray-900"
        >
          {title}
        </h2>

        {message ? (
          <p className="relative z-10 mb-6 text-[0.9rem] leading-relaxed text-gray-600">
            {message}
          </p>
        ) : null}

        <div className="relative z-10 mx-auto grid w-full max-w-[360px] grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={CONFIRM_BTN_STYLE}
          >
            {resolvedConfirm}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={CONFIRM_BTN_STYLE}
          >
            {resolvedCancel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
