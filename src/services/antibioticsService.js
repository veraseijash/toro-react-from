import api from './api';

export const getAntibioticLists= async () => {
  const response = await api.get(`/antibiotic`);
  return response.data;
};

export const getAntibiotic = async (antibioticId) => {
  const response = await api.get(`/antibiotic/${antibioticId}`);
  return response.data;
}

export const createAntibiotic = async (newAntibiotic) => {
  const response = await api.post(`/antibiotic`, newAntibiotic);
  return response.data;
}

export const updateAntibiotic = async (antibioticId, modify) => {
  const response = await api.patch(`/antibiotic/${antibioticId}`, modify);
  return response.data;
}

export const deleteAntibiotic = async (antibioticId) => {
  const response = await api.delete(`/antibiotic/${antibioticId}`);
  return response.data;
}