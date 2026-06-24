/**
 * VirtualAssistantSelector.jsx
 * Checkout selector backed by the live Operations virtual-assistant catalog.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Headset } from 'lucide-react';
import useCurrency from '../../context/CurrencyContext';
import AddonAccordionCard from './AddonAccordionCard';
import PremiumInfoTooltip from './PremiumInfoTooltip';
import { resolveOperationsIcon } from '../../utils/operationsIcons';
import {
  useVirtualAssistantCatalog,
  vaLabel,
  vaTotal,
} from '../../hooks/useVirtualAssistantCatalog';

export { vaLabel, vaTotal } from '../../hooks/useVirtualAssistantCatalog';

export const VA_SERVICES = [];

const BADGE_TONES = {
  default: 'bg-[#eef2ff] text-[#4f46e5] border-[#dbe4ff]',
  marketing: 'bg-[#fff1e3] text-[#b86a14] border-[#f5dcc0]',
  people: 'bg-[#e8f7ef] text-[#1f7a4c] border-[#c9ebd8]',
  support: 'bg-[#e8f1fd] text-[#2563b8] border-[#cfe0fb]',
  creative: 'bg-[#f7ecff] text-[#7c3aed] border-[#e6d5ff]',
  technology: 'bg-[#e8f2ff] text-[#1d4ed8] border-[#cfe0fb]',
  operations: 'bg-[#f4f1ff] text-[#6b5fc7] border-[#ded8f6]',
  finance: 'bg-[#fff7e8] text-[#b45309] border-[#f5e1b5]',
  growth: 'bg-[#ecfbf4] text-[#15803d] border-[#caebd6]',
  sales: 'bg-[#eef5ff] text-[#2563eb] border-[#d7e4ff]',
};

function getTone(category) {
  return BADGE_TONES[category] || BADGE_TONES.default;
}

function VirtualAssistantPrice({ price, formatPrice }) {
  return (
    <span className="shrink-0 text-[0.86rem] font-bold text-gray-900">
      {formatPrice(price)}
      <span className="text-[0.68rem] font-medium text-gray-400">/mo</span>
    </span>
  );
}

function AssistantPlanCard({ service, checked, onToggle, formatPrice, t }) {
  const Icon = resolveOperationsIcon(service);
  const badgeClass = getTone(service.category);

  return (
    <label
      className={`group block cursor-pointer rounded-[10px] border p-3 transition-all duration-200 ease-out ${
        checked
          ? 'border-[#8b83e8] bg-[#f8f7ff] shadow-[0_2px_10px_rgba(99,102,241,0.1)]'
          : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.05)]'
      }`}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />

      <div className="flex items-start gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-2 transition-all duration-200 ${
            checked
              ? 'border-[#7c6fe0] bg-[#7c6fe0] shadow-[0_2px_6px_rgba(124,111,224,0.3)]'
              : 'border-gray-300 bg-white'
          }`}
          aria-hidden="true"
        >
          {checked && (
            <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-gray-200 bg-white text-gray-700">
                <Icon size={16} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[0.82rem] font-bold leading-snug text-gray-900 sm:text-[0.86rem]">
                    {service.name}
                  </span>
                  <span className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[0.68rem] font-semibold ${badgeClass}`}>
                    {service.category ? service.category.replace(/_/g, ' ') : t('operations', { defaultValue: 'operations' })}
                  </span>
                </div>
                <p className="mt-1 text-[0.72rem] font-medium uppercase tracking-wide text-gray-400">
                  {t('operationsBillingMonthly', { defaultValue: 'Monthly' })}
                </p>
              </div>
            </div>
            <VirtualAssistantPrice price={service.price} formatPrice={formatPrice} />
          </div>

          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-gray-500">
            {service.description || t('operationsCardDesc', {
              defaultValue: 'Dedicated remote professional for your MSME — flexible monthly engagement.',
            })}
          </p>

          {service.skills ? (
            <p className="mt-1.5 text-[0.72rem] leading-relaxed text-gray-500">
              {service.skills}
            </p>
          ) : null}
        </div>
      </div>
    </label>
  );
}

export default function VirtualAssistantSelector({
  selected = [],
  onChange,
  className = 'mt-4',
  services: externalServices = null,
  loading: externalLoading = false,
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [open, setOpen] = useState(false);
  const catalog = useVirtualAssistantCatalog({ enabled: !externalServices });
  const services = externalServices || catalog.services;
  const loading = externalLoading || catalog.loading;

  const toggle = (key) => {
    onChange(selected.includes(key) ? [] : [key]);
  };

  const total = vaTotal(selected, services);

  return (
    <div className={className}>
      <AddonAccordionCard
        theme="amber"
        icon={<Headset size={16} strokeWidth={2.2} aria-hidden />}
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
        <div className="border-t border-[#ecd9b8] bg-[#fafbfc] p-2.5">
          <div className="rounded-xl border border-gray-200/80 bg-[#f7f8fa] p-2 space-y-2">
            {loading ? (
              <div className="rounded-[10px] border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                {t('loading', { defaultValue: 'Loading…' })}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                {t('vaSelectorEmpty', { defaultValue: 'No virtual assistants are available right now.' })}
              </div>
            ) : (
              services.map((service) => (
                <AssistantPlanCard
                  key={service.id}
                  service={service}
                  checked={selected.includes(service.id)}
                  onToggle={() => toggle(service.id)}
                  formatPrice={formatPrice}
                  t={t}
                />
              ))
            )}
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
