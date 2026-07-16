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

  return {
    id: item.id,
    name: item.productName || 'Item',
    productType: item.productType,
    available: item.available !== false,
    selectedPlan: item.selectedPlan,
    planLabel: item.selectedPlan ? planLabelForKey(item.selectedPlan) : null,
    basePrice: Number(item.basePrice) || 0,
    addonAmount,
    coBrotherFee: Number(item.coBrotherFee) || 0,
    productPayToday,
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
      amount: breakdown.productPayToday,
      basePrice: breakdown.basePrice,
      addonAmount: breakdown.addonAmount,
      coBrotherFee: breakdown.coBrotherFee,
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

  const productSubtotal = round2(products.reduce((sum, p) => sum + p.amount, 0));
  const productGst = round2(productSubtotal * 0.18);
  const productTotal = round2(productSubtotal + productGst);

  return {
    products,
    services,
    virtualAssistants,
    productSubtotal,
    productGst,
    productTotal,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
