import api from './client.js';

export const uploadApi = {
  uploadDirect: (formData) => {
    return api.post('/upload', formData);
  },
  uploadPhotos: (inquiryId, formData) => {
    return api.post(`/inquiries/${inquiryId}/photos`, formData);
  },
  getPhotos: (inquiryId) => api.get(`/inquiries/${inquiryId}/photos`),
  deletePhoto: (inquiryId, photoId) => api.delete(`/inquiries/${inquiryId}/photos/${photoId}`)
};

export default uploadApi;
