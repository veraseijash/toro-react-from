import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUsersOrder = async () => {
  const response = await api.get('/users/order');
  return response.data;
}

export const getUserSession = async (credentials) => {
  const response = await api.post('/users/session', credentials);
  return response.data;
};

export const getLaboratory = async (id) => {
  const response = await api.get(`/Laboratory/${id}/`);
  return response.data;
};

export const getVisibleUsersWithUnreadMessageCount = async (userId) => {
  const response = await api.get(`/users/visible-with-unread-messages/${userId}/`);
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}/`);
  return response.data;
};

export const updateUser = async (id, changes) => {
  const response = await api.patch(`/users/${id}/`, changes);
  return response.data;
};
