import { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const buttonVariantMap = {
  green: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
  blue: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  red: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  orange: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
  neutral: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400',
};

export { buttonVariantMap };

export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'neutral',
  loading = false,
  loadingLabel = 'Working...',
  size = 'md',
  confirmDisabled = false,
  bodyClassName = '',
  panelClassName = '',
  footerClassName = '',
  children,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;

  const sizeClassMap = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-[820px]',
  };
  const maxWidthClass = sizeClassMap[size] || sizeClassMap.md;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-gray-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className={`flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl ${maxWidthClass} ${panelClassName}`}
      >
        <div className="shrink-0 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <span
              className={`rounded-full p-2 ${
                variant === 'red' || variant === 'orange'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="confirmation-modal-title" className="text-lg font-semibold text-gray-950">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
            </div>
          </div>
        </div>
        {children && (
          <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5 sm:px-6 ${bodyClassName}`}>
            {children}
          </div>
        )}
        <div className={`shrink-0 border-t border-gray-200 bg-white px-5 py-4 sm:px-6 ${footerClassName}`}>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${buttonVariantMap[variant] || buttonVariantMap.neutral}`}
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? loadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
