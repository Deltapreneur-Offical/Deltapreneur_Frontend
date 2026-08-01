/**
 * Premium accordion header + panel shell for checkout add-on cards.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

const THEMES = {
  purple: {
    card: 'bg-[#EFF6FF] border-[#BFDBFE] hover:bg-[#E0F2FE] focus-visible:ring-[#93C5FD]/40',
    cardOpen: 'rounded-t-xl border-b-0',
    cardClosed: 'rounded-xl',
    iconBox: 'bg-white border-[#BFDBFE] text-[#1D4ED8]',
    title: 'text-[#1E293B]',
    toggle: 'text-[#1D4ED8]',
    panel: 'border-[#BFDBFE] bg-white',
    panelHint: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E293B]',
    badge: 'bg-[#1D4ED8]',
    tooltip: 'border-[#BFDBFE] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]',
  },
  amber: {
    card: 'bg-[#EFF6FF] border-[#BFDBFE] hover:bg-[#E0F2FE] focus-visible:ring-[#93C5FD]/40',
    cardOpen: 'rounded-t-xl border-b-0',
    cardClosed: 'rounded-xl',
    iconBox: 'bg-white border-[#BFDBFE] text-[#1D4ED8]',
    title: 'text-[#1E293B]',
    toggle: 'text-[#1D4ED8]',
    panel: 'border-[#BFDBFE] bg-white',
    panelHint: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E293B]',
    badge: 'bg-[#1D4ED8]',
    tooltip: 'border-[#BFDBFE] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]',
  },
};

function ChevronToggle({ open, className }) {
  return (
    <svg
      className={`w-2.5 h-2.5 shrink-0 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''} ${className || ''}`}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AddonAccordionCard({
  theme = 'purple',
  icon,
  title,
  tooltip,
  selectedCount = 0,
  open = false,
  onToggle,
  children,
  className = '',
}) {
  const { t } = useTranslation();
  const palette = THEMES[theme] || THEMES.purple;
  const panelId = useId();

  const handleHeaderKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={`addon-accordion ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleHeaderKeyDown}
        aria-expanded={open}
        aria-controls={panelId}
        className={`addon-accordion-trigger w-full flex items-center gap-2.5 px-3 py-3 min-h-[48px] border-2 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all duration-200 ease-out cursor-pointer focus:outline-none focus-visible:ring-2 ${palette.card} ${open ? palette.cardOpen : palette.cardClosed}`}
      >
        <span
          className={`addon-accordion-icon-box flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ${palette.iconBox}`}
        >
          {icon}
        </span>

        <span className="addon-accordion-title-wrap flex min-w-0 flex-1 items-center gap-1.5">
          <span className={`addon-accordion-title text-[0.74rem] sm:text-[0.8rem] font-extrabold leading-snug tracking-[-0.01em] ${palette.title}`}>
            {title}
          </span>
          {tooltip && (
            <span className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {tooltip}
            </span>
          )}
          {selectedCount > 0 && (
            <span className={`ml-1 inline-flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[0.55rem] font-bold text-white ${palette.badge}`}>
              {selectedCount}
            </span>
          )}
        </span>

        <span className={`addon-accordion-toggle flex shrink-0 items-center gap-1 text-[0.65rem] font-bold ${palette.toggle}`}>
          <ChevronToggle open={open} />
          <span>{open ? t('addonSelectorHideLabel') : t('addonSelectorShowLabel')}</span>
        </span>
      </div>

      {open && (
        <div
          id={panelId}
          className={`addon-accordion-panel overflow-hidden rounded-b-xl border-2 border-t-0 shadow-[0_4px_14px_rgba(15,23,42,0.04)] ${palette.panel}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
