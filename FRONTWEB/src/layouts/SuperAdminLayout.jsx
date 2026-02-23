import React from 'react'
import { Outlet } from 'react-router-dom'
import SuperAdminSidebar from './SuperAdminSidebar'
import './Layout.css'

const SuperAdminLayout = () => {
  return (
    <div className="layout">
      <SuperAdminSidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default SuperAdminLayout