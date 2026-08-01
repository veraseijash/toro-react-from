import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/users/login', credentials);
  return response.data;
};