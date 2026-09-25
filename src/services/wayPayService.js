import api from './api';

export const deleteCash_register = async (id) => {
  const response = await api.delete(`/cash_register/${id}/`);
  return response.data;
};

export const getInvoiceTotales = async (date, idUser, idTypePay) => {
  const response = await api.post('/waypay/totales', {
    date,
    idUser,
    idTypePay,
  });
  return response.data;
};

export const getTypepayments = async () => {
  const response = await api.get('/Typepayment');
  return response.data;
}

export const getDollarvalue = async () => {
  const response = await api.get('/dollarvalue/get/');
  return response.data;
}

export const updateCash_register = async (id, changes) => {
  const response = await api.patch(`/cash_register/${id}/`, changes);
  return response.data; 
}

export const createCash_register = async (changes) => {
  const response = await api.post(`/cash_register/`, changes);
  return response.data; 
} 
