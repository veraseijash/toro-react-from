import api from './api';

export const getPatientsDateOrder = async (admission) => {
  const response = await api.get(`/patients/dateorder/${admission}/`);
  return response.data;
};