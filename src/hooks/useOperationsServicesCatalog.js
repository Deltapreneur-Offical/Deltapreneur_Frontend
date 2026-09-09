import { useCallback, useEffect, useMemo, useState } from 'react';
import { hubRegistrarCategoryAPI, operationsAPI } from '../api/services';
import { asArray } from '../utils/asArray';

function normalizeService(row) {
  const id = String(row?.id ?? '');
  return {
    id,
    key: id,
    name: row?.name || '',
    category: row?.category || '',
    price: Number(row?.price ?? 0) || 0,
    skills: row?.skills || '',
    icon: row?.icon || null,
    description: row?.description || '',
    serviceType: row?.serviceType ?? row?.service_type ?? 'compliance',
    isAvailable: row?.isAvailable ?? row?.is_available ?? true,
    displayOrder: Number(row?.displayOrder ?? row?.display_order ?? 0) || 0,
    contactOnly: (Number(row?.price ?? 0) || 0) <= 0,
  };
}

function normalizeCategory(row) {
  return {
    id: String(row?.id ?? ''),
    slug: row?.slug || '',
    name: row?.name || '',
    description: row?.description || '',
    icon: row?.icon || null,
    displayOrder: Number(row?.displayOrder ?? row?.display_order ?? 0) || 0,
    isActive: row?.isActive ?? row?.is_active ?? true,
  };
}

export function useOperationsServicesCatalog({ enabled = true } = {}) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    setError('');
    try {
      const [servicesResponse, categoriesResponse] = await Promise.all([
        operationsAPI.list({ serviceType: 'compliance' }),
        hubRegistrarCategoryAPI.list(),
      ]);
      const rows = asArray(servicesResponse.data)
        .map(normalizeService)
        .filter((row) => row.isAvailable !== false);
      const categoryRows = asArray(categoriesResponse.data)
        .map(normalizeCategory)
        .filter((row) => row.isActive !== false);
      setServices(rows);
      setCategories(categoryRows);
      return rows;
    } catch {
      setServices([]);
      setCategories([]);
      setError('Could not load business registration services. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setServices([]);
      setCategories([]);
      setError('');
      return undefined;
    }
    refresh();
    return undefined;
  }, [enabled, refresh]);

  const priceByAddonKey = useMemo(() => {
    const map = new Map();
    services.forEach((svc) => {
      if (svc.id) map.set(svc.id, svc);
      if (svc.key) map.set(svc.key, svc);
      if (svc.skills) map.set(svc.skills, svc);
    });
    return map;
  }, [services]);

  return { services, categories, priceByAddonKey, loading, error, refresh };
}
