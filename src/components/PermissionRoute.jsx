import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { hasPermission } from '../utils/permissions';

function PermissionRoute({ permission }) {
  const { session } = useAuth();

  return hasPermission(session?.user?.permissions, permission)
    ? <Outlet />
    : <Navigate to="/" replace />;
}

export default PermissionRoute;
