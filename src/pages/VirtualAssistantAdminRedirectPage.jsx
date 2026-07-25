import { Navigate, useLocation } from 'react-router-dom';
import { vaAdminModulePath } from '../utils/virtualAssistantAdminNav';

const PATH_TO_SUBTAB = {
  '/admin/virtual-assistants/applications': 'applications',
  '/admin/virtual-assistants/direct-add': 'direct-add',
  '/admin/virtual-assistants/published': 'published',
};

export default function VirtualAssistantAdminRedirectPage() {
  const { pathname } = useLocation();
  const vaSubTab = PATH_TO_SUBTAB[pathname] || 'applications';
  return <Navigate to={vaAdminModulePath(vaSubTab)} replace />;
}
