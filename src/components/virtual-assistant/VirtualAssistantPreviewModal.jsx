import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import VirtualAssistantPreviewPanel from './VirtualAssistantPreviewPanel';

export default function VirtualAssistantPreviewModal({
  profile,
  open,
  onClose,
  hireIntent = false,
  showShareIcon = true,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    queueMicrotask(() => {
      const firstFocusable = dialogRef.current?.querySelector('button,[href],[tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus?.();
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !profile || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Virtual assistant preview"
        className="relative flex h-[85vh] w-full max-w-[850px] flex-col overflow-x-hidden overflow-y-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_32px_96px_-16px_rgba(15,23,42,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        <VirtualAssistantPreviewPanel
          profile={profile}
          onClose={onClose}
          hireIntent={hireIntent}
          showShareIcon={showShareIcon}
          embedded
        />
      </div>
    </div>,
    document.body,
  );
}
