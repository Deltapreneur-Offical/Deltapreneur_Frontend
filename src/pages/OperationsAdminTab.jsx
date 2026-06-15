import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, ChevronDown, Headset, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import OperationsAdminPartitionTabs from '../components/operations/OperationsAdminPartitionTabs';
import OperationsContactModal from '../components/operations/OperationsContactModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { operationsAdminAPI } from '../api/services';
import OperationRoleModal from '../components/admin/OperationRoleModal';
import { OPERATIONS_CATEGORY_LABELS, OPERATIONS_CATEGORY_OPTIONS } from '../utils/operationsCategories';
import { formatRequestAdminPrice } from '../utils/operationsPricing';
import { getRequestActionLabel, getRequestStatusLabel } from '../utils/operationsRequestLabels';
import { OPERATIONS_SECTIONS, resolveOperationsSection } from '../utils/operationsSections';
import { asArray } from '../utils/asArray';
import { readApiError } from '../utils/apiError';

const VA_CATEGORY_OPTIONS = OPERATIONS_CATEGORY_OPTIONS.filter((opt) => opt.value !== 'compliance');

const REQUEST_STATUS_STYLES = {
  PENDING: 'operations-admin-request-status--pending',
  CONTACTED: 'operations-admin-request-status--contacted',
  CLOSED: 'operations-admin-request-status--closed',
};

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
    defaultTitle: 'Compliance',
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
  requests: {
    icon: ShieldCheck,
    titleKey: 'adminOperationsRequestsTitle',
    defaultTitle: 'Requests',
    subtitleKey: 'adminOperationsRequestsSubtitle',
    defaultSubtitle: 'Monthly hire requests and one-time compliance bookings from the storefront.',
    searchKey: 'adminOperationsSearchRequestsPlaceholder',
    defaultSearch: 'Search by name, email, or service…',
    emptyKey: 'adminOperationsEmptyRequests',
    defaultEmpty: 'No hire or booking requests yet.',
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

function formatRequestDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRequestPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return phone || '—';
}

export default function OperationsAdminTab({ services = [], onRefresh }) {
  const { t } = useTranslation();
  const [activePartitionId, setActivePartitionId] = useState('assistance');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [contactRequest, setContactRequest] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const isRequestsPartition = activePartitionId === 'requests';
  const activeSection = isRequestsPartition
    ? null
    : resolveOperationsSection(activePartitionId);
  const isCompliance = activeSection?.serviceType === 'compliance';
  const meta = SECTION_META[activePartitionId] || SECTION_META.assistance;
  const SectionIcon = meta.icon;

  const showNotice = useCallback((message, type = 'success') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ message, type });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 5000);
  }, []);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const params = {};
      if (requestTypeFilter !== 'all') params.requestType = requestTypeFilter;
      if (requestStatusFilter !== 'all') params.status = requestStatusFilter;
      const { data } = await operationsAdminAPI.listRequests(params);
      setRequests(asArray(data));
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestTypeFilter, requestStatusFilter]);

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    if (!isRequestsPartition) {
      setRequestTypeFilter('all');
      setRequestStatusFilter('all');
    }
  }, [activePartitionId, isRequestsPartition]);

  const sectionCounts = useMemo(() => {
    const counts = Object.fromEntries(OPERATIONS_SECTIONS.map((section) => [section.id, 0]));
    services.forEach((row) => {
      const type = row.serviceType || 'virtual_assistance';
      const section = OPERATIONS_SECTIONS.find((s) => s.serviceType === type) || OPERATIONS_SECTIONS[0];
      counts[section.id] += 1;
    });
    return counts;
  }, [services]);

  const sectionServices = useMemo(() => {
    if (!activeSection) return [];
    return services.filter((row) => (row.serviceType || 'virtual_assistance') === activeSection.serviceType);
  }, [services, activeSection]);

  const filteredCatalog = useMemo(() => {
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

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((row) => {
      const haystack = [
        row.serviceName,
        row.fullName,
        row.email,
        row.phone,
        row.companyName,
        row.message,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, search]);

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

  const handleSaved = (saveMode, meta = {}) => {
    onRefresh?.();
    const isComplianceSection = meta.sectionId === 'compliance';
    const sectionLabel = isComplianceSection
      ? t('operationsSectionCompliances', { defaultValue: 'Compliance service' })
      : t('operationsSectionVirtualAssistance', { defaultValue: 'Virtual Assistance role' });
    const name = meta.name ? `"${meta.name}"` : '';

    if (saveMode === 'add') {
      showNotice(
        t('adminOperationsAddedSuccessSection', {
          section: sectionLabel,
          name,
          defaultValue: '{{section}} {{name}} added successfully.',
        }),
      );
      return;
    }
    if (saveMode === 'edit') {
      showNotice(
        t('adminOperationsUpdatedSuccessSection', {
          section: sectionLabel,
          name,
          defaultValue: '{{section}} {{name}} updated successfully.',
        }),
      );
    }
  };

  const handleSaveError = (message) => {
    showNotice(
      message || t('adminOperationsSaveFailed', { defaultValue: 'Failed to save changes.' }),
      'error',
    );
  };

  const handleRequestStatus = async (row, status) => {
    try {
      await operationsAdminAPI.patchRequestStatus(row.id, { status });
      await loadRequests();
      if (status === 'CONTACTED') {
        showNotice(
          t('adminOperationsRequestContactedSuccess', {
            defaultValue: 'Customer marked as contacted successfully.',
          }),
        );
      } else if (status === 'PENDING') {
        showNotice(
          t('adminOperationsRequestRevertedSuccess', {
            defaultValue: 'Request reverted to pending.',
          }),
        );
      } else if (status === 'CLOSED') {
        showNotice(
          t('adminOperationsRequestClosedSuccess', {
            defaultValue: 'Request closed successfully.',
          }),
        );
      } else {
        showNotice(t('adminOperationsRequestUpdated', { defaultValue: 'Request status updated.' }));
      }
    } catch (err) {
      showNotice(
        readApiError(err) || t('adminOperationsRequestUpdateFailed', { defaultValue: 'Failed to update request.' }),
        'error',
      );
    }
  };

  const openContactModal = (row) => {
    setContactRequest(row);
  };

  const handleMarkContacted = async () => {
    if (!contactRequest) return;
    setContactLoading(true);
    try {
      await operationsAdminAPI.patchRequestStatus(contactRequest.id, { status: 'CONTACTED' });
      await loadRequests();
      setContactRequest(null);
      showNotice(
        t('adminOperationsRequestContactedSuccess', {
          defaultValue: 'Customer marked as contacted successfully.',
        }),
      );
    } catch (err) {
      showNotice(
        readApiError(err) || t('adminOperationsRequestUpdateFailed', { defaultValue: 'Failed to update request.' }),
        'error',
      );
    } finally {
      setContactLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deleteRequest) return;
    setDeleteLoading(true);
    try {
      await operationsAdminAPI.removeRequest(deleteRequest.id);
      await loadRequests();
      setDeleteRequest(null);
      showNotice(
        t('adminOperationsRequestDeletedSuccess', {
          defaultValue: 'Request deleted successfully.',
        }),
      );
    } catch (err) {
      showNotice(
        readApiError(err) || t('adminOperationsRequestDeleteFailed', { defaultValue: 'Failed to delete request.' }),
        'error',
      );
    } finally {
      setDeleteLoading(false);
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

      <OperationsAdminPartitionTabs
        activePartitionId={activePartitionId}
        onChange={setActivePartitionId}
        catalogCounts={sectionCounts}
        requestCount={requests.length}
      />

      {notice && (
        <div className="operations-admin-notice-stack" role="status" aria-live="polite">
          <div className={`operations-admin-notice operations-admin-notice--${notice.type}`}>
            {notice.type === 'error' ? (
              <AlertCircle className="operations-admin-notice-icon" aria-hidden />
            ) : (
              <CheckCircle2 className="operations-admin-notice-icon" aria-hidden />
            )}
            <span>{notice.message}</span>
          </div>
        </div>
      )}

      <div
        className={`operations-admin-section-panel operations-admin-section-panel--${activePartitionId}`}
        role="tabpanel"
      >
        <div className="operations-admin-section-header">
          <div className="operations-admin-section-heading">
            <span className={`operations-admin-section-icon operations-admin-section-icon--${activePartitionId}`}>
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
          {!isRequestsPartition && (
            <button
              type="button"
              className={`operations-admin-add-btn operations-admin-add-btn--${activePartitionId}`}
              onClick={openAddModal}
            >
              {t(meta.addKey, { defaultValue: meta.defaultAdd })}
            </button>
          )}
        </div>

        <div className="operations-admin-toolbar">
          <input
            type="search"
            className="operations-admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(meta.searchKey, { defaultValue: meta.defaultSearch })}
          />
          {isRequestsPartition ? (
            <>
              <div className="operations-admin-select-wrap">
                <select
                  className="operations-admin-select"
                  value={requestTypeFilter}
                  onChange={(e) => setRequestTypeFilter(e.target.value)}
                >
                  <option value="all">{t('adminOperationsFilterAllRequestTypes', { defaultValue: 'All Types' })}</option>
                  <option value="hire">{t('operationsHire', { defaultValue: 'Hire' })}</option>
                  <option value="booking">{t('operationsBookSlot', { defaultValue: 'Book Your Slot' })}</option>
                </select>
                <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
              </div>
              <div className="operations-admin-select-wrap">
                <select
                  className="operations-admin-select"
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                >
                  <option value="all">{t('adminOperationsFilterAllRequestStatus', { defaultValue: 'All Status' })}</option>
                  <option value="PENDING">{t('adminOperationsRequestStatusPending', { defaultValue: 'Pending' })}</option>
                  <option value="CONTACTED">{t('adminOperationsRequestStatusContacted', { defaultValue: 'Contacted' })}</option>
                  <option value="CLOSED">{t('adminOperationsRequestStatusClosed', { defaultValue: 'Closed' })}</option>
                </select>
                <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="operations-admin-table-wrap">
          {isRequestsPartition ? (
            <table className="operations-admin-table operations-admin-table--requests">
              <thead>
                <tr>
                  <th>{t('adminOperationsColSerial', { defaultValue: 'S.No' })}</th>
                  <th>{t('adminOperationsColDate', { defaultValue: 'Date' })}</th>
                  <th>{t('adminOperationsColServiceName', { defaultValue: 'Service' })}</th>
                  <th>{t('adminOperationsColContact', { defaultValue: 'Contact' })}</th>
                  <th>{t('adminOperationsColDescription', { defaultValue: 'Message' })}</th>
                  <th className="operations-admin-request-status-col">
                    {t('adminOperationsColStatus', { defaultValue: 'Status' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {requestsLoading ? (
                  <tr>
                    <td colSpan={6} className="operations-admin-empty">
                      {t('loading', { defaultValue: 'Loading…' })}
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="operations-admin-empty">
                      {t(meta.emptyKey, { defaultValue: meta.defaultEmpty })}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((row, index) => {
                    const serial = String(index + 1).padStart(2, '0');
                    const isHire = row.requestType === 'hire';
                    return (
                      <tr key={row.id}>
                        <td className="operations-admin-serial">{serial}</td>
                        <td className="operations-admin-request-date">{formatRequestDate(row.createdAt)}</td>
                        <td className="operations-admin-request-service-cell">
                          <div className="operations-admin-name">{row.serviceName}</div>
                          <div className="operations-admin-request-service-meta">
                            <span className={`operations-admin-request-type operations-admin-request-type--${isHire ? 'hire' : 'booking'}`}>
                              {getRequestActionLabel(row, t)}
                            </span>
                            <span className="operations-admin-price">{formatRequestAdminPrice(row)}</span>
                          </div>
                        </td>
                        <td className="operations-admin-request-contact-cell">
                          <div className="operations-admin-name">{row.fullName}</div>
                          <div className="operations-admin-request-contact-meta">{row.email}</div>
                          <div className="operations-admin-request-contact-meta">{formatRequestPhone(row.phone)}</div>
                          {row.companyName && (
                            <div className="operations-admin-request-contact-meta">{row.companyName}</div>
                          )}
                        </td>
                        <td className="operations-admin-request-message">
                          {row.message ? truncate(row.message, 80) : '—'}
                        </td>
                        <td className="operations-admin-request-status-cell">
                          <div className="operations-admin-request-status-row">
                            <span className={`operations-admin-request-status ${REQUEST_STATUS_STYLES[row.status] || ''}`}>
                              {getRequestStatusLabel(row.status, t)}
                            </span>
                            <span className="operations-admin-request-status-divider" aria-hidden />
                            {row.status === 'PENDING' && (
                              <button
                                type="button"
                                className="operations-admin-request-action-btn operations-admin-request-action-btn--primary"
                                onClick={() => openContactModal(row)}
                              >
                                {t('adminOperationsMarkContacted', { defaultValue: 'Contact' })}
                              </button>
                            )}
                            {row.status === 'CONTACTED' && (
                              <button
                                type="button"
                                className="operations-admin-request-action-btn"
                                onClick={() => handleRequestStatus(row, 'PENDING')}
                                title={t('adminOperationsRevertToPending', { defaultValue: 'Revert to Pending' })}
                              >
                                {t('adminOperationsRevertShort', { defaultValue: 'Revert' })}
                              </button>
                            )}
                            {row.status !== 'CLOSED' && (
                              <button
                                type="button"
                                className="operations-admin-request-action-btn"
                                onClick={() => handleRequestStatus(row, 'CLOSED')}
                              >
                                {t('adminOperationsMarkClosed', { defaultValue: 'Close' })}
                              </button>
                            )}
                            <button
                              type="button"
                              className="operations-admin-request-action-btn operations-admin-request-action-btn--icon operations-admin-request-action-btn--danger"
                              onClick={() => setDeleteRequest(row)}
                              aria-label={t('adminOperationsDeleteRequestAria', {
                                name: row.fullName,
                                defaultValue: 'Delete request from {{name}}',
                              })}
                              title={t('delete', { defaultValue: 'Delete' })}
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
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
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={isCompliance ? 6 : 7} className="operations-admin-empty">
                      {t(meta.emptyKey, { defaultValue: meta.defaultEmpty })}
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((row, index) => {
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
          )}
        </div>

        <div className="operations-admin-footer">
          <p>
            {isRequestsPartition
              ? t('adminOperationsRequestsFooter', {
                  count: filteredRequests.length,
                  defaultValue: 'Showing {{count}} requests',
                })
              : filteredCatalog.length === 0
                ? t('adminOperationsNoRoles', { defaultValue: 'No roles to display' })
                : filteredCatalog.length === sectionServices.length
                  ? t('adminOperationsSectionTotal', {
                      count: filteredCatalog.length,
                      section: t(meta.titleKey, { defaultValue: meta.defaultTitle }),
                      defaultValue: 'Showing all {{count}} {{section}} entries',
                    })
                  : t('adminOperationsSectionFiltered', {
                      count: filteredCatalog.length,
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
          onError={handleSaveError}
        />
      )}

      {contactRequest && (
        <OperationsContactModal
          request={contactRequest}
          loading={contactLoading}
          onClose={() => {
            if (!contactLoading) setContactRequest(null);
          }}
          onMarkContacted={handleMarkContacted}
        />
      )}

      <ConfirmationModal
        open={Boolean(deleteRequest)}
        title={t('adminOperationsDeleteRequestTitle', { defaultValue: 'Delete request?' })}
        message={t('adminOperationsDeleteRequestMessage', {
          name: deleteRequest?.fullName || '',
          service: deleteRequest?.serviceName || '',
          defaultValue: 'This will permanently remove the request from {{name}} for {{service}}. This cannot be undone.',
        })}
        confirmLabel={t('delete', { defaultValue: 'Delete' })}
        cancelLabel={t('cancel', { defaultValue: 'Cancel' })}
        variant="red"
        loading={deleteLoading}
        loadingLabel={t('adminOperationsDeletingRequest', { defaultValue: 'Deleting…' })}
        onCancel={() => {
          if (!deleteLoading) setDeleteRequest(null);
        }}
        onConfirm={handleDeleteRequest}
      />
    </div>
  );
}
