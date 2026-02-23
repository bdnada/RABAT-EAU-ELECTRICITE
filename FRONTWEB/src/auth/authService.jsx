// src/auth/authService.js
import axios from 'axios';

const API_URL = 'http://localhost:8081/api';

export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password,
    });
    return response.data; // { token: "eyJ..." }
  } catch (error) {
    throw error.response?.data || { message: 'Identifiants ou mot de passe incorrects' };
  }
};
