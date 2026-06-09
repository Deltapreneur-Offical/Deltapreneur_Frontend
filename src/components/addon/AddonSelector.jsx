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
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-800 hover:from-indigo-100 hover:to-purple-100 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <span className="text-base flex-shrink-0">🏢</span>
          <span className="leading-snug">{t('addonSelectorTitle')}</span>
          {selected.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        <span className="text-indigo-500 text-xs font-normal flex-shrink-0 whitespace-nowrap">
          {open ? t('addonSelectorHide') : t('addonSelectorShow')}
        </span>
      </button>

      {open && (
        <div className="mt-2 border border-indigo-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-start justify-between gap-3">
            <p className="text-xs text-indigo-700 leading-relaxed flex-1">
              {t('addonSelectorHint')}
            </p>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="shrink-0 text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 whitespace-nowrap"
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
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 ${
                    checked ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
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
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {t('addonSelectorServicesSelected', { count: selected.length })}
                {selected.some((key) => ADDON_SERVICES.find((service) => service.key === key)?.contactOnly) && (
                  <span className="ml-1 text-amber-600">{t('addonSelectorSomeContactBased')}</span>
                )}
              </div>
              {total > 0 && (
                <div className="text-sm font-bold text-indigo-700">
                  {t('addonSelectorAddonsTotal', { price: formatPrice(total) })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
