import api from './api';

export const countUnreadByRecipientUserId = async (recipientUserId) => {
  const response = await api.get(`/messages/unread/count/${recipientUserId}/`);
  return response.data;
};

export const findUnreadByUserId = async (userId) => {
  const response = await api.get(`/messages/unread/${userId}/`);
  return response.data;
};

export const findByUsersAndDays = async (recipientUserId, senderUserId, days) => {
  const response = await api.get(`/messages/history/${recipientUserId}/${senderUserId}/${days}`);
  return response.data;
};

export const updateMessage = async (id, data) => {
  const response = await api.patch(`/messages/${id}/`, data);
  return response.data;
};
