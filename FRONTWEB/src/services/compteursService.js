import api from './api'

export const getCompteurs = () => api.get('/compteurs')
export const getCompteurById = (id) => api.get(`/compteurs/${id}`)
export const createCompteur = (compteurData) => api.post('/compteurs', compteurData)
export const updateCompteur = (id, compteurData) => api.put(`/compteurs/${id}`, compteurData)
export const deleteCompteur = (id) => api.delete(`/compteurs/${id}`)
export const getCompteursByAdresse = (adresseId) => api.get(`/compteurs/adresse/${adresseId}`)