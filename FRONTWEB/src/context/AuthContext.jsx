// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../auth/authService';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Décodage JWT
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erreur décodage token', e);
    return { sub: '', roles: [], exp: 0 };
  }
};

// Vérifie si le token est expiré
const isTokenExpired = (token) => {
  try {
    const payload = decodeToken(token);
    if (!payload.exp) return true;
    return Date.now() >= payload.exp * 1000; // exp en secondes
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const extractRoles = (payload) => {
    let roles = payload.roles || [];
    if (Array.isArray(roles) && roles[0]?.authority) {
      return roles.map((r) => r.authority);
    }
    if (Array.isArray(roles)) return roles;
    return [];
  };

  // Vérification du token au chargement
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
      const payload = decodeToken(token);
      setUser({ username: payload.sub, roles: extractRoles(payload) });
    } else {
      sessionStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Connexion
  const login = async (username, password) => {
    const data = await apiLogin(username, password);
    const token = data.token;

    if (isTokenExpired(token)) throw new Error('Token expiré dès la connexion');

    sessionStorage.setItem('token', token);

    const payload = decodeToken(token);
    const roles = extractRoles(payload);
    const userData = { username: payload.sub, roles };

    sessionStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);

    // Redirection selon rôle
    if (roles.includes('ROLE_SUPERADMIN')) navigate('/superadmin/users');
    else if (roles.includes('ROLE_UTILISATEUR')) navigate('/user/dashboard');
    else if (roles.includes('ROLE_AGENT')) navigate('/agent/dashboard');
    else throw new Error('Aucun rôle valide trouvé');

    return userData;
  };

  // Déconnexion
  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    setUser(null);
    navigate('/login');
  };

  // Vérification de rôle
  const hasRole = (role) => {
    const roleString = `ROLE_${role.toUpperCase()}`;
    return user?.roles?.includes(roleString) || false;
  };

  // Déconnexion automatique si token expiré
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const token = sessionStorage.getItem('token');
      if (!token || isTokenExpired(token)) {
        logout();
      }
    }, 5000); // vérifie toutes les 5 secondes
    return () => clearInterval(interval);
  }, [user]);

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isSuperAdmin: () => hasRole('SUPERADMIN'),
    isUser: () => hasRole('UTILISATEUR'),
    isAgent: () => hasRole('AGENT'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
