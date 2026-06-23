/**
 * VirtualAssistantSelector.jsx
 * Premium selectable Virtual Assistant plan cards for checkout.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCurrency from '../../context/CurrencyContext';
import AddonAccordionCard from './AddonAccordionCard';
import PremiumInfoTooltip from './PremiumInfoTooltip';

export const VA_SERVICES = [
  {
    key: 'VA_ENTRY_ECOMMERCE',
    labelKey: 'vaEntryTitle',
    badgeKey: 'vaEntryBadge',
    badgeTone: 'green',
    descKey: 'vaEntryDesc',
    featureKeys: ['vaEntryFeature1', 'vaEntryFeature2', 'vaEntryFeature3', 'vaEntryFeature4', 'vaEntryFeature5'],
    price: 499,
  },
  {
    key: 'VA_MID_ECOMMERCE',
    labelKey: 'vaMidTitle',
    badgeKey: 'vaMidBadge',
    badgeTone: 'blue',
    descKey: 'vaMidDesc',
    featureKeys: ['vaMidFeature1', 'vaMidFeature2', 'vaMidFeature3', 'vaMidFeature4', 'vaMidFeature5'],
    price: 999,
  },
  {
    key: 'VA_EXPERT_ECOMMERCE',
    labelKey: 'vaExpertTitle',
    badgeKey: 'vaExpertBadge',
    badgeTone: 'orange',
    descKey: 'vaExpertDesc',
    featureKeys: ['vaExpertFeature1', 'vaExpertFeature2', 'vaExpertFeature3', 'vaExpertFeature4', 'vaExpertFeature5'],
    price: 1999,
  },
];

const BADGE_TONES = {
  green: 'bg-[#e8f7ef] text-[#1f7a4c] border-[#c9ebd8]',
  blue: 'bg-[#e8f1fd] text-[#2563b8] border-[#cfe0fb]',
  orange: 'bg-[#fff1e3] text-[#b86a14] border-[#f5dcc0]',
};

export function vaLabel(key, translate = (k) => k) {
  const service = VA_SERVICES.find((item) => item.key === key);
  return service ? translate(service.labelKey) : key;
}

export function vaTotal(selected) {
  return VA_SERVICES
    .filter((service) => selected.includes(service.key))
    .reduce((sum, service) => sum + service.price, 0);
}

function StarIcon() {
  return (
    <svg className="h-[14px] w-[14px]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2.5l1.86 3.77 4.16.6-3.01 2.94.71 4.14L10 12.02l-3.72 1.93.71-4.14-3.01-2.94 4.16-.6L10 2.5z" />
    </svg>
  );
}

function PlanCheckbox({ checked }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-2 transition-all duration-200 ${
        checked
          ? 'border-[#7c6fe0] bg-[#7c6fe0] shadow-[0_2px_6px_rgba(124,111,224,0.3)]'
          : 'border-gray-300 bg-white'
      }`}
    >
      {checked && (
        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function AssistantPlanCard({ service, checked, onToggle, formatPrice, t }) {
  const badgeClass = BADGE_TONES[service.badgeTone] || BADGE_TONES.green;

  return (
    <label
      className={`group block min-w-0 cursor-pointer rounded-[10px] border p-3 transition-all duration-200 ease-out ${
        checked
          ? 'border-[#8b83e8] bg-[#f8f7ff] shadow-[0_2px_10px_rgba(99,102,241,0.1)]'
          : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.05)]'
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onToggle}
      />

      <div className="flex items-start gap-2">
        <PlanCheckbox checked={checked} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="text-[0.82rem] font-bold leading-snug text-gray-900 sm:text-[0.86rem]">
                {t(service.labelKey)}
              </span>
              <span className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[0.68rem] font-semibold ${badgeClass}`}>
                {t(service.badgeKey)}
              </span>
            </div>
            <span className="shrink-0 text-[0.86rem] font-bold text-gray-900">
              {formatPrice(service.price)}
            </span>
          </div>

          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-gray-500">
            {t(service.descKey)}
          </p>

          <ul className="mt-1.5 space-y-0.5 pl-0.5">
            {service.featureKeys.map((featureKey) => (
              <li key={featureKey} className="flex items-start gap-1.5 text-[0.72rem] leading-snug text-gray-600">
                <span className="mt-[0.35rem] h-0.5 w-0.5 shrink-0 rounded-full bg-gray-400" aria-hidden="true" />
                <span>{t(featureKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </label>
  );
}

export default function VirtualAssistantSelector({ selected = [], onChange, className = 'mt-4' }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [open, setOpen] = useState(false);

  const toggle = (key) => {
    onChange(selected.includes(key) ? [] : [key]);
  };

  const total = vaTotal(selected);

  return (
    <div className={`min-w-0 overflow-x-hidden ${className}`}>
      <AddonAccordionCard
        theme="amber"
        icon={<StarIcon />}
        title={t('vaSelectorTitle')}
        tooltip={(
          <PremiumInfoTooltip
            title={t('vaTooltipTitle')}
            paragraphs={[t('vaTooltipBody1'), t('vaTooltipBody2')]}
            ariaLabel={t('vaTooltipTitle')}
          />
        )}
        selectedCount={selected.length}
        open={open}
        onToggle={() => setOpen((value) => !value)}
      >
        <div className="border-t border-[#ecd9b8] bg-[#fafbfc] p-2.5 overflow-x-hidden">
          <div className="rounded-xl border border-gray-200/80 bg-[#f7f8fa] p-2 space-y-2 overflow-x-hidden">
            {VA_SERVICES.map((service) => (
              <AssistantPlanCard
                key={service.key}
                service={service}
                checked={selected.includes(service.key)}
                onToggle={() => toggle(service.key)}
                formatPrice={formatPrice}
                t={t}
              />
            ))}
          </div>

          {selected.length > 0 && (
            <div className="mt-2 flex items-center justify-between px-0.5 text-[0.75rem] text-gray-600">
              <span>{t('addonSelectorServicesSelected', { count: selected.length })}</span>
              <span className="font-bold text-[#7c6fe0]">
                {t('addonSelectorAddonsTotal', { price: formatPrice(total) })}
              </span>
            </div>
          )}
        </div>
      </AddonAccordionCard>
    </div>
  );
}
