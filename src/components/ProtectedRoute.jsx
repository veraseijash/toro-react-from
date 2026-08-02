import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../context/useAuth';

function ProtectedRoute() {
  const { session } = useAuth();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
