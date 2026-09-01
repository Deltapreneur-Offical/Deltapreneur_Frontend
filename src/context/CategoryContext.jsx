import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hubRegistrarCategoryAPI } from '../api/services';

const CategoryContext = createContext({});

/**
 * Provides a slug→name map for Hub Registrar categories.
 * Fetches from the public API once on mount.
 * Falls back to empty map on error so callers still work.
 */
export function CategoryProvider({ children }) {
  const [categoryMap, setCategoryMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    hubRegistrarCategoryAPI
      .list()
      .then(({ data }) => {
        if (cancelled) return;
        const map = {};
        for (const cat of (data.data || [])) {
          map[cat.slug] = cat.name;
        }
        setCategoryMap(map);
      })
      .catch(() => {
        // Keep empty — fallback label functions will still work
      });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => categoryMap, [categoryMap]);
  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

/**
 * Hook to look up a dynamic category name by slug.
 * Falls back to the static label if the slug isn't in the API data.
 */
export function useDynamicCategoryName(slug, fallbackFn) {
  const map = useContext(CategoryContext);
  const key = String(slug || '').trim().toLowerCase();
  if (map[key]) return map[key];
  return fallbackFn ? fallbackFn(key) : key;
}

/**
 * Hook to get the full category map (slug → name).
 */
export function useCategoryMap() {
  return useContext(CategoryContext);
}
