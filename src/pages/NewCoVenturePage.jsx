import { Navigate } from 'react-router-dom';
import { ventureListChooseUrl } from '../constants/ventureListingTypeContent';

/** Co-venture creation starts at the listing type guide, then /ventures/new. */
export default function NewCoVenturePage() {
  return <Navigate to={ventureListChooseUrl('co-venture')} replace />;
}
