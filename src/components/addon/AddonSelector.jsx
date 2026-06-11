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
import i18n from '../../i18n';
import AddonAccordionCard from './AddonAccordionCard';

export const ADDON_SERVICES = [
  { key: 'GST_REGISTRATION', labelKey: 'addonGstRegistration', price: 3000, contactOnly: false },
  { key: 'TRADEMARK_REGISTRATION', labelKey: 'addonTrademarkRegistration', price: 0, contactOnly: true },
  { key: 'COMPANY_REGISTRATION', labelKey: 'addonCompanyRegistration', price: 0, contactOnly: true },
  { key: 'UDYAM_REGISTRATION', labelKey: 'addonUdyamRegistration', price: 1500, contactOnly: false },
  { key: 'WEBSITE_DEVELOPMENT', labelKey: 'addonWebsiteDevelopment', price: 0, contactOnly: true },
  { key: 'IEC_REGISTRATION', labelKey: 'addonIecRegistration', price: 2000, contactOnly: false },
  { key: 'DIGITAL_SIGNATURE', labelKey: 'addonDigitalSignature', price: 3000, contactOnly: false },
  { key: 'PROFESSIONAL_TAX', labelKey: 'addonProfessionalTax', price: 2500, contactOnly: false },
  { key: 'STARTUP_INDIA', labelKey: 'addonStartupIndia', price: 3000, contactOnly: false },
];

export function addonTotal(selected) {
  return ADDON_SERVICES
    .filter((service) => selected.includes(service.key) && !service.contactOnly)
    .reduce((sum, service) => sum + service.price, 0);
}

export function addonLabel(key) {
  const service = ADDON_SERVICES.find((item) => item.key === key);
  return service ? i18n.t(service.labelKey) : key;
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

export default function AddonSelector({ selected = [], onChange, className = 'mt-4' }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [open, setOpen] = useState(false);

  const toggle = (key) => {
    const next = selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key];
    onChange(next);
  };

  const total = addonTotal(selected);

  return (
    <div className={className}>
      <AddonAccordionCard
        theme="purple"
        icon={<BusinessIcon />}
        title={t('addonSelectorTitle')}
        selectedCount={selected.length}
        open={open}
        onToggle={() => setOpen((value) => !value)}
      >
        <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 bg-[#f8f6ff] border-[#e8e2f8]`}>
          <p className="text-xs text-[#4a4478] leading-relaxed flex-1">
            {t('addonSelectorHint')}
          </p>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="shrink-0 text-xs font-semibold text-[#6b5fc7] hover:text-[#4f4599] underline underline-offset-2 whitespace-nowrap"
            >
              {t('addonSelectorUnselectAll')}
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {ADDON_SERVICES.map((service) => {
            const checked = selected.includes(service.key);
            return (
              <label
                key={service.key}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-150 ${
                  checked ? 'bg-[#f8f6ff]' : 'bg-white hover:bg-gray-50/80'
                }`}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  checked ? 'bg-[#6b5fc7] border-[#6b5fc7]' : 'border-gray-300'
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
                    {t(service.labelKey)}
                  </div>
                  {service.contactOnly && (
                    <div className="text-xs text-amber-600 mt-0.5">{t('addonSelectorContactNote')}</div>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  {service.contactOnly ? (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{t('addonSelectorContact')}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(service.price)}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {t('addonSelectorServicesSelected', { count: selected.length })}
              {selected.some((key) => ADDON_SERVICES.find((service) => service.key === key)?.contactOnly) && (
                <span className="ml-1 text-amber-600">{t('addonSelectorSomeContactBased')}</span>
              )}
            </div>
            {total > 0 && (
              <div className="text-sm font-bold text-[#6b5fc7]">
                {t('addonSelectorAddonsTotal', { price: formatPrice(total) })}
              </div>
            )}
          </div>
        )}
      </AddonAccordionCard>
    </div>
  );
}
