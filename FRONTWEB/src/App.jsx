import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './auth/Login'
import PrivateRoute from './routes/PrivateRoute'
import RoleRoute from './routes/RoleRoute'

// Layouts
import SuperAdminLayout from './layouts/SuperAdminLayout'
import UserLayout from './layouts/UserLayout'

// SuperAdmin Pages
import UsersList from './pages/superadmin/UsersList'
import UserDetails from './pages/superadmin/UserDetails'
import AddUser from './pages/superadmin/AddUser'
import EditUser from './pages/superadmin/EditUser'
import SuperAdminDashboard from './pages/superadmin/Dashboard'
import SuperAdminAgents from './pages/superadmin/AgentsList'
import SuperAdminCompteurs from './pages/superadmin/CompteursList'


// User Pages
import Dashboard from './pages/utilisateur/Dashboard'
import RelevesList from './pages/utilisateur/RelevesList'
import ReleveDetails from './pages/utilisateur/ReleveDetailsModal'
import CompteursList from './pages/utilisateur/CompteursList'
import AddCompteur from './pages/utilisateur/AddCompteur'
import AgentsList from './pages/utilisateur/AgentsList'
import AgentDetails from './pages/utilisateur/AgentDetails'
import Facturation from './pages/utilisateur/Facturation'
import Reports from './pages/utilisateur/Reports'
import AgentsChatList from './pages/utilisateur/AgentsChatList';
import AgentChat from './pages/utilisateur/AgentChat';
import FacturesList from './pages/utilisateur/FacturesList'
import AgentChatPage from './pages/utilisateur/AgentChatPage'
import ReleveHistoriqueList from './pages/utilisateur/ReleveHistoriqueList'
import ReleveDetailsModal from './pages/utilisateur/ReleveDetailsModal'
import AgentMapModal from './pages/utilisateur/AgentLocationsLive'






/* 🔴 REDIRECTION INTELLIGENTE */
const HomeRedirect = () => {
  const { user, loading, isSuperAdmin, isUser } = useAuth()
  
  console.log('HomeRedirect - User:', user)
  console.log('HomeRedirect - isSuperAdmin:', isSuperAdmin())
  console.log('HomeRedirect - isUser:', isUser())

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    )
  }

  if (!user) {
    console.log('No user, redirecting to login')
    return <Navigate to="/login" replace />
  }

  if (isSuperAdmin()) {
    console.log('SuperAdmin detected, redirecting to /superadmin')
    return <Navigate to="/superadmin/users" replace />
  }

  if (isUser()) {
    console.log('User detected, redirecting to /user/dashboard')
    return <Navigate to="/user/dashboard" replace />
  }

  console.log('No valid role, redirecting to login')
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<Login />} />

          {/* HOME REDIRECT */}
          <Route path="/" element={<HomeRedirect />} />

         


          {/* SUPERADMIN ROUTES */}
          <Route element={<PrivateRoute />}>
            <Route element={<RoleRoute allowedRoles={['SUPERADMIN']} />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="/superadmin" element={<Navigate to="/superadmin/users" replace />} />
                <Route path="/superadmin/users" element={<UsersList />} />
                <Route path="/superadmin/users/add" element={<AddUser />} />
                <Route path="/superadmin/users/edit/:id" element={<EditUser />} />
                <Route path="/superadmin/users/:id" element={<UserDetails />} />
                <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/superadmin/agents" element={<SuperAdminAgents />} />
                <Route path="/superadmin/agents/:id" element={<AgentDetails />} />
                <Route path="/superadmin/compteurs" element={<SuperAdminCompteurs />} />
              </Route>
            </Route>
          </Route>

          {/* USER ROUTES */}
<Route element={<PrivateRoute />}>
  <Route element={<RoleRoute allowedRoles={['UTILISATEUR']} />}>
    <Route element={<UserLayout />}>
      <Route path="/user" element={<Navigate to="/user/dashboard" replace />} />
      <Route path="/user/dashboard" element={<Dashboard />} />
      <Route path="/user/releves" element={<RelevesList />} />
      <Route path="/user/releves/:id" element={<ReleveDetailsModal />} />
      <Route path="/user/compteurs" element={<CompteursList />} />
      <Route path="/user/compteurs/add" element={<AddCompteur />} />
      <Route path="/user/agents" element={<AgentsList />} />
      <Route path="/user/agents/:id" element={<AgentDetails />} />
      <Route path="/user/facturation" element={<Facturation />} />
      <Route path="/user/factures" element={<FacturesList />} />
      <Route path="/user/reports" element={<Reports />} />
      <Route path="/user/agent-locations" element={<AgentMapModal />} />
      

      {/* ✅ NOUVELLE ROUTE AJOUTÉE */}
      <Route path="/user/historique" element={<ReleveHistoriqueList />} />

      {/* ✅ ROUTES CHAT (déjà présentes) */}
      <Route path="/user/chat" element={<AgentChatPage />} />
      <Route path="/user/chat/agent/:agentId" element={<Navigate to="/user/chat" replace />} />
      <Route path="/user/agents-chat" element={<Navigate to="/user/chat" replace />} />
      
    </Route>
  </Route>
</Route>

          {/* CATCH ALL ROUTE */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App