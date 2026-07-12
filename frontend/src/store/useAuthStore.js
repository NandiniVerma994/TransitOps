import { create } from 'zustand';
import { api } from '../api';

export const useAuthStore = create((set, get) => {
  // Listen for session expiration events from the API client
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-session-expired', () => {
      set({ user: null, isAuthenticated: false, isLoading: false });
    });
  }

  return {
    user: null,
    isAuthenticated: false,
    isCheckingSession: true,
    isLoading: false,
    error: null,

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const user = await api.post('/api/auth/login', { email, password });
        set({ user, isAuthenticated: true, isLoading: false });
        return user;
      } catch (err) {
        set({ error: err.message, isLoading: false, isAuthenticated: false });
        throw err;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await api.post('/api/auth/logout');
      } catch (err) {
        console.error('Logout API call failed:', err);
      } finally {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      }
    },

    checkSession: async () => {
      set({ isCheckingSession: true, error: null });
      try {
        const user = await api.get('/api/auth/me');
        set({ user, isAuthenticated: true, isCheckingSession: false });
        return user;
      } catch (err) {
        set({ user: null, isAuthenticated: false, isCheckingSession: false });
        return null;
      }
    },

    changePassword: async (currentPassword, newPassword) => {
      set({ isLoading: true, error: null });
      try {
        await api.post('/api/auth/change-password', {
          current_password: currentPassword,
          new_password: newPassword
        });
        set({ user: null, isAuthenticated: false, isLoading: false });
      } catch (err) {
        set({ error: err.message, isLoading: false });
        throw err;
      }
    },

    clearError: () => set({ error: null })
  };
});
