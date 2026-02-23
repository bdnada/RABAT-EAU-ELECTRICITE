import api from './api'

export const getReleves = () => api.get('/releves')
export const getReleveById = (id) => api.get(`/releves/${id}`)
export const createReleve = (releveData) => api.post('/releves', releveData)
export const getRelevesByCompteur = (compteurId) => api.get(`/releves/compteur/${compteurId}`)
export const getRelevesByAgent = (agentId) => api.get(`/releves/agent/${agentId}`)