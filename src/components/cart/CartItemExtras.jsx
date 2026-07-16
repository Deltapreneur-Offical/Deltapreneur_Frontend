import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { technologyAPI } from '../../api/services';
import { useCurrency } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';
import AddonSections from '../addon/AddonSections';
import { ADDON_SERVICES } from '../addon/AddonSelector';
import { useVirtualAssistantCatalog } from '../../hooks/useVirtualAssistantCatalog';
import { getEnabledPricingPlans } from '../../utils/technologyPricingPlans';
import TechnologyPlanPicker from './TechnologyPlanPicker';

const BUSINESS_KEYS = new Set(ADDON_SERVICES.map((s) => s.key));
const SAVE_DELAY_MS = 450;

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

export default function CartItemExtras({ item, onUpdated }) {
  const { formatPrice } = useCurrency();
  const { updateItem } = useCart();
  const { services: vaServices, loading: vaLoading } = useVirtualAssistantCatalog();
  const saveTimerRef = useRef(null);
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
        setEnabledPlans(getEnabledPricingPlans(record?.pricingPlans || record?.pricing_plans));
      })
      .catch(() => {
        if (active) setEnabledPlans([]);
      })
      .finally(() => {
        if (active) setTechLoading(false);
      });
    return () => { active = false; };
  }, [isTechnology, item.productId]);

  useEffect(() => {
    const nextSplit = splitAddonServices(item.addonServices || [], vaServices);
    setCoBrotherOptIn(Boolean(item.coBrotherOptIn));
    setBusinessAddons(nextSplit.business);
    setVaAddons(nextSplit.va);
    setSelectedPlan(item.selectedPlan || null);
  }, [item.id, item.addonServices, item.coBrotherOptIn, item.selectedPlan, vaServices]);

  const persist = useCallback(async (nextCoBrother, nextBusiness, nextVa, nextPlan) => {
    setSaving(true);
    setError('');
    try {
      const body = {
        addonServices: [...nextBusiness, ...nextVa],
      };
      if (isTechnology) {
        body.coBrotherOptIn = nextCoBrother;
        if (nextPlan) body.selectedPlan = nextPlan;
      }
      await updateItem(item.id, body);
      await onUpdated?.();
    } catch {
      setError('Could not update options. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isTechnology, item.id, onUpdated, updateItem]);

  const scheduleSave = useCallback((nextCoBrother, nextBusiness, nextVa, nextPlan) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      persist(nextCoBrother, nextBusiness, nextVa, nextPlan);
    }, SAVE_DELAY_MS);
  }, [persist]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleCoBrotherToggle = () => {
    const next = !coBrotherOptIn;
    setCoBrotherOptIn(next);
    scheduleSave(next, businessAddons, vaAddons, selectedPlan);
  };

  const handleBusinessChange = (next) => {
    setBusinessAddons(next);
    scheduleSave(coBrotherOptIn, next, vaAddons, selectedPlan);
  };

  const handleVaChange = (next) => {
    setVaAddons(next);
    scheduleSave(coBrotherOptIn, businessAddons, next, selectedPlan);
  };

  const handlePlanChange = (planKey) => {
    setSelectedPlan(planKey);
    scheduleSave(coBrotherOptIn, businessAddons, vaAddons, planKey);
  };

  if (!supported) return null;

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

      {isTechnology && enabledPlans.length > 0 && (
        <TechnologyPlanPicker
          plans={enabledPlans}
          selectedKey={selectedPlan}
          onSelect={handlePlanChange}
          loading={techLoading}
          formatPrice={formatPrice}
          className="mb-3"
        />
      )}

      {isTechnology && (
        <div
          onClick={handleCoBrotherToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCoBrotherToggle(); }}
          className={`flex items-start gap-3 p-3 sm:p-3.5 mb-3 cursor-pointer rounded-xl border-2 transition-all ${
            coBrotherOptIn
              ? 'bg-purple-50/60 border-purple-300 shadow-sm'
              : 'bg-white border-gray-200 hover:border-purple-200'
          }`}
        >
          <div className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${
            coBrotherOptIn ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'
          }`}>
            {coBrotherOptIn && <span className="text-white text-[0.65rem] font-bold">✓</span>}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${coBrotherOptIn ? 'text-purple-900' : 'text-gray-800'}`}>
              Co-Creator Assistance
              <span className={`ml-2 font-display ${coBrotherOptIn ? 'text-purple-700' : 'text-gray-500'}`}>
                +{formatPrice(1000)}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Dedicated CoBrother support for setup and deployment within 24 hours.
            </p>
          </div>
        </div>
      )}

      <AddonSections
        businessSelected={businessAddons}
        onBusinessChange={handleBusinessChange}
        vaSelected={vaAddons}
        onVaChange={handleVaChange}
        vaServices={vaServices}
        vaLoading={vaLoading}
        className="mt-0"
      />

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
