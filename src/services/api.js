import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export const login = async (username, password) => {
  const response = await api.post('/login', { username, password });
  return response.data;
};

export const register = async (email, username, password, captcha) => {
  const response = await api.post('/register', { email, username, password, captcha });
  return response.data;
};

export const playUser = async (userId) => {
  const response = await api.post('/play-user', { userId });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/logout');
  return response.data;
};

export const getStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/accounts/list/user');
  return response.data;
};

export const createUser = async (username, ground) => {
  const response = await api.post('/accounts/create/user', { username, ground });
  return response.data;
};

export default api;
