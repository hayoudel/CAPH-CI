import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../ui/Spinner';
import { homePathFor, useAuth } from './AuthContext';

/** Barrière d'accès. `area` : espace des organisations ou administration du personnel. La vraie sécurité reste côté serveur. */
export function RequireAuth({ area }: { area: 'member' | 'staff' }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner fullPage label="Ouverture de votre session…" />;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  const inMemberArea = !!user.organizationId;
  if ((area === 'member') !== inMemberArea) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}
