/**
 * Premium accordion header + panel shell for checkout add-on cards.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

const THEMES = {
  purple: {
    card: 'bg-[#f4f1ff] border-[#d8cff5] hover:bg-[#ede8ff] focus-visible:ring-[#a89ad4]/40',
    cardOpen: 'rounded-t-xl border-b-0',
    cardClosed: 'rounded-xl',
    iconBox: 'bg-white border-[#d8cff5] text-[#5b4f9a]',
    title: 'text-[#2e2860]',
    toggle: 'text-[#6b5fc7]',
    panel: 'border-[#d8cff5] bg-white',
    panelHint: 'bg-[#f8f6ff] border-[#e8e2f8] text-[#4a4478]',
    badge: 'bg-[#6b5fc7]',
    tooltip: 'border-[#d4c9f0] bg-white text-[#6b5fc7] hover:bg-[#f4f1ff]',
  },
  amber: {
    card: 'bg-[#fff9f0] border-[#ecd9b8] hover:bg-[#fff4e6] focus-visible:ring-[#d4a96a]/40',
    cardOpen: 'rounded-t-xl border-b-0',
    cardClosed: 'rounded-xl',
    iconBox: 'bg-white border-[#ecd9b8] text-[#c9922e]',
    title: 'text-[#5c3f1e]',
    toggle: 'text-[#b8862d]',
    panel: 'border-[#ecd9b8] bg-white',
    panelHint: 'bg-[#fffbf5] border-[#f0e4d0] text-[#6b4e28]',
    badge: 'bg-[#c9922e]',
    tooltip: 'border-[#e8d4b0] bg-white text-[#b8862d] hover:bg-[#fff9f0]',
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
