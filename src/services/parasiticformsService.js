import api from './api';

export const getParasiticformsLists = async () => {
  const response = await api.get(`/parasiticforms`);
  return response.data;
}

export const getParasiticforms = async (parasiticformsId) => {
  const response = await api.get(`/parasiticforms/${parasiticformsId}`);
  return response.data;
}

export const createParasiticforms = async (newParasiticforms) => {
  const response = await api.post(`/parasiticforms`, newParasiticforms);
  return response.data;
}

export const updateParasiticforms = async (parasiticformsId, modify) => {
  const response = await api.patch(`/parasiticforms/${parasiticformsId}`, modify);
  return response.data;
}

export const deleteParasiticforms = async (parasiticformsId) => {
  const response = await api.delete(`/parasiticforms/${parasiticformsId}`);
  return response.data;
}