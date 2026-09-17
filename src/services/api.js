import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pocika_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 & 403
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        localStorage.removeItem('pocika_token');
        localStorage.removeItem('pocika_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=true';
        }
      }
      
      const customError = new Error(data?.error?.message || data?.message || 'Request failed');
      customError.status = status;
      customError.code = data?.error?.code || 'API_ERROR';
      customError.details = data?.error?.details || [];
      return Promise.reject(customError);
    }
    
    if (error.request) {
      const netErr = new Error('Cannot connect to POCIKA API server. Please make sure the backend is running.');
      netErr.code = 'NETWORK_ERROR';
      return Promise.reject(netErr);
    }

    return Promise.reject(error);
  }
);

export default api;
