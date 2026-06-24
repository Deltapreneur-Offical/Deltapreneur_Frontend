import { useCallback, useEffect, useMemo, useState } from 'react';
import { operationsAPI } from '../api/services';
import { asArray } from '../utils/asArray';

function normalizeService(row) {
  return {
    id: String(row?.id ?? ''),
    name: row?.name || '',
    description: row?.description || '',
    price: Number(row?.price ?? 0) || 0,
    category: row?.category || 'operations',
    icon: row?.icon || null,
    displayOrder: Number(row?.displayOrder ?? row?.display_order ?? 0) || 0,
    isAvailable: row?.isAvailable ?? row?.is_available ?? true,
    serviceType: row?.serviceType ?? row?.service_type ?? 'virtual_assistance',
    skills: row?.skills || '',
  };
}

export function useVirtualAssistantCatalog({ enabled = true } = {}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    setError('');
    try {
      const { data } = await operationsAPI.list({ serviceType: 'virtual_assistance' });
      const rows = asArray(data)
        .map(normalizeService)
        .filter((row) => row.id && row.isAvailable !== false && row.serviceType === 'virtual_assistance')
        .sort((a, b) => (a.displayOrder - b.displayOrder) || a.name.localeCompare(b.name));
      setServices(rows);
      return rows;
    } catch (err) {
      setServices([]);
      setError(err?.message || 'Failed to load virtual assistants.');
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

  const lookup = useMemo(() => {
    return new Map(services.map((service) => [service.id, service]));
  }, [services]);

  return { services, lookup, loading, error, refresh };
}

export function vaLabel(key, services = []) {
  const lookup = Array.isArray(services)
    ? new Map(services.map((service) => [String(service.id), service]))
    : services instanceof Map
      ? services
      : new Map();
  return lookup.get(String(key))?.name || String(key);
}

export function vaTotal(selected = [], services = []) {
  const lookup = Array.isArray(services)
    ? new Map(services.map((service) => [String(service.id), service]))
    : services instanceof Map
      ? services
      : new Map();
  return selected.reduce((sum, key) => sum + (Number(lookup.get(String(key))?.price) || 0), 0);
}

export function resolveVirtualAssistantService(key, services = []) {
  const lookup = Array.isArray(services)
    ? new Map(services.map((service) => [String(service.id), service]))
    : services instanceof Map
      ? services
      : new Map();
  return lookup.get(String(key)) || null;
}
