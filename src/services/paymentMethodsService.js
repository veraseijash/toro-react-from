import api from './api';

export const getTypepayments = async () => {
  const response = await api.get(`/Typepayment`);
  return response.data;
}

export const getTypepayment = async (typepaymentId) => {
  const response = await api.get(`/Typepayment/${typepaymentId}`);
  return response.data;
}

export const createTypepayment = async (newTypepayment) => {
  const response = await api.post(`/Typepayment`, newTypepayment);
  return response.data;
}

export const updateTypepayment = async (typepaymentId, modify) => {
  const response = await api.patch(`/Typepayment/${typepaymentId}`, modify);
  return response.data;
}