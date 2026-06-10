import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { creatorFollowAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { asArray } from '../utils/asArray';
import { unwrapApiData } from '../utils/apiResponse';
import { hasAuthSession } from '../utils/authSession';

function followKey(communityId) {
  if (typeof communityId === 'string') return communityId.toLowerCase();
  if (communityId == null) return '';
  return String(communityId).toLowerCase();
}

function isAuthError(error) {
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

function mapFollowPayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const next = {};
  Object.entries(payload).forEach(([communityId, value]) => {
    const key = followKey(communityId);
    if (typeof value === 'number') {
      next[key] = { following: false, count: value };
      return;
    }
    next[key] = {
      following: Boolean(value?.following),
      count: Number(value?.count ?? value?.followerCount ?? value?.follower_count ?? 0),
    };
  });
  return next;
}

function seedFollowMapFromItems(items) {
  const next = {};
  asArray(items).forEach((item) => {
    if (!item?.id) return;
    const count = Number(item.followerCount ?? item.follower_count ?? 0);
    if (count > 0) {
      next[followKey(item.id)] = { following: false, count };
    }
  });
  return next;
}

export function useCreatorFollows(profiles) {
  const navigate = useNavigate();
  const { user, hasAccessToken, loading: authLoading } = useAuth();
  const authenticated = Boolean(user || hasAccessToken || hasAuthSession());
  const canFetchStatus = Boolean(user || hasAccessToken);
  const list = asArray(profiles);
  const profileIdsKey = useMemo(
    () => list.map((item) => item.id).filter(Boolean).join(','),
    [list],
  );
  const seededMap = useMemo(() => seedFollowMapFromItems(list), [profileIdsKey]);
  const [followMap, setFollowMap] = useState(seededMap);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowMap((prev) => ({ ...seededMap, ...prev }));
  }, [seededMap]);

  const fetchFollowMap = useCallback(async () => {
    if (!profileIdsKey) {
      setFollowMap({});
      return;
    }
    const ids = profileIdsKey.split(',').filter(Boolean);
    if (!ids.length) return;

    setLoading(true);
    try {
      const safeIds = ids.map((id) => String(id));
      let response;
      if (canFetchStatus) {
        try {
          response = await creatorFollowAPI.bulkStatus(safeIds);
        } catch (error) {
          if (!isAuthError(error)) throw error;
          response = await creatorFollowAPI.bulkCounts(safeIds);
        }
      } else {
        response = await creatorFollowAPI.bulkCounts(safeIds);
      }
      const fetched = mapFollowPayload(unwrapApiData(response));
      setFollowMap({ ...seededMap, ...fetched });
    } catch {
      setFollowMap((prev) => ({ ...seededMap, ...prev }));
    } finally {
      setLoading(false);
    }
  }, [profileIdsKey, canFetchStatus, seededMap]);

  useEffect(() => {
    if (!profileIdsKey || authLoading) {
      if (!profileIdsKey) setFollowMap({});
      return undefined;
    }
    fetchFollowMap();
    return undefined;
  }, [profileIdsKey, authLoading, fetchFollowMap]);

  useEffect(() => {
    if (!profileIdsKey) return undefined;

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') fetchFollowMap();
    };

    const onExternalUpdate = (event) => {
      const detail = event?.detail;
      if (!detail || detail.communityId == null) return;
      const key = followKey(detail.communityId);
      setFollowMap((prev) => ({
        ...prev,
        [key]: {
          following: Boolean(detail.following),
          count: Number(detail.count ?? prev[key]?.count ?? 0),
        },
      }));
    };

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('creator-follow:updated', onExternalUpdate);

    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('creator-follow:updated', onExternalUpdate);
    };
  }, [profileIdsKey, fetchFollowMap]);

  const toggle = useCallback(
    async (communityId) => {
      const key = followKey(communityId);
      if (!authenticated) {
        if (typeof window !== 'undefined') {
          const returnPath = `${window.location.pathname}${window.location.search}`;
          localStorage.setItem('redirectAfterLogin', returnPath);
          navigate('/login', { state: { from: returnPath } });
        }
        return null;
      }

      const previous = followMap[key] || { following: false, count: 0 };
      const optimisticFollowing = !previous.following;
      const optimisticCount = Math.max(
        0,
        previous.count + (optimisticFollowing ? 1 : -1),
      );

      setFollowMap((prev) => ({
        ...prev,
        [key]: { following: optimisticFollowing, count: optimisticCount },
      }));

      try {
        const payload = unwrapApiData(
          await creatorFollowAPI.toggle(String(communityId)),
        );
        if (!payload || typeof payload.following !== 'boolean') {
          setFollowMap((prev) => ({ ...prev, [key]: previous }));
          return null;
        }
        const nextState = {
          following: payload.following,
          count: Number(
            payload.count ?? payload.followerCount ?? payload.follower_count ?? optimisticCount,
          ),
        };
        setFollowMap((prev) => ({ ...prev, [key]: nextState }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('creator-follow:updated', {
              detail: {
                communityId: key,
                following: nextState.following,
                count: nextState.count,
              },
            }),
          );
        }
        return payload;
      } catch {
        setFollowMap((prev) => ({ ...prev, [key]: previous }));
        return null;
      }
    },
    [followMap, authenticated, navigate],
  );

  const get = useCallback(
    (communityId) => followMap[followKey(communityId)] || { following: false, count: 0 },
    [followMap],
  );

  return { followMap, toggle, get, loading, refresh: fetchFollowMap };
}
