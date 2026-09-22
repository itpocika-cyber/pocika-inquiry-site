import api from './client.js';

export const catalogApi = {
  getCatalog: (params = {}) => api.get('/catalog', { params }),
  createCatalogItem: (data) => api.post('/catalog', data),
  updateCatalogItem: (id, data) => api.patch(`/catalog/${id}`, data),
  deleteCatalogItem: (id) => api.delete(`/catalog/${id}`)
};

export default catalogApi;
