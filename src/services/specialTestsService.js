import api from './api';

export const getSpecialTestLabList = async () => {
  const response = await api.get(`/specialtestlab`);
  return response.data;
}

export const getSpecialTestLab = async (specialTestLabId) => {
  const response = await api.get(`/specialtestlab/${specialTestLabId}`);
  return response.data;
}

export const createSpecialTestLab = async (newSpecialTestLab) => {
  const response = await api.post(`/specialtestlab`, newSpecialTestLab);
  return response.data;
}

export const updateSpecialTestLab = async (specialTestLabId, modify) => {
  const response = await api.patch(`/specialtestlab/${specialTestLabId}`, modify);
  return response.data;
}

export const deleteSpecialTestLab = async (specialTestLabId) => {
  const response = await api.delete(`/specialtestlab/${specialTestLabId}`);
  return response.data;
}

export const deleteTestItems = async (specialTestItemIds) => {
  const response = await api.delete(`/specialtestItems/${specialTestItemIds}`);
  return response.data;
}

export const createSpecialTestItems = async (newSpecialTestItems) => {
  const response = await api.post(`/specialtestItems`, newSpecialTestItems);
  return response.data;
}