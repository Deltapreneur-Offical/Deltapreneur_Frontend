import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { likeAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { asArray } from '../utils/asArray';
import { unwrapApiData } from '../utils/apiResponse';
import { hasAuthSession } from '../utils/authSession';

function likeKey(entityId) {
  if (typeof entityId === 'string') return entityId.toLowerCase();
  if (entityId == null) return '';
  if (typeof entityId === 'number' || typeof entityId === 'boolean') {
    return String(entityId).toLowerCase();
  }
  return '';
}

function isAuthError(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

function mapCountPayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const next = {};
  Object.entries(payload).forEach(([entityId, value]) => {
    const key = likeKey(entityId);
    if (typeof value === 'number') {
      next[key] = { liked: false, count: value };
      return;
    }
    next[key] = {
      liked: Boolean(value?.liked),
      count: value?.count ?? value?.total_likes ?? 0,
    };
  });
  return next;
}

function seedLikeMapFromItems(items) {
  const next = {};
  asArray(items).forEach((item) => {
    if (!item?.id) return;
    const count = Number(item.likeCount ?? item.like_count ?? 0);
    if (count > 0) {
      next[likeKey(item.id)] = { liked: false, count };
    }
  });
  return next;
}

/**
 * Manages like state for a list of items.
 * type: 'VENTURE' | 'DOMAIN' | 'SOFTWARE' | 'COMMUNITY'
 * items: array with .id fields
 */
export function useLikes(type, items) {
  const navigate = useNavigate();
  const { user, hasAccessToken, loading: authLoading } = useAuth();
  const authenticated = Boolean(user || hasAccessToken || hasAuthSession());
  const canFetchLikeStatus = Boolean(user || hasAccessToken);
  const list = asArray(items);
  const entityIdsKey = useMemo(
    () => list.map((i) => i.id).filter(Boolean).join(','),
    [list],
  );
  const seededMap = useMemo(() => seedLikeMapFromItems(list), [entityIdsKey]);
  const [likeMap, setLikeMap] = useState(seededMap);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLikeMap((prev) => ({ ...seededMap, ...prev }));
  }, [seededMap]);

  const fetchLikeMap = useCallback(async () => {
    if (!entityIdsKey) {
      setLikeMap({});
      return;
    }
    const ids = entityIdsKey.split(',').filter(Boolean);
    if (ids.length === 0) return;

    setLoading(true);
    try {
      const safeIds = ids.map((id) => String(id));
      let response;
      if (canFetchLikeStatus) {
        try {
          response = await likeAPI.bulkStatus(type, safeIds);
        } catch (error) {
          if (!isAuthError(error)) throw error;
          response = await likeAPI.bulkCounts(type, safeIds);
        }
      } else {
        response = await likeAPI.bulkCounts(type, safeIds);
      }
      const fetched = mapCountPayload(unwrapApiData(response));
      setLikeMap({ ...seededMap, ...fetched });
    } catch {
      setLikeMap((prev) => ({ ...seededMap, ...prev }));
    } finally {
      setLoading(false);
    }
  }, [type, entityIdsKey, canFetchLikeStatus, seededMap]);

  useEffect(() => {
    if (!entityIdsKey || authLoading) {
      if (!entityIdsKey) setLikeMap({});
      return undefined;
    }

    fetchLikeMap();
    return undefined;
  }, [entityIdsKey, authLoading, fetchLikeMap]);

  useEffect(() => {
    if (!entityIdsKey) return undefined;

    const onExternalUpdate = (event) => {
      const detail = event?.detail;
      if (!detail || detail.type !== type || detail.entityId == null) return;
      const key = likeKey(detail.entityId);
      setLikeMap((prev) => ({
        ...prev,
        [key]: {
          liked: Boolean(detail.liked),
          count: Number(detail.count ?? prev[key]?.count ?? 0),
        },
      }));
    };

    window.addEventListener('likes:updated', onExternalUpdate);

    return () => {
      window.removeEventListener('likes:updated', onExternalUpdate);
    };
  }, [type, entityIdsKey]);

  const toggle = useCallback(
    async (entityId) => {
      const key = likeKey(entityId);
      if (!authenticated) {
        if (typeof window !== 'undefined') {
          const returnPath = `${window.location.pathname}${window.location.search}`;
          localStorage.setItem('redirectAfterLogin', returnPath);
          navigate('/login', { state: { from: returnPath } });
        }
        return null;
      }

      const previous = likeMap[key] || { liked: false, count: 0 };
      const optimisticLiked = !previous.liked;
      const optimisticCount = Math.max(
        0,
        previous.count + (optimisticLiked ? 1 : -1),
      );

      setLikeMap((prev) => ({
        ...prev,
        [key]: { liked: optimisticLiked, count: optimisticCount },
      }));

      try {
        const payload = unwrapApiData(await likeAPI.toggle(type, String(entityId)));
        if (!payload || typeof payload.liked !== 'boolean') {
          setLikeMap((prev) => ({ ...prev, [key]: previous }));
          return null;
        }
        const nextState = {
          liked: payload.liked,
          count: payload.count ?? payload.total_likes ?? optimisticCount,
        };
        setLikeMap((prev) => ({
          ...prev,
          [key]: nextState,
        }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('likes:updated', {
              detail: {
                type,
                entityId: key,
                liked: nextState.liked,
                count: nextState.count,
              },
            }),
          );
        }
        return payload;
      } catch {
        setLikeMap((prev) => ({ ...prev, [key]: previous }));
        return null;
      }
    },
    [type, likeMap, authenticated, navigate],
  );

  const get = useCallback(
    (entityId) => likeMap[likeKey(entityId)] || { liked: false, count: 0 },
    [likeMap],
  );

  return { likeMap, toggle, get, loading, refresh: fetchLikeMap };
}
