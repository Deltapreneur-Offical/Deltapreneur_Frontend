import { Headset, ShieldCheck, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PUBLIC_OPERATIONS_SECTIONS } from '../../utils/operationsSections';

const SECTION_ICONS = {
  assistance: Headset,
  compliance: ShieldCheck,
  offices: Building2,
};

export default function OperationsSectionTabs({
  activeSectionId,
  onChange,
  counts = {},
  variant = 'public',
  ariaLabel,
}) {
  const { t } = useTranslation();
  const wrapperClass = [
    'operations-section-tabs',
    variant === 'admin' ? 'operations-section-tabs--admin' : 'operations-section-tabs--public',
  ].join(' ');

  return (
    <div className="operations-section-tabs-wrap">
      <p className="operations-section-tabs-eyebrow">
        {t('operationsPartitionEyebrow', { defaultValue: 'Two service areas' })}
      </p>
      <div
        className={wrapperClass}
        role="tablist"
        aria-label={ariaLabel || t('operationsPartitionLabel', { defaultValue: 'Operations sections' })}
      >
        {PUBLIC_OPERATIONS_SECTIONS.map((section) => {
          const isActive = activeSectionId === section.id;
          const TabIcon = SECTION_ICONS[section.id] || Headset;
          const count = counts[section.id];

          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[
                'operations-section-tab',
                `operations-section-tab--${section.theme}`,
                isActive ? 'is-active' : '',
                // Offices theme — inactive
                section.theme === 'offices' && !isActive && '!bg-gradient-to-b !from-[#f0f9ff] !to-[#e0f2fe] !border-[#bae6fd] !text-[#0369a1] hover:!border-[#7dd3fc] hover:!shadow-[0_4px_14px_rgba(14,165,233,0.12)]',
                // Offices theme — active
                section.theme === 'offices' && isActive && '!bg-[#C2410C] !border-[#C2410C] !text-white !shadow-[0_8px_22px_rgba(194,65,12,0.12)]',
              ].filter(Boolean).join(' ')}
              onClick={() => onChange(section.id)}
            >
              <span 
                className="operations-section-tab-accent" 
                aria-hidden 
                style={section.theme === 'offices' ? { background: 'linear-gradient(180deg, #F97316 0%, #C2410C 100%)' } : undefined}
              />
              <span className="operations-section-tab-main">
                <span className={[
                  'operations-section-tab-icon-wrap',
                  section.theme === 'offices' && !isActive && '!bg-[rgba(14,165,233,0.12)] !text-[#0284c7]',
                  section.theme === 'offices' && isActive && '!bg-white/15 !text-white',
                ].filter(Boolean).join(' ')}>
                  <TabIcon size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="operations-section-tab-copy">
                  <span className="operations-section-tab-label">
                    {t(section.labelKey, { defaultValue: section.defaultLabel })}
                  </span>
                  <span className="operations-section-tab-hint">
                    {t(section.hintKey, { defaultValue: section.defaultHint })}
                  </span>
                </span>
              </span>
              {typeof count === 'number' && (
                <span className={[
                  'operations-section-tab-count',
                  section.theme === 'offices' && !isActive && '!bg-[rgba(14,165,233,0.14)] !text-[#0369a1]',
                ].filter(Boolean).join(' ')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
