import { ADDON_SERVICES } from '../components/addon/AddonSelector';
import { OPERATIONS_SERVICES_CATALOG } from './operationsServicesCatalog';
import { planLabelForKey } from './technologyPricingPlans';

const BUSINESS_KEYS = new Set(ADDON_SERVICES.map((s) => s.key));
const STATIC_CATALOG_BY_KEY = new Map(OPERATIONS_SERVICES_CATALOG.map((item) => [item.key, item]));

function addonDisplayLabel(key, translate) {
  const svc = ADDON_SERVICES.find((s) => s.key === key);
  if (!svc) return key;
  return translate ? translate(svc.labelKey) : svc.labelKey;
}

function catalogFallback(key) {
  return STATIC_CATALOG_BY_KEY.get(key);
}

function isVaKey(key, vaCatalog) {
  const id = String(key);
  const vaIds = new Set(vaCatalog.map((s) => String(s.id)));
  return vaIds.has(id) || (!BUSINESS_KEYS.has(key) && (id.includes('-') || /^\d+$/.test(id)));
}

function resolveOperationsService(key, operationsPriceByKey, translate) {
  const op = operationsPriceByKey?.get?.(key);
  const fallback = catalogFallback(key);
  if (op) {
    return {
      label: op.name || addonDisplayLabel(key, translate),
      estimatedPrice: Number(op.price) || 0,
      iconKey: op.icon || fallback?.icon || 'ShieldCheck',
      description: op.description || fallback?.defaultDescription || '',
    };
  }
  const svc = ADDON_SERVICES.find((s) => s.key === key);
  return {
    label: addonDisplayLabel(key, translate),
    estimatedPrice: svc ? Number(svc.price) || 0 : 0,
    iconKey: fallback?.icon || 'ShieldCheck',
    description: fallback?.defaultDescription || '',
  };
}

export function resolveCartItemAddonLines(item, vaCatalog = [], operationsPriceByKey = new Map(), translate) {
  const keys = item.addonServices || [];
  const lines = [];

  keys.forEach((key) => {
    const id = String(key);

    if (isVaKey(key, vaCatalog)) {
      const va = vaCatalog.find((s) => String(s.id) === id);
      lines.push({
        key: id,
        label: va?.name || 'Virtual Assistant',
        estimatedPrice: Number(va?.price) || 0,
        description: va?.description || '',
        isVirtualAssistant: true,
        isServiceAddon: false,
      });
      return;
    }

    if (BUSINESS_KEYS.has(key) || ADDON_SERVICES.find((s) => s.key === key)) {
      const { label, estimatedPrice, iconKey, description } = resolveOperationsService(key, operationsPriceByKey, translate);
      lines.push({
        key,
        label,
        estimatedPrice,
        iconKey,
        description,
        isVirtualAssistant: false,
        isServiceAddon: true,
      });
    }
  });

  return lines;
}

export function buildCartItemBreakdown(item, vaCatalog = [], operationsPriceByKey = new Map(), translate) {
  const addonLines = resolveCartItemAddonLines(item, vaCatalog, operationsPriceByKey, translate);
  const serviceLines = addonLines.filter((l) => l.isServiceAddon);
  const virtualAssistantLines = addonLines.filter((l) => l.isVirtualAssistant);
  const addonAmount = Number(item.addonAmount) || 0;
  const productPayToday = round2((Number(item.basePrice) || 0) + addonAmount + (Number(item.coBrotherFee) || 0));
  const isDomainListing = item.productType === 'DOMAIN_LISTING';
  const listingInclusive = isDomainListing
    ? Number(item.metadata?.buyerPayableInr) > 0
      ? round2(Number(item.metadata.buyerPayableInr) + addonAmount + (Number(item.coBrotherFee) || 0))
      : null
    : null;

  return {
    id: item.id,
    name: item.productName || 'Item',
    productType: item.productType,
    available: item.available !== false,
    selectedPlan: item.selectedPlan,
    planLabel: item.selectedPlan ? planLabelForKey(item.selectedPlan) : null,
    periodYears:
      item.productType === 'DOMAIN_REGISTRATION'
        ? Math.max(1, Number(item.metadata?.period || 1))
        : null,
    basePrice: Number(item.basePrice) || 0,
    addonAmount,
    coBrotherFee: Number(item.coBrotherFee) || 0,
    productPayToday: listingInclusive != null ? listingInclusive : productPayToday,
    listingInclusive: listingInclusive != null,
    listingGst: isDomainListing ? Number(item.metadata?.gstInr || 0) : 0,
    listingGstRate: isDomainListing ? item.metadata?.gstRate : null,
    serviceLines,
    virtualAssistantLines,
    lineTotal: Number(item.lineTotal) || 0,
  };
}

export function buildCartOrderViewModel(itemBreakdowns) {
  const products = [];
  const services = [];
  const virtualAssistants = [];

  itemBreakdowns.forEach((breakdown) => {
    if (!breakdown.available) return;

    products.push({
      id: breakdown.id,
      name: breakdown.name,
      planLabel: breakdown.planLabel,
      productType: breakdown.productType,
      periodYears: breakdown.periodYears,
      amount: breakdown.productPayToday,
      basePrice: breakdown.basePrice,
      addonAmount: breakdown.addonAmount,
      coBrotherFee: breakdown.coBrotherFee,
      listingInclusive: breakdown.listingInclusive === true,
      listingGst: breakdown.listingGst || 0,
      listingGstRate: breakdown.listingGstRate,
    });

    breakdown.serviceLines.forEach((line) => {
      services.push({
        id: `${breakdown.id}-svc-${line.key}`,
        serviceKey: line.key,
        productName: breakdown.name,
        label: line.label,
        estimatedPrice: line.estimatedPrice,
        iconKey: line.iconKey,
        description: line.description,
      });
    });

    breakdown.virtualAssistantLines.forEach((line) => {
      virtualAssistants.push({
        id: `${breakdown.id}-va-${line.key}`,
        productName: breakdown.name,
        label: line.label,
        estimatedPrice: line.estimatedPrice,
        description: line.description,
      });
    });
  });

  const listingDisplaySum = round2(
    products.reduce((sum, p) => sum + (p.listingInclusive ? p.amount : 0), 0),
  );
  const nonListingExGst = round2(
    products.reduce((sum, p) => sum + (p.listingInclusive ? 0 : p.amount), 0),
  );
  const listingGstRate = products.find((p) => p.listingInclusive && p.listingGstRate != null)?.listingGstRate;
  const nonListingGst = round2(nonListingExGst * 0.18);
  const listingOnly = products.length > 0 && products.every((p) => p.listingInclusive);
  const productTotal = round2(listingDisplaySum + nonListingExGst + nonListingGst);
  const productSubtotal = round2(listingDisplaySum + nonListingExGst);
  const hideGstSplit = listingOnly || nonListingGst <= 0;

  return {
    products,
    services,
    virtualAssistants,
    productSubtotal,
    productGst: nonListingGst,
    productTotal,
    hideGstSplit,
    gstRate: listingGstRate != null ? Number(listingGstRate) : null,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
