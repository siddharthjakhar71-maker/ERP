import { create } from 'zustand';

interface UserProfile {
  id: string;
  fullName: string;
  role: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (payload: { token: string; user: UserProfile }) => void;
  clearAuth: () => void;
}

const unauthenticatedState = {
  token: null,
  user: null,
  isAuthenticated: false,
} satisfies Pick<AuthState, 'token' | 'user' | 'isAuthenticated'>;

export const useAuthStore = create<AuthState>((set) => ({
  ...unauthenticatedState,
  login: ({ token, user }) => set({ token, user, isAuthenticated: true }),
  clearAuth: () => set(unauthenticatedState),
}));
