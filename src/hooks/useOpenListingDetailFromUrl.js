import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Opens a listing detail modal when the URL contains ?id= (e.g. from homepage).
 * Returns closeListingDetail — always use this instead of setDetail(null) so the URL clears.
 */
export function useOpenListingDetailFromUrl({
  items,
  loading,
  setDetail,
  fetchById,
  /** When false, ?id= in the URL will not open the detail modal (e.g. verification progress open). */
  allowUrlDetail = true,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fetchedIdRef = useRef(null);
  const id = searchParams.get('id');

  const closeListingDetail = useCallback(() => {
    setDetail(null);
    if (searchParams.get('id')) {
      const next = new URLSearchParams(searchParams);
      next.delete('id');
      setSearchParams(next, { replace: true });
    }
    fetchedIdRef.current = null;
  }, [searchParams, setSearchParams, setDetail]);

  useEffect(() => {
    if (!id || !allowUrlDetail) {
      if (!id) fetchedIdRef.current = null;
      return;
    }

    const match = items.find((item) => String(item.id) === String(id));
    if (match) {
      setDetail(match);
      return;
    }

    if (loading || !fetchById || fetchedIdRef.current === id) return;
    fetchedIdRef.current = id;

    fetchById(id)
      .then((entity) => {
        if (entity) setDetail(entity);
      })
      .catch(() => {});
  }, [items, loading, id, setDetail, fetchById, allowUrlDetail]);

  return { closeListingDetail };
}
