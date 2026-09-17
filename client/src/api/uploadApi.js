import api from './client.js';

export const uploadApi = {
  uploadPhotos: (inquiryId, formData) => {
    return api.post(`/inquiries/${inquiryId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getPhotos: (inquiryId) => api.get(`/inquiries/${inquiryId}/photos`),
  deletePhoto: (inquiryId, photoId) => api.delete(`/inquiries/${inquiryId}/photos/${photoId}`)
};

export default uploadApi;
