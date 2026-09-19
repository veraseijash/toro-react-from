import api from './api';

export const getGroupHtListActiveWithTotals = async () => {
  const response = await api.get('/groupHt/list/totals');
  return response.data;
};

export const getGroupHtList = async () => {
  const response = await api.get('/groupHt');
  return response.data;
}

export const createGroupHt = async (newGroupHt) => {
  const response = await api.post('/groupHt', newGroupHt);
  return response.data;
}

export const updateGroupHt = async (groupHtId, modify) => {
  const response = await api.patch(`/groupHt/${groupHtId}`, modify);
  return response.data;
}

export const deleteGroupHt = async (groupHtId) => {
  const response = await api.delete(`/groupHt/${groupHtId}`);
  return response.data;
}

export const createGroupItemsHt = async (newGroupItemsHt) => {
  const response = await api.post('/groupHtItems', newGroupItemsHt);
  return response.data;
}

export const deleteGroupItemsHt = async (groupItemsHtId) => {
  const response = await api.delete(`/groupHtItems/${groupItemsHtId}`);
  return response.data;
}