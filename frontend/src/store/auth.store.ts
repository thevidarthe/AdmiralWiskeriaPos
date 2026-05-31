'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, apiError } from '@/lib/api';

export type Role = 'ADMIN' | 'MANAGER' | 'BARISTA' | 'WAITER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  loginWithPassword: (email: string, password: string) => Promise<User>;
  loginWithPin: (userId: string, pin: string) => Promise<User>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      loginWithPassword: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data } = await authApi.login(email, password);
          set({
            user: data.user,
            token: data.accessToken,
            isAuthenticated: true,
            loading: false,
          });
          return data.user;
        } catch (e) {
          set({ loading: false, error: apiError(e) });
          throw e;
        }
      },

      loginWithPin: async (userId, pin) => {
        set({ loading: true, error: null });
        try {
          const { data } = await authApi.loginPin(userId, pin);
          set({
            user: data.user,
            token: data.accessToken,
            isAuthenticated: true,
            loading: false,
          });
          return data.user;
        } catch (e) {
          set({ loading: false, error: apiError(e) });
          throw e;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null });
        // Limpiar también las sucursales en memoria (lazy import para evitar ciclo)
        if (typeof window !== 'undefined') {
          import('./branch.store').then((m) => m.useBranchStore.getState().reset());
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'admiral-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    },
  ),
);

export const ROLE_ROUTES: Record<Role, string> = {
  ADMIN: '/admin',
  MANAGER: '/admin',
  BARISTA: '/pos',
  WAITER: '/mesero',
  CASHIER: '/pos',
};
