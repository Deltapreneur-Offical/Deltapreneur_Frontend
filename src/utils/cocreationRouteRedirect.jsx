import { Navigate, useLocation } from 'react-router-dom';

/** Legacy `/cocreation/*` URLs → `/technology/*` (same path suffix). */
export function CocreationLegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const next = pathname.replace(/^\/cocreation/, '/technology') + search + hash;
  return <Navigate to={next} replace />;
}
