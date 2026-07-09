import { create } from 'zustand';
import api from '../services/api';

interface User {
  username: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { accessToken } = response.data;
      localStorage.setItem('token', accessToken);
      set({ token: accessToken, isAuthenticated: true });
      
      // Fetch user profile
      const userProfile = await api.get('/api/users/me');
      set({ user: userProfile.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      await api.post('/api/auth/register', { username, email, password });
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initSession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ token, isLoading: true });
      const userProfile = await api.get('/api/users/me');
      set({ user: userProfile.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
