import api from './api';

export const getExamgroupsAll = async () => {
  const response = await api.get(`/examgroup/list`);
  return response.data;
};

export const getExamByGroup = async (groupId) => {
  const response = await api.get(`/ExamListsService/${groupId}/`);
  return response.data;
};

export const updateExamgroup = async (groupId, modify) => {
  const response = await api.patch(`/examgroup/${groupId}`, modify);
  return response.data;
}

export const getExamByGroupPaginated = async (query) => {
  const response = await api.post(`/examlists/group/paginated`, query);
  return response.data;
}