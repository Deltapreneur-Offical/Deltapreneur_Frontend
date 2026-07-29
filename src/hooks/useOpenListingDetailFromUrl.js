import { useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { canViewListingDetail } from '../utils/listingVisibility';

/**
 * Opens a listing detail modal when the URL contains /:id or ?id= / ?highlight= (e.g. from homepage).
 * Returns closeListingDetail — always use this instead of setDetail(null) so the URL clears.
 */
export function useOpenListingDetailFromUrl({
  items,
  loading,
  setDetail,
  fetchById,
  /** When false, URL detail params will not open the detail modal. */
  allowUrlDetail = true,
  /** domain | venture | technology | software | community */
  listingType,
  user,
  /** Wait for auth session before allowing/denying owner-only deep links. */
  authLoading = false,
  onAccessDenied,
}) {
  const { id: routeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fetchedIdRef = useRef(null);
  const closedIdRef = useRef(null);
  const id = routeId || searchParams.get('id') || searchParams.get('highlight');

  const clearUrlListingParams = useCallback(() => {
    if (routeId) {
      // e.g. /domains/uuid -> /domains
      const index = pathname.lastIndexOf('/' + routeId);
      const basePath = index !== -1 ? pathname.substring(0, index) : pathname;
      navigate(basePath || pathname, { replace: true });
    } else {
      const next = new URLSearchParams(searchParams);
      next.delete('id');
      next.delete('highlight');
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    }
    fetchedIdRef.current = null;
  }, [routeId, pathname, navigate, searchParams, setSearchParams]);

  const denyDetailAccess = useCallback(() => {
    setDetail(null);
    clearUrlListingParams();
    onAccessDenied?.();
  }, [setDetail, clearUrlListingParams, onAccessDenied]);

  const openDetailIfAllowed = useCallback((entity) => {
    if (!entity) {
      denyDetailAccess();
      return;
    }
    if (listingType && !canViewListingDetail(entity, user, listingType)) {
      denyDetailAccess();
      return;
    }
    // Card click: put ?id= in the URL so the deep-link effect opens the modal (and Back can close it).
    const currentId = routeId || searchParams.get('id') || searchParams.get('highlight');
    if (!routeId && entity.id != null && String(currentId) !== String(entity.id)) {
      const next = new URLSearchParams(searchParams);
      next.set('id', String(entity.id));
      next.delete('highlight');
      setSearchParams(next);
      return;
    }
    closedIdRef.current = null;
    setDetail(entity);
  }, [listingType, user, setDetail, denyDetailAccess, routeId, searchParams, setSearchParams]);

  const closeListingDetail = useCallback(() => {
    const currentId = routeId || searchParams.get('id') || searchParams.get('highlight');
    if (currentId) {
      closedIdRef.current = String(currentId);
    }
    setDetail(null);
    clearUrlListingParams();
  }, [routeId, searchParams, setDetail, clearUrlListingParams]);

  useEffect(() => {
    if (!id || !allowUrlDetail) {
      if (!id) {
        fetchedIdRef.current = null;
        closedIdRef.current = null;
        setDetail(null);
      }
      return;
    }
    if (authLoading) return;

    if (closedIdRef.current && String(closedIdRef.current) === String(id)) {
      return;
    }

    const match = items.find((item) => String(item.id) === String(id));
    if (match) {
      openDetailIfAllowed(match);
      return;
    }

    if (loading || !fetchById || fetchedIdRef.current === id) return;
    fetchedIdRef.current = id;

    fetchById(id)
      .then((entity) => {
        if (closedIdRef.current && String(closedIdRef.current) === String(id)) return;
        openDetailIfAllowed(entity);
      })
      .catch(() => {
        denyDetailAccess();
      });
  }, [
    items,
    loading,
    id,
    fetchById,
    allowUrlDetail,
    openDetailIfAllowed,
    denyDetailAccess,
    authLoading,
  ]);

  return { closeListingDetail, openDetailIfAllowed };
}
