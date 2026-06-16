import { Navigate } from 'react-router-dom';

/** Co-venture creation is unified at /ventures/new with listing type picker. */
export default function NewCoVenturePage() {
  return <Navigate to="/ventures/new?type=co-venture" replace />;
}
