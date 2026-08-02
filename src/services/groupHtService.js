import api from './api';


export const getGroupHtListActiveWithTotals = async () => {
  const response = await api.get('/groupHt/list/totals');
  return response.data;
};