/**
 * AddonSelector.jsx
 * Drop-in component for selecting business registration add-ons during checkout.
 * Props:
 *   selected   : string[]   — array of AddonServiceType keys currently selected
 *   onChange   : (string[]) => void
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCurrency from '../../context/CurrencyContext';
import AddonAccordionCard from './AddonAccordionCard';
import { ADDON_SERVICES_FROM_CATALOG } from '../../utils/operationsServicesCatalog';

export const ADDON_SERVICES = ADDON_SERVICES_FROM_CATALOG;

export function addonTotal(selected, services = ADDON_SERVICES) {
  return services
    .filter((service) => selected.includes(service.key) && !service.contactOnly)
    .reduce((sum, service) => sum + service.price, 0);
}

export function addonLabel(key, translate = (k, opts) => k, services = ADDON_SERVICES) {
  const service = services.find((item) => item.key === key);
  if (!service) return key;
  return service.labelKey ? translate(service.labelKey) : service.name || key;
}

function BusinessIcon() {
  return (
    <svg className="h-[14px] w-[14px]" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="5" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="4" width="5" height="13" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 11H5.6M5.5 14H5.6M14.5 8H14.6M14.5 11H14.6M14.5 14H14.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AddonSelector({
  selected = [],
  onChange,
  className = 'mt-4',
  services,
  categories = null,
  loading = false,
  error = '',
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [open, setOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const dynamicMode = Array.isArray(categories);
  const availableServices = services || ADDON_SERVICES;
  const serviceByKey = new Map(availableServices.map((service) => [service.key, service]));
  const selectedVisible = dynamicMode
    ? selected.map(String).filter((key) => serviceByKey.has(key))
    : selected;

  const toggle = (key) => {
    const source = dynamicMode ? selectedVisible : selected;
    const next = source.includes(key)
      ? source.filter((item) => item !== key)
      : [...source, key];
    onChange(next);
  };

  const toggleCategory = (slug) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const total = addonTotal(selectedVisible, availableServices);
  const selectedCount = selectedVisible.length;
  const hasContactOnly = selectedVisible.some((key) => serviceByKey.get(key)?.contactOnly);
  const servicesByCategory = availableServices.reduce((map, service) => {
    const slug = service.category || '';
    if (!map.has(slug)) map.set(slug, []);
    map.get(slug).push(service);
    return map;
  }, new Map());

  const renderServiceRow = (service) => {
    const checked = selectedVisible.includes(service.key);
    return (
      <label
        key={service.key}
        className={`flex min-w-0 items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-150 ${checked ? 'bg-[#EFF6FF]' : 'bg-white hover:bg-gray-50/80'
          }`}
      >
        <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'border-gray-300'
          }`}>
          {checked && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={() => toggle(service.key)}
        />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 leading-snug">
            {service.labelKey ? t(service.labelKey) : service.name}
          </div>
          {service.contactOnly && (
            <div className="text-xs text-[#1D4ED8] mt-0.5">{t('addonSelectorContactNote')}</div>
          )}
        </div>

        <div className="flex-shrink-0 text-right">
          {service.contactOnly ? (
            <span className="text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-full">{t('addonSelectorContact')}</span>
          ) : (
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(service.price)}
            </span>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className={`min-w-0 overflow-x-hidden ${className}`}>
      <AddonAccordionCard
        theme="purple"
        icon={<BusinessIcon />}
        title={t('addonSelectorTitle')}
        selectedCount={selectedCount}
        open={open}
        onToggle={() => setOpen((value) => !value)}
      >
        <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 bg-[#EFF6FF] border-[#BFDBFE]`}>
          <p className="text-xs text-[#1E293B] leading-relaxed flex-1">
            {t('addonSelectorHint')}
          </p>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="shrink-0 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] underline underline-offset-2 whitespace-nowrap"
            >
              {t('addonSelectorUnselectAll')}
            </button>
          )}
        </div>

        {dynamicMode ? (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto overflow-x-hidden">
            {loading && (
              <div className="px-4 py-3.5 text-sm text-gray-500 bg-white">
                Loading business registration services...
              </div>
            )}
            {!loading && error && (
              <div className="px-4 py-3.5 text-sm text-red-600 bg-white">
                {error}
              </div>
            )}
            {!loading && !error && availableServices.length === 0 && (
              <div className="px-4 py-3.5 text-sm text-gray-500 bg-white">
                No business registration services are currently available.
              </div>
            )}
            {!loading && !error && availableServices.length > 0 && categories.length === 0 && (
              <div className="px-4 py-3.5 text-sm text-gray-500 bg-white">
                No business registration services are currently available.
              </div>
            )}
            {!loading && !error && availableServices.length > 0 && categories.map((category) => {
              const categoryServices = servicesByCategory.get(category.slug) || [];
              const isCategoryOpen = openCategories.has(category.slug);
              return (
                <div key={category.id || category.slug} className="bg-white">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.slug)}
                    className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3.5 text-left bg-white hover:bg-gray-50/80 transition-colors duration-150"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900 leading-snug">
                        {category.name}
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {categoryServices.length} services
                      </span>
                    </span>
                    <svg
                      className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.25 4.417a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {isCategoryOpen && (
                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                      {categoryServices.length > 0 ? (
                        categoryServices.map(renderServiceRow)
                      ) : (
                        <div className="px-4 py-3.5 text-sm text-gray-500 bg-white">
                          No services available in this category.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto overflow-x-hidden">
            {availableServices.map(renderServiceRow)}
          </div>
        )}

        {selectedCount > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {t('addonSelectorServicesSelected', { count: selectedCount })}
              {hasContactOnly && (
                <span className="ml-1 text-[#1D4ED8]">{t('addonSelectorSomeContactBased')}</span>
              )}
            </div>
            {total > 0 && (
              <div className="text-sm font-bold text-[#1D4ED8]">
                {t('addonSelectorAddonsTotal', { price: formatPrice(total) })}
              </div>
            )}
          </div>
        )}
      </AddonAccordionCard>
    </div>
  );
}
