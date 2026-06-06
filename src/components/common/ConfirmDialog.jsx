import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false,
  onConfirm, onCancel,
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-6 animate-fadeIn backdrop-blur-md"
      style={{ background: 'rgba(17, 24, 39, 0.42)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="relative w-full max-w-[420px] text-center bg-white border border-gray-200 rounded-2xl shadow-[0_24px_60px_rgba(17,24,39,0.2)] animate-slideUp overflow-hidden p-9 mx-4 md:mx-0">
        {/* Glow Effect */}
        <div 
          className="absolute -top-20 -right-20 w-[250px] h-[250px] rounded-full blur-[80px] pointer-events-none opacity-[0.18]"
          style={{ background: '#e0e7ff' }}
        />

        {/* Icon */}
        <div className="text-[2rem] mb-3 relative z-10">
          {danger ? '⚠️' : '❓'}
        </div>

        {/* Title */}
        <h2 className="font-display text-[1.65rem] font-semibold mb-2 text-gray-900 relative z-10">
          {title}
        </h2>

        {/* Message */}
        {message && (
          <p className="text-gray-600 text-[0.9rem] mb-6 leading-relaxed relative z-10">
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center items-center w-full max-w-[360px] mx-auto relative z-10">
          <button
            onClick={onConfirm}
            className={`btn-glow flex-1 min-w-0 ${
              danger ? 'border-red-400 text-red-600' : ''
            }`}
          >
            {resolvedConfirm}
          </button>
          <button 
            onClick={onCancel} 
            className="btn-glow flex-1 min-w-0"
          >
            {resolvedCancel}
          </button>
        </div>
      </div>
    </div>
  );
}