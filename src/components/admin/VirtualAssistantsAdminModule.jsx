import { ClipboardList, Globe, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import VirtualAssistantApplicationsAdminPage from '../../pages/VirtualAssistantApplicationsAdminPage';
import VirtualAssistantDirectAddAdminPage from '../../pages/VirtualAssistantDirectAddAdminPage';
import VirtualAssistantPublishedProfilesPage from '../../pages/VirtualAssistantPublishedProfilesPage';
import { VA_ADMIN_SUB_TABS } from '../../utils/virtualAssistantAdminNav';

const SUB_TABS = [
  {
    id: 'applications',
    label: 'Applications',
    hint: 'Review and manage VA applications',
    icon: ClipboardList,
    theme: 'assistance',
  },
  {
    id: 'published',
    label: 'Published Profiles',
    hint: 'View and manage published Virtual Assistants',
    icon: Globe,
    theme: 'requests',
  },
  {
    id: 'direct-add',
    label: 'Direct Add VA',
    hint: 'Manually create a Virtual Assistant profile',
    icon: User,
    theme: 'compliance',
  },
];

export default function VirtualAssistantsAdminModule() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramSubTab = searchParams.get('vaSubTab') || 'applications';
  const activeTab = VA_ADMIN_SUB_TABS.includes(paramSubTab) ? paramSubTab : 'applications';

  const handleSubTabChange = (nextTab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'operations');
    newParams.set('section', 'virtual-assistants');
    newParams.set('vaSubTab', nextTab);
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div className="virtual-assistants-admin-module" data-admin-section="virtual-assistants">
      <div className="operations-admin-section-header mb-4">
        <div className="operations-admin-section-heading">
          <span className="operations-admin-section-icon operations-admin-section-icon--assistance">
            <Users size={18} aria-hidden />
          </span>
          <div>
            <h3 className="operations-admin-section-title">
              {t('adminTabVirtualAssistants', { defaultValue: 'Virtual Assistants' })}
            </h3>
            <p className="operations-admin-section-subtitle">
              {t('adminOperationsVaModuleSubtitle', {
                defaultValue: 'Review applications, manage publishing, and direct-add profiles.',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="operations-section-tabs-wrap mb-6">
        <p className="operations-section-tabs-eyebrow">
          {t('adminTabVirtualAssistants', { defaultValue: 'Virtual Assistants' })}
        </p>
        <div className="operations-section-tabs operations-section-tabs--admin" role="tablist">
          {SUB_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`operations-section-tab operations-section-tab--${tab.theme} ${isActive ? 'is-active' : ''}`}
                onClick={() => handleSubTabChange(tab.id)}
              >
                <span className="operations-section-tab-accent" aria-hidden />
                <span className="operations-section-tab-main">
                  <span className="operations-section-tab-icon-wrap">
                    <TabIcon size={18} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="operations-section-tab-copy">
                    <span className="operations-section-tab-label">{tab.label}</span>
                    <span className="operations-section-tab-hint">{tab.hint}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'applications' && <VirtualAssistantApplicationsAdminPage embedded />}
      {activeTab === 'published' && <VirtualAssistantPublishedProfilesPage embedded />}
      {activeTab === 'direct-add' && (
        <VirtualAssistantDirectAddAdminPage
          embedded
          onCancel={() => handleSubTabChange('applications')}
          onSuccess={() => handleSubTabChange('applications')}
        />
      )}
    </div>
  );
}
