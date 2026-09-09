import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../context/CurrencyContext';

import { useDynamicCategoryName } from '../../context/CategoryContext';
import { resolveOperationsIcon } from '../../utils/operationsIcons';
import { OPERATIONS_CATEGORY_LABELS, getHubRegistrarCategoryLabel, HUB_REGISTRAR_CATEGORY_LABELS } from '../../utils/operationsCategories';

/** Map category value to i18n translation key */
const CATEGORY_I18N_KEY = {
  marketing: 'operationsCategoryMarketing',
  technology: 'operationsCategoryTechnology',
  sales: 'operationsCategorySales',
  finance: 'operationsCategoryFinance',
  people: 'operationsCategoryPeopleHr',
  support: 'operationsCategorySupport',
  creative: 'operationsCategoryCreative',
  growth: 'operationsCategoryGrowth',
  operations: 'operationsCategoryOperations',
  compliance: 'operationsCategoryHubRegistrar',
};

/** Map hub-registrar category value to i18n translation key */
const HUB_REG_I18N_KEY = {
  business_entity: 'operationsCategoryBusinessEntity',
  tax_identity: 'operationsCategoryTaxIdentity',
  local_licences: 'operationsCategoryLocalLicences',
  msme_udyam: 'operationsCategoryMsmeUdyam',
  startup_dpiit: 'operationsCategoryStartupDpiit',
  food_fssai: 'operationsCategoryFoodFssai',
  import_export: 'operationsCategoryImportExport',
  manufacturing: 'operationsCategoryManufacturing',
  technology_saas: 'operationsCategoryTechnologySaas',
  ecommerce: 'operationsCategoryEcommerce',
  fintech: 'operationsCategoryFintech',
  aviation: 'operationsCategoryAviation',
  construction_real_estate: 'operationsCategoryConstruction',
  healthcare: 'operationsCategoryHealthcare',
  education: 'operationsCategoryEducation',
  professional_services: 'operationsCategoryProfessionalServices',
  telecom: 'operationsCategoryTelecom',
  pharma_chemical: 'operationsCategoryPharmaChemical',
  automotive: 'operationsCategoryAutomotive',
  agriculture: 'operationsCategoryAgriculture',
  logistics_transport: 'operationsCategoryLogistics',
  tourism_hospitality: 'operationsCategoryTourism',
  entertainment_media: 'operationsCategoryEntertainment',
  energy_power: 'operationsCategoryEnergy',
  defence_aerospace: 'operationsCategoryDefence',
  intellectual_property: 'operationsCategoryIntellectualProperty',
  employer_labour: 'operationsCategoryEmployerLabour',
  environmental: 'operationsCategoryEnvironmental',
  digital_services: 'operationsCategoryDigitalServices',
  other: 'operationsCategoryOther',
};
import { formatOperationsPrice, isComplianceService } from '../../utils/operationsPricing';

/**
 * Single Operations service/role card.
 * Reused by both the Operations page and the Home page Operations section so
 * the role list renders identically in both places (no duplicated markup).
 */
export default function OperationsServiceCard({ service, onHire, className = '' }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const dynamicName = useDynamicCategoryName(service.category, getHubRegistrarCategoryLabel);

  const Icon = resolveOperationsIcon(service);
  const cardCompliance = isComplianceService(service);
  // Use dynamic API category name for compliance (Hub Registrar) services.
  // For non-compliance services, fall back to static category labels.
  const catLabel = cardCompliance
    ? t(HUB_REG_I18N_KEY[service.category], { defaultValue: dynamicName })
    : t(CATEGORY_I18N_KEY[service.category], { defaultValue: OPERATIONS_CATEGORY_LABELS[service.category] ?? service.category });
  const priceInfo = formatOperationsPrice(service, { t, formatPrice });
  const tone = cardCompliance
    ? {
        article: 'hover:border-[#99F6E4] hover:shadow-[0_14px_30px_rgba(15,118,110,0.12)]',
        icon: 'bg-[#F0FDFA] text-[#0F766E] border-[#CCFBF1] shadow-[#CCFBF1] group-hover:bg-[#CCFBF1]',
        badge: 'text-[#0F766E] bg-[#F0FDFA] border-[#CCFBF1]',
        price: 'border-[#CCFBF1] bg-[#F0FDFA]/70',
        priceText: 'text-[#0F766E]',
        button: 'bg-[#0F766E] shadow-[0_2px_8px_rgba(15,118,110,0.18)] hover:bg-[#115E59] hover:shadow-[0_8px_18px_rgba(15,118,110,0.22)]',
      }
    : {
        article: 'hover:border-[#FED7AA] hover:shadow-[0_14px_30px_rgba(249,115,22,0.12)]',
        icon: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5] shadow-[#FFEDD5] group-hover:bg-[#FFEDD5]',
        badge: 'text-[#C2410C] bg-[#FFF7ED] border-[#FFEDD5]',
        price: 'border-[#FFEDD5] bg-[#FFF7ED]/70',
        priceText: 'text-[#C2410C]',
        button: 'bg-[#C2410C] shadow-[0_2px_8px_rgba(194,65,12,0.18)] hover:bg-[#9A3412] hover:shadow-[0_8px_18px_rgba(194,65,12,0.22)]',
      };

  return (
    <>
    <article
      key={service.id}
      className={`group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 ${tone.article} ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors ${tone.icon}`}>
          <Icon size={20} strokeWidth={2} aria-hidden />
        </div>
        <span className={`max-w-[calc(100%-4rem)] text-[9px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full whitespace-normal break-words ${tone.badge}`}>
          {catLabel}
        </span>
      </div>
      <h3 className="font-display text-base font-bold text-gray-900 leading-snug mb-1.5">
        {t(`opsSvcName_${(service.name || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`, { defaultValue: service.name })}
      </h3>
      <p className="text-sm text-gray-500 flex-1 leading-relaxed line-clamp-2">
        {service.description
          ? t(`opsSvcDesc_${(service.name || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`, { defaultValue: service.description })
          : t('operationsCardDesc', { defaultValue: 'Dedicated remote professional for your MSME — flexible monthly engagement.' })}
      </p>
      {service.governmentFeesApplicable && service.governmentFeeText && (
        <div className="mt-2 w-fit">
          <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700 whitespace-nowrap">
            {t('operationsGovtFeesApplicable', { defaultValue: 'Govt. fees applicable' })}
          </span>
        </div>
      )}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <div className="flex items-end justify-between gap-3">
          {cardCompliance && !priceInfo.showPrice ? (
            <div className={`rounded-lg border px-3 py-1.5 min-h-[2.25rem] overflow-hidden ${tone.price}`}>
              <p className={`text-[11px] font-semibold whitespace-nowrap ${tone.priceText}`}>
                {t('operationsContactForPricing', { defaultValue: 'Contact for pricing' })}
              </p>
            </div>
          ) : priceInfo.showPrice ? (
            <div className={`rounded-lg border px-3 py-1.5 ${tone.price}`}>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5 font-medium">
                {t('operationsFrom', { defaultValue: 'Starting at' })}
              </p>
              <p className="text-base font-bold text-gray-900">
                {priceInfo.amount}
                {priceInfo.suffix && (
                  <span className="text-xs font-medium text-gray-400">{priceInfo.suffix}</span>
                )}
              </p>
            </div>
          ) : (
            <div className="min-h-[2.25rem]" />
          )}
          <button
            type="button"
            className={`shrink-0 text-sm px-4 py-2 rounded-lg text-white font-bold transition-all duration-200 inline-flex items-center justify-center gap-1 ${tone.button}`}
            onClick={() => onHire(service)}
          >
            {cardCompliance
              ? t('operationsBookSlot', { defaultValue: 'Book Your Slot' })
              : t('operationsHire', { defaultValue: 'Hire' })}
            <span className="ml-0.5">→</span>
          </button>
        </div>
      </div>
    </article>
    </>
  );
}
