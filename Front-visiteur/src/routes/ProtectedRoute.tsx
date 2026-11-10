import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { pagePatterns } from './paths';

export default function ProtectedRoute() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session?.authenticated) {
    return <Navigate to={pagePatterns.members} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
