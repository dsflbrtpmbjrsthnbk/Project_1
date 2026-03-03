import axios from 'axios';

// Single-container: frontend and backend run on the same origin.
// All /api/* requests go to ASP.NET Core directly.
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  me: () => api.get('/auth/me').then(r => r.data),
  searchUsers: (q) => api.get('/auth/users/search', { params: { q } }).then(r => r.data),
  loginUrl: (provider) =>
    `/api/auth/login/${provider}?returnUrl=${window.location.origin}/auth-callback`,
};

export const inventoriesApi = {
  list: (params) => api.get('/inventories', { params }).then(r => r.data),
  get: (id) => api.get(`/inventories/${id}`).then(r => r.data),
  create: (data) => api.post('/inventories', data).then(r => r.data),
  update: (id, data) => api.put(`/inventories/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/inventories/${id}`),
  getAccess: (id) => api.get(`/inventories/${id}/access`).then(r => r.data),
  addAccess: (id, data) => api.post(`/inventories/${id}/access`, data),
  removeAccess: (id, userId) => api.delete(`/inventories/${id}/access/${userId}`),
  stats: (id) => api.get(`/inventories/${id}/stats`).then(r => r.data),
  exportCsv: (id) => api.get(`/inventories/${id}/export`, { responseType: 'blob' }),
  userInventories: (userId) => api.get(`/inventories/user/${userId}`).then(r => r.data),
  uploadImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/inventories/upload-image', form).then(r => r.data);
  },
};

export const itemsApi = {
  list: (inventoryId, params) => api.get(`/inventories/${inventoryId}/items`, { params }).then(r => r.data),
  get: (inventoryId, id) => api.get(`/inventories/${inventoryId}/items/${id}`).then(r => r.data),
  create: (inventoryId, data) => api.post(`/inventories/${inventoryId}/items`, data).then(r => r.data),
  update: (inventoryId, id, data) => api.put(`/inventories/${inventoryId}/items/${id}`, data).then(r => r.data),
  delete: (inventoryId, id) => api.delete(`/inventories/${inventoryId}/items/${id}`),
  toggleLike: (inventoryId, id) => api.post(`/inventories/${inventoryId}/items/${id}/like`).then(r => r.data),
  addComment: (inventoryId, id, data) =>
    api.post(`/inventories/${inventoryId}/items/${id}/comments`, data).then(r => r.data),
  deleteComment: (inventoryId, itemId, commentId) =>
    api.delete(`/inventories/${inventoryId}/items/${itemId}/comments/${commentId}`),
};

export const searchApi = {
  search: (q) => api.get('/search', { params: { q } }).then(r => r.data),
};

export const tagsApi = {
  cloud: () => api.get('/tags/cloud').then(r => r.data),
  autocomplete: (q) => api.get('/tags/autocomplete', { params: { q } }).then(r => r.data),
};

export const adminApi = {
  users: (params) => api.get('/admin/users', { params }).then(r => r.data),
  block: (id) => api.post(`/admin/users/${id}/block`),
  unblock: (id) => api.post(`/admin/users/${id}/unblock`),
  delete: (id) => api.delete(`/admin/users/${id}`),
  makeAdmin: (id) => api.post(`/admin/users/${id}/make-admin`),
  removeAdmin: (id) => api.post(`/admin/users/${id}/remove-admin`),
};

export default api;
