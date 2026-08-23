import api from './api';

export const getPatientsDateOrder = async (admission) => {
  const response = await api.get(`/patients/dateorder/${admission}/`);
  return response.data;
};

export const getPatient = async (id) => {
  const response = await api.get(`/patients/${id}/`);
  return response.data;
};

export const getExam = async (id) => {
  const response = await api.get(`/exams/${id}/`);
  return response.data;
};

export const updateExam = async (id, data) => {
  const response = await api.patch(`/exams/${id}/`, data);
  return response.data;
};
