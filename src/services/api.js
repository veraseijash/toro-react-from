import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      const authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;

      config.headers.set('Authorization', authorization);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isSessionRequest = error.config?.url?.includes('/users/session');

    if (error.response?.status === 401 && !isSessionRequest) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    console.error(
      'Error de API:',
      error.response?.data || error.message,
    );

    return Promise.reject(error);
  },
);

export default api;
