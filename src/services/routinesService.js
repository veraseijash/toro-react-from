import api from './api';

export const getRoutinesList = async () => {
  const response = await api.get(`/routines`);
  return response.data;
}

export const createRoutines = async (routineData) => {
  const response = await api.post(`/routines`, routineData);
  return response.data;
}

export const updateRoutines = async (routineId, modify) => {
  const response = await api.patch(`/routines/${routineId}`, modify);
  return response.data;
}

export const deleteRoutines = async (routineId) => {
  const response = await api.delete(`/routines/${routineId}`);
  return response.data;
}