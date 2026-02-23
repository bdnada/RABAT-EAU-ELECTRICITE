import api from './api'

export const getUsers = () => api.get('/users')
export const getUserById = (id) => api.get(`/users/${id}`)
export const createUser = (userData) => api.post('/users', userData)
export const updateUser = (id, userData) => api.put(`/users/${id}`, userData)
export const deleteUser = (id) => api.delete(`/users/${id}`)
export const changePassword = (id, passwordData) => api.put(`/users/${id}/password`, passwordData)
export const getMyProfile = () => {
  return api.get('/users/me')
}

// Test API
export const testApi = () => api.get('/test/health')