import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('pocika_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('pocika_token') || null,
  isAuthenticated: !!localStorage.getItem('pocika_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('pocika_token', token);
      localStorage.setItem('pocika_user', JSON.stringify(user));
      
      set({ token, user, isAuthenticated: true, loading: false, error: null });
      return user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('pocika_token');
    localStorage.removeItem('pocika_user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('pocika_token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return null;
    }

    try {
      const response = await api.get('/auth/me');
      const user = response.data.user;
      localStorage.setItem('pocika_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
      return user;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        get().logout();
      }
      return null;
    }
  }
}));
