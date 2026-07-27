import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { technologyAPI } from '../../api/services';
import { useCurrency } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';
import AddonSections from '../addon/AddonSections';
import { ADDON_SERVICES } from '../addon/AddonSelector';
import { useVirtualAssistantCatalog } from '../../hooks/useVirtualAssistantCatalog';
import { getEnabledPricingPlans } from '../../utils/technologyPricingPlans';
import TechnologyPurchaseConfig from './TechnologyPurchaseConfig';

const BUSINESS_KEYS = new Set(ADDON_SERVICES.map((s) => s.key));
const SAVE_DELAY_MS = 450;
/** Domain listing extras only — Technology cart config is CoBrother-only (no VA). */
const SHOW_VA_IN_CART = false;

function splitAddonServices(all = [], vaCatalog = []) {
  const vaIds = new Set(vaCatalog.map((s) => String(s.id)));
  const business = [];
  const va = [];
  (all || []).forEach((key) => {
    const id = String(key);
    if (vaIds.has(id)) va.push(id);
    else if (BUSINESS_KEYS.has(key)) business.push(key);
    else if (/^\d+$/.test(id) || id.includes('-')) va.push(id);
    else business.push(key);
  });
  return { business, va };
}

/**
 * @param {object} props
 * @param {object} props.item
 * @param {() => void} [props.onUpdated]
 * @param {(status: { itemId: string, requiresPlan: boolean, hasPlan: boolean, complete: boolean }) => void} [props.onConfigStatus]
 * @param {boolean} [props.collapsed] — when true, hide body (parent accordion controls visibility)
 * @param {boolean} [props.forceExpanded] — unused; kept for API stability
 */
export default function CartItemExtras({ item, onUpdated, onConfigStatus, collapsed = false }) {
  const { formatPrice } = useCurrency();
  const { updateItem } = useCart();
  const { services: vaServices, loading: vaLoading } = useVirtualAssistantCatalog();
  const saveTimerRef = useRef(null);
  const autoPlanSavedRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [techLoading, setTechLoading] = useState(false);
  const [enabledPlans, setEnabledPlans] = useState([]);

  const isTechnology = item.productType === 'TECHNOLOGY';
  const isDomainListing = item.productType === 'DOMAIN_LISTING';
  const supported = isTechnology || isDomainListing;

  const split = useMemo(
    () => splitAddonServices(item.addonServices || [], vaServices),
    [item.addonServices, vaServices],
  );

  const [coBrotherOptIn, setCoBrotherOptIn] = useState(Boolean(item.coBrotherOptIn));
  const [businessAddons, setBusinessAddons] = useState(split.business);
  const [vaAddons, setVaAddons] = useState(split.va);
  const [selectedPlan, setSelectedPlan] = useState(item.selectedPlan || null);

  useEffect(() => {
    if (!isTechnology) return undefined;
    let active = true;
    setTechLoading(true);
    technologyAPI.get(item.productId)
      .then(({ data }) => {
        if (!active) return;
        const record = data?.data ?? data;
        const plans = getEnabledPricingPlans(record?.pricingPlans || record?.pricing_plans);
        setEnabledPlans(plans);
        if (
          plans.length === 1
          && !item.selectedPlan
          && autoPlanSavedRef.current !== item.id
        ) {
          const onlyKey = plans[0].key;
          autoPlanSavedRef.current = item.id;
          setSelectedPlan(onlyKey);
          updateItem(item.id, {
            selectedPlan: onlyKey,
            coBrotherOptIn: Boolean(item.coBrotherOptIn),
          })
            .then(() => onUpdated?.())
            .catch(() => {
              autoPlanSavedRef.current = null;
            });
        }
      })
      .catch(() => {
        if (active) setEnabledPlans([]);
      })
      .finally(() => {
        if (active) setTechLoading(false);
      });
    return () => { active = false; };
    // Intentionally omit updateItem/onUpdated to avoid re-fetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTechnology, item.productId, item.id, item.selectedPlan, item.coBrotherOptIn]);

  useEffect(() => {
    const nextSplit = splitAddonServices(item.addonServices || [], vaServices);
    setCoBrotherOptIn(Boolean(item.coBrotherOptIn));
    setBusinessAddons(nextSplit.business);
    setVaAddons(nextSplit.va);
    setSelectedPlan(item.selectedPlan || null);
  }, [item.id, item.addonServices, item.coBrotherOptIn, item.selectedPlan, vaServices]);

  const requiresPlan = isTechnology && enabledPlans.length > 0;
  const hasPlan = Boolean(selectedPlan);
  const complete = !requiresPlan || hasPlan;

  useEffect(() => {
    if (!isTechnology || !onConfigStatus) return;
    onConfigStatus({
      itemId: item.id,
      requiresPlan,
      hasPlan,
      complete,
    });
  }, [isTechnology, item.id, requiresPlan, hasPlan, complete, onConfigStatus]);

  const persistTechnology = useCallback(async (nextCoBrother, nextPlan) => {
    setSaving(true);
    setError('');
    try {
      const body = {
        coBrotherOptIn: nextCoBrother,
      };
      if (nextPlan) body.selectedPlan = nextPlan;
      // Do not send addonServices — leave VA/Compliance untouched; cart UI is CoBrother-only.
      await updateItem(item.id, body);
      await onUpdated?.();
    } catch {
      setError('Could not update options. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [item.id, onUpdated, updateItem]);

  const persistDomainListing = useCallback(async (nextBusiness, nextVa) => {
    setSaving(true);
    setError('');
    try {
      await updateItem(item.id, {
        addonServices: [...nextBusiness, ...nextVa],
      });
      await onUpdated?.();
    } catch {
      setError('Could not update options. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [item.id, onUpdated, updateItem]);

  const scheduleTechSave = useCallback((nextCoBrother, nextPlan) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      persistTechnology(nextCoBrother, nextPlan);
    }, SAVE_DELAY_MS);
  }, [persistTechnology]);

  const scheduleDomainSave = useCallback((nextBusiness, nextVa) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      persistDomainListing(nextBusiness, nextVa);
    }, SAVE_DELAY_MS);
  }, [persistDomainListing]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleCoBrotherToggle = () => {
    const next = !coBrotherOptIn;
    setCoBrotherOptIn(next);
    scheduleTechSave(next, selectedPlan);
  };

  const handleBusinessChange = (next) => {
    setBusinessAddons(next);
    scheduleDomainSave(next, vaAddons);
  };

  const handleVaChange = (next) => {
    setVaAddons(next);
    scheduleDomainSave(businessAddons, next);
  };

  const handlePlanChange = (planKey) => {
    setSelectedPlan(planKey);
    scheduleTechSave(coBrotherOptIn, planKey);
  };

  if (!supported) return null;
  if (collapsed) return null;

  return (
    <div className="rounded-[14px] border border-gray-200/80 bg-gray-50/60 px-3 py-4 sm:px-4 -mt-1 mb-1">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800">Configure before checkout</p>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{item.productName}</p>
        </div>
        {saving && (
          <span className="text-[11px] text-indigo-600 font-medium shrink-0">Updating…</span>
        )}
      </div>

      {isTechnology && (
        <TechnologyPurchaseConfig
          plans={enabledPlans}
          selectedPlan={selectedPlan}
          onPlanSelect={handlePlanChange}
          plansLoading={techLoading}
          coBrotherOptIn={coBrotherOptIn}
          onCoBrotherToggle={handleCoBrotherToggle}
          formatPrice={formatPrice}
        />
      )}

      {isTechnology && requiresPlan && !hasPlan && (
        <p className="text-xs text-amber-700 mt-2 font-medium">
          Select a pricing plan before checkout.
        </p>
      )}

      {isDomainListing && (
        <AddonSections
          businessSelected={businessAddons}
          onBusinessChange={handleBusinessChange}
          vaSelected={vaAddons}
          onVaChange={handleVaChange}
          vaServices={vaServices}
          vaLoading={vaLoading}
          showVirtualAssistant={SHOW_VA_IN_CART}
          className="mt-0"
        />
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
