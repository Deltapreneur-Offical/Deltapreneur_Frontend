import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X } from 'lucide-react';
import { operationsAdminAPI } from '../../api/services';
import {
  OPERATIONS_CATEGORY_OPTIONS,
  HUB_REGISTRAR_CATEGORY_OPTIONS,
  resolveHubRegistrarCategoryForm,
  slugifyHubRegistrarCategory,
} from '../../utils/operationsCategories';
import { useCategoryMap } from '../../context/CategoryContext';
import { OPERATIONS_SECTIONS } from '../../utils/operationsSections';
import { readApiError } from '../../utils/apiError';

const VA_CATEGORY_OPTIONS = OPERATIONS_CATEGORY_OPTIONS.filter((opt) => opt.value !== 'compliance');

const SECTION_MODAL_META = {
  compliance: {
    titleKey: 'adminOperationsModalTitleCompliance',
    defaultTitle: 'Add / Edit Service',
    namePlaceholderKey: 'adminOperationsFieldComplianceNamePlaceholder',
    defaultNamePlaceholder: 'GST Registration',
    priceHintKey: 'adminOperationsPriceHintCompliance',
    defaultPriceHint: 'One-time fee (use 0 for contact-only pricing).',
  },
};

const EMPTY_FORM = {
  name: '',
  category: '',
  customCategoryName: '',
  description: '',
  price: '',
  isAvailable: true,
  serviceType: 'compliance',
  governmentFeesApplicable: false,
  governmentFeeText: 'Government fees applicable',
};

function parsePriceInput(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function formatPriceInput(value) {
  if (value === '' || value == null) return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
}

export default function OperationRoleModal({
  mode,
  record,
  onClose,
  onSaved,
  onError,
  defaultServiceType = 'compliance',
  lockServiceType = false,
  sectionId = 'compliance',
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const isCompliance = form.serviceType === 'compliance';
  const modalMeta = SECTION_MODAL_META[sectionId] || SECTION_MODAL_META.compliance;
  const categoryMap = useCategoryMap();
  const categoryOptions = isCompliance
    ? Object.entries(categoryMap).length > 0
      ? [{ value: 'other', label: 'Other (Custom)' }, ...Object.entries(categoryMap).map(([value, label]) => ({ value, label }))]
      : HUB_REGISTRAR_CATEGORY_OPTIONS
    : VA_CATEGORY_OPTIONS;
  const activeSection = OPERATIONS_SECTIONS.find((s) => s.id === sectionId) || OPERATIONS_SECTIONS[0];

  useEffect(() => {
    if (mode === 'edit' && record) {
      const isRecordCompliance = (record.serviceType || 'virtual_assistance') === 'compliance';
      const hubRegistrarCategory = isRecordCompliance
        ? resolveHubRegistrarCategoryForm(record.category)
        : { category: record.category || 'people', customCategoryName: '' };
      setForm({
        name: record.name || '',
        category: hubRegistrarCategory.category,
        customCategoryName: hubRegistrarCategory.customCategoryName,
        description: record.description || '',
        price: formatPriceInput(record.price),
        isAvailable: record.isAvailable !== false,
        serviceType: record.serviceType || 'virtual_assistance',
        governmentFeesApplicable: record.governmentFeesApplicable || false,
        governmentFeeText: record.governmentFeeText || 'Government fees applicable',
      });
      return;
    }
    setForm({
      ...EMPTY_FORM,
      serviceType: defaultServiceType,
      category: defaultServiceType === 'compliance' ? '' : 'people',
      customCategoryName: '',
    });
  }, [mode, record, defaultServiceType]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = parsePriceInput(form.price);
    if (!form.name.trim()) {
      alert(t('adminOperationsNameRequired', { defaultValue: 'Role name is required.' }));
      return;
    }

    let category = form.category;
    if (isCompliance) {
      if (form.category === 'other') {
        category = slugifyHubRegistrarCategory(form.customCategoryName);
        if (!category) {
          alert(t('adminOperationsCustomCategoryRequired', { defaultValue: 'Enter a category name.' }));
          return;
        }
      } else if (!category) {
        alert(t('adminOperationsCategoryRequired', { defaultValue: 'Category is required.' }));
        return;
      }
    } else if (!category) {
      alert(t('adminOperationsCategoryRequired', { defaultValue: 'Category is required.' }));
      return;
    }
    if (price === null || price < 0) {
      alert(t('adminOperationsPriceInvalid', { defaultValue: 'Enter a valid price.' }));
      return;
    }
    if (!isCompliance && price <= 0) {
      alert(t('adminOperationsPriceRequired', { defaultValue: 'Enter a valid monthly price.' }));
      return;
    }

    const payload = {
      name: form.name.trim(),
      category,
      description: form.description.trim() || null,
      price,
      isAvailable: form.isAvailable,
      serviceType: form.serviceType,
      governmentFeesApplicable: form.governmentFeesApplicable,
      governmentFeeText: form.governmentFeeText.trim() || 'Government fees applicable',
    };

    setLoading(true);
    try {
      if (mode === 'edit' && record?.id) {
        await operationsAdminAPI.update(record.id, payload);
        onSaved?.('edit', { sectionId, name: payload.name });
      } else {
        await operationsAdminAPI.create(payload);
        onSaved?.('add', { sectionId, name: payload.name });
      }
      onClose();
    } catch (err) {
      onError?.(
        readApiError(err) || t('adminOperationsSaveFailed', { defaultValue: 'Failed to save changes.' }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="operations-role-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`operations-role-modal ${isCompliance ? 'operations-role-modal--compliance' : 'operations-role-modal--assistance'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="operations-role-modal-title"
      >
        <div className={`operations-role-modal-glow ${isCompliance ? 'operations-role-modal-glow--compliance' : 'operations-role-modal-glow--assistance'}`} />

        <button
          type="button"
          className="operations-role-modal-close"
          onClick={onClose}
          aria-label={t('close', { defaultValue: 'Close' })}
        >
          <X size={18} />
        </button>

        <div className="operations-role-modal-header">
          <span className={`operations-role-modal-badge ${isCompliance ? 'operations-role-modal-badge--compliance' : 'operations-role-modal-badge--assistance'}`}>
            {t(activeSection.labelKey, { defaultValue: activeSection.defaultLabel })}
          </span>
          <h2 id="operations-role-modal-title" className="operations-role-modal-title">
            {t(modalMeta.titleKey, { defaultValue: modalMeta.defaultTitle })}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="operations-role-modal-form">
          <div className="operations-role-modal-fields">
            <div className="operations-role-modal-field operations-role-modal-field--full">
              <label className="operations-role-modal-label" htmlFor="ops-role-name">
                {t('adminOperationsFieldName', { defaultValue: 'Role Name' })}
              </label>
              <input
                id="ops-role-name"
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t(modalMeta.namePlaceholderKey, { defaultValue: modalMeta.defaultNamePlaceholder })}
                className="operations-role-modal-input"
              />
            </div>

            {!lockServiceType && (
              <div className="operations-role-modal-field operations-role-modal-field--full">
                <label className="operations-role-modal-label" htmlFor="ops-role-service-type">
                  {t('adminOperationsFieldServiceType', { defaultValue: 'Service Type' })}
                </label>
                <div className="operations-admin-select-wrap operations-admin-select-wrap--full">
                  <select
                    id="ops-role-service-type"
                    className="operations-admin-select operations-role-modal-select"
                    value={form.serviceType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        serviceType: nextType,
                        category: nextType === 'compliance' ? '' : prev.category === 'other' || !prev.category ? 'people' : prev.category,
                        customCategoryName: '',
                      }));
                    }}
                  >
                    {OPERATIONS_SECTIONS.map((section) => (
                      <option key={section.serviceType} value={section.serviceType}>
                        {t(section.labelKey, { defaultValue: section.defaultLabel })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
                </div>
              </div>
            )}

            <div className={`operations-role-modal-field ${isCompliance ? 'operations-role-modal-field--full' : ''}`}>
              <label className="operations-role-modal-label" htmlFor="ops-role-category">
                {t('adminOperationsFieldCategory', { defaultValue: 'Category' })}
              </label>
              <div className="operations-admin-select-wrap operations-admin-select-wrap--full">
                <select
                  id="ops-role-category"
                  className="operations-admin-select operations-role-modal-select"
                  value={form.category}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      category: next,
                      customCategoryName: next === 'other' ? prev.customCategoryName : '',
                    }));
                  }}
                >
                  {isCompliance && (
                    <option value="">
                      {t('adminOperationsSelectCategory', { defaultValue: 'Select category' })}
                    </option>
                  )}
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
              </div>
              {isCompliance && form.category === 'other' && (
                <>
                  <input
                    id="ops-role-custom-category"
                    type="text"
                    value={form.customCategoryName}
                    onChange={(e) => setField('customCategoryName', e.target.value)}
                    placeholder={t('adminOperationsCustomCategoryPlaceholder', {
                      defaultValue: 'Type a category name',
                    })}
                    className="operations-role-modal-input"
                  />
                  <p className="operations-role-modal-hint">
                    {t('adminOperationsCustomCategoryHint', {
                      defaultValue: 'This name is saved as the category for this service.',
                    })}
                  </p>
                </>
              )}
            </div>

            <div className={`operations-role-modal-field ${isCompliance ? 'operations-role-modal-field--full' : ''}`}>
              <label className="operations-role-modal-label" htmlFor="ops-role-price">
                {t('adminOperationsFieldPrice', { defaultValue: 'Price (₹)' })}
              </label>
              <input
                id="ops-role-price"
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder={isCompliance ? '3,000' : '18,999'}
                className="operations-role-modal-input"
              />
              <p className="operations-role-modal-hint">
                {t(modalMeta.priceHintKey, { defaultValue: modalMeta.defaultPriceHint })}
              </p>
            </div>

            <div className="operations-role-modal-field operations-role-modal-field--full">
              <label className="operations-role-modal-label" htmlFor="ops-role-description">
                {t('adminOperationsFieldDescription', { defaultValue: 'Description' })}
              </label>
              <textarea
                id="ops-role-description"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={2}
                placeholder={t('adminOperationsFieldDescriptionPlaceholder', {
                  defaultValue: 'Short summary shown in the admin table and on the Operations card.',
                })}
                className="operations-role-modal-input operations-role-modal-textarea"
              />
            </div>

            <div className="operations-role-modal-field operations-role-modal-field--full operations-role-modal-status">
              <div className="operations-role-modal-status-row">
                <div>
                  <span className="operations-role-modal-label">
                    Government Fees Applicable
                  </span>
                  <p className="operations-role-modal-hint operations-role-modal-hint--inline">
                    Show a government fees notice on this service card.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.governmentFeesApplicable}
                  className={`admin-feature-switch operations-role-switch ${form.governmentFeesApplicable ? 'is-on' : ''}`}
                  onClick={() => setField('governmentFeesApplicable', !form.governmentFeesApplicable)}
                >
                  <span className="admin-feature-switch-track">
                    <span className="admin-feature-switch-thumb" />
                  </span>
                </button>
              </div>
            </div>

            {form.governmentFeesApplicable && (
              <div className="operations-role-modal-field operations-role-modal-field--full">
                <label className="operations-role-modal-label" htmlFor="ops-role-gov-fee-text">
                  Government Fee Text
                </label>
                <input
                  id="ops-role-gov-fee-text"
                  type="text"
                  value={form.governmentFeeText}
                  onChange={(e) => setField('governmentFeeText', e.target.value)}
                  placeholder="Government fees applicable"
                  className="operations-role-modal-input"
                />
                <p className="operations-role-modal-hint">
                  Text displayed on the service card when the toggle is ON.
                </p>
              </div>
            )}

            <div className="operations-role-modal-field operations-role-modal-field--full operations-role-modal-status">
              <div className="operations-role-modal-status-row">
                <div>
                  <span className="operations-role-modal-label">
                    {t('adminOperationsFieldStatus', { defaultValue: 'Status' })}
                  </span>
                  <p className="operations-role-modal-hint operations-role-modal-hint--inline">
                    {t('adminOperationsStatusHint', {
                      defaultValue: 'Paused roles are hidden from the primary storefront catalog.',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isAvailable}
                  className={`admin-feature-switch operations-role-switch ${form.isAvailable ? 'is-on' : ''}`}
                  onClick={() => setField('isAvailable', !form.isAvailable)}
                >
                  <span className="admin-feature-switch-track">
                    <span className="admin-feature-switch-thumb" />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="operations-role-modal-actions">
            <button type="submit" className="btn-primary operations-role-modal-submit" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner" aria-hidden />
                  <span>{t('adminOperationsSaving', { defaultValue: 'Saving…' })}</span>
                </>
              ) : (
                t('adminOperationsSaveChanges', { defaultValue: 'Save Changes' })
              )}
            </button>
            <button type="button" className="operations-role-modal-cancel" onClick={onClose} disabled={loading}>
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
