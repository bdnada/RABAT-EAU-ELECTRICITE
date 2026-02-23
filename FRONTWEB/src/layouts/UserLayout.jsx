import React from 'react'
import { Outlet } from 'react-router-dom'
import UserSidebar from './UserSidebar'
import './Layout.css'

const UserLayout = () => {
  return (
    <div className="layout">
      <UserSidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout