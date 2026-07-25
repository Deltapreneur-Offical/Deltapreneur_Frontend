import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getVirtualAssistantDetailPath } from '../utils/listingNavigation';

/** Legacy /virtual-assistants/:id URLs → embedded Operations detail flow. */
const VirtualAssistantPublicProfilePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent') === 'hire' ? 'hire' : undefined;

  return (
    <Navigate
      to={getVirtualAssistantDetailPath(id, { intent })}
      replace
    />
  );
};

export default VirtualAssistantPublicProfilePage;
