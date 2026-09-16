import { getIdToken, signOut } from './auth.js';

const API_BASE_URL = 'http://localhost:5000/api/v1';

/**
 * Centralized API request wrapper.
 * Automatically attaches Authorization: Bearer <Firebase ID Token>
 * Handles 401 (Session Expired -> Redirect to login) and 403 (Forbidden).
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Retrieve current Firebase ID token (waits for auth readiness)
  let token = null;
  try {
    token = await getIdToken();
  } catch (e) {
    console.warn('Unable to get Firebase ID token:', e.message);
  }
  
  const headers = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    // Handle 401 Unauthorized: Expired / Missing / Invalid token
    if (response.status === 401) {
      console.warn('API 401 Unauthorized received. Redirecting to login...');
      await signOut();
      if (!window.location.pathname.includes('login.html')) {
        // Redirect smoothly with query parameter for clean inline notification
        const expiredParam = token ? '?expired=true' : '';
        window.location.href = `login.html${expiredParam}`;
      }
      const err = new Error('Authentication required.');
      err.code = 'UNAUTHORIZED';
      err.status = 401;
      throw err;
    }

    // Handle 403 Forbidden: Authenticated but not permitted or account inactive
    if (response.status === 403) {
      let result = null;
      try {
        result = await response.json();
      } catch (e) {}
      
      const message = result?.error?.message || "You don't have permission to perform this action.";
      console.warn('API 403 Forbidden:', message);
      
      const err = new Error(message);
      err.code = result?.error?.code || 'FORBIDDEN';
      err.status = 403;
      throw err;
    }

    const result = await response.json();
    
    if (!response.ok) {
      const error = new Error(result.error?.message || 'API request failed');
      error.details = result.error?.details;
      error.code = result.error?.code;
      error.status = response.status;
      throw error;
    }
    
    return result;
  } catch (error) {
    // If it's a fetch network failure
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`Network Error [${options.method || 'GET'} ${endpoint}]: API server may be offline.`);
      const netError = new Error('Cannot connect to the server. Please verify your connection.');
      netError.code = 'NETWORK_ERROR';
      throw netError;
    }
    throw error;
  }
}

export const api = {
  // Auth endpoints
  getMe: async () => {
    return apiRequest('/auth/me');
  },

  // Inquiries endpoints
  getSummary: async () => {
    return apiRequest('/inquiries/summary');
  },
  
  getInquiries: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/inquiries?${query}` : '/inquiries';
    return apiRequest(endpoint);
  },
  
  getInquiryById: async (id) => {
    return apiRequest(`/inquiries/${id}`);
  },
  
  createInquiry: async (data) => {
    return apiRequest('/inquiries', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  updateInquiry: async (id, data) => {
    return apiRequest(`/inquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  uploadInquiryPhotos: async (inquiryId, formData) => {
    return apiRequest(`/inquiries/${inquiryId}/photos`, {
      method: 'POST',
      body: formData
    });
  },

  getInquiryPhotos: async (inquiryId) => {
    return apiRequest(`/inquiries/${inquiryId}/photos`);
  },

  deleteInquiryPhoto: async (inquiryId, photoId) => {
    return apiRequest(`/inquiries/${inquiryId}/photos/${photoId}`, {
      method: 'DELETE'
    });
  }
};
