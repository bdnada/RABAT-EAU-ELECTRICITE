// src/routes/PrivateRoute.jsx (ou src/components/RouteGuards.jsx)

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const PrivateRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const RoleRoute = ({ allowedRoles }) => {
  const { user, hasRole, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const hasPermission = allowedRoles.some(role => hasRole(role));
  if (!hasPermission) return <Navigate to="/" replace />;

  return <Outlet />;
};

// Ajoute ceci à la fin :
export default PrivateRoute;  // ← export par défaut