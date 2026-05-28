import { useState, useEffect, useCallback, useMemo } from 'react';
import { likeAPI } from '../api/services';
import { asArray } from '../utils/asArray';
import { isLoggedIn } from '../utils/listingNavigation';

/**
 * Manages like state for a list of items.
 * type: 'VENTURE' | 'DOMAIN' | 'SOFTWARE' | 'COMMUNITY'
 * items: array with .id fields
 */
export function useLikes(type, items) {
  const list = asArray(items);
  const entityIdsKey = useMemo(
    () => list.map((i) => i.id).filter(Boolean).join(','),
    [list],
  );
  const [likeMap, setLikeMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn() || !entityIdsKey) {
      setLikeMap({});
      return;
    }
    const ids = entityIdsKey.split(',').filter(Boolean);
    if (ids.length === 0) return;

    let cancelled = false;
    setLoading(true);
    likeAPI
      .bulkStatus(type, ids.map((id) => String(id)))
      .then(({ data }) => {
        if (!cancelled) setLikeMap(data ?? {});
      })
      .catch(() => {
        if (!cancelled) setLikeMap({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type, entityIdsKey]);

  const toggle = useCallback(
    async (entityId) => {
      if (!isLoggedIn()) return null;
      try {
        const { data } = await likeAPI.toggle(type, entityId);
        setLikeMap((prev) => ({
          ...prev,
          [String(entityId)]: { liked: data.liked, count: data.count },
        }));
        return data;
      } catch {
        return null;
      }
    },
    [type],
  );

  const get = useCallback(
    (entityId) => likeMap[String(entityId)] || { liked: false, count: 0 },
    [likeMap],
  );

  return { likeMap, toggle, get, loading };
}
