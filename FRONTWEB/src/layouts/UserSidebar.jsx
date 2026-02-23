import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";
import logo from "../assets/Gemini_Generated_Image_yzzfc7yzzfc7yzzf-removebg-preview.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faClipboardList,
  faTachometerAltFast,
  faUsers,
  faFileInvoiceDollar,
  faCalculator,
  faChartBar,
  faComments,
  faHistory,
} from "@fortawesome/free-solid-svg-icons";

const UserSidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsMobileOpen(true)}>
        ☰
      </button>

      <div
        className={`sidebar-overlay ${isMobileOpen ? "visible" : ""}`}
        onClick={() => setIsMobileOpen(false)}
      />

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
          <NavLink to="/user/dashboard" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faTachometerAlt} />
            Dashboard
          </NavLink>

          <NavLink to="/user/releves" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faClipboardList} />
            Relevés
          </NavLink>

          <NavLink to="/user/compteurs" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faTachometerAltFast} />
            Compteurs
          </NavLink>

          <NavLink to="/user/agents" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faUsers} />
            Agents
          </NavLink>

          <NavLink to="/user/factures" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faFileInvoiceDollar} />
            Gestion Factures
          </NavLink>

          <NavLink to="/user/facturation" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faCalculator} />
            Consommation
          </NavLink>

          <NavLink to="/user/reports" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faChartBar} />
            Rapports
          </NavLink>

          <NavLink to="/user/historique" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faHistory} />
            Historique Relevés
          </NavLink>

          <NavLink to="/user/agents-chat" onClick={() => setIsMobileOpen(false)}>
            <FontAwesomeIcon icon={faComments} />
            Contacter un agent
          </NavLink>
        </nav>

        {/* USER INFO */}
        {user && (
          <div className="user-info-header">
            <div className="user-avatar">{getInitials(user.username)}</div>
            <div className="user-details">
              <p className="user-name">{user.username}</p>
              <p className="user-role">UTILISATEUR</p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;
