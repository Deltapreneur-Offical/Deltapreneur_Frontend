import { Headset, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OPERATIONS_SECTIONS } from '../../utils/operationsSections';

const SECTION_ICONS = {
  assistance: Headset,
  compliance: ShieldCheck,
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
        {OPERATIONS_SECTIONS.map((section) => {
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
              ].join(' ')}
              onClick={() => onChange(section.id)}
            >
              <span className="operations-section-tab-accent" aria-hidden />
              <span className="operations-section-tab-main">
                <span className="operations-section-tab-icon-wrap">
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
                <span className="operations-section-tab-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
