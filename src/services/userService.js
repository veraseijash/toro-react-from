import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUserSession = async (credentials) => {
  const response = await api.post('/users/session', credentials);
  return response.data;
};