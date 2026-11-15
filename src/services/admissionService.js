import api from './api';

export const getSampletypes = async () => {
  const response = await api.get('/Sampletype/');
  return response.data;
}

export const getClients = async () => {
  const response = await api.get('/client/');
  return response.data;
}

export const getClient = async (id) => {
  const response = await api.get(`/client/${id}/`);
  return response.data;
}

export const getLaboratory = async () => {
  const response = await api.get('/laboratory/1');
  return response.data;
};

export const getPatientsCI = async (ci) => {
  const response = await api.get(`/patients/ci/${ci}`);
  return response.data;
};

export const getExamgroups = async () => {
  const response = await api.get('/examgroup/');
  return response.data;
};

export const getExamByGroup = async (groupId) => {
  const response = await api.get(`/examlists/group/${groupId}`);
  return response.data;
}

export const getExamListByDescription = async (description) => {
  const response = await api.get(`/examlists/search-description/${description}`);
  return response.data;
};

export const getRoutinesList = async () => {
  const response = await api.get('/routines/');
  return response.data;
};

export const getTaxs = async () => {
  const response = await api.get('/tax/');
  return response.data;
};

export const getDollarvalue = async () => {
  const response = await api.get('/dollarvalue/get/');
  return response.data;
};

export const createDollarvalue = async ({ date, value }) => {
  const response = await api.post('/dollarvalue/', { date, value });
  return response.data;
}

export const getTypepaymentsActive = async () => {
  const response = await api.get('/Typepayment/');
  return response.data;
}

export const createPatient = async (patientData) => {
  const response = await api.post('/patients/', patientData);
  return response.data;
}

export const createExam = async (examenData) => {
  const response = await api.post('/exams/', examenData);
  return response.data;
}

export const getPatientsTotalByDate = async (date) => {
  const response = await api.get(`/patients/total/${date}`);
  return response.data;
}

export const updatePatient = async (patientId, patientData) => {
  const response = await api.patch(`/patients/${patientId}/`, patientData);
  return response.data;
}

export const createWaypay = async (wayPayData) => {
  const response = await api.post('/waypay/', wayPayData);
  return response.data;
}

export const createWaypayitems = async (wayPayData) => {
  const response = await api.post('/waypayitems/', wayPayData);
  return response.data;
}
