import { ClipboardList, Headset, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OPERATIONS_SECTIONS } from '../../utils/operationsSections';

const REQUESTS_PARTITION = {
  id: 'requests',
  labelKey: 'adminOperationsRequestsTitle',
  defaultLabel: 'Requests',
  hintKey: 'adminOperationsRequestsTabHint',
  defaultHint: 'Hire requests & service bookings',
  theme: 'requests',
  icon: ClipboardList,
};

const SECTION_ICONS = {
  assistance: Headset,
  compliance: ShieldCheck,
  requests: ClipboardList,
};

export default function OperationsAdminPartitionTabs({
  activePartitionId,
  onChange,
  catalogCounts = {},
  requestCount = 0,
}) {
  const { t } = useTranslation();

  const tabs = [
    ...OPERATIONS_SECTIONS.map((section) => ({
      id: section.id,
      labelKey: section.labelKey,
      defaultLabel: section.defaultLabel,
      hintKey: section.hintKey,
      defaultHint: section.defaultHint,
      theme: section.theme,
      count: catalogCounts[section.id],
    })),
    {
      ...REQUESTS_PARTITION,
      count: requestCount,
    },
  ];

  return (
    <div className="operations-section-tabs-wrap">
      <p className="operations-section-tabs-eyebrow">
        {t('adminOperationsPartitionEyebrow', { defaultValue: 'Catalog & requests' })}
      </p>
      <div
        className="operations-section-tabs operations-section-tabs--admin operations-admin-partition-tabs"
        role="tablist"
        aria-label={t('adminOperationsPartitionLabel', { defaultValue: 'Operations sections' })}
      >
        {tabs.map((tab) => {
          const isActive = activePartitionId === tab.id;
          const TabIcon = SECTION_ICONS[tab.id] || ClipboardList;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[
                'operations-section-tab',
                `operations-section-tab--${tab.theme}`,
                isActive ? 'is-active' : '',
              ].join(' ')}
              onClick={() => onChange(tab.id)}
            >
              <span className="operations-section-tab-accent" aria-hidden />
              <span className="operations-section-tab-main">
                <span className="operations-section-tab-icon-wrap">
                  <TabIcon size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="operations-section-tab-copy">
                  <span className="operations-section-tab-label">
                    {t(tab.labelKey, { defaultValue: tab.defaultLabel })}
                  </span>
                  <span className="operations-section-tab-hint">
                    {t(tab.hintKey, { defaultValue: tab.defaultHint })}
                  </span>
                </span>
              </span>
              {typeof tab.count === 'number' && (
                <span className="operations-section-tab-count">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
