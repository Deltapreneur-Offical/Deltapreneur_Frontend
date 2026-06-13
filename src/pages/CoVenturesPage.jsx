import { Navigate } from 'react-router-dom';

/** Co-venture browse is unified at /ventures. Creation remains at /co-ventures/new. */
export default function CoVenturesPage() {
  return <Navigate to="/ventures" replace />;
}
