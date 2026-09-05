import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, ChevronDown, ShieldCheck, CheckCircle2, AlertCircle, Briefcase, Building2, Car, Clapperboard, Copyright, Cpu, Factory, FlaskConical, Globe, GraduationCap, HardHat, HeartPulse, Hotel, Landmark, Leaf, Monitor, Plane, Radio, Receipt, Rocket, Shield, ShoppingBag, Truck, Users, UtensilsCrossed, Wheat, Zap } from 'lucide-react';
import OperationsAdminPartitionTabs from '../components/operations/OperationsAdminPartitionTabs';
import OperationsContactModal from '../components/operations/OperationsContactModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { operationsAdminAPI, hubRegistrarCategoryAPI } from '../api/services';
import OperationRoleModal from '../components/admin/OperationRoleModal';
import VirtualAssistantsAdminModule from '../components/admin/VirtualAssistantsAdminModule';
import { getRequestStatusLabel } from '../utils/operationsRequestLabels';
import { getHubRegistrarCategoryLabel } from '../utils/operationsCategories';
import { asArray } from '../utils/asArray';
import { readApiError } from '../utils/apiError';

const REQUEST_STATUS_STYLES = {
  PENDING: 'operations-admin-request-status--pending',
  CONTACT_PENDING: 'operations-admin-request-status--pending',
  CONTACTED: 'operations-admin-request-status--contacted',
  CLOSED: 'operations-admin-request-status--closed',
  PAYMENT_FAILED: 'operations-admin-request-status--pending',
};

const PAYMENT_STATUS_STYLES = {
  SUCCESS: 'operations-admin-request-status--contacted',
  FAILED: 'operations-admin-request-status--closed',
  PENDING: 'operations-admin-request-status--pending',
};

const SECTION_META = {
  compliance: {
    icon: ShieldCheck,
    titleKey: 'adminOperationsComplianceTitle',
    defaultTitle: 'Deltapreneur',
    subtitleKey: 'adminOperationsComplianceSubtitle',
    defaultSubtitle: 'Manage one-time registration and hub registrar services.',
    addKey: 'adminOperationsAddComplianceService',
    defaultAdd: '+ Add Service',
    searchKey: 'adminOperationsSearchCompliancePlaceholder',
    defaultSearch: 'Search hub registrar services…',
    nameColKey: 'adminOperationsColServiceName',
    defaultNameCol: 'Service Name',
    emptyKey: 'adminOperationsEmptyCompliance',
    defaultEmpty: 'No hub registrar services match your filters.',
    modalTitleKey: 'adminOperationsModalTitleCompliance',
    defaultModalTitle: 'Add / Edit Deltapreneur Service',
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
    defaultSubtitle: 'Monthly hire requests and one-time service bookings from the storefront.',
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

function formatAdminPrice(row) {
  const price = Number(row.price) || 0;
  if (price <= 0) return '—';
  return formatInr(price);
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

const CATEGORY_ICONS = {
  business_entity: Building2, tax_identity: Receipt, local_licences: Landmark,
  msme_udyam: Factory, startup_dpiit: Rocket, food_fssai: UtensilsCrossed,
  import_export: Globe, manufacturing: Factory, technology_saas: Cpu,
  ecommerce: ShoppingBag, fintech: Landmark, aviation: Plane,
  construction_real_estate: HardHat, healthcare: HeartPulse,
  education: GraduationCap, professional_services: Briefcase, telecom: Radio,
  pharma_chemical: FlaskConical, automotive: Car, agriculture: Wheat,
  logistics_transport: Truck, tourism_hospitality: Hotel,
  entertainment_media: Clapperboard, energy_power: Zap,
  defence_aerospace: Shield, intellectual_property: Copyright,
  employer_labour: Users, environmental: Leaf, digital_services: Monitor,
};

const OPERATIONS_PARTITION_IDS = ['virtual-assistants', 'compliance', 'requests'];

function resolveInitialPartition(sectionParam) {
  if (sectionParam === 'compliance') return 'compliance';
  if (sectionParam === 'requests') return 'requests';
  if (sectionParam === 'virtual-assistants' || sectionParam === 'assistance') return 'virtual-assistants';
  return 'compliance';
}

export default function OperationsAdminTab({ services = [], onRefresh }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePartitionId, setActivePartitionId] = useState(() =>
    resolveInitialPartition(searchParams.get('section')),
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestCategoryFilter, setRequestCategoryFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [contactRequest, setContactRequest] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  // ── Hub Registrar sub-tab (services vs categories) ───────────────────
  const [complianceSubTab, setComplianceSubTab] = useState('services');

  // ── Hub Registrar Categories ──────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '', slug: '', description: '', starting_price: '',
    icon: '', display_order: 0, is_active: true,
  });
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const categoryFormRef = useRef(null);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'assistance') {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', 'operations');
      newParams.set('section', 'virtual-assistants');
      if (!newParams.get('vaSubTab')) newParams.set('vaSubTab', 'applications');
      setSearchParams(newParams, { replace: true });
      setActivePartitionId('virtual-assistants');
      return;
    }
    if (section && OPERATIONS_PARTITION_IDS.includes(section)) {
      setActivePartitionId(section);
    }
  }, [searchParams, setSearchParams]);

  // Scroll to category form when it opens or switches category
  const categoryFormKey = showCategoryForm ? (editingCategory?.id || 'add') : null;
  useEffect(() => {
    if (categoryFormKey && categoryFormRef.current) {
      requestAnimationFrame(() => {
        categoryFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [categoryFormKey]);

  const handlePartitionChange = (nextPartitionId) => {
    setActivePartitionId(nextPartitionId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'operations');
    newParams.set('section', nextPartitionId);
    if (nextPartitionId !== 'virtual-assistants') {
      newParams.delete('vaSubTab');
    } else if (!newParams.get('vaSubTab')) {
      newParams.set('vaSubTab', 'applications');
    }
    setSearchParams(newParams, { replace: true });
  };

  const isRequestsPartition = activePartitionId === 'requests';
  const isVirtualAssistantsPartition = activePartitionId === 'virtual-assistants';
  const meta = SECTION_META[activePartitionId] || SECTION_META.compliance;
  const SectionIcon = meta.icon;

  const complianceServices = useMemo(
    () => services.filter((row) => (row.serviceType || 'virtual_assistance') === 'compliance'),
    [services],
  );

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

  // ── Category CRUD handlers ──────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const { data } = await hubRegistrarCategoryAPI.adminList();
      setCategories(data.data || []);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePartitionId === 'compliance') {
      fetchCategories();
    }
  }, [activePartitionId, fetchCategories]);

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', slug: '', description: '', starting_price: '', icon: '', display_order: 0, is_active: true });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) { showNotice('Category name is required', 'error'); return; }
    if (!editingCategory && !categoryForm.slug.trim()) { showNotice('Slug is required', 'error'); return; }
    try {
      setCategorySubmitting(true);
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        startingPrice: categoryForm.starting_price === '' ? null : Number(categoryForm.starting_price),
        icon: categoryForm.icon.trim() || null,
        displayOrder: Number(categoryForm.display_order) || 0,
        isActive: categoryForm.is_active,
      };
      if (editingCategory) {
        await hubRegistrarCategoryAPI.adminUpdate(editingCategory.id, payload);
        showNotice('Category updated successfully');
      } else {
        payload.slug = categoryForm.slug.trim().toLowerCase();
        await hubRegistrarCategoryAPI.adminCreate(payload);
        showNotice('Category created successfully');
      }
      resetCategoryForm();
      fetchCategories();
    } catch (err) {
      showNotice(readApiError(err) || 'Failed to save category', 'error');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleCategoryToggleActive = async (cat) => {
    try {
      await hubRegistrarCategoryAPI.adminUpdate(cat.id, { isActive: !cat.isActive });
      showNotice(`Category ${cat.isActive ? 'deactivated' : 'activated'}`);
      fetchCategories();
    } catch (err) {
      showNotice(readApiError(err) || 'Failed to update status', 'error');
    }
  };

  const handleCategoryDelete = async () => {
    if (!deleteCategoryConfirm) return;
    try {
      setDeleteCategoryLoading(true);
      await hubRegistrarCategoryAPI.adminDelete(deleteCategoryConfirm.id);
      showNotice('Category deleted');
      setDeleteCategoryConfirm(null);
      fetchCategories();
    } catch (err) {
      showNotice(readApiError(err) || 'Failed to delete', 'error');
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    if (!isRequestsPartition) {
      setRequestTypeFilter('all');
      setRequestStatusFilter('all');
      setRequestCategoryFilter('all');
    }
  }, [activePartitionId, isRequestsPartition]);

  const sectionCounts = useMemo(() => ({
    compliance: complianceServices.length,
  }), [complianceServices]);

  // Dynamic category slug → name lookup from API data (must be before filteredCatalog)
  const categoryNameMap = useMemo(() => {
    const map = {};
    for (const cat of categories) { map[cat.slug] = cat.name; }
    return map;
  }, [categories]);
  const dynamicCategoryLabel = useCallback((slug) => {
    const val = String(slug || '').trim().toLowerCase();
    return categoryNameMap[val] || getHubRegistrarCategoryLabel(val);
  }, [categoryNameMap]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complianceServices.filter((row) => {
      if (statusFilter === 'active' && row.isAvailable === false) return false;
      if (statusFilter === 'paused' && row.isAvailable !== false) return false;
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (!q) return true;
      const haystack = `${row.name || ''} ${row.description || ''} ${dynamicCategoryLabel(row.category)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [complianceServices, search, statusFilter, categoryFilter, dynamicCategoryLabel]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((row) => {
      if (requestCategoryFilter !== 'all' && row.category !== requestCategoryFilter) return false;
      if (!q) return true;
      const haystack = [
        dynamicCategoryLabel(row.category),
        row.serviceName,
        row.fullName,
        row.email,
        row.phone,
        row.companyName,
        row.message,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, search, requestCategoryFilter]);

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

  const handleSaved = (saveMode, saveMeta = {}) => {
    onRefresh?.();
    const sectionLabel = t('operationsSectionCompliances', { defaultValue: 'Service' });
    const name = saveMeta.name ? `"${saveMeta.name}"` : '';

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
      defaultServiceType: 'compliance',
      lockServiceType: true,
      sectionId: 'compliance',
    });
  };

  const openEditModal = (row) => {
    setModal({
      mode: 'edit',
      record: row,
      defaultServiceType: row.serviceType || 'compliance',
      lockServiceType: true,
      sectionId: 'compliance',
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
              defaultValue: 'Manage Virtual Assistants, business solutions, and customer requests.',
            })}
          </p>
        </div>
      </div>

      <OperationsAdminPartitionTabs
        activePartitionId={activePartitionId}
        onChange={handlePartitionChange}
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

      {isVirtualAssistantsPartition ? (
        <VirtualAssistantsAdminModule />
      ) : (
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

          {/* ── Hub Registrar sub-tabs (Services / Categories) ──────────── */}
          {activePartitionId === 'compliance' && (
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl mb-5 w-fit border border-gray-200 shadow-inner">
              <button type="button" className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 ${complianceSubTab === 'services' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`} onClick={() => setComplianceSubTab('services')}>Services</button>
              <button type="button" className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 ${complianceSubTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`} onClick={() => setComplianceSubTab('categories')}>Categories</button>
            </div>
          )}

          {/* ── Services view (complianceSubTab === 'services') ─────────── */}
          {(!isRequestsPartition && !isVirtualAssistantsPartition && activePartitionId !== 'compliance' || complianceSubTab === 'services') && (
          <>
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
                    value={requestCategoryFilter}
                    onChange={(e) => setRequestCategoryFilter(e.target.value)}
                    aria-label="Category"
                  >
                    <option value="all">All Categories</option>
                    {categories
                      .filter((cat) => cat.isActive)
                      .map((cat) => (
                        <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                      ))}
                  </select>
                  <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
                </div>
                <div className="operations-admin-select-wrap">
                  <select
                    className="operations-admin-select"
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value)}
                  >
                    <option value="all">{t('adminOperationsFilterAllRequestTypes', { defaultValue: 'All Types' })}</option>
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
                    <option value="CONTACT_PENDING">{t('adminOperationsRequestStatusContactPending', { defaultValue: 'Contact Pending' })}</option>
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
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Category"
                  >
                    <option value="all">All Categories</option>
                    {categories
                      .filter((cat) => cat.isActive)
                      .map((cat) => (
                        <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                      ))}
                  </select>
                  <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
                </div>
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
                    <th>{t('adminOperationsColCategory', { defaultValue: 'Category' })}</th>
                    <th>{t('adminOperationsColServiceName', { defaultValue: 'Service' })}</th>
                    <th>{t('adminOperationsColContact', { defaultValue: 'Contact' })}</th>
                    <th>{t('adminOperationsColDescription', { defaultValue: 'Message' })}</th>
                    <th>{t('adminOperationsColPayment', { defaultValue: 'Payment' })}</th>
                    <th className="operations-admin-request-status-col">
                      {t('adminOperationsColStatus', { defaultValue: 'Status' })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requestsLoading ? (
                    <tr>
                      <td colSpan={8} className="operations-admin-empty">
                        {t('loading', { defaultValue: 'Loading…' })}
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="operations-admin-empty">
                        {t(meta.emptyKey, { defaultValue: meta.defaultEmpty })}
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((row, index) => {
                      const serial = String(index + 1).padStart(2, '0');
                      const statusLabel = getRequestStatusLabel(row.status, t);
                      const statusClass = REQUEST_STATUS_STYLES[row.status] || REQUEST_STATUS_STYLES.PENDING;
                      return (
                        <tr key={row.id}>
                          <td className="operations-admin-serial">{serial}</td>
                          <td className="operations-admin-date">{formatRequestDate(row.createdAt)}</td>
                          <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{dynamicCategoryLabel(row.category) || '—'}</td>
                          <td className="operations-admin-service-name">
                            <span className="operations-admin-request-service">{row.serviceName}</span>
                          </td>
                          <td className="operations-admin-contact">
                            <strong>{row.fullName}</strong>
                            {row.companyName ? ` (${row.companyName})` : ''}
                            <br />
                            <a href={`mailto:${row.email}`}>{row.email}</a> • {formatRequestPhone(row.phone)}
                          </td>
                          <td className="operations-admin-message">{truncate(row.message, 60)}</td>
                          <td>
                            {(() => {
                              const payStatus = (row.paymentStatus || '').toUpperCase();
                              if (payStatus === 'SUCCESS') return (
                                <span className="operations-admin-request-status operations-admin-request-status--contacted">
                                  {t('adminOperationsPaymentCompleted', { defaultValue: 'Completed' })}
                                </span>
                              );
                              if (payStatus === 'FAILED') return (
                                <span className="operations-admin-request-status operations-admin-request-status--closed">
                                  {t('adminOperationsPaymentFailed', { defaultValue: 'Failed' })}
                                </span>
                              );
                              return (
                                <span className="operations-admin-request-status operations-admin-request-status--pending">
                                  {t('adminOperationsPaymentPending', { defaultValue: 'Pending' })}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="operations-admin-request-status-col">
                            <div className="operations-admin-request-status-wrap">
                              <span className={`operations-admin-request-status ${statusClass}`}>{statusLabel}</span>
                              <div className="operations-admin-actions">
                                {row.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    className="operations-admin-action-btn"
                                    title={t('adminOperationsMarkContacted', { defaultValue: 'Mark as Contacted' })}
                                    onClick={() => openContactModal(row)}
                                  >
                                    <CheckCircle2 size={15} />
                                  </button>
                                )}
                                {row.status === 'CONTACT_PENDING' && (
                                  <button
                                    type="button"
                                    className="operations-admin-action-btn"
                                    title={t('adminOperationsMarkContacted', { defaultValue: 'Mark as Contacted' })}
                                    onClick={() => openContactModal(row)}
                                  >
                                    <CheckCircle2 size={15} />
                                  </button>
                                )}
                                {row.status === 'CONTACTED' && (
                                  <>
                                    <button
                                      type="button"
                                      className="operations-admin-action-btn"
                                      title={t('adminOperationsCloseRequest', { defaultValue: 'Close Request' })}
                                      onClick={() => handleRequestStatus(row, 'CLOSED')}
                                    >
                                      <CheckCircle2 size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="operations-admin-action-btn"
                                      title={t('adminOperationsRevertPending', { defaultValue: 'Revert to Pending' })}
                                      onClick={() => handleRequestStatus(row, 'PENDING')}
                                    >
                                      <AlertCircle size={15} />
                                    </button>
                                  </>
                                )}
                                {row.status === 'CLOSED' && (
                                  <button
                                    type="button"
                                    className="operations-admin-action-btn"
                                    title={t('adminOperationsRevertContacted', { defaultValue: 'Revert to Contacted' })}
                                    onClick={() => handleRequestStatus(row, 'CONTACTED')}
                                  >
                                    <AlertCircle size={15} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="operations-admin-action-btn operations-admin-action-btn--danger"
                                  title={t('adminOperationsDeleteRequest', { defaultValue: 'Delete Request' })}
                                  onClick={() => setDeleteRequest(row)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
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
                    <th>{t('adminOperationsColCategory', { defaultValue: 'Category' })}</th>
                    <th>{t(meta.nameColKey, { defaultValue: meta.defaultNameCol })}</th>
                    <th>{t('adminOperationsColDescription', { defaultValue: 'Description' })}</th>
                    <th>{t('adminOperationsColPrice', { defaultValue: 'Price' })}</th>
                    <th>{t('adminOperationsColStatus', { defaultValue: 'Status' })}</th>
                    <th>{t('adminOperationsColGovtFees', { defaultValue: 'Govt Fees' })}</th>
                    <th aria-label={t('adminOperationsColActions', { defaultValue: 'Actions' })} />
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="operations-admin-empty">
                        {t(meta.emptyKey, { defaultValue: meta.defaultEmpty })}
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((row, index) => {
                      const serial = String(index + 1).padStart(2, '0');
                      const isActive = row.isAvailable !== false;
                      return (
                        <tr key={row.id}>
                          <td className="operations-admin-serial">{serial}</td>
                          <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{dynamicCategoryLabel(row.category) || '—'}</td>
                          <td className="operations-admin-name">{row.name}</td>
                          <td className="operations-admin-description">{truncate(row.description)}</td>
                          <td className="operations-admin-price">{formatAdminPrice(row)}</td>
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
                          <td className="operations-admin-govt-fees">
                            {row.governmentFeesApplicable ? (
                              <span className="operations-admin-govt-fees--yes">Yes</span>
                            ) : (
                              <span className="operations-admin-govt-fees--no">—</span>
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
                  : filteredCatalog.length === complianceServices.length
                    ? t('adminOperationsSectionTotal', {
                        count: filteredCatalog.length,
                        section: t(meta.titleKey, { defaultValue: meta.defaultTitle }),
                        defaultValue: 'Showing all {{count}} {{section}} entries',
                      })
                    : t('adminOperationsSectionFiltered', {
                        count: filteredCatalog.length,
                        total: complianceServices.length,
                        section: t(meta.titleKey, { defaultValue: meta.defaultTitle }),
                        defaultValue: 'Showing {{count}} of {{total}} {{section}} entries',
                      })}
            </p>
          </div>
          </>
          )}

          {/* ── Categories view (complianceSubTab === 'categories') ──────── */}
          {activePartitionId === 'compliance' && complianceSubTab === 'categories' && (
            <>
              <div className="operations-admin-section-header">
                <div className="operations-admin-section-heading">
                  <span className="operations-admin-section-icon operations-admin-section-icon--compliance">
                    <ShieldCheck size={18} aria-hidden />
                  </span>
                  <div>
                    <h3 className="operations-admin-section-title">Deltapreneur Categories</h3>
                    <p className="operations-admin-section-subtitle">Manage main categories displayed on the public website.</p>
                  </div>
                </div>
                <button type="button" className="operations-admin-add-btn operations-admin-add-btn--compliance" onClick={() => { resetCategoryForm(); setShowCategoryForm(true); }}>+ Add Category</button>
              </div>

              {showCategoryForm && (
                <div key={categoryFormKey} ref={categoryFormRef} className="operations-admin-modal-overlay" onClick={() => !categorySubmitting && resetCategoryForm()}>
                  <div className="operations-admin-modal" onClick={(e) => e.stopPropagation()}>
                    <h3>{editingCategory ? 'Edit Main Category' : 'Add New Main Category'}</h3>
                    <form onSubmit={handleCategorySubmit} className="operations-admin-modal-form">
                      <div className="operations-admin-form-group"><label>Category Name *</label><input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Business / Entity Registration" maxLength={255} required /></div>
                      {!editingCategory && (<div className="operations-admin-form-group"><label>Slug *</label><input type="text" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase() })} placeholder="e.g. business_entity" maxLength={64} pattern="[a-z0-9][a-z0-9_-]*" required /><small className="text-gray-400">Lowercase letters, numbers, underscores, and hyphens only. Cannot be changed after creation.</small></div>)}
                      {editingCategory && (<div className="operations-admin-form-group"><label>Slug</label><input type="text" value={categoryForm.slug} disabled className="bg-gray-50 text-gray-500 cursor-not-allowed" /><small className="text-gray-400">Slug cannot be changed after creation.</small></div>)}
                      <div className="operations-admin-form-group"><label>Description</label><textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Short description for the category card" rows={3} maxLength={5000} /></div>
                      <div className="operations-admin-form-row"><div className="operations-admin-form-group"><label>Starting Price (₹)</label><input type="number" value={categoryForm.starting_price} onChange={(e) => setCategoryForm({ ...categoryForm, starting_price: e.target.value })} placeholder="e.g. 1499" min="0" step="1" /></div><div className="operations-admin-form-group"><label>Icon</label><input type="text" value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} placeholder="e.g. Building2" maxLength={64} /></div></div>
                      <div className="operations-admin-form-row"><div className="operations-admin-form-group"><label>Display Order</label><input type="number" value={categoryForm.display_order} onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })} min="0" /></div><div className="operations-admin-form-group"><label>Status</label><select value={categoryForm.is_active ? 'active' : 'inactive'} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.value === 'active' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>
                      <div className="operations-admin-form-actions"><button type="button" className="btn btn-secondary" onClick={resetCategoryForm} disabled={categorySubmitting}>Cancel</button><button type="submit" className="btn btn-primary" disabled={categorySubmitting}>{categorySubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}</button></div>
                    </form>
                  </div>
                </div>
              )}

              <div className="p-1">
                {categoriesLoading ? (
                  <div className="operations-admin-empty">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="operations-admin-empty">No main categories found. Click "+ Add Category" to create one.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categories.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.slug] || Briefcase;
                      const formatPrice = (p) => p != null ? `Starts at ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p)}` : '—';
                      return (
                        <div key={cat.id} className="relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <Icon size={22} strokeWidth={1.8} />
                            </div>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cat.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              {cat.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">{cat.name}</h4>
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">{cat.description || 'No description'}</p>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-indigo-600">{formatPrice(cat.startingPrice)}</span>
                            <span className="text-[11px] text-gray-400 font-mono">#{cat.displayOrder}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                            <button type="button" className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description || '', starting_price: cat.startingPrice ?? '', icon: cat.icon || '', display_order: cat.displayOrder || 0, is_active: cat.isActive }); setShowCategoryForm(true); }}>
                              <Pencil size={13} className="inline -mt-0.5 mr-1" />Edit
                            </button>
                            <button type="button" className={`flex-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${cat.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`} onClick={() => handleCategoryToggleActive(cat)}>
                              {cat.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button type="button" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" onClick={() => setDeleteCategoryConfirm(cat)}>
                              <Trash2 size={13} className="inline -mt-0.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

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

      {deleteCategoryConfirm && (
        <ConfirmationModal
          open={Boolean(deleteCategoryConfirm)}
          title="Delete Category"
          message={`Are you sure you want to delete "${deleteCategoryConfirm.name}"? This is a soft delete — the category will be hidden from the public website but can be restored by an administrator.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="red"
          loading={deleteCategoryLoading}
          onCancel={() => !deleteCategoryLoading && setDeleteCategoryConfirm(null)}
          onConfirm={handleCategoryDelete}
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
