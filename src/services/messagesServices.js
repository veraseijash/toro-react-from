import api from './api';

export const countUnreadByRecipientUserId = async (recipientUserId) => {
  const response = await api.get(`/messages/unread/count/${recipientUserId}/`);
  return response.data;
};

export const findUnreadByUserId = async (userId) => {
  const response = await api.get(`/messages/unread/${userId}/`);
  return response.data;
};