import { useCallback, useEffect, useMemo, useState } from 'react';
import { operationsAPI } from '../api/services';
import { asArray } from '../utils/asArray';
import { OPERATIONS_SERVICES_CATALOG } from '../utils/operationsServicesCatalog';

function normalizeService(row) {
  return {
    id: String(row?.id ?? ''),
    name: row?.name || '',
    price: Number(row?.price ?? 0) || 0,
    skills: row?.skills || '',
    icon: row?.icon || null,
    description: row?.description || '',
    serviceType: row?.serviceType ?? row?.service_type ?? 'compliance',
    isAvailable: row?.isAvailable ?? row?.is_available ?? true,
  };
}

export function useOperationsServicesCatalog({ enabled = true } = {}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  const refresh = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    try {
      const { data } = await operationsAPI.list({ serviceType: 'compliance' });
      const rows = asArray(data)
        .map(normalizeService)
        .filter((row) => row.isAvailable !== false);
      setServices(rows);
      return rows;
    } catch {
      setServices([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setServices([]);
      return undefined;
    }
    refresh();
    return undefined;
  }, [enabled, refresh]);

  const priceByAddonKey = useMemo(() => {
    const map = new Map();
    services.forEach((svc) => {
      if (svc.skills) map.set(svc.skills, svc);
    });
    OPERATIONS_SERVICES_CATALOG.forEach((item) => {
      if (!map.has(item.key)) {
        map.set(item.key, {
          id: item.key,
          name: item.defaultName,
          price: item.price,
          skills: item.key,
          icon: item.icon,
          description: item.defaultDescription,
          fromCatalog: true,
        });
      }
    });
    return map;
  }, [services]);

  return { services, priceByAddonKey, loading, refresh };
}
