import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";
import logo from "../assets/Gemini_Generated_Image_yzzfc7yzzfc7yzzf-removebg-preview.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faUsers,
  faUserShield,
  faTachometerAltFast,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";

const SuperAdminSidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "SA";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* MOBILE TOGGLE */}
      <button className="sidebar-toggle" onClick={() => setIsMobileOpen(true)}>
        ☰
      </button>

      {/* OVERLAY */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? "visible" : ""}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* SIDEBAR */}
      <aside className={`user-sidebar ${isMobileOpen ? "open" : ""}`}>
        {/* HEADER */}
        <div className="sidebar-header">
          <div className="logo-block">
            <img src={logo} alt="REE Logo" className="logo-image" />
            <h2 className="app-title">SI Relevés</h2>
            <p className="app-subtitle">RABAT ÉNERGIE & EAU</p>
          </div>
        </div>

        {/* NAV */}
        <nav className="sidebar-nav">
          <NavLink
            to="/superadmin/dashboard"
            onClick={() => setIsMobileOpen(false)}
          >
            <FontAwesomeIcon icon={faTachometerAlt} />
            Dashboard
          </NavLink>

          <NavLink
            to="/superadmin/users"
            onClick={() => setIsMobileOpen(false)}
          >
            <FontAwesomeIcon icon={faUsers} />
            Gestion Utilisateurs
          </NavLink>

          <NavLink
            to="/superadmin/agents"
            onClick={() => setIsMobileOpen(false)}
          >
            <FontAwesomeIcon icon={faUserShield} />
            Agents
          </NavLink>

          <NavLink
            to="/superadmin/compteurs"
            onClick={() => setIsMobileOpen(false)}
          >
            <FontAwesomeIcon icon={faTachometerAltFast} />
            Compteurs
          </NavLink>
        </nav>

        {/* USER INFO */}
        {user && (
          <div className="user-info-header">
            <div className="user-avatar">{getInitials(user.username)}</div>
            <div className="user-details">
              <p className="user-name">{user.username}</p>
              <p className="user-role">SUPER ADMIN</p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
