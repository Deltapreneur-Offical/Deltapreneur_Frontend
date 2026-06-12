import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, ChevronDown, Headset, ShieldCheck } from 'lucide-react';
import OperationsSectionTabs from '../components/operations/OperationsSectionTabs';
import { operationsAdminAPI } from '../api/services';
import OperationRoleModal from '../components/admin/OperationRoleModal';
import { OPERATIONS_CATEGORY_LABELS, OPERATIONS_CATEGORY_OPTIONS } from '../utils/operationsCategories';
import { OPERATIONS_SECTIONS, resolveOperationsSection } from '../utils/operationsSections';
import { readApiError } from '../utils/apiError';

const VA_CATEGORY_OPTIONS = OPERATIONS_CATEGORY_OPTIONS.filter((opt) => opt.value !== 'compliance');

const SECTION_META = {
  assistance: {
    icon: Headset,
    titleKey: 'adminOperationsVaTitle',
    defaultTitle: 'Virtual Assistance',
    subtitleKey: 'adminOperationsVaSubtitle',
    defaultSubtitle: 'Manage monthly virtual roles shown on the Operations page.',
    addKey: 'adminOperationsAddVirtualRole',
    defaultAdd: '+ Add Virtual Role',
    searchKey: 'adminOperationsSearchVaPlaceholder',
    defaultSearch: 'Search virtual roles…',
    nameColKey: 'adminOperationsColVirtualName',
    defaultNameCol: 'Virtual Name',
    emptyKey: 'adminOperationsEmptyVa',
    defaultEmpty: 'No virtual roles match your filters.',
    modalTitleKey: 'adminOperationsModalTitleVa',
    defaultModalTitle: 'Add / Edit Virtual Role',
    namePlaceholderKey: 'adminOperationsFieldNamePlaceholder',
    defaultNamePlaceholder: 'Virtual HR Manager',
    priceHintKey: 'adminOperationsPriceHintVa',
    defaultPriceHint: 'Monthly subscription fee (required).',
  },
  compliance: {
    icon: ShieldCheck,
    titleKey: 'adminOperationsComplianceTitle',
    defaultTitle: 'Compliances',
    subtitleKey: 'adminOperationsComplianceSubtitle',
    defaultSubtitle: 'Manage one-time compliance and registration services.',
    addKey: 'adminOperationsAddComplianceService',
    defaultAdd: '+ Add Compliance Service',
    searchKey: 'adminOperationsSearchCompliancePlaceholder',
    defaultSearch: 'Search compliance services…',
    nameColKey: 'adminOperationsColServiceName',
    defaultNameCol: 'Service Name',
    emptyKey: 'adminOperationsEmptyCompliance',
    defaultEmpty: 'No compliance services match your filters.',
    modalTitleKey: 'adminOperationsModalTitleCompliance',
    defaultModalTitle: 'Add / Edit Compliance Service',
    namePlaceholderKey: 'adminOperationsFieldComplianceNamePlaceholder',
    defaultNamePlaceholder: 'GST Registration',
    priceHintKey: 'adminOperationsPriceHintCompliance',
    defaultPriceHint: 'One-time fee (use 0 for contact-only pricing).',
  },
};

function formatInr(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function truncate(text, max = 42) {
  const value = String(text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

function formatAdminPrice(row, isCompliance) {
  const price = Number(row.price) || 0;
  if (isCompliance) {
    if (price <= 0) return '—';
    return formatInr(price);
  }
  return `${formatInr(price)}/mo`;
}

export default function OperationsAdminTab({ services = [], onRefresh }) {
  const { t } = useTranslation();
  const [activeSectionId, setActiveSectionId] = useState('assistance');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const activeSection = resolveOperationsSection(activeSectionId);
  const isCompliance = activeSection.serviceType === 'compliance';
  const meta = SECTION_META[activeSection.id] || SECTION_META.assistance;
  const SectionIcon = meta.icon;

  const showNotice = useCallback((message, type = 'success') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ message, type });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
  }, [activeSectionId]);

  const sectionCounts = useMemo(() => {
    const counts = Object.fromEntries(OPERATIONS_SECTIONS.map((section) => [section.id, 0]));
    services.forEach((row) => {
      const type = row.serviceType || 'virtual_assistance';
      const section = OPERATIONS_SECTIONS.find((s) => s.serviceType === type) || OPERATIONS_SECTIONS[0];
      counts[section.id] += 1;
    });
    return counts;
  }, [services]);

  const sectionServices = useMemo(
    () => services.filter((row) => (row.serviceType || 'virtual_assistance') === activeSection.serviceType),
    [services, activeSection.serviceType],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sectionServices.filter((row) => {
      if (statusFilter === 'active' && row.isAvailable === false) return false;
      if (statusFilter === 'paused' && row.isAvailable !== false) return false;
      if (!isCompliance && categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (!q) return true;
      const haystack = `${row.name || ''} ${row.description || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sectionServices, search, statusFilter, categoryFilter, isCompliance]);

  const handleDelete = async (row) => {
    const confirmed = window.confirm(
      t('adminOperationsDeleteConfirm', {
        name: row.name,
        defaultValue: `Delete "${row.name}"? This cannot be undone.`,
      }),
    );
    if (!confirmed) return;
    try {
      await operationsAdminAPI.remove(row.id);
      onRefresh?.();
      showNotice(
        t('adminOperationsDeletedSuccess', {
          name: row.name,
          defaultValue: '"{{name}}" deleted successfully.',
        }),
      );
    } catch (err) {
      showNotice(
        readApiError(err) || t('adminOperationsDeleteFailed', { defaultValue: 'Failed to delete role.' }),
        'error',
      );
    }
  };

  const handleSaved = (saveMode) => {
    onRefresh?.();
    if (saveMode === 'add') {
      showNotice(t('adminOperationsAddedSuccess', { defaultValue: 'Role added successfully.' }));
      return;
    }
    if (saveMode === 'edit') {
      showNotice(t('adminOperationsUpdatedSuccess', { defaultValue: 'Role updated successfully.' }));
    }
  };

  const openAddModal = () => {
    setModal({
      mode: 'add',
      record: null,
      defaultServiceType: activeSection.serviceType,
      lockServiceType: true,
      sectionId: activeSection.id,
    });
  };

  const openEditModal = (row) => {
    setModal({
      mode: 'edit',
      record: row,
      defaultServiceType: row.serviceType || activeSection.serviceType,
      lockServiceType: true,
      sectionId: activeSection.id,
    });
  };

  return (
    <div className="operations-admin-tab">
      <div className="operations-admin-header">
        <div>
          <h2 className="operations-admin-title">
            {t('adminOperationsTitle', { defaultValue: 'Operations' })}
          </h2>
          <p className="operations-admin-subtitle">
            {t('adminOperationsSubtitle', {
              defaultValue: 'Manage virtual assistance roles and compliance services for the storefront.',
            })}
          </p>
        </div>
      </div>

      <OperationsSectionTabs
        activeSectionId={activeSection.id}
        onChange={setActiveSectionId}
        counts={sectionCounts}
        variant="admin"
        ariaLabel={t('adminOperationsPartitionLabel', { defaultValue: 'Operations sections' })}
      />

      {notice && (
        <div
          className={`operations-admin-notice operations-admin-notice--${notice.type}`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      )}

      <div
        className={`operations-admin-section-panel operations-admin-section-panel--${activeSection.id}`}
        role="tabpanel"
        aria-labelledby={`operations-admin-tab-${activeSection.id}`}
      >
        <div className="operations-admin-section-header">
          <div className="operations-admin-section-heading">
            <span className={`operations-admin-section-icon operations-admin-section-icon--${activeSection.id}`}>
              <SectionIcon size={18} aria-hidden />
            </span>
            <div>
              <h3 className="operations-admin-section-title">
                {t(meta.titleKey, { defaultValue: meta.defaultTitle })}
              </h3>
              <p className="operations-admin-section-subtitle">
                {t(meta.subtitleKey, { defaultValue: meta.defaultSubtitle })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`operations-admin-add-btn operations-admin-add-btn--${activeSection.id}`}
            onClick={openAddModal}
          >
            {t(meta.addKey, { defaultValue: meta.defaultAdd })}
          </button>
        </div>

        <div className="operations-admin-toolbar">
          <input
            type="search"
            className="operations-admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(meta.searchKey, { defaultValue: meta.defaultSearch })}
          />
          <div className="operations-admin-select-wrap">
            <select
              className="operations-admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t('adminOperationsFilterAllStatus', { defaultValue: 'All Status' })}
            >
              <option value="all">{t('adminOperationsFilterAllStatus', { defaultValue: 'All Status' })}</option>
              <option value="active">{t('adminOperationsStatusActive', { defaultValue: 'Active' })}</option>
              <option value="paused">{t('adminOperationsStatusPaused', { defaultValue: 'Paused' })}</option>
            </select>
            <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
          </div>
          {!isCompliance && (
            <div className="operations-admin-select-wrap">
              <select
                className="operations-admin-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label={t('adminOperationsFilterAllCategories', { defaultValue: 'All Categories' })}
              >
                <option value="all">{t('adminOperationsFilterAllCategories', { defaultValue: 'All Categories' })}</option>
                {VA_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
            </div>
          )}
        </div>

        <div className="operations-admin-table-wrap">
          <table className="operations-admin-table">
            <thead>
              <tr>
                <th>{t('adminOperationsColSerial', { defaultValue: 'S.No' })}</th>
                <th>{t(meta.nameColKey, { defaultValue: meta.defaultNameCol })}</th>
                {!isCompliance && (
                  <th>{t('adminOperationsColCategory', { defaultValue: 'Category' })}</th>
                )}
                <th>{t('adminOperationsColDescription', { defaultValue: 'Description' })}</th>
                <th>{t('adminOperationsColPrice', { defaultValue: 'Price' })}</th>
                <th>{t('adminOperationsColStatus', { defaultValue: 'Status' })}</th>
                <th aria-label={t('adminOperationsColActions', { defaultValue: 'Actions' })} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isCompliance ? 6 : 7} className="operations-admin-empty">
                    {t(meta.emptyKey, { defaultValue: meta.defaultEmpty })}
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const serial = String(index + 1).padStart(2, '0');
                  const categoryLabel = OPERATIONS_CATEGORY_LABELS[row.category] || row.category;
                  const isActive = row.isAvailable !== false;
                  return (
                    <tr key={row.id}>
                      <td className="operations-admin-serial">{serial}</td>
                      <td className="operations-admin-name">{row.name}</td>
                      {!isCompliance && (
                        <td>
                          <span className={`operations-admin-category operations-admin-category--${row.category}`}>
                            {categoryLabel}
                          </span>
                        </td>
                      )}
                      <td className="operations-admin-description">{truncate(row.description)}</td>
                      <td className="operations-admin-price">{formatAdminPrice(row, isCompliance)}</td>
                      <td>
                        {isActive ? (
                          <span className="operations-admin-status operations-admin-status--active">
                            <span className="operations-admin-status-dot" aria-hidden />
                            {t('adminOperationsStatusActive', { defaultValue: 'Active' })}
                          </span>
                        ) : (
                          <span className="operations-admin-status operations-admin-status--paused">
                            {t('adminOperationsStatusPaused', { defaultValue: 'Paused' })}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="operations-admin-actions">
                          <button
                            type="button"
                            className="operations-admin-action-btn"
                            aria-label={t('adminOperationsEdit', { defaultValue: 'Edit role' })}
                            onClick={() => openEditModal(row)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="operations-admin-action-btn operations-admin-action-btn--danger"
                            aria-label={t('adminOperationsDelete', { defaultValue: 'Delete role' })}
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="operations-admin-footer">
          <p>
            {filtered.length === 0
              ? t('adminOperationsNoRoles', { defaultValue: 'No roles to display' })
              : filtered.length === sectionServices.length
                ? t('adminOperationsSectionTotal', {
                    count: filtered.length,
                    section: t(meta.titleKey, { defaultValue: meta.defaultTitle }),
                    defaultValue: 'Showing all {{count}} {{section}} entries',
                  })
                : t('adminOperationsSectionFiltered', {
                    count: filtered.length,
                    total: sectionServices.length,
                    section: t(meta.titleKey, { defaultValue: meta.defaultTitle }),
                    defaultValue: 'Showing {{count}} of {{total}} {{section}} entries',
                  })}
          </p>
        </div>
      </div>

      {modal && (
        <OperationRoleModal
          mode={modal.mode}
          record={modal.record}
          defaultServiceType={modal.defaultServiceType}
          lockServiceType={modal.lockServiceType}
          sectionId={modal.sectionId}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
