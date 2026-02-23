import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const RoleRoute = ({ allowedRoles }) => {
  const { user, hasRole, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const ok = allowedRoles.some(role => hasRole(role))
  if (!ok) return <Navigate to="/" replace />

  return <Outlet />
}

export default RoleRoute
