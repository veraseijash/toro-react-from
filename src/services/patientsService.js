import api from './api';

// page comienza en 1. Devuelve { items, total, page, itemsPerPage, totalPages }.
export const getPatientsPaginated = async (itemsPerPage, page, filters = {}, options = {}) => {
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  );
  const response = await api.get('/patients/paginated', {
    params: { ...activeFilters, itemsPerPage, page },
    signal: options.signal,
  });
  return response.data;
};

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

export const getPatientIdValidatedResult = async (id) => {
  const response = await api.get(`/patients/validresult/${id}`);
  return response.data;
};

export const updatePatient = async (id, modify) => {
  const response = await api.patch(`/patients/${id}/`, modify);
  return response.data;
}

export const getClients = async () => {
  const response = await api.get('/client/');
  return response.data;
}
