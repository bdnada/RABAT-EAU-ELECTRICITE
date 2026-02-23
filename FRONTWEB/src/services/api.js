// src/services/api.js

import axios from 'axios';


const API_URL = 'http://localhost:8081/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Interceptor : Ajoute le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor : Déconnexion automatique en cas de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expirée → déconnexion');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

export const agentLogin = (username, password) =>
  api.post('/agent/auth/login', { username, password });

export const changeAgentPassword = (oldPassword, newPassword) =>
  api.post('/agent/auth/change-password', { oldPassword, newPassword });

// ==================== USERS (Admin) ====================
export const getUsers = () => api.get('/users');
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (userData) => api.post('/users', userData);
export const updateUser = (id, userData) => api.put(`/users/${id}`, userData);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// ==================== AGENTS ====================
export const getAgents = () => api.get('/agents');
export const getAllAgents = getAgents; // ← Alias pour résoudre l'erreur d'import

export const getAgentById = (id) => api.get(`/agents/${id}`);

export const assignQuartier = (id, quartier) =>
  api.put(`/agents/${id}/quartier?quartier=${quartier}`);

export const createAgentAccount = (id) =>
  api.post(`/agents/${id}/create-account`);

export const resetAgentPassword = (id) =>
  api.post(`/agents/${id}/reset-password`);
// ==================== AGENTS ====================

// ... autres fonctions existantes ...

export const toggleAgentLoginStatus = (id, enabled) => {
  return api.patch(`/agents/${id}/login-status?enabled=${enabled}`);
};

// Optionnel : garder les noms explicites si tu préfères
export const enableAgentLogin = (id) => {
  return api.patch(`/agents/${id}/login-status?enabled=true`);
};

export const disableAgentLogin = (id) => {
  return api.patch(`/agents/${id}/login-status?enabled=false`);
};

// ==================== COMPTEURS ====================
export const getCompteurs = () => api.get('/compteurs');
export const getCompteurById = (id) => api.get(`/compteurs/${id}`);
export const createCompteur = (data) => api.post('/compteurs', data);
export const updateCompteur = (id, data) => api.put(`/compteurs/${id}`, data);
export const deleteCompteur = (id) => api.delete(`/compteurs/${id}`);

// ==================== ADRESSES ====================
// ==================== ADRESSES ====================
export const getAdresses = () => api.get('/adresses');
export const getAdresseById = (id) => api.get(`/adresses/${id}`);
export const getAdressesByQuartier = (quartier) =>
  api.get(`/adresses/quartier/${quartier}`);
export const searchAdresses = (q) =>
  api.get(`/adresses/search?q=${encodeURIComponent(q)}`);

// Fonction pour récupérer la liste des clients
export const getClients = async () => {
  try {
    const response = await axios.get('/api/clients', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    return response
  } catch (error) {
    throw error
  }
}

// 🔴 AJOUT ICI
export const getAdressesIncomplete = () =>
  api.get('/adresses/incompletes');


// ==================== RELEVÉS ====================
export const getReleves = () => api.get('/releves');
export const getReleveById = (id) => api.get(`/releves/${id}`);
export const createReleve = (data) => api.post('/releves', data);

// Pour l'agent mobile
export const getTournee = () => api.get('/agent/tournee');
export const getCompteursByAdresse = (adresseId) => api.get(`/agent/compteurs/${adresseId}`);
export const saveReleves = (releves) => api.post('/agent/releves', releves);

// ==================== FACTURATION ====================
export const sendAllFactures = () => api.post('/facturation/send/all');
export const sendClientFacture = (odooClientId) => api.get(`/facturation/send/client/${odooClientId}`);
export const testFacturation = () => api.get('/facturation/test');
export const getAllFactures = () => api.get('/factures');

// CORRECTION : factureUniqueId au lieu de factureId
export const requestSignature = (factureId, email, signature) =>
  api.post(`/factures/sign/request/${factureId}`, {
    email,
    signature,
  });

export const completeSignature = (email, otp) =>
  api.post('/factures/sign/complete', {
    email,
    otp,
  }, {
    responseType: 'blob', // On reçoit le PDF signé en retour
  });

export const downloadFacturePdf = (factureUniqueId) => 
  api.get(`/factures/download/${factureUniqueId}`, {
    responseType: 'blob',
  });

export const sendFactureEmail = (factureId) => 
  api.post(`/factures/send/email/${factureId}`);

// ==================== MESSAGES (Admin ↔ Agent) ====================
// Admin → Agent
// Admin → Agent (texte ou image)
export const sendMessageToAgent = (agentId, contenu, imageFile = null) => {
  const formData = new FormData();
  formData.append('contenu', contenu);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  return api.post(`/messages/admin/${agentId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 🔹 Appels WebRTC
export const initiateCall = (to) => api.post(`/call/initiate`, { to });
export const acceptCall = (to) => api.post(`/call/accept`, { to });
export const rejectCall = (to) => api.post(`/call/reject`, { to });
export const hangupCall = (to) => api.post(`/call/hangup`, { to });


export const getMessagesWithAgent = (agentId) => api.get(`/messages/admin/${agentId}`);

// Agent mobile
export const getAgentMessages = () => api.get('/messages/agent');
export const getAgentUnreadCount = () => api.get('/messages/agent/unread-count');
export const sendMessageFromAgent = (contenu) =>
  api.post('/messages/agent', contenu, {
    headers: { 'Content-Type': 'text/plain' },
  });


// Admin : modifier/supprimer n'importe quel message
export const updateMessage = (messageId, contenu) =>
  api.put(`/messages/${messageId}`, contenu, {
    headers: { 'Content-Type': 'text/plain' },
  });

export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`);

// Agent : modifier/supprimer seulement ses propres messages
export const updateMessageByAgent = (messageId, contenu) =>
  api.put(`/messages/agent/${messageId}`, contenu, {
    headers: { 'Content-Type': 'text/plain' },
  });

export const deleteMessageByAgent = (messageId) => api.delete(`/messages/agent/${messageId}`);

// ==================== HISTORIQUE RELEVÉS ====================
export const getRelevesHistorique = (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.mois) params.append('mois', filters.mois);
  if (filters.quartier) params.append('quartier', filters.quartier);
  if (filters.clientOdooId) params.append('clientOdooId', filters.clientOdooId);

  const url = params.toString() 
    ? `/releves/historique?${params.toString()}` 
    : '/releves/historique';

  return api.get(url);
};

export const getRelevesHistoriqueParMois = (mois) => {
  return api.get(`/releves/historique/mois/${mois}`);
};


export const getAllAgentLocations = async () => {
  try {
    const token = localStorage.getItem('token'); // ou ta méthode de récupération du token
    const response = await axios.get('/api/agents/locations', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erreur récupération positions:', error);
    throw error;
  }
 } 

// Localisations
export const getAllLatestAgentLocations = () => api.get("/agents/locations");
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "[API ERROR]",
      error?.response?.status,
      error?.response?.data || error.message
    );

    if (error.response?.status === 401) {
      console.warn("Session expirée → déconnexion");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userData");
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;