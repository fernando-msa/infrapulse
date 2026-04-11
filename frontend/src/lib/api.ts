import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Inject token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('infrapulse_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('infrapulse_token');
      localStorage.removeItem('infrapulse_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const dashboardApi = {
  executive: (startDate?: string, endDate?: string) =>
    api.get('/dashboard/executive', { params: { startDate, endDate } }),
  operational: () => api.get('/dashboard/operational'),
};

export const ticketsApi = {
  list: (filters?: Record<string, string>) =>
    api.get('/tickets', { params: filters }),
  get: (id: string) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.put(`/tickets/${id}`, data),
  queue: () => api.get('/tickets/queue'),
};

export const alertsApi = {
  get: () => api.get('/alerts'),
};

export const importApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/import/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  process: (filePath: string, filename: string, mapping: Record<string, string>) =>
    api.post('/import/process', { filePath, filename, mapping }),
  batches: () => api.get('/import/batches'),
};

export const reportsApi = {
  tickets: (filters?: Record<string, string>) =>
    api.get('/reports/tickets', { params: filters }),
  exportCsv: (filters?: Record<string, string>) =>
    `${API_URL}/api/reports/tickets/export?${new URLSearchParams(filters).toString()}`,
};

export const usersApi = {
  list: () => api.get('/users'),
  technicians: () => api.get('/users/technicians'),
  create: (data: any) => api.post('/users', data),
};
