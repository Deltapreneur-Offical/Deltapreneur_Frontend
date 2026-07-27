import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { likeAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { asArray } from '../utils/asArray';
import { unwrapApiData } from '../utils/apiResponse';

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
      // Counts-only: liked unknown — caller must preserve prev.liked when merging.
      next[key] = { liked: false, count: value, countsOnly: true };
      return;
    }
    next[key] = {
      liked: Boolean(value?.liked),
      count: value?.count ?? value?.total_likes ?? 0,
      countsOnly: false,
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
 * Merge server fetch into local map without wiping an in-flight / newer optimistic like.
 * Counts-only rows keep previous `liked` when we already know the user liked it.
 */
function mergeFetchedLikeMap(prev, seededMap, fetched) {
  const base = { ...seededMap };
  const keys = new Set([...Object.keys(base), ...Object.keys(fetched), ...Object.keys(prev)]);
  const next = {};
  keys.forEach((key) => {
    const prevRow = prev[key];
    const fetchedRow = fetched[key];
    const seededRow = seededMap[key];

    if (!fetchedRow) {
      if (prevRow) next[key] = prevRow;
      else if (seededRow) next[key] = seededRow;
      return;
    }

    if (fetchedRow.countsOnly) {
      const liked = Boolean(prevRow?.liked);
      const count = Math.max(
        Number(fetchedRow.count ?? 0),
        liked ? Number(prevRow?.count ?? 0) : 0,
        Number(seededRow?.count ?? 0),
      );
      next[key] = { liked, count };
      return;
    }

    // Full status from server — trust it, but don't drop a higher optimistic count mid-race.
    const liked = Boolean(fetchedRow.liked);
    const count = Math.max(
      Number(fetchedRow.count ?? 0),
      liked && prevRow?.liked ? Number(prevRow?.count ?? 0) : 0,
    );
    next[key] = { liked, count };
  });
  return next;
}

function redirectToLogin(navigate) {
  if (typeof window === 'undefined') return;
  const returnPath = `${window.location.pathname}${window.location.search}`;
  localStorage.setItem('redirectAfterLogin', returnPath);
  navigate('/login', { state: { from: returnPath } });
}

/**
 * Manages like state for a list of items.
 * type: 'VENTURE' | 'DOMAIN' | 'SOFTWARE' | 'COMMUNITY' | 'VIRTUAL_ASSISTANT'
 * items: array with .id fields
 *
 * VIRTUAL_ASSISTANT is intentionally separate from COMMUNITY so Creator
 * and Virtual Assistant likes never share counts.
 *
 * Toggle requires a real access token (user || hasAccessToken), not csrf alone —
 * otherwise optimism flashes then rolls back on 401.
 */
export function useLikes(type, items) {
  const navigate = useNavigate();
  const { user, hasAccessToken, loading: authLoading } = useAuth();
  // Real auth for mutating likes (Bearer / loaded user). Cookie-only is not enough.
  const canToggleLike = Boolean(user || hasAccessToken);
  const canFetchLikeStatus = canToggleLike;
  const list = asArray(items);
  const entityIdsKey = useMemo(
    () => list.map((i) => i.id).filter(Boolean).join(','),
    [list],
  );
  const seededMap = useMemo(() => seedLikeMapFromItems(list), [entityIdsKey]);
  const [likeMap, setLikeMap] = useState(seededMap);
  const [loading, setLoading] = useState(false);
  const pendingToggleKeysRef = useRef(new Set());

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
      let usedCountsOnly = false;
      if (canFetchLikeStatus) {
        try {
          response = await likeAPI.bulkStatus(type, safeIds);
        } catch (error) {
          if (!isAuthError(error)) throw error;
          response = await likeAPI.bulkCounts(type, safeIds);
          usedCountsOnly = true;
        }
      } else {
        response = await likeAPI.bulkCounts(type, safeIds);
        usedCountsOnly = true;
      }
      const fetched = mapCountPayload(unwrapApiData(response));
      if (usedCountsOnly) {
        Object.keys(fetched).forEach((key) => {
          if (fetched[key]) fetched[key].countsOnly = true;
        });
      }
      setLikeMap((prev) => {
        // Don't clobber keys that still have an in-flight optimistic toggle.
        const pending = pendingToggleKeysRef.current;
        if (pending.size === 0) {
          return mergeFetchedLikeMap(prev, seededMap, fetched);
        }
        const safeFetched = { ...fetched };
        pending.forEach((key) => {
          delete safeFetched[key];
        });
        return mergeFetchedLikeMap(prev, seededMap, safeFetched);
      });
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
      // Require real access token — csrf-only session causes flash then 401 rollback.
      if (!canToggleLike) {
        redirectToLogin(navigate);
        return null;
      }

      const previous = likeMap[key] || { liked: false, count: 0 };
      const optimisticLiked = !previous.liked;
      const optimisticCount = Math.max(
        0,
        previous.count + (optimisticLiked ? 1 : -1),
      );

      pendingToggleKeysRef.current.add(key);
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
      } catch (error) {
        setLikeMap((prev) => ({ ...prev, [key]: previous }));
        if (isAuthError(error)) {
          redirectToLogin(navigate);
        }
        return null;
      } finally {
        pendingToggleKeysRef.current.delete(key);
      }
    },
    [type, likeMap, canToggleLike, navigate],
  );

  const get = useCallback(
    (entityId) => likeMap[likeKey(entityId)] || { liked: false, count: 0 },
    [likeMap],
  );

  return { likeMap, toggle, get, loading, refresh: fetchLikeMap };
}
