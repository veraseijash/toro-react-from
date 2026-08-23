import api from './api';

export const getLaboratory = async () => {
  const response = await api.get('/laboratory/1');
  return response.data;
};