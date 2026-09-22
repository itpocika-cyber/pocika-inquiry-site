import api from './client.js';

export const inquiryApi = {
  getSummary: () => api.get('/inquiries/summary'),
  getInquiries: (params = {}) => api.get('/inquiries', { params }),
  getInquiryById: (id) => api.get(`/inquiries/${id}`),
  createInquiry: (data) => api.post('/inquiries', data),
  updateInquiry: (id, data) => api.patch(`/inquiries/${id}`, data),
  downloadPdf: (id) => api.get(`/inquiries/${id}/pdf`, { responseType: 'blob' }),
  addComment: (id, text) => api.post(`/inquiries/${id}/comments`, { text }),
  exportExcel: (params = {}) => api.get('/inquiries/export/excel', { params, responseType: 'blob' })
};

export default inquiryApi;
