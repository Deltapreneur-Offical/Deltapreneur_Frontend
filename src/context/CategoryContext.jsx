import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hubRegistrarCategoryAPI } from '../api/services';
import { asArray } from '../utils/asArray';
import {
  getStaticHubRegistrarCategories,
  mapPublicHubRegistrarCategory,
  readCachedHubRegistrarCategories,
  writeCachedHubRegistrarCategories,
} from '../utils/operationsCategories';

const CategoryContext = createContext({
  categoryMap: {},
  categories: [],
  ready: false,
  fetched: false,
});

/**
 * Fetches Hub Registrar categories once at app start.
 * Paints last cached API data immediately so homepage cards never flash
 * hardcoded titles / ₹1 before the live list arrives.
 */
export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState(readCachedHubRegistrarCategories);
  const [categoryMap, setCategoryMap] = useState(() => (
    Object.fromEntries(readCachedHubRegistrarCategories().map((cat) => [cat.slug, cat.label]))
  ));
  const [ready, setReady] = useState(() => readCachedHubRegistrarCategories().length > 0);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hubRegistrarCategoryAPI
      .list()
      .then(({ data }) => {
        if (cancelled) return;
        const rows = asArray(data);
        const items = rows
          .map(mapPublicHubRegistrarCategory)
          .filter((cat) => cat.slug && cat.label);
        const map = {};
        for (const row of rows) {
          if (row?.slug && row?.name) map[row.slug] = row.name;
        }
        if (items.length) {
          writeCachedHubRegistrarCategories(items);
          setCategories(items);
        } else {
          setCategories((prev) => (prev.length ? prev : getStaticHubRegistrarCategories()));
        }
        if (Object.keys(map).length) setCategoryMap(map);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories((prev) => (prev.length ? prev : getStaticHubRegistrarCategories()));
      })
      .finally(() => {
        if (cancelled) return;
        setReady(true);
        setFetched(true);
      });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(
    () => ({ categoryMap, categories, ready, fetched }),
    [categoryMap, categories, ready, fetched],
  );

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
  const { categoryMap } = useContext(CategoryContext);
  const key = String(slug || '').trim().toLowerCase();
  if (categoryMap[key]) return categoryMap[key];
  return fallbackFn ? fallbackFn(key) : key;
}

/**
 * Hook to get the full category map (slug → name).
 */
export function useCategoryMap() {
  return useContext(CategoryContext).categoryMap;
}

/** Live Hub Registrar category cards (name + starting price) for public pages. */
export function usePublicHubRegistrarCategories() {
  const { categories, ready, fetched } = useContext(CategoryContext);
  return { categories, ready, fetched };
}
