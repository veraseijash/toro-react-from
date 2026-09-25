import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUsersOrder = async () => {
  const response = await api.get('/users/order');
  return response.data;
}

export const getUserSession = async (credentials) => {
  const response = await api.post('/users/session', credentials);
  return response.data;
};

export const getLaboratory = async (id) => {
  const response = await api.get(`/Laboratory/${id}/`);
  return response.data;
};

export const getVisibleUsersWithUnreadMessageCount = async (userId) => {
  const response = await api.get(`/users/visible-with-unread-messages/${userId}/`);
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}/`);
  return response.data;
};

export const getUsersWithPatientsByDate = async (date) => {
  const response = await api.get(`/users/patients/${date}/`);
  return response.data;
}

export const updateUser = async (id, changes) => {
  const assertSuccess = (data) => {
    if (data?.success === false || data?.ok === false || data?.error
      || Number(data?.status) >= 400 || Number(data?.statusCode) >= 400) {
      const message = typeof data?.response === 'string' ? data.response : data?.message;
      throw new Error(typeof message === 'string' ? message : 'No se pudo actualizar el usuario.');
    }
    return data;
  };
  const payload = { ...changes };
  // El backend necesita user_name también en actualizaciones parciales
  // para comprobar duplicados sin buscar con un nombre undefined.
  if (payload.user_name === undefined) {
    const current = assertSuccess(await getUserById(id));
    if (!current?.user_name) throw new Error('No se pudo obtener el nombre de usuario actual.');
    payload.user_name = current.user_name;
  }
  const response = await api.patch(`/users/${id}/`, payload);
  return assertSuccess(response.data);
};

export const uploadUserFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await api.post('/users/upload', formData, {
    headers: { 'Content-Type': undefined },
  });
  return response.data;
};
