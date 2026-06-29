import { Fragment, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronRight, X } from 'lucide-react';

function VerificationStepperOnly({ verified }) {
  const { t } = useTranslation();
  const activeStep = verified ? 3 : 2;

  const steps = [
    { label: t('techVerifyStepListed', 'Listed'), hint: t('techVerifyStepListedHint', 'Your technology is on CoɃrother') },
    { label: t('techVerifyStepReview', 'Under review'), hint: t('techVerifyStepReviewHint', 'Waiting period: 2–3 business days') },
    { label: t('techVerifyStepVerified', 'Verified'), hint: t('techVerifyStepVerifiedHint', 'Available to buyers') },
  ];

  const stateFor = (stepNum) => {
    if (stepNum < activeStep) return 'done';
    if (stepNum === activeStep && !verified) return 'active';
    if (stepNum === 3 && verified) return 'done';
    return 'pending';
  };

  const circleClass = (state) => {
    if (state === 'done') {
      return 'bg-emerald-500 border-emerald-500 text-white';
    }
    if (state === 'active') {
      return 'bg-amber-50 border-amber-500 text-amber-800';
    }
    return 'bg-white border-gray-300 text-gray-400';
  };

  const labelClass = (state) => {
    if (state === 'done') return 'text-emerald-700';
    if (state === 'active') return 'text-amber-800';
    return 'text-gray-400';
  };

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-center w-full max-w-[360px] mx-auto">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const state = stateFor(stepNum);
          return (
            <Fragment key={step.label}>
              {index > 0 && (
                <div
                  className={[
                    'h-1 w-10 sm:w-14 shrink-0 rounded-full',
                    index < activeStep ? 'bg-emerald-400' : 'bg-gray-200',
                  ].join(' ')}
                  aria-hidden
                />
              )}
              <div
                className={[
                  'w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full flex items-center justify-center text-base font-bold border-2',
                  circleClass(state),
                ].join(' ')}
              >
                {state === 'done' ? <Check size={24} strokeWidth={3} /> : stepNum}
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5 max-w-[360px] mx-auto w-full">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const state = stateFor(stepNum);
          return (
            <div key={`${step.label}-lbl`} className="flex flex-col items-center text-center min-w-0">
              <p className={`text-xs sm:text-sm font-semibold leading-tight m-0 ${labelClass(state)}`}>
                {step.label}
              </p>
              <p className="mt-1.5 text-[0.65rem] sm:text-[11px] leading-snug m-0 text-gray-500 px-0.5">
                {step.hint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Portal modal on document.body — render once at page level. */
export function VerificationProgressModal({ open, onClose, verified, itemName }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(17, 24, 39, 0.55)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-verify-modal-title"
    >
      <div
        className="relative w-full max-w-[440px] bg-white rounded-2xl border border-gray-200 shadow-2xl px-6 py-8 sm:px-8 sm:py-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          onClick={onClose}
          aria-label={t('close')}
        >
          <X size={22} />
        </button>

        <h2
          id="tech-verify-modal-title"
          className="font-display text-xl sm:text-2xl font-semibold text-gray-900 text-center pr-8 m-0"
        >
          {t('techVerifyModalTitle', 'Verification progress')}
        </h2>
        {itemName ? (
          <p className="text-sm text-gray-500 text-center mt-1 mb-0">{itemName}</p>
        ) : null}

        <div className="mt-10 sm:mt-12">
          <VerificationStepperOnly verified={verified} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Button trigger only — parent owns modal open/close. */
export function TechnologyVerificationTrigger({
  verified,
  onOpen,
  className = '',
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`w-full ${className}`}
      data-tech-verify-zone
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2.5 text-left transition-colors hover:bg-indigo-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOpen();
        }}
      >
        <span className="text-[0.72rem] font-semibold text-indigo-900 leading-snug">
          {verified ? t('techVerifyTrackerTitleDone') : t('techVerifyTrackerTitle')}
        </span>
        <ChevronRight size={16} className="flex-shrink-0 text-indigo-600" />
      </button>
    </div>
  );
}
