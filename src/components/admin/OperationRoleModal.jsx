import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { operationsAdminAPI } from '../../api/services';
import { OPERATIONS_CATEGORY_OPTIONS } from '../../utils/operationsCategories';
import { OPERATIONS_SECTIONS } from '../../utils/operationsSections';
import { readApiError } from '../../utils/apiError';

const VA_CATEGORY_OPTIONS = OPERATIONS_CATEGORY_OPTIONS.filter((opt) => opt.value !== 'compliance');

const SECTION_MODAL_META = {
  assistance: {
    titleKey: 'adminOperationsModalTitleVa',
    defaultTitle: 'Add / Edit Virtual Role',
    namePlaceholderKey: 'adminOperationsFieldNamePlaceholder',
    defaultNamePlaceholder: 'Virtual HR Manager',
    priceHintKey: 'adminOperationsPriceHintVa',
    defaultPriceHint: 'Monthly subscription fee (required).',
  },
  compliance: {
    titleKey: 'adminOperationsModalTitleCompliance',
    defaultTitle: 'Add / Edit Compliance Service',
    namePlaceholderKey: 'adminOperationsFieldComplianceNamePlaceholder',
    defaultNamePlaceholder: 'GST Registration',
    priceHintKey: 'adminOperationsPriceHintCompliance',
    defaultPriceHint: 'One-time fee (use 0 for contact-only pricing).',
  },
};

const EMPTY_FORM = {
  name: '',
  category: 'people',
  description: '',
  price: '',
  isAvailable: true,
  serviceType: 'virtual_assistance',
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
  defaultServiceType = 'virtual_assistance',
  lockServiceType = false,
  sectionId = 'assistance',
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const isCompliance = form.serviceType === 'compliance';
  const modalMeta = SECTION_MODAL_META[sectionId] || SECTION_MODAL_META.assistance;
  const categoryOptions = isCompliance
    ? OPERATIONS_CATEGORY_OPTIONS.filter((opt) => opt.value === 'compliance')
    : VA_CATEGORY_OPTIONS;
  const activeSection = OPERATIONS_SECTIONS.find((s) => s.id === sectionId) || OPERATIONS_SECTIONS[0];

  useEffect(() => {
    if (mode === 'edit' && record) {
      setForm({
        name: record.name || '',
        category: record.category || 'people',
        description: record.description || '',
        price: formatPriceInput(record.price),
        isAvailable: record.isAvailable !== false,
        serviceType: record.serviceType || 'virtual_assistance',
      });
      return;
    }
    setForm({
      ...EMPTY_FORM,
      serviceType: defaultServiceType,
      category: defaultServiceType === 'compliance' ? 'compliance' : 'people',
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
    if (!form.category) {
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
      category: form.category,
      description: form.description.trim() || null,
      price,
      isAvailable: form.isAvailable,
      serviceType: form.serviceType,
    };

    setLoading(true);
    try {
      if (mode === 'edit' && record?.id) {
        await operationsAdminAPI.update(record.id, payload);
        onSaved('edit');
      } else {
        await operationsAdminAPI.create(payload);
        onSaved('add');
      }
      onClose();
    } catch (err) {
      alert(readApiError(err) || t('adminOperationsSaveFailed', { defaultValue: 'Failed to save role.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card operations-role-modal" style={{ maxWidth: 440 }}>
        <div className="modal-glow" />
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('close', { defaultValue: 'Close' })}>
          ✕
        </button>

        <div className="modal-header">
          <h2>{t(modalMeta.titleKey, { defaultValue: modalMeta.defaultTitle })}</h2>
        </div>

        <form onSubmit={handleSubmit} className="operations-role-modal-form">
          <div className="form-group">
            <label className="admin-form-label operations-role-label" htmlFor="ops-role-name">
              {t('adminOperationsFieldName', { defaultValue: 'ROLE NAME' })}
            </label>
            <input
              id="ops-role-name"
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={t(modalMeta.namePlaceholderKey, { defaultValue: modalMeta.defaultNamePlaceholder })}
            />
          </div>

          {lockServiceType ? (
            <div className="form-group">
              <span className="admin-form-label operations-role-label">
                {t('adminOperationsFieldServiceType', { defaultValue: 'SERVICE TYPE' })}
              </span>
              <span className={`operations-admin-service-type operations-admin-service-type--${form.serviceType}`}>
                {t(activeSection.labelKey, { defaultValue: activeSection.defaultLabel })}
              </span>
            </div>
          ) : (
            <div className="form-group">
              <label className="admin-form-label operations-role-label" htmlFor="ops-role-service-type">
                {t('adminOperationsFieldServiceType', { defaultValue: 'SERVICE TYPE' })}
              </label>
              <div className="operations-admin-select-wrap operations-admin-select-wrap--full">
                <select
                  id="ops-role-service-type"
                  className="operations-admin-select"
                  value={form.serviceType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      serviceType: nextType,
                      category: nextType === 'compliance' ? 'compliance' : prev.category === 'compliance' ? 'people' : prev.category,
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

          {!isCompliance && (
            <div className="form-group">
              <label className="admin-form-label operations-role-label" htmlFor="ops-role-category">
                {t('adminOperationsFieldCategory', { defaultValue: 'CATEGORY' })}
              </label>
              <div className="operations-admin-select-wrap operations-admin-select-wrap--full">
                <select
                  id="ops-role-category"
                  className="operations-admin-select"
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="operations-admin-select-chevron" aria-hidden />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="admin-form-label operations-role-label" htmlFor="ops-role-description">
              {t('adminOperationsFieldDescription', { defaultValue: 'DESCRIPTION' })}
            </label>
            <textarea
              id="ops-role-description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              placeholder={t('adminOperationsFieldDescriptionPlaceholder', {
                defaultValue: 'Short summary shown in the admin table and on the Operations card.',
              })}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="admin-form-label operations-role-label" htmlFor="ops-role-price">
              {t('adminOperationsFieldPrice', { defaultValue: 'PRICE (₹)' })}
            </label>
            <input
              id="ops-role-price"
              type="text"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              placeholder={isCompliance ? '3,000' : '18,999'}
            />
            <p className="operations-role-status-hint">
              {t(modalMeta.priceHintKey, { defaultValue: modalMeta.defaultPriceHint })}
            </p>
          </div>

          <div className="form-group operations-role-status-group">
            <div className="operations-role-status-row">
              <span className="admin-form-label operations-role-label">
                {t('adminOperationsFieldStatus', { defaultValue: 'STATUS' })}
              </span>
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
            <p className="operations-role-status-hint">
              {t('adminOperationsStatusHint', {
                defaultValue: 'Paused roles are hidden from the primary storefront catalog.',
              })}
            </p>
          </div>

          <div className="operations-role-modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '…' : t('adminOperationsSaveChanges', { defaultValue: 'Save Changes' })}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
