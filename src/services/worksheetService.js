import api from './api';

export const getGroupHtListActive = async () => {
  const response = await api.get('/groupHt/list/');
  return response.data;
}

export const getPatientsByDateAndExamIds = async (consultation) => {
  const response = await api.post('/patients/date-exams/', consultation);
  return response.data;
}