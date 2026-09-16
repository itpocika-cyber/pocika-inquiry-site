const API_BASE_URL = 'http://localhost:5000/api/v1';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Try to get token if auth is initialized
  let token = null;
  try {
    const { auth } = await import('./auth.js');
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch (e) {
    // If auth module fails to load or no user, proceed without token
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const result = await response.json();
    
    if (!response.ok) {
      const error = new Error(result.error?.message || 'API request failed');
      error.details = result.error?.details;
      error.code = result.error?.code;
      throw error;
    }
    
    return result;
  } catch (error) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error.message);
    throw error; // Re-throw so caller can handle UI state
  }
}

export const api = {
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
  
  getUploadSignature: async () => {
    return apiRequest('/upload/signature');
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
  }
};
