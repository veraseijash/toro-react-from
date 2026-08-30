import api from './api';

export const getExamgroupsAll = async () => {
  const response = await api.get(`/examgroup/list`);
  return response.data;
};

export const getExamByGroup = async (groupId) => {
  const response = await api.get(`/ExamListsService/${groupId}/`);
  return response.data;
};