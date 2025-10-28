import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, AuthResponse } from '@/lib/auth';

interface User {
  userId: string;
  username: string;
  email: string;
  karma: number;
  league: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setAuth: (authResponse: AuthResponse) => void;
  logout: () => Promise<void>;
  clearError: () => void;
  
  // Auth methods
  register: (email: string, username: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithWallet: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ accessToken, isAuthenticated: true });
      },
      
      setAuth: (authResponse) => {
        const { user, tokens } = authResponse;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        set({
          user,
          accessToken: tokens.accessToken,
          isAuthenticated: true,
          error: null,
        });
      },
      
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, accessToken: null, isAuthenticated: false, error: null });
        }
      },
      
      clearError: () => set({ error: null }),
      
      register: async (email, username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register({ email, username, password });
          get().setAuth(response);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          get().setAuth(response);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      
      loginWithWallet: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.connectWallet();
          get().setAuth(response);
        } catch (error: any) {
          const errorMessage = error.message || 'Wallet connection failed';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
