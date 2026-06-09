/**
 * VirtualAssistantSelector.jsx
 * Drop-in component for selecting Virtual Assistant add-ons during checkout.
 * Props:
 *   selected   : string[]   — array of VA service keys currently selected
 *   onChange   : (string[]) => void
 *   className  : string     — optional wrapper classes
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

export const VA_SERVICES = [
  { key: 'VA_ADMIN', labelKey: 'vaAdminAssistant', contactOnly: true },
  { key: 'VA_CUSTOMER_SUPPORT', labelKey: 'vaCustomerSupport', contactOnly: true },
  { key: 'VA_SOCIAL_MEDIA', labelKey: 'vaSocialMedia', contactOnly: true },
  { key: 'VA_BOOKKEEPING', labelKey: 'vaBookkeeping', contactOnly: true },
  { key: 'VA_RESEARCH', labelKey: 'vaResearch', contactOnly: true },
];

export function vaLabel(key) {
  const service = VA_SERVICES.find((item) => item.key === key);
  return service ? i18n.t(service.labelKey) : key;
}

function InfoIcon({ onClick, expanded }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex-shrink-0 w-4 h-4 rounded-full border border-amber-400 bg-amber-50 text-[0.65rem] font-bold text-amber-700 leading-none flex items-center justify-center hover:bg-amber-100 transition-colors"
      aria-label="More information"
      aria-expanded={expanded}
    >
      ?
    </button>
  );
}

export default function VirtualAssistantSelector({ selected = [], onChange, className = 'mt-4' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const toggle = (key) => {
    const next = selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key];
    onChange(next);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-900 hover:from-amber-100 hover:to-orange-100 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <span className="text-base flex-shrink-0">⭐</span>
          <span className="leading-snug">{t('vaSelectorTitle')}</span>
          <InfoIcon expanded={infoOpen} onClick={() => setInfoOpen((v) => !v)} />
          {selected.length > 0 && (
            <span className="ml-1 flex-shrink-0 px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        <span className="text-amber-600 text-xs font-normal flex-shrink-0 whitespace-nowrap">
          {open ? t('addonSelectorHide') : t('addonSelectorShow')}
        </span>
      </button>

      {infoOpen && !open && (
        <p className="mt-1.5 px-1 text-xs text-amber-800/80 leading-relaxed">
          {t('vaSelectorInfo')}
        </p>
      )}

      {open && (
        <div className="mt-2 border border-amber-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-start justify-between gap-3">
            <p className="text-xs text-amber-800 leading-relaxed flex-1">
              {t('vaSelectorHint')}
            </p>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="shrink-0 text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 whitespace-nowrap"
              >
                {t('addonSelectorUnselectAll')}
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {VA_SERVICES.map((service) => {
              const checked = selected.includes(service.key);
              return (
                <label
                  key={service.key}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 ${
                    checked ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    checked ? 'bg-amber-600 border-amber-600' : 'border-gray-300'
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
                    <div className="text-xs text-amber-600 mt-0.5">{t('addonSelectorContactNote')}</div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      {t('addonSelectorContact')}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {selected.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {t('addonSelectorServicesSelected', { count: selected.length })}
                <span className="ml-1 text-amber-600">{t('addonSelectorSomeContactBased')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
