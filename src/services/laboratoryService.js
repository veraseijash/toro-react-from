import api from './api';

export const getLaboratory = async () => {
  const response = await api.get('/laboratory/1');
  return response.data;
};

export const updateLaboratory = async (laboratoryId, modify) => {
  const response = await api.patch(`/laboratory/${laboratoryId}`, modify);
  return response.data;
}

export const uploadLaboratoryLogo = async (file) => {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await api.post('/laboratory/upload', formData, {
    headers: { 'Content-Type': undefined },
  });
  return response.data;
};

export const getTaxs = async () => {
  const response = await api.get('/tax');
  return response.data;
};

export const createTax = async (newTax) => {
  const response = await api.post('/tax', newTax);
  return response.data;
}

export const updateTax = async (taxId, modify) => {
  const response = await api.patch(`/tax/${taxId}`, modify);
  return response.data;
}

