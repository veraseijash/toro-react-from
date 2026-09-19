import api from './api';

export const getListGermsOrder = () => {
  return api.get('/list-germs/list');
};

export const getGerm = (germId) => {
  return api.get(`/list-germs/${germId}`);
}

export const createGerm = (newGerm) => {
  return api.post(`/list-germs`, newGerm);
}

export const updateGerm = (germId, modify) => {
  return api.patch(`/list-germs/${germId}`, modify);
}

export const deleteGerm = (germId) => {
  return api.delete(`/list-germs/${germId}`);
}