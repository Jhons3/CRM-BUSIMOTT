// =============================================
// CRM Sales - Cliente API + Contexto Auth
// =============================================
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL
  || `${window.location.protocol}//${window.location.hostname}:3001/api`;

const api = axios.create({ baseURL: API_BASE });

// Interceptor: adjuntar token JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── API calls ────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const clientsAPI = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  update: (id, data) => api.patch(`/clients/${id}`, data),
};

export const advisorsAPI = {
  list: () => api.get('/advisors'),
  create: (data) => api.post('/advisors', data),
  setAvailability: (id, isAvailable) => api.patch(`/advisors/${id}/availability`, { isAvailable }),
};

export const assignmentsAPI = {
  list: () => api.get('/assignments'),
  manual: (clientId, advisorId) => api.post('/assignments/manual', { clientId, advisorId }),
  updateStatus: (id, status) => api.patch(`/assignments/${id}/status`, { status }),
};

export const conversationsAPI = {
  list: () => api.get('/conversations'),
  messages: (id) => api.get(`/conversations/${id}/messages`),
  send: (id, message) => api.post(`/conversations/${id}/send`, { message }),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  recent: () => api.get('/dashboard/recent'),
};

export default api;
