import api from './api';

export const getExamgroupsAll = async () => {
  const response = await api.get(`/examgroup/list`);
  return response.data;
};

export const getExamList = async (id) => {
  const response = await api.get(`/examlists/${id}`);
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

export const getExamgroup = async (groupId) => {
  const response = await api.get(`/examgroup/${groupId}`);
  return response.data;
};

export const createExamgroup = async (newGroup) => {
  const response = await api.post(`/examgroup`, newGroup);
  return response.data;
};


export const getExamByGroupPaginated = async (query) => {
  const response = await api.post(`/examlists/group/paginated`, query);
  return response.data;
}

export const updateExamList = async (examId, modify) => {
    const response = await api.patch(`/examlists/${examId}`, modify);
    return response.data;
}

export const createExamList = async (newExam) => {
  const response = await api.post(`/examlists`, newExam);
  return response.data;
}

export const updateGroupCosts = async (modify) => {
  const response = await api.patch(`/examlists/group/costs`, modify);
  return response.data;
}

export const getTaxs = async () => {
  const response = await api.get(`/tax`);
  return response.data;
}